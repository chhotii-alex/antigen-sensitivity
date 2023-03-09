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

$: substitutionCount = findNeededSubstitutionCount(info, maxstr);

function findNeededSubstitutionCount(info, maxstr) {
   let count = 0;
   for (let i = 0; i < info.length; ++i) {
       let s = info[i].label.toLowerCase();
       for (let j = 0; ; ++j) {
          if (s.length <= maxstr || j >= substitutions.length) {
             if (j > count) {
                 count = j;
             }
             break;
          }
          let subs = substitutions[j];
          s = s.replaceAll(subs[0].toLowerCase(), subs[1].toLowerCase());
          s = s.replaceAll("  ", " ");
      }
  }
  return count;
}

function shortLabelAtIndex(info, i, maxstr, substitutionCount) {
    let s = info[i].label.toLowerCase();
    for (let j = 0; j < substitutionCount; ++j) {
        let subs = substitutions[j];
        s = s.replaceAll(subs[0].toLowerCase(), subs[1].toLowerCase());
        s = s.replaceAll("  ", " ");
    }
    if (s.length > maxstr) {
        s = s.substring(0, maxstr-3) + "...";
    }
    return s;
}

const substitutions = [
    ["Early Variant" , "Early"],
    ["omicron" , "omi"],
    ["in inpatient settings" , "inpatient"],
    ["in outpatient settings" , "outpatient"],
    ["in the Emergency Department" , "in ED"],
    ["at other institutions" , "other inst"],
    ["patients" , ""],
    [" to " , "-"],
    [",000" , "K"],
    ["from areas with median household income" , ""],
    ["from ZCTAs with Median Household Income" , ""],
    ["having unknown vaccination status", "vaccination unknown"],
    ["vaccination" , "vax"],
    ["vaccinated" , "vax"],
    [" or " , "/"],
    ["unknown/other" , "other"],
    [" unknown" , "?"],
    ["with no" , "w/o"],
    ["not having" , "w/o"],
    ["having" , "w/"],
    ["with" , "w/"],
    ["not getting" , "w/"],
    ["getting" , "w/o"],
    ["current smokers", "smokers"],
    ["who never smoked" , "non-smoking"],
    ["pulmonary" , "lung"],
    ["peptic ulcer" , "ulcer"],
    ["connective tissue disease" , "rheum"],
    [" and " , " & "],
    ["(<30 y.o.)" , " "],
    ["(60+ y.o.)" , " "],
    ["30 - 60 y.o." , " middle "],
    ["females" , "F."],
    ["males" , "M."],
    ["pregnant" , "preg"],
    ["blood products" , "blood"],
    ["survived" , "lived"],
    ["$" , ""],
    ["< 5" , "<5"],
    ["asian & pacific islander" , "aapi"],
    ["Asian/Pacific Islander" , "aapi"],
    ["hispanic" , "hisp"],
    ["Native American" , "NatAmer"],
    ["white" , "wh"],
    ["black" , "bl"],
    ["Translanted organ and tissue status" , "transplant"],
    ["acquired immunodeficiency syndrome" , "aids"],
    ["ventilation assist" , "vent"],
    ["neurological" , "neuro"],
    ["Immunosuppressed" , "Immunosup."],
    ["Immunocompetent" , "Immunocomp."],
    ["Immuno" , "imm-"],
    ["appearing " , " "],
    ["diabetes" , "diab"],
    ["Sickle Cell & Thalassemia" , "sickle"],
    ["Mental health conditions" , "mental"],
    ["Substance abuse" , "drugs"],
    ["peripheral" , "periph"],
    ["vascular" , "vasc"],
    ["DEXAMETHASONE", "DEXA"],
    ["zumab" , "z"],
    ["desivir" , "d"],
    ["era" , " "],
    [" who " , " "],
    ["conditions" , "dx"],
    ["cerebrovasc" , "cbv"],
    ["disabilities" , "disabil"],
    ["disorders" , " "],
    ["disease" , " "],
    ["healthy" , "hlthy"],
    ["weight" , "w."],
    ["smoking" , "smoke"],
    ["smokers" , "smoke"],
    ["smoker" , "smoke"],
    ["former" , "form"],
    ["preg f" , "preg"],
    ["smoke" , "sm"],
    ["." , ""],
];

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
                                 fill={util.colorForPValue(retrievePValue(info, i, j))}
                        />
                        <text x={x(j-0.5)} y={y(i-0.5)}
                                fill={util.textColorForPValue(retrievePValue(info, i, j))} 
                                text-anchor="middle"
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
                    {shortLabelAtIndex(info, i, maxstr, substitutionCount)}
                </text>
            {/each}
            {#each util.range(0, info.length-1) as i }
                <text class="col_labels"
                       x={scale*(totalWidth-(i+0.25)*rectSize+outerMargin)}
                       y={scale*(outerMargin+labelWidth)}
                       text-anchor="start"
                       transform={`rotate(-90 ${scale*(totalWidth-(i+0.25)*rectSize+outerMargin)} ${scale*(outerMargin+labelWidth)})`}>
                    {shortLabelAtIndex(info, i, maxstr, substitutionCount)}
                </text> 
            {/each}
        </svg>
    {/if}
</div>
