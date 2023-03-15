<script>

import * as util from './util.js';
import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { line, curveBasis, stack } from 'd3-shape';

/* props */
export let info;
export let catagories = ["count"];
export let highlightOne = false;
export let highlightedGroupLabel = null;
export let joy = false;
export let y_scale = 'scale_absolute';
export let infectivityThreshold = 5;

const margin = {top: 10, right: 0, bottom: 60, left: 20};

/* These are bound to the client dimensions of the element containing the svg, below: */
let clientWidth;
let clientHeight;

$: width = clientWidth - (margin.left + margin.right);
$: height = clientHeight - (margin.top + margin.bottom);

let stackFunc;
$: if (catagories) { stackFunc = stack().keys(catagories); }

$: hasHighlight = highlightOne && (highlightedGroupLabel != null);
$: highlightedGroup = info.find(d => d.label == highlightedGroupLabel);

$: yFunc = ((y_scale == 'scale_shared') ? "yNorm" : "yScale" ); 
$: histogramWorthyPopulations = info.filter(d => (d.shouldPlot && d.data));

$: xScale = calculateXScale(histogramWorthyPopulations, width);
$: barWidth = calculateBarWidth(xScale, histogramWorthyPopulations);

$: heightAdjustment = calcHeightAdjustment(joy, histogramWorthyPopulations, height);
$: stagger = staggerForJoy(joy, histogramWorthyPopulations, height, heightAdjustment);

$: yScaleFunc = assignYScaling(histogramWorthyPopulations, yFunc,
           height, stagger, heightAdjustment);

$: infectivityRegions = [
      {"title" : "NON-CONTAGIOUS", "color" : "#dbdbdb", "min" : 0,
          "max" : infectivityThreshold,
          "text_anchor" : "end",
          "text_x" : infectivityThreshold - 0.5
          },
      {"title" : "CONTAGIOUS", "color" : "white", "min" : infectivityThreshold,
          "max" : 12,
          "text_anchor" : "start",
          "text_x" : infectivityThreshold + 0.5
          },
   ];
 
function calculateXScale(populations, width) {
    if (!width) return null;
    let xValues = [0, 11.01]; // TECHDEBT this should not be hard-coded
    if (populations && populations.length) {
       const firstData = populations[0].data;
       if (firstData && firstData.length) {
          const firstBin = firstData[0];
          xValues = firstData.map( d => d["viralLoadLogMax"]);
          xValues.push(firstData["viralLoadLogMin"] - 1);
      }
    }
    let theExtent = extent(xValues);
    if (!theExtent) return null;
    return scaleLinear()
        .domain(theExtent)
        .range([0, width]);
}

function calculateBarWidth(xScale, populations) {
    if (populations.length < 1) return 1;
    if (!xScale) return 0;
    const firstData = populations[0].data;
    const firstBin = firstData[0];
    return xScale(firstBin.viralLoadLogMax) - xScale(firstBin.viralLoadLogMin);
}

function calcHeightAdjustment(joy, histogramWorthyPopulations, height) {
    let newHeightAdjustment = 1.0;
    if (joy && (histogramWorthyPopulations.length > 1)) {
        newHeightAdjustment = 0.1 + 1/histogramWorthyPopulations.length;
        if (newHeightAdjustment < 0.2) {
            newHeightAdjustment = 0.2;
        }
    }
    return newHeightAdjustment;
}

function staggerForJoy(joy, histogramWorthyPopulations, height, heigtAdjustment) {
    let newStagger = 0;
    if (joy && (histogramWorthyPopulations.length > 1)) {
        newStagger = (1-heightAdjustment)*height/(histogramWorthyPopulations.length-1);
    }
    return newStagger;
}

function findPeak(pop) {
    if (!pop.data) return 0;
    let peak = 0;
    for (let bin of pop.data) {
        let sum = 0;
        for (let key of catagories) { sum += bin[key]; }
        sum *= 1.1;
        if (sum > peak) {
            peak = sum;
        }
    }
    return peak;
}

function assignYScaling(histogramWorthyPopulations, yFunc,
        height, theStagger, heightAdjustment) {
    let yScaleFuncs = {}
    let maxPeak = 0;
    for (let i = 0; i < histogramWorthyPopulations.length; ++i) {
        let pop = histogramWorthyPopulations[i];
        let peak = findPeak(pop);
        if (peak > maxPeak) maxPeak = peak;
        if (yFunc == "yScale") {
            let yIndex = histogramWorthyPopulations.length-(i+1);
            yScaleFuncs[pop.label] = scaleLinear().domain([0,peak])
                             .range([height-(yIndex*theStagger),
                                 height-(yIndex*theStagger)-height*heightAdjustment]);
        }
    }
    if (yFunc == "yNorm") {
        for (let i = 0; i < histogramWorthyPopulations.length; ++i) {
            let pop = histogramWorthyPopulations[i];
            let yIndex = histogramWorthyPopulations.length-(i+1);
            yScaleFuncs[pop.label] = scaleLinear().domain([0, maxPeak])
                             .range([height-(yIndex*theStagger),
                                 height-(yIndex*theStagger)-height*heightAdjustment]);
        }
    }
    return yScaleFuncs;
}

function adjustedColor(color, hasHighlight, groupLabel, highlightedGroupLabel, joy, alpha) {
    if (hasHighlight && (groupLabel != highlightedGroupLabel)) {
        return util.addAlpha(color, 0.04);
    }
    if (joy) {
        return color;
    }
    return util.addAlpha(color, alpha);
}

/* For crude debugging: 
  $: console.log(`width: ${width}`);
*/

</script>

<div class="sizer"
      bind:clientWidth={clientWidth} bind:clientHeight={clientHeight}>
    <svg>
        {#if xScale}

            {#if (histogramWorthyPopulations.length == 0) || (highlightedGroup && !(highlightedGroup.shouldPlot))}
                <text class="nodata" text-anchor="middle" x={`${xScale(5)}px`}
                       y={`${(height/2)+margin.top}`}>
                    Insufficient data to plot
                </text>
            {/if}

            <g class="histgroup" transform={`translate(${margin.left}, ${margin.top})`}>
                <line class="yaxis" x1={`${xScale(0)}px`} x2={`${xScale(0)}px`}
                   y1="0" y2={height} stroke="black"></line>
                <g class="ylabeldiv">
                    <text class="ylabel" text-anchor="middle"
                             x={`${xScale(-0.25)}`} y={`${height/2}`}
                             transform={`rotate(-90 ${xScale(-0.25)} ${height/2})`}>
                        Fraction of patients
                    </text>
                </g>

                <!-- now for the actual histograms -->
                {#if stackFunc}
                    {#each histogramWorthyPopulations as pop}
                        {#each stackFunc(pop.data) as layer}
                            <g class="series"
                                  style={`fill: ${adjustedColor(pop.colors[layer.key][1],
                                          hasHighlight,
                                          pop.label,
                                          highlightedGroupLabel,
                                          joy, 0.4)}`}>
                                <path d={line().curve(curveBasis)
                                           .x(d => xScale(d.data.viralLoadLog))
                                           .y(d => yScaleFunc[pop.label](d[1]))
                                                    (layer) }
                                            style={`stroke: ${adjustedColor(pop.colors[layer.key][0],
                                                            hasHighlight,
                                                            pop.label,
                                                            highlightedGroupLabel,
                                                            joy, 1.0)};`}/>
                            </g>
                        {/each}
                    {/each}
                {/if}
                <g class="x-axis" transform={`translate(0, ${height})`} >
                    <line x1={xScale(0)} x2={xScale(11)} y1="0" y2="0" stroke="black" />
                    {#each [0, 3, 6, 9] as tick}
                        <g class="tick" transform={`translate(${xScale(tick)},0)`} >
                                <foreignObject width="2em" height="2em" x="-1em" y="0.5em" >
                                <div class="exponentlabel">
                                    10<sup>{tick}</sup>
                                </div>
                            </foreignObject>
                            <line x1="0" x2="0" y1="0" y2="5" stroke="black" />
                        </g>
                    {/each}
                </g>
                <text class="xlabel" text-anchor="middle" x={width/2} y={height + margin.top + 44}>
                    Viral load (copies of mRNA/mL)
                </text>
            </g>

            <!-- show what range of values represents non-contagious/contagious -->
            <g class="regiongroup" transform="translate({margin.left}, {margin.top})">
                {#each infectivityRegions as region}
                    <g class="i_region">
                        {#if region.min > 0}
                            <line x1={xScale(region.min)} y1="0" x2={xScale(region.min)} y2={height}
                               stroke-width="0.25px"
                               stroke="black" />
                        {/if}
                        <text class="i_label" y="10"
                                 text-anchor={region.text_anchor}
                                 x={xScale(region.text_x)}
                               >
                            {region.title}
                        </text>
                    </g>
                {/each}
            </g>
        {/if}
    </svg>
</div>

<style>

div.sizer {
   width: 100%;
   height: 100%;
}

svg {
    width: 100%;
    height: 100%;
    /* Note that both of these must be set to keep the graphic from going over the
      top menu banner: */
    position: relative;
    z-index: -1;
    overflow: visible;
}
.i_label {
    fill: black;
}
.triangle {
    fill: #dbdbdb;
}
g.series {
    stroke-width: 4;
}
</style>

