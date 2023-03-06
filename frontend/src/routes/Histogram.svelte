<script>

import * as util from './util.js';
let d3;
   
/* props */
export let info;
export let catagories = ["count"];
export let highlightOne = false;
export let highlightedGroupLabel = null;
export let joy = false;
export let y_scale = 'scale_absolute';
export let infectivityThreshold = 5;

import { onMount } from 'svelte';
onMount(async () => {
    d3 = await import("https://cdn.skypack.dev/pin/d3@v7.6.1-1Q0NZ0WZnbYeSjDusJT3/mode=imports,min/optimized/d3.js");
});

const margin = {top: 10, right: 0, bottom: 60, left: 20};

/* These are bound to the client dimensions of the element containing the svg, below: */
let clientWidth;
let clientHeight;

$: width = clientWidth - (margin.left + margin.right);
$: height = clientHeight - (margin.top + margin.bottom);

let stack;
$: if (d3 && catagories) { stack = d3.stack().keys(catagories); }

$: hasHighlight = highlightOne && (highlightedGroupLabel != null);
$: highlightedGroup = info.find(d => d.label == highlightedGroupLabel);

$: yFunc = ((y_scale == 'scale_shared') ? "yNorm" : "yScale" ); 
$: histogramWorthyPopulations = info.filter(d => d.shouldPlot);

$: xScale = calculateXScale(d3, histogramWorthyPopulations, width);
$: barWidth = calculateBarWidth(xScale, histogramWorthyPopulations);

$: heightAdjustment = calcHeightAdjustment(joy, histogramWorthyPopulations, height);
$: stagger = staggerForJoy(joy, histogramWorthyPopulations, height, heightAdjustment);

$: yScaleFunc = assignYScaling(d3, histogramWorthyPopulations, yFunc,
           height, stagger, heightAdjustment);

$: infectivityRegions = [
      {"title" : "", "color" : "#dbdbdb", "min" : 0, "max" : infectivityThreshold },
      {"title" : "CONTAGIOUS", "color" : "white", "min" : infectivityThreshold, "max" : 12},
   ];
 
function calculateXScale(d3, populations, width) {
    if (!d3) return null;
    if (populations.length < 1) return null;
    if (!width) return null;
    const firstData = populations[0].data;
    if (firstData.length < 1) return null;
    const firstBin = firstData[0];
    const xValues = firstData.map( d => d["viralLoadLogMax"]);
    xValues.push(firstData["viralLoadLogMin"] - 1);
    let extent = d3.extent(xValues);
    if (!extent) return null;
    return d3.scaleLinear()
        .domain(extent)
        .range([0, width]);
}

function calculateBarWidth(xScale, populations) {
    if (populations.length < 1) return 1;
    const firstData = populations[0].data;
    const firstBin = firstData[0];
    if (!xScale) return 0;
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

function assignYScaling(d3, histogramWorthyPopulations, yFunc,
        height, theStagger, heightAdjustment) {
    if (!d3) return null;
    let yScaleFuncs = {}
    let maxPeak = 0;
    for (let i = 0; i < histogramWorthyPopulations.length; ++i) {
        let pop = histogramWorthyPopulations[i];
        let peak = findPeak(pop);
        if (peak > maxPeak) maxPeak = peak;
        if (yFunc == "yScale") {
            let yIndex = histogramWorthyPopulations.length-(i+1);
            yScaleFuncs[pop.label] = d3.scaleLinear().domain([0,peak])
                             .range([height-(yIndex*theStagger),
                                 height-(yIndex*theStagger)-height*heightAdjustment]);
        }
    }
    if (yFunc == "yNorm") {
        for (let i = 0; i < histogramWorthyPopulations.length; ++i) {
            let pop = histogramWorthyPopulations[i];
            let yIndex = histogramWorthyPopulations.length-(i+1);
            yScaleFuncs[pop.label] = d3.scaleLinear().domain([0, maxPeak])
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

<div class="histogram"
      bind:clientWidth={clientWidth} bind:clientHeight={clientHeight}>
    <svg>
        {#if xScale}
            <!-- show what range of values represents non-contagious/contagious -->
            <g class="regiongroup" transform="translate({margin.left}, {margin.top})">
                {#each infectivityRegions as region}
                    <g class="i_region">
                        <rect class="region" y="0" height={height} x={xScale(region.min)}
                              width={xScale(region.max)-xScale(region.min)}
                              fill={region.color}>
                        </rect>
                        <text class="i_label" text-anchor="end" y="30" x={20+xScale(region.min)}
                               transform="rotate(-90 {20+xScale(region.min)} 30)">
                            {region.title}
                        </text>
                        <polygon class="triangle"
                            points={`${xScale(region.min)+8} 28 ${xScale(region.min)+18} 22 ${xScale(region.min)+8} 16`} />
                    </g>
                {/each}
            </g>

            {#if highlightedGroup && !(highlightedGroup.shouldPlot)}
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
                {#if stack}
                    {#each histogramWorthyPopulations as pop}
                        {#each stack(pop.data) as layer}
                            <g class="series"
                                  style={`fill: ${adjustedColor(pop.colors[layer.key][1],
                                          hasHighlight,
                                          pop.label,
                                          highlightedGroupLabel,
                                          joy, 0.4)}`}>
                                <path d={d3.line().curve(d3.curveBasis)
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
        {/if}
    </svg>
</div>

<style>
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
    fill: #b8b8b8;
}
.triangle {
    fill: #dbdbdb;
}
g.series {
    stroke-width: 4;
}
</style>

