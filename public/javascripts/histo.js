
import * as d3 from "https://cdn.skypack.dev/pin/d3@v7.6.1-1Q0NZ0WZnbYeSjDusJT3/mode=imports,min/optimized/d3.js"
//import * as d3 from "https://cdn.skypack.dev/d3@7.6";

function expo(x) {
  return Number.parseFloat(x).toExponential(1);
}

function formatPValue(p) {
    let s = expo(p);
    const r = /(\d\.\d)e([+-]\d+)/
    const match = s.match(r);
    if (!match) return "";
    return `<em>(p</em>=${match[1]}x10<sup>${match[2]}</sup>)`;
}

/*  The comorbidityCategories lookup will have an entry for every item in the drop-down in the
    "Comorbidities" category. Some of these have subdivisions, and thus have checkboxes,
    and some don't. 
*/
let comorbidityCategories = {};

function createCheckbox(id, displayName, parentNode, labelClass) {
    let checky = document.createElement("input");
    checky.setAttribute("type", "checkbox");
    checky.setAttribute("id", id);
    checky.setAttribute("value", id);
    checky.setAttribute("name", id);
    let label = document.createElement("label");
    label.setAttribute("for", id);
    label.setAttribute("class", labelClass);
    parentNode.appendChild(checky);
    parentNode.appendChild(label);
    label.appendChild(new Text(displayName));
    parentNode.appendChild(document.createElement("br"));
    return checky;
}

export function resetChecks() {
    for (const v of Object.keys(variables)) {
	document.getElementById(v).checked = false;
	for (const value of variables[v]) {
	    document.getElementById(value).checked = false;
	}
    }
    updateQuery();    
}



let variables = {};
let variableValues = {};

function loadVariableOptions(data) {
    let options = data.items;
    let div = document.getElementById("select_var_checks");
    for (let item of options) {
	let subdiv = document.createElement("div");
	div.appendChild(subdiv);
	variables[item.id] = [];
	let checky = createCheckbox(item.id, item.displayName, subdiv, "variablename");
	checky.addEventListener('click', updateVariables);
	let splits = item.splits;
	for (let subItem of splits) {
	    variables[item.id].push(subItem.value);
	    variableValues[subItem.value] = item.id;
	    checky = createCheckbox(subItem.value, subItem.valueDisplayName, subdiv, "valuename");
	    checky.addEventListener('click', updateVariables);
	}
    }
}

function updateVariables(e) {
    let variable = e.target.value;
    let state = e.target.checked;
    if (variables[variable]) {
	// this is a variable (for example, sex)
	for (let value of variables[variable]) {
	    document.getElementById(value).checked = state;
	}
    }
    else {
	let value = e.target.value;
	let variable = variableValues[value];
	// this is a value for a variable (for example, male)
	if (state) {
	    document.getElementById(variable).checked = true;
	}
	else {
	// If we turn off the last checkbox for a variable, uncheck the variable
	    // Look up the variable for which this is a value
	    let anyOn = false;
	    for (let anyValue of variables[variable]) {
		if (document.getElementById(anyValue).checked) {
		    anyOn = true;
		    break
		}
	    }
	    if (!anyOn) {
		document.getElementById(variable).checked = false;
	    }
	}
    }
    updateQuery();
}

let assayOptions = {};

function loadAssayOptions(data) {
    assayOptions = {};
    let options = data.items;
    let select = document.getElementById("antigenTest");
    for (let item of options) {
        let id = item.id;
        let label = item.displayName;
        let opt = document.createElement("option");
        opt.value = id;
        opt.text = label;
        select.add(opt);
	assayOptions[id] = label;
    }
}

function minDateAvail() {
    return document.getElementById("minDate") != null;
}

function maxDateAvail() {
    return document.getElementById("maxDate") != null;
}

function updateLOD(lod) {
    gData.lod = lod;
    if (lod >= 0) {
	gData.assay = null;
    }
    let lod_exp = document.getElementById("lod_exp");
    let lod_text = document.getElementById("lod_text");
    if (lod >= 0) {
	lod_exp.innerHTML = lod;
	lod_text.className = "inline_style";
	document.getElementById("antigenTest").value = "none";
	document.getElementById("test_description").innerHTML = `antigen test with an LOD of 10<sup>${lod}</sup>`;
    }
    else {
	lod_exp.innerHTML = "";
	lod_text.className = "hidden_style";
    }
    
    displayTestPerformance();
}


function updateAntigenTestSelection() {
    let assay = document.getElementById("antigenTest").value;
    gData.lod = null;
    if (assay == "none") {
	assay = null;
    }
    gData.assay = assay;
    if (assay != null) {
	let lod_slider = document.getElementById("lod_slider");
	lod_slider.value = -1;
	updateLOD(lod_slider.value);
	let assayName = assayOptions[assay];
	document.getElementById("test_description").innerHTML = assayName;
    }
    displayTestPerformance();
}

document.getElementById("antigenTest").onchange = updateAntigenTestSelection;

document.getElementById("lod_slider").oninput = function() {
    updateLOD(this.value);
}

function isAntigenParamSet() {
    console.log(gData.assay);
    if (gData.assay != null && gData.assay != "none") {
	console.log("antigen test is seelcted");
	return true;
    }
    if (gData.lod != null && gData.lod >= 0) {
	console.log("LOD is specified");
	return true;
    }
    console.log("no antigen test speci");
    return false;
}
  
function displayTestPerformance() {
    setHidden("antihisto", !isAntigenParamSet());
    if (!isAntigenParamSet()) {
	return;
    }
    if (gData.assay != null) {
	applyKnownAntigenTest(gData, gData.assay);
    }
    else {
	applyLOD(gData, gData.lod);
    }
    displayAntigenTestHistogram();
}

function applyKnownAntigenTest(gData, assay) {
    for (let pop of gData) {
	pop.catagories["negatives"] = "Antigen Negatives";
	pop.catagories["positives"] = "Antigen Positives";
	for (let bin of pop.data) {
	    if (bin.viralLoadLog < 4) {
		bin["negatives"] = bin["count"];
		bin["positives"] = 0;
	    }
	    else if (bin.viralLoadLog < 7) {
		bin["negatives"] = Math.round(0.5*bin["count"]);
		bin["positives"] = Math.round(0.5*bin["count"]);
	    }
	    else {
		bin["negatives"] = 0;
		bin["positives"] = bin["count"];
	    }
	}
    }    
}

function applyLOD(gData, lod) {
    for (let pop of gData) {
	pop.catagories["negatives"] = "Antigen Negatives";
	pop.catagories["positives"] = "Antigen Positives";
	for (let bin of pop.data) {
	    if (bin.viralLoadLog < lod) {
		bin["negatives"] = bin["count"];
		bin["positives"] = 0;
	    }
	    else {
		bin["negatives"] = 0;
		bin["positives"] = bin["count"];
	    }
	}
    }
}

function displayAntigenTestHistogram() {
    displayData([gData[0]], "antiperf", ["negatives", "positives"]);
}

function setHidden(id, hidden) {
    let node = document.getElementById(id);
    if (hidden) {
	console.log(`hiding ${id}`);
	node.classList.add("hidden_style");
    }
    else {
	console.log(`showing ${id}`);
	node.classList.remove("hidden_style");
    }
}


if (minDateAvail()) {
    document.getElementById("minDate").onchange = updateQuery;
}
if (maxDateAvail()) {
    document.getElementById("maxDate").onchange = updateQuery;
}


/* Called directly when a checkbox is clicked */
export function updateQuery() {
    let minDate = null;
    let maxDate = null;
    if (minDateAvail()) {
      minDate = document.getElementById("minDate").value;
    }
    if (maxDateAvail()) {
      maxDate = document.getElementById("maxDate").value;
    }
    doQuery(minDate, maxDate);
  }

  let url;
  
  url = "/api/variables";
  fetch(url)
        .then(response => response.json())
        .then(data => loadVariableOptions(data));

  url = "/api/assays";
  fetch(url)
        .then(response => response.json())
        .then(data => loadAssayOptions(data));


export function doQuery(minDate=null, maxDate=null) {
    let url = 'api/data/viralloads?';

    for (let variable in variables) {
	for (let value of variables[variable]) {
	    if (document.getElementById(value).checked) {
		url += `${variable}[]=${value}&`;
	    }
	}
    }
    
    if (minDate) {
        url += `minDate=${minDate}&`
    }
    if (maxDate) {
        url += `maxDate=${maxDate}&`
    }
    fetch(url)
        .then(response => response.json())
        .then(data => loadData(data));
}

let gData = [];
let gInfectivityThreshold;

export function setInfectivityThreshold(value) {
    gInfectivityThreshold = value;
    if (gData) {
        presentData();
    }
}

function loadData(data) {
    gData = data;
    presentData();
}

export function presentData() {
    applyInfectivityThreshold(gData, gInfectivityThreshold);
    if (gData) {
	displayData(gData, "displaybox"); 
	displayComparisons(gData);
	displayCommentary(gData);
	displayGroupRadioButtons(gData);
    }
}

function getLOD() {
    return gData.lod;
}

// TODO: Use the framework Luke
function displayCommentary(items) {
    let text = " ";
    for (let i = 0; i < items.length; ++i) {
	text += "<p>The mean viral load across ";
	let item = items[i];
	let color = item.colors.negatives;
	let meanvl = numberFormatter.format(item.mean);
	text += `<span style="color: ${color}">`;
	text += `${item.count} ${item.label.trim()}`;
	text += "</span>"
	text += " was ";
	text += `<span style="color: ${color}">`;
	text += `${meanvl} copies/mL`
	text += "</span>."
	text += "</p>";
    }
    document.getElementById("commentary").innerHTML = text;
}

function displayTestCommentary(items) {
    text += " A test with an ";
    text += `<span class="lodisred">LOD of 10<sup>${getLOD()}</sup></span> `;
    text += " would have a sensitivity of ";
}

function applyInfectivityThreshold(data, infectivityThreshold) {
    for (let pop of data) {
        pop.infectivityThreshold = infectivityThreshold;
        pop.infectiousCount = 0;
        pop.truePositiveCount = 0;
        for (let bin of pop.data) {
            if (bin.viralLoadLog >= infectivityThreshold) {
                pop.infectiousCount += bin.count;
                pop.truePositiveCount += bin.positives;
            }
        }
        if (pop.truePositiveCount && pop.infectiousCount) {
            pop.sensitivity = pop.truePositiveCount/pop.infectiousCount;
            pop.distributionsWithSensitivityCalc = [pop];
        }
        else {
            pop.sensitivity = null;
            pop.distributionsWithSensitivityCalc = []
        }
    }
}

function getTotal(data, categories) {
    let total = 0;
    for (let segment of data) {
        for (let cat of categories) {
            total += segment[cat];
        }
    }
    let str = numberFormatter.format(total);
    return str;
}

const margin = {top: 10, right: 30, bottom: 40, left: 80};

function linearScale(values, width) {
    let extent = d3.extent(values);
    extent[0] -= 0.5;
    extent[1] += 0.5;
    return d3.scaleLinear()
        .domain(extent)
        .range([0, width]);
}

function prepareDataForStackedHistogram(info, catagories) {
    let stack = d3.stack().keys(catagories);
    let stackedData = stack(info.data);
    stackedData.forEach( (f) => {
        f.color = info.colors[f.key];
        f.label = info.catagories[f.key];
        f.forEach( (a) => {
            a[0] = info.yScale(a[0]);
            a[1] = info.yScale(a[1]);
        });
    });
    return stackedData;
}

let numberFormatter = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 });

function composeAnnotationOnMean(d) {
    let value = d.mean;
    if (value == null) {
        return "";
    }
    value = parseFloat(value);
    let str = numberFormatter.format(value);

    return `mean viral load: ${str} copies/mL`;
}

function prepareInfectivityRegions(d) {
    let result = [
        {"title" : "", "color" : "#dbdbdb", "min" : 0, "max" : d.infectivityThreshold },
        {"title" : "CONTAGIOUS", "color" : "white", "min" : d.infectivityThreshold, "max" : 12},
    ];
    return result;
}

function numberOfComparisons(info) {
    let count = 0;
    for (let i = 1; i < info.length; ++i) {
	for (let j = 0; j < i; ++j) {
	    if (info[i].comparisons[j] == null) {
		continue;
	    }
	    count += 1;
	}
    }
    return count;
}

function displayComparisons(info) {
    displayTextComparisons(info);
    if (numberOfComparisons(info) > 1) {
	displayPyramid(info);
    }
    else {
	displayPyramid([]);
    }
}

function range(start, stop, step=1) {
    let a = [];
    if (!step) return a; // zero step means empty array, not forever
    for (let x = start; ; x += step) {
	if (step < 0) {
	    if (x <= stop) {
		break;
	    }
	}
	else {
	    if (x >= stop) {
		break;
	    }
	}
	a.push(x);
    }
    return a;
}

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
    if (num >= 0.01) {
	return num.toFixed(2);
    }
    else {
	return expo(num);
    }
}

function labelAtIndex(info, i) {
    return info[i].label;
}

function maxLabelLen(info) {
    let maxLen = 0;
    for (let i = 0; i < info.length; ++i) {
	if (info[i].label.length > maxLen) {
	    maxLen = info[i].label.length;
	}
    }
    return maxLen+1;
}

function displayPyramid(info) {
    const baseFontSize = 6.8;
    let container = document.getElementById("pyramid_container");
    if (info.length < 2) {
	container.style.display = "none";
    }
    else {
	container.style.display = "block";
    }
    let pyramidElem = document.getElementById("pyramid");
    const rectSize = 25;
    const innerMargin = 10;
    const outerMargin = 0;
    const totalWidth = rectSize*(info.length-1);
    const labelWidth = maxLabelLen(info)*baseFontSize/Math.sqrt(2);
    let box = d3.select("#pyramid");
    let w = pyramidElem.parentNode.getBoundingClientRect().width;
    const scale = w/(totalWidth+labelWidth+innerMargin+2*outerMargin);
    function x(i) {
	return scale*(outerMargin+totalWidth-(i+1)*rectSize);
    }
    function y(i) {
	return scale*(labelWidth+totalWidth+innerMargin+outerMargin-(i)*rectSize);
    }
    box.attr('transform-origin', `${x(0)}px 100%`)
	.attr('transform', `rotate(-45) translate(${w/Math.sqrt(2)} ${w/Math.sqrt(2)})`);
    let row = box.selectAll('g.pyramidrow')
        .data(range(1, info.length))
	.join('g')
	.classed('pyramidrow', true);
    let label1 = box.selectAll('text.row_labels')
	.data(range(1, info.length))
	.join('text')
	.classed('row_labels', true)
	.text(d => labelAtIndex(info, d))
	.attr('x', scale*(outerMargin+totalWidth+innerMargin))
	.attr('y', d => scale*(outerMargin+labelWidth+innerMargin+(info.length-(d+0.25))*rectSize))
	.attr('font-size', `${10*scale}px`);
    let label2 = box.selectAll('text.col_labels')
	.data(range(0, info.length-1))
	.join('text')
	.classed('col_labels', true)
	.text(d => labelAtIndex(info, d))
	.attr('x', d => scale*(totalWidth-(d+0.5)*rectSize+outerMargin))
	.attr('y', scale*(outerMargin+labelWidth))
	.attr("text-anchor", "end")
    	.attr("transform", d => `rotate(90 ${scale*(totalWidth-(d+0.5)*rectSize+outerMargin)} ${scale*(outerMargin+labelWidth)})`)
	.attr('font-size', `${10*scale}px`);
    let square = row.selectAll('rect')
	.data(d => range(0, d).map(index => [d,index]))
	.join('rect')
        .attr('x', d => x(d[1]))
        .attr('y', d => y(d[0]))
        .attr('width', scale*rectSize)
        .attr('height', scale*rectSize)
	.style('fill', d => colorForPValue(retrievePValue(info, d[0], d[1])));
    let pvalues = row.selectAll('text')
	.data(d => range(0, d).map(index => [d,index]))
	.join('text')
        .attr('x', d => x(d[1]-0.5))
        .attr('y', d => y(d[0]-0.5))
	.attr("text-anchor", "middle")
	.attr('transform', d => `rotate(45 ${x(d[1]-0.5)} ${y(d[0]-0.5)} )`)
	.attr('fill', 'white')
	.attr('font-size', `${baseFontSize*scale}px`)
	.text(d => `${shortPValue(info, d[0], d[1])}`); 
}

function hasSignificantDifferences(info, alpha) {
    for (let i = 1; i < info.length; ++i) {
	for (let j = 0; j < i; ++j) {
	    let d = {};
	    d.pvalue = info[i].comparisons[j];
	    if (d.pvalue == null) {
		continue;
            }
	    if (d.pvalue < alpha) {
		return true;
	    }
	}
    }
    return false;
}

function displayTextComparisons(info) {
    let text = "";
    if (info.length > 1) {
	let conclusion = "are similar";
	if (hasSignificantDifferences(info, 0.05)) {
	    conclusion = "vary";
	}
	let preposition = "between";
	if (info.length > 2) {
	    preposition = "across";
	}
	let num = info.length;
	text = `Viral loads ${conclusion} ${preposition} these ${num} groups`;
    }
    document.getElementById("comparison_title").innerHTML = text;
	    
    let box = d3.select("#pvalue_text");
    let comparisons = [];
    if (info.length > 2) {
	info = [];
    }
    for (let i = 1; i < info.length; ++i) {
	for (let j = 0; j < i; ++j) {
	    let d = {};
	    d.pvalue = info[i].comparisons[j];
	    if (d.pvalue == null) {
		continue;
            }
	    d.label1 = info[i].label;
	    d.label2 = info[j].label;
	    d.conclusion = " are statistically indistinguishable ";
	    if (d.pvalue < 0.05) {
		d.conclusion = " differ ";
	    }
	    d.color1 = info[i].colors.negatives;
	    d.color2 = info[j].colors.negatives;
	    comparisons.push(d);
	}
    }
    let conclusiontext = box.selectAll("div.conclusiontext")
        .data(comparisons)
        .join("div")
        .classed("conclusiontext", true);
    conclusiontext.selectAll("span.vl_prefix")
        .data(d => [d])
        .join("span")
        .classed("vl_prefix", true)
        .text(d => "Viral loads for ");
    conclusiontext.selectAll("span.group1noun")
        .data(d => [d])
        .join("span")
        .classed("group1noun", true)
        .text(d =>  d.label1)
        .style('color', (d) => d.color1);
    conclusiontext.selectAll("span.and")
        .data(d => [d])
        .join("span")
        .classed("and", true)
        .text(d => " and ");
    conclusiontext.selectAll("span.group2noun")
        .data(d => [d])
        .join("span")
        .classed("group2noun", true)
        .text(d =>  d.label2)
        .style('color', (d) => d.color2);
    conclusiontext.selectAll("span.conclusion")
        .data(d => [d])
        .join("span")
        .classed("conclusion", true)
        .text(d => d.conclusion);
    conclusiontext.selectAll("span.pvalue")
        .data(d => [d])
        .join("span")
        .classed("pvalue", true)
        .html(d =>  formatPValue(d.pvalue));
}

function displayData(info, widgetID, catagories=["count"]) {
    let elem = document.getElementById(widgetID);
    let box = d3.select(elem);
    let rect = elem.getBoundingClientRect();
    let width = rect.width - (margin.left + margin.right);
    let height = rect.height - (margin.top + margin.bottom);
    let y_scale = Array.from(document.getElementsByName("y_scale")).find(radio =>
	radio.checked).value;
    let yScalesIndependent = true;
    if (y_scale == 'scale_shared') {
	yScalesIndependent = false;
    }

    if (info.length < 1) {
	return;
    }
    
    let firstData = info[0].data;

    // We are very much assuming that all histograms will have the same x axis.
    const xValues = firstData.map( (d) => d['viralLoadLog']);
    const xScale = linearScale(xValues, width);
    const barWidth = width/(xValues.length);

    let allValues = [0];

    for (let item of info) {
        item.yScale = d3.scaleLinear().range([height,0]);
        let  maxPValues = item.data.map( (d) => {
            let sum = 0;
            for (let key of catagories) { sum += d[key]; }
            sum *= 1.1; /* Give headroom for "Infectious"/"Non-infectious" strings. Tweak if any relevant sizes change. */
            return sum;
        });
	allValues = allValues.concat(maxPValues);

	if (yScalesIndependent) {
	    // Using a different y axis scaling for each histogram.
	    item.yScale.domain( d3.extent(maxPValues.concat([0])) );
	}
    }
    if (!yScalesIndependent) {
	for (let item of info) {
	    item.yScale.domain( d3.extent(allValues));
	}
    }
      
   // Show regions of viral load non-ifectivity/infectivity
    let regiongroup = box.selectAll("g.regiongroup").data([info[0]]).join("g")
	.classed("regiongroup", true)
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    let regiong = regiongroup.selectAll("g.i_region")
        .data(d => prepareInfectivityRegions(d))
        .join("g")
        .classed("i_region", true);
    regiong.selectAll("rect.region")
        .data(d => [d])
        .join("rect")
        .classed("region", true)
        .attr("y", 0)
        .attr("height", height)
        .attr("x", d => xScale(d.min - 0.5))
        .attr("width", d => xScale((d.max - d.min) + 0.5))
        .style("fill", d => d.color);
    regiong.selectAll("text.i_label")
        .data(d => [d])
        .join("text")
        .classed("i_label", true)
        .text(d => d.title)
	.style('fill', "#b8b8b8")
	.attr("text-anchor", "end")
	.attr("transform", d =>`rotate(-90 ${20+xScale(d.min - 0.5)} 30)`)
        .attr("y", "30")
        .attr("x", (d) => 20+xScale(d.min - 0.5));
    regiong.selectAll("polygon.triangle")
	.data(d => [d])
	.join("polygon")
	.classed("triangle", true)
	.attr("points", d => `${xScale(d.min-0.5)+8} 28 ${xScale(d.min-0.5)+18} 22 ${xScale(d.min-0.5)+8} 16`)
	.style("fill", "#dbdbdb");
                             
    let group = box.selectAll("g.histgroup").data(info).join("g")
        .classed("histgroup", true)
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    //Adds in the X axis with ticks
    let xAxis = group.selectAll("g.x-axis").data(d => [d]).join("g")
        .classed("x-axis", true)
        .attr("transform", `translate(0, ${height})`);
    d3.axisBottom(xScale)
        .tickValues([0, 3, 6, 9, 12])
        .tickFormat('')(xAxis);
    xAxis.selectAll(".tick").selectAll("foreignObject").data(d => [d]).join("svg:foreignObject")
            .attr("width","2em")
            .attr("height","2em")
            .attr("x", "-1em")
            .attr("y", "0.5em")
        .selectAll("div.exponentlabel").data(d => [d]).join("xhtml:div")
            .classed("exponentlabel", true)
            .html(function(n) {return `10<sup>${n}</sup>`;});

    // Add X axis label:
    group.selectAll("text.xlabel").data(["Viral load (copies of mRNA/mL)"]).join("text")
        .classed("xlabel", true)
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", height + margin.top + 24)
        .text(d => d);

    // Y axis with no ticks
    group.selectAll("g.yaxis").data(d => [d]).join("g")
	.classed("yaxis", true)
        .each(function(d, i) {
	    d3.select(this).call(d3.axisLeft(d.yScale).ticks(0) )
	});

    group.selectAll("text.ylabel")
	.data(d => [d])
        .join("text")
        .classed("ylabel", true)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left/2)
        .attr("x", -height/2)
        .text(d => "Probability Density");

    // Create a g element for each series
    /* We can make there be transitions here, by passing functions to join(). See
        https://observablehq.com/@d3/selection-join */
    const seriesGroupSelection = group
        .selectAll('g.series')
          .data(d => prepareDataForStackedHistogram(d, catagories), d => d.key)
          .join(
              enter => enter.append('g')
                .classed('series', true)
	        .style('fill', "#ffffff00")
	        .style('stroke-width', '2')
                .style('stroke', (d) => d.color)
        ); 

    // For each series create a rect element for each viralLoadLog
    const rectSelection = seriesGroupSelection.selectAll('line')
          .data((d) => traceUpperEdge(d, xScale, barWidth))
          .join("line")
	  .attr('x1', d => d.x1)
	  .attr('x2', d => d.x2)
	  .attr('y1', d => d.y1)
	  .attr('y2', d => d.y2);
/*
    // Show calculation of "sensitivity" (according to infectivity)    
    div.selectAll("p.sensitivity").data(d => d.distributionsWithSensitivityCalc)
        .join("p")
        .classed("sensitivity", true)
        .html(d => markupForSensitivity(d));
  */
}

function traceUpperEdge(data, xScale, barWidth) {
    let lines = [];
    let prevY = null;
    data.forEach( bar => {
	let x = xScale(bar.data.viralLoadLog-0.5);
	let width = barWidth;
	let y = bar[1];
	// From (x, prevY) to (x, y)
	if (prevY != null) {
	    lines.push({"x1":x, "x2":x, "y1":prevY, "y2":y});
	}
	// From (x, y) to (x+width, y)
	lines.push({"x1":x, "x2":x+width, "y1":y, "y2":y});
	prevY = y;
    });
    return lines;
}

function markupForSensitivity(d) {
    let ic = d.infectiousCount;
    let pc = d.truePositiveCount;
    let pr = Math.round(100*d.sensitivity);
    return `${ic} infectious people,<br>${pc} of whom are antigen-positive<br><b>= ${pr}% sensitivity</b>`;
}

function displayGroupRadioButtons(info) {
    console.log("Doing displayGroupRadioButtons");
    let box = d3.select("#group_radio");
    console.log("Box:", box);
    console.log("Data: ", info);
    let span = box.selectAll("span")
	.data(info)
	.join("span")
    	.classed("first_radio", (d,i) => { return (i == 0); });
    span.selectAll("input")
	.data(d => [d])
	.join("input")
	.attr("type", "radio")
	.attr("id", d => d.label)
	.attr("name", "group_for_performance");
    span.selectAll("label")
	.data(d => [d])
	.join("label")
	.attr("for", d => d.label)
	.text(d => d.label);
    box.select(`span.first_radio input`)
    	.property("checked", true);
}

export function displayCheckboxes(subdivisions) {
    let box = d3.select("#checkboxes");

    if (!subdivisions) {
	subdivisions = [];
    }
    if (subdivisions.length < 2) {
	subdivisions = [];
    }
    let div = box.selectAll("div").data(subdivisions).join(
	enter => enter.append("div"),
    );
    div.selectAll("input").data(d => [d]).join("input")
        .attr("id", d => d.tag)
        .attr("type", "checkbox")
        .property("checked", d => d.onByDefault)
        .on('change', function() {
	    updateQuery();
	});
    div.selectAll("label").data(d => [d]).join("label")
        .text(d => d.descr)
        .attr("for", d => d.tag);
}

doQuery();
