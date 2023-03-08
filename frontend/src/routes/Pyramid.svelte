<script>

import * as util from './util.js';

export let info;

const baseFontSize = 6.8;
let labelFontSize = 10;
const fontWidthRatio = 0.476;

const rectSize = 25;
const maxGroups = 8; //this is determined by the back end
const innerMargin = 10;
const outerMargin = 0;
const totalWidth = rectSize*(maxGroups-1);
const labelWidth = totalWidth-innerMargin;
let maxstr = (totalWidth - 2*innerMargin)/(labelFontSize*fontWidthRatio);
if (maxstr < 15) {
    maxstr = 15;
    labelFontSize = (totalWidth - innerMargin)/(maxstr*fontWidthRatio);
}

/* These are bound to the client dimensions of the element containing the svg, below: */
let clientWidth;
let clientHeight;

$: scale = clientWidth/(totalWidth+labelWidth+innerMargin+2*outerMargin);

let x = i => 0;
let y = i => 0;

$: if (clientWidth) { x = makeXScaler(scale); }
$: if (clientWidth && info) { y = makeYScaler(scale, info); }

function makeXScaler(scale) {
    return (i) => {
        return scale*(outerMargin+totalWidth-(i+1)*rectSize);
    }
}
function makeYScaler(scale, info) {
    return (i) => {
        return scale*(labelWidth+rectSize*(info.length-1)+innerMargin+outerMargin-(i)*rectSize);
    }
}

function shortLabelAtIndex(info, i, maxstr) {
    let s = info[i].label;
    for (let subs in substitutions) {
        if (s.length <= maxstr) {
            return s;
        }
        s = s.replaceAll(subs, substitutions[subs]);
        s = s.replaceAll("  ", " ");
    }
    if (s.length > maxstr) {
        s = s.substring(0, maxstr-3) + "...";
    }
    return s;
}

const substitutions = {
    "Early Variant" : "Early",
    "in inpatient settings" : "inpatient",
    "in outpatients settings" : "outpatient",
    "in the Emergency Department" : "ED",
    "at other institutions" : "other inst",
    "patients" : "",
    "from ZCTAs with Median Household Income" : "",
    " to " : "-",
    ",000" : "K",
    "having unknown vaccination status": "vaccination unknown",
    "not having" : "w/o",
    "having" : "w/",
    "not getting" : "w/",
    "getting" : "w/o",
    "current smokers": "smokers",
    "who never smoked" : "non-smoking",
    " and " : " & ",
    "(<30 y.o.)" : " ",
    "(60+ y.o.)" : " ",
    "30 - 60 y.o." : " middle ",
    "females" : "F",
    "males" : "M",
    "blood products" : "blood",
    "$" : "",
    "Asian/Pacific Islander" : "Asian",
    "Native American" : "NatAmer",
    "Unknown/Other" : "Other",
    "Translanted organ and tissue status" : "transplant",
    "Immunosuppressed" : "Immunosup.",
    "Immunocompetent" : "Immunocomp.",
    "Immuno" : "imm-",
    "appearing " : " ",
    "Sickle Cell & Thalassemia" : "sickle",
    "Mental health conditions" : "mental",
    "Substance abuse" : "drugs",
    "DEXAMETHASONE": "DEXA",
    "vaccination": "vax",
};

function colorForPValue(p) {
    let r = 90;
    let g = 90;
    let b = 90;
    p = -Math.log10(p);
    if (p < 0.0) {
        p = 0.0;
    }
    p = p * 20;
    r += p;
    if (r > 255.0) {
        r = 255.0;
    }
    r = Math.floor(r);
    let s = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
    return s;
}

function retrievePValue(info, i, j) {
    return info[i].comparisons[j];
}

function shortPValue(info, i, j) {
    let num = retrievePValue(info, i, j);
    return formatShortPValue(num);
}

function formatShortPValue(num) {
    if (num >= 0.01) {
        return num.toFixed(2);
    }
    else {
        return util.expo(num);
    }
}

$: marginBottom = `margin-bottom: ${y(-1)-clientWidth}px`;

</script>

<div id="pyramid_container" class="pyramid"
          bind:clientWidth={clientWidth} bind:clientHeight={clientHeight}
          style={marginBottom}>
    {#if scale}
        <svg id="pyramid" width="100%"
                font-size={`${labelFontSize*scale}px`}>
            {#each util.range(1, info.length) as i}
                <g class="pyramidrow">
                    {#each util.range(0, i) as j}
                        <rect x={x(j)} y={y(i)} width={scale*rectSize} height={scale*rectSize}
                                 fill={colorForPValue(retrievePValue(info, i, j))}
                        />
                        <text x={x(j-0.5)} y={y(i-0.5)} fill="white" text-anchor="middle"
                                font-size={`${baseFontSize*scale}px`}>
                            {shortPValue(info, i, j)}
                        </text>
                    {/each}
                </g>
            {/each}
            {#each util.range(1, info.length) as i}
                <text class="row_labels"
                         x={ scale*(outerMargin+totalWidth+innerMargin)}
                         y={scale*(outerMargin+labelWidth+innerMargin+(info.length-(i+0.25))*rectSize)}>
                    {shortLabelAtIndex(info, i, maxstr)}
                </text>
            {/each}
            {#each util.range(0, info.length-1) as i }
                <text class="col_labels"
                       x={scale*(totalWidth-(i+0.25)*rectSize+outerMargin)}
                       y={scale*(outerMargin+labelWidth)}
                       text-anchor="start"
                       transform={`rotate(-90 ${scale*(totalWidth-(i+0.25)*rectSize+outerMargin)} ${scale*(outerMargin+labelWidth)})`}>
                    {shortLabelAtIndex(info, i, maxstr)}
                </text> 
            {/each}
        </svg>
    {/if}
</div>
