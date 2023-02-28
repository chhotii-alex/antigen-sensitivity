
import * as d3 from "https://cdn.skypack.dev/pin/d3@v7.6.1-1Q0NZ0WZnbYeSjDusJT3/mode=imports,min/optimized/d3.js"
//import * as d3 from "https://cdn.skypack.dev/d3@7.6";

import { urlPrefix } from "./server_url.js";

function URLforEndpoint(endpointName) {
    return `${urlPrefix}/api/${endpointName}`;
}

function addAlpha(color, alpha) {
    const re = /rgb\((\d+),(\d+),(\d+)\)/;
    const found = color.match(re);
    if (!found) {
	throw new Error("Color specification does not match pattern.");
    }
    let r = found[1];
    let g = found[2];
    let b = found[3];
    return `rgba(${r},${g},${b},${alpha})`;
}   

function expo(x, places=1) {
    return Number.parseFloat(x).toExponential(places);
}

function formatPValue(p) {
    let s = expo(p);
    const r = /(\d\.\d)e([+-]\d+)/
    const match = s.match(r);
    if (!match) return "";
    return `(<em>p</em>=${match[1]}x10<sup>${match[2]}</sup>)`;
}

function createCheckbox(id, displayName, parentNode, labelClass, checked=false) {
    let checky = document.createElement("input");
    checky.setAttribute("type", "checkbox");
    checky.setAttribute("id", id);
    checky.setAttribute("value", id);
    checky.setAttribute("name", id);
    checky.setAttribute("class", labelClass);
    if (checked) {
	checky.setAttribute("checked", "checked");
    }
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
    let div = document.getElementById("select_var");
    for (let item of options) {
	let onByDefault = false;
	if (item.displayName == "Presentation" || item.displayName.toLowerCase() == "presumed variant") {
	    onByDefault = true;
	}
	let subdiv = document.createElement("div");
	div.appendChild(subdiv);
	subdiv.className = "group_variable_div";
	variables[item.id] = [];
	let checky = createCheckbox(item.id, item.displayName, subdiv, "variablename", onByDefault);
	checky.addEventListener('click', updateVariables);
	let splits = item.splits;
	for (let subItem of splits) {
	    variables[item.id].push(subItem.value);
	    variableValues[subItem.value] = item.id;
	    checky = createCheckbox(subItem.value, subItem.valueDisplayName, subdiv, "valuename", onByDefault);
	    checky.addEventListener('click', updateVariables);
	}
    }
    doQuery();
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
    let randomElement = options[Math.floor(Math.random() * options.length)];
    let select = document.getElementById("antigenTest");
    for (let item of options) {
        let id = item.id;
        let label = item.displayName;
        let opt = document.createElement("option");
        opt.value = id;
        opt.innerHTML = label;
        select.add(opt);
	assayOptions[id] = item;
    }
    select.value = randomElement.id;
    if (gData) {
	gData.assay = randomElement.id;
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
    }
    displayTestPerformance();
}

document.getElementById("antigenTest").onchange = updateAntigenTestSelection;

document.getElementById("lod_slider").oninput = function() {
    updateLOD(this.value);
}

function isAntigenParamSet() {
    if (gData.assay != null && gData.assay != "none") {
	return true;
    }
    if (gData.lod != null && gData.lod >= 0) {
	return true;
    }
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
    let coef = assayOptions[assay].coef;
    let intercept = assayOptions[assay].intercept;
    for (let pop of gData) {
	pop.catagories["negatives"] = "Antigen Negatives";
	pop.catagories["positives"] = "Antigen Positives";
	for (let bin of pop.data) {
        let p = 1/(1 + Math.exp(-coef * bin.viralLoadLog - intercept))
        bin["positives"] = p*bin["count"];
        //bin["positives"] = Math.round(p*bin["count"]);
        bin["negatives"] = bin["count"] - bin["positives"];
	}
    }
    applyInfectivityThreshold(gData, gInfectivityThreshold);
    let assayName = assayOptions[assay].displayName;
    document.getElementById("test_description").innerHTML = assayName;
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
    applyInfectivityThreshold(gData, gInfectivityThreshold);
}

function displayAntigenTestHistogram() {
    let group = gData.find(pop => pop.label == gData.selectedGroup);
    //displayData([group] , "antiperf", ["positives", "negatives"]);
    displayData([group] , "antiperf", ["negatives", "positives"]);
    displayAccuracyCalc(group, gData.length == 1);
}

function displayAccuracyCalc(group, onlyGroup) {
    if (!d3) return;
    let box = d3.select(".performance_commentary");
    if (!group) {
	box.selectAll("span")
	    .data([])
	    .join("span");
	return;
    }
    let color = group.colors.negatives;
    let result = " ";
    let specifier = '';
    if (onlyGroup) {
	specifier = ' all ';
    }
    if (group.sensitivity != null && group.specificity != null) {
        result = `In ${specifier} <span class="ag_test_group" style="color: ${color}">${group.label.trim()}</span>,
          the <span class="senspec_label">sensitivity</span> for
          detecting contagiousness is <span class="senspec_value">${group.sensitivity.toFixed(2)}
          </span> and the <span class="senspec_label">specificity</span> is
          <span class="senspec_value">${group.specificity.toFixed(2)}</span>.`
    }
    box.selectAll("span")
	.data([result])
	.join("span")
	.html(d => d);
}

function setHidden(id, hidden) {
    let node = document.getElementById(id);
    if (hidden) {
	node.classList.add("hidden_style");
    }
    else {
	node.classList.remove("hidden_style");
    }
}

if (minDateAvail()) {
    document.getElementById("minDate").onchange = updateQuery;
}
if (maxDateAvail()) {
    document.getElementById("maxDate").onchange = updateQuery;
}

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

fetch(URLforEndpoint("variables"))
        .then(response => response.json())
        .then(data => loadVariableOptions(data));

fetch(URLforEndpoint("assays"))
        .then(response => response.json())
        .then(data => loadAssayOptions(data));


export function doQuery(minDate=null, maxDate=null) {
    setHidden("loading", false);
    let url = URLforEndpoint("data");
    url += '/viralloads?';

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
    applyInfectivityThreshold(gData, gInfectivityThreshold);    
    if (gData) {
        presentData();
    }
}

/*
  TODO: fix that code assumes that gData is an Array.
  It should be an object containing an array, matching
  what the API returns.
  */
function loadData(data) {
    let oldData = gData;
    gData = data.populations;
    gData.tooManyQueries = data.tooManyQueries;
    gData.splitDescription = data.splitDescription;
    if (oldData) {
	gData.assay = oldData.assay;
	gData.lod = oldData.lod;
    }
    else {
	gData.assay = document.getElementById("antigenTest").value;
    }
    if (gData.find( e => e.label == oldData.selectedGroup)) {
	gData.selectedGroup = oldData.selectedGroup;
    }
    else {
	let firstPossibleGroup = gData.find(d => shouldShowHistogram(d));
	if (firstPossibleGroup) {
	    gData.selectedGroup = firstPossibleGroup.label;
	}
    }
    setHidden("loading", true);
    presentData();
}

export function presentData() {
    if (gData) {
	let msg = document.getElementById("too_many_groups");
	if (gData.tooManyQueries) {
	    msg.classList.remove("hidden_style");
	}
	else {	    
	    msg.classList.add("hidden_style");
	}
	groupHistogram();
	displayComparisons(gData);
	displayCommentary(gData);
	displayGroupRadioButtons(gData);
	displayTestPerformance();
	onresize = (event) => {presentData()};
    }
}

function groupHistogram() {
    displayData(gData, "displaybox", ["count"], true, true);
}

function getLOD() {
    return gData.lod;
}

function mouseEnterAction() {
    return function (event) {
	highlightGroup(event.target);
    };
}

function mouseLeaveAction() {
    return function (event) {
	unhighlightGroup(event.target);
    };
}

export function highlightGroup(target) {
    let name = target.getAttribute("app_group_name");
    if (gData.highlightedGroupLabel != name) {
	gData.highlightedGroupLabel = name;
	groupHistogram();
    }
}

export function unhighlightGroup(target) {
    let name = target.getAttribute("app_group_name");
    if (gData.highlightedGroupLabel == name) {
	gData.highlightedGroupLabel = null;
	groupHistogram();
    }
}

function displayCommentary(items) {
    if (!d3) return;
    let box = d3.select("#commentary");
    let p = box.selectAll("p.groupcomment")
	.data(items)
	.join("p")
	.classed("groupcomment", true)
	.attr("app_group_name", (d, i) => d.label)
	.on("mouseenter", mouseEnterAction())
	.on("mouseleave", mouseLeaveAction());
    p.selectAll("text.comm_part1")
	.data([0])
	.join("text")
	.classed("comm_part1", true)
	.text("The mean viral load across ");
    let span = p.selectAll("span.comm_part2")
	.data(d => [d])
	.join("span")
	.classed("comm_part2", true)
	.style("color", d => d.colors.negatives);
    span.selectAll("text")
	.data(d => [d])
	.join("text")
	.text(d => `${numberFormatter.format(d.count)} ${d.label.trim()}`);
    p.selectAll("text.comm_part3")
	.data([0])
	.join("text")
	.classed("comm_part3", true)
	.text(" was ");
    span = p.selectAll("span.comm_part4")
	.data(d => [d])
	.join("span")
	.classed("comm_part4", true)
	.style("color", d => d.colors.negatives);
    span.selectAll("text")
	.data(d => [d])
	.join("text")
	.text(d => `${numberFormatter.format(d.mean)} copies/mL`);
    p.selectAll("text.comm_period")
	.data([0])
	.join("text")
	.classed("comm_period", true)
	.text(".");
}

function applyInfectivityThreshold(data, infectivityThreshold) {
    for (let pop of data) {
        pop.tp = 0;
	pop.fn = 0;
	pop.fp = 0;
	pop.tn = 0;
        for (let bin of pop.data) {
            if (bin.viralLoadLog >= infectivityThreshold) {
                pop.tp += bin.positives;
		pop.fn += bin.negatives;
            }
	    else {
		pop.tn += bin.negatives;
		pop.fp += bin.positives;
	    }
        }
        if ((pop.tp + pop.fn) > 0) {
            pop.sensitivity = pop.tp/(pop.tp+pop.fn);
	}
	else {
	    pop.sensitivity = null;
	}
	if ((pop.tn + pop.fp) > 0) {
	    pop.specificity = pop.tn/(pop.tn+pop.fp);
	}
	else {
	    pop.specificity = null;
	}
    }
}

const margin = {top: 10, right: 0, bottom: 60, left: 20};

function linearScale(values, width) {
    if (!d3) return;
    let extent = d3.extent(values);
//    extent[0] -= 0.5;
//    extent[1] += 0.5;
    return d3.scaleLinear()
        .domain(extent)
        .range([0, width]);
}

function prepareDataForStackedHistogram(info, catagories) {
    if (!d3) return;
    let stack = d3.stack().keys(catagories);
    let stackedData = stack(info.data);
    stackedData.forEach( (f) => {
        f.color = info.colors[f.key];
        f.label = info.catagories[f.key];
	f.groupLabel = info.label;
        f.forEach( (a) => {
            a[0] = info.yScale(a[0]);
            a[1] = info.yScale(a[1]);
        });
    });
    return stackedData;
}

let numberFormatter = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 3 });

function prepareInfectivityRegions(d) {
    let result = [
        {"title" : "", "color" : "#dbdbdb", "min" : 0, "max" : gInfectivityThreshold },
        {"title" : "CONTAGIOUS", "color" : "white", "min" : gInfectivityThreshold, "max" : 12},
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

function linspace(start, stop, n) {
    if (n < 2) {
	return [start, stop];
    }
    if (stop <= start) {
	return [stop, start];
    }
    let step = (stop-start)/(n-1);
    let a = [];
    for (let x = start, j = 0; j < n; ++j, x += step) {
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
    return formatShortPValue(num);
}

function formatShortPValue(num) {
    if (num >= 0.01) {
	return num.toFixed(2);
    }
    else {
	return expo(num, 0);
    }
}

const substitutions = {
    "early variant" : "early",
    "in inpatient settings" : "inpatient",
    "in outpatients settings" : "outpatient",
    "in the emergency department" : "ED",
    "at other institutions" : "other inst",
    "patients" : "",
    "from areass with median household income" : "",
    " to " : "-",
    ",000" : "K",
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
    "sickle cell & thalassemia" : "sickle",
    "Mental health conditions" : "mental",
    "Substance abuse" : "drugs",
    "DEXAMETHASONE": "DEXA",
    "dexamethasone": "dexa",
};

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

function maxLabelLen(info) {
    let maxLen = 0;
    for (let i = 0; i < info.length; ++i) {
	if (info[i].label.length > maxLen) {
	    maxLen = info[i].label.length;
	}
    }
    return maxLen+1;
}

function pyramidLegend(flag) {
    let element = document.getElementById("plegend");
    let container = element.parentNode;
    if (!flag) {
	container.style.display = "none";
    }
    else {
	container.style.display = "flex";
    }
}

function drawPyramidLegend(values) {
    if (!d3) return;
    let element = document.getElementById("plegend");
    let container = element.parentNode;
    const height = 25;
    const bandWidth = 2;
    let box = d3.select("#plegend");
    box.selectAll('rect')
	.data(values)
	.join('rect')
	.attr('x', (d,i) => `${i*bandWidth}`)
	.attr('y', 20)
	.attr('width', bandWidth+1)
	.attr('height', height)
	.attr('fill', d => colorForPValue(d));
}	

function displayPyramid(info) {
    if (!d3) return;
    let allPValues = new Set();
    function observePValue(p) {
	allPValues.add(p);
	return p;
    }
    const baseFontSize = 6.5;
    let labelFontSize = 10;
    const fontWidthRatio = 0.476;
    let pyramidElem = document.getElementById("pyramid");
    let container = pyramidElem.parentNode;
    if (info.length < 2) {
	container.style.display = "none";
    }
    else {
	container.style.display = "block";
    }
    pyramidLegend(info.length > 2);
    const rectSize = 25;
    const maxGroups = 8; //this is determined by the back end
    const innerMargin = 10;
    const outerMargin = 0;
    const totalWidth = rectSize*(maxGroups-1);
    const labelWidth = totalWidth-innerMargin;
    let maxstr = (totalWidth - innerMargin)/(labelFontSize*fontWidthRatio);
    if (maxstr < 15) {
	maxstr = 15;
	labelFontSize = (totalWidth - innerMargin)/(maxstr*fontWidthRatio);
    }
    let box = d3.select("#pyramid");
    let w = container.getBoundingClientRect().width;
    const scale = w/(totalWidth+labelWidth+innerMargin+2*outerMargin);
    function x(i) {
	return scale*(outerMargin+totalWidth-(i+1)*rectSize);
    }
    function y(i) {
	return scale*(labelWidth+rectSize*(info.length-1)+innerMargin+outerMargin-(i)*rectSize);
    }
    
    let row = box.selectAll('g.pyramidrow')
        .data(range(1, info.length))
	.join('g')
	.classed('pyramidrow', true);
    let label1 = box.selectAll('text.row_labels')
	.data(range(1, info.length))
	.join('text')
	.classed('row_labels', true)
	.text(d => shortLabelAtIndex(info, d, maxstr))
	.attr('x', scale*(outerMargin+totalWidth+innerMargin))
	.attr('y', d => scale*(outerMargin+labelWidth+innerMargin+(info.length-(d+0.25))*rectSize))
	.attr('font-size', `${labelFontSize*scale}px`);
    let label2 = box.selectAll('text.col_labels')
	.data(range(0, info.length-1))
	.join('text')
	.classed('col_labels', true)
	.text(d => shortLabelAtIndex(info, d, maxstr))
	.attr('x', d => scale*(totalWidth-(d+0.25)*rectSize+outerMargin))
	.attr('y', scale*(outerMargin+labelWidth))
	.attr("text-anchor", "start")
    	.attr("transform", d => `rotate(-90 ${scale*(totalWidth-(d+0.25)*rectSize+outerMargin)} ${scale*(outerMargin+labelWidth)})`)
	.attr('font-size', `${labelFontSize*scale}px`);
    let square = row.selectAll('rect')
	.data(d => range(0, d).map(index => [d,index]))
	.join('rect')
        .attr('x', d => x(d[1]))
        .attr('y', d => y(d[0]))
        .attr('width', scale*rectSize)
        .attr('height', scale*rectSize)
	.attr('dummy', d=> observePValue(retrievePValue(info, d[0], d[1])))
	.style('fill', d => colorForPValue(retrievePValue(info, d[0], d[1])));
    let pvalues = row.selectAll('text')
	.data(d => range(0, d).map(index => [d,index]))
	.join('text')
        .attr('x', d => x(d[1]-0.5))
        .attr('y', d => y(d[0]-0.5))
	.attr("text-anchor", "middle")
	.attr('fill', 'white')
	.attr('font-size', `${baseFontSize*scale}px`)
	.text(d => `${shortPValue(info, d[0], d[1])}`); 
}

function capLength(arr, maxLen) {
    if (arr.length <= maxLen) {
	return arr;
    }
    let r = arr.slice(1);
    let n = Math.ceil(r.length / maxLen);
    let result = [];
    for (let j = r.length-1; j >= 0; j -= n) {
	result.unshift(r[j]);
    }
    result.unshift(arr[0]);
    return result;
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
    if (!d3) return;
    let text = "";
    if (info.length > 1) {
	let conclusion = "are similar";
	if (hasSignificantDifferences(info, 0.00125)) {
	    conclusion = "vary";
	}
	let preposition = "between";
	if (info.length > 2) {
	    preposition = "across";
	}
	if (info.splitDescription) {
	    text = `Viral loads ${info.splitDescription}`;
	}
	else {
	    let num = info.length;
	    text = `Viral loads ${conclusion} ${preposition} these ${num} groups`;
	}
    }
    else {
	text = "Real-world viral loads, 2020&ndash;present";
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
        .html(d => "<strong>Statistics.</strong> Viral loads for ");
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
    conclusiontext.selectAll("span.period")
	.data(d => [d])
	.join("span")
	.classed("period", true)
	.text(".");
}

function shouldShowHistogram(pop) {
    if (!pop) return false;
    return pop.count >= 60;
}

/* Draws histograms */
function displayData(info, widgetID, catagories=["count"], highlightOne=false, joy=false) {
    if (!d3) return;
    let highlightedGroupLabel = info["highlightedGroupLabel"];
    let hasHighlight = highlightOne && (highlightedGroupLabel != null);
    function shouldAddMoreAlpha(group) {
	return hasHighlight && (group != highlightedGroupLabel);
    }
    function adjustedColor(d, isFill) {
	let color = d.color;
	if (typeof(color) == 'object') {
	    if (isFill) {
		color = color[1];
	    }
	    else {
		color =  color[0];
	    }
	}
	if (shouldAddMoreAlpha(d.groupLabel)) {
	    return addAlpha(color, 0.04);
	}
	else if (joy) {
	    return color;
	}
	else {
	    if (isFill) {
		return addAlpha(color, 0.4)
	    }
	    else {
		return color;
	    }
	}
    }
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

    let histogramWorthyInfo = info.filter(d => shouldShowHistogram(d));
    if (histogramWorthyInfo.length < 1) {
	box.selectAll("g").data([]).join("g");
	return;
    }

    let firstData = info[0].data;

    // We are very much assuming that all histograms will have the same x axis.
    const xValues = firstData.map( (d) => d['viralLoadLogMax']);
    xValues.push(firstData[0].viralLoadLogMin - 1);
    const xScale = linearScale(xValues, width);
    const barWidth = xScale(firstData[0].viralLoadLogMax) - xScale(firstData[0].viralLoadLogMin);

    let allValues = [0];

    let stagger = 0;
    let heightAdjustment = 1.0;
    if (joy && (histogramWorthyInfo.length > 1)) {
	heightAdjustment = 0.1 + 1/histogramWorthyInfo.length;
	if (heightAdjustment < 0.2) {
	    heightAdjustment = 0.2;
	}
	stagger = (1-heightAdjustment)*height/(histogramWorthyInfo.length-1);
    }
    for (let i = 0; i < histogramWorthyInfo.length; ++i) {
	let item = histogramWorthyInfo[i];
	let yIndex = histogramWorthyInfo.length-(i+1);
        item.yScale = d3.scaleLinear().range([height-(yIndex*stagger), height-(yIndex*stagger)-height*heightAdjustment]);
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
      
   // Show regions of viral load non-infectivity/infectivity
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
        .attr("x", d => xScale(d.min))
        .attr("width", d => xScale(d.max) - xScale(d.min))
        .style("fill", d => d.color);
    regiong.selectAll("text.i_label")
        .data(d => [d])
        .join("text")
        .classed("i_label", true)
        .text(d => d.title)
	.style('fill', "#b8b8b8")
	.attr("text-anchor", "end")
	.attr("transform", d =>`rotate(-90 ${20+xScale(d.min)} 30)`)
        .attr("y", "30")
        .attr("x", (d) => 20+xScale(d.min));
    regiong.selectAll("polygon.triangle")
	.data(d => [d])
	.join("polygon")
	.classed("triangle", true)
	.attr("points", d => `${xScale(d.min)+8} 28 ${xScale(d.min)+18} 22 ${xScale(d.min)+8} 16`)
	.style("fill", "#dbdbdb");
                             
    let group = box.selectAll("g.histgroup")
	.data(info.filter(d => shouldShowHistogram(d)))
	.join("g")
        .classed("histgroup", true)
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    box.selectAll("text.nodata")
	.data(info.filter(d => !shouldShowHistogram(d) && (d.label == highlightedGroupLabel)))
	.join("text")
	.classed("nodata", true)
	.text("Insufficient data to plot")
	.attr("text-anchor", "middle")
	.attr("x", `${xScale(5)}px`)
	.attr("y", `${(height/2)+margin.top}`);
    
    // Y axis with no ticks
    group.selectAll("line.yaxis")
	.data(d => [0])
	.join("line")
	.classed("yaxis", true)
	.attr("x1", `${xScale(0)}px`)
	.attr("x2", `${xScale(0)}px`)
	.attr("y1", 0)
	.attr("y2", height)
	.attr("stroke", "black");

    let ylabeldiv = group.selectAll("g.ylabeldiv")
	.data(d => [d])
	.join("g")
	.classed("ylabeldiv", true);

    ylabeldiv.selectAll("text.ylabel")
	.data(d => [d])
        .join("text")
        .classed("ylabel", true)
        .attr("text-anchor", "middle")
	.attr("x", `${xScale(-0.25)}`)
	.attr("y", `${height/2}`)    
        .attr("transform", `rotate(-90 ${xScale(-0.25)} ${height/2})`)
          .text(d => "Fraction of patients");

    // Create a g element for each series
    /*TODO:  We can make there be transitions here, by passing functions to join(). See
      https://observablehq.com/@d3/selection-join */
    /*
      TODO: See: https://gist.github.com/mbostock/4341954#file-faithful-json
      for ideas on using datum, curve, and path to simplify this code
      See http://using-d3js.com/05_04_curves.html
      for path smoothing options
      */
    const seriesGroupSelection = group
        .selectAll('g.series')
         .data(d => prepareDataForStackedHistogram(d, catagories), d => d.key)
          .join("g")
          .classed('series', true)
	  .style('fill', (d, i) => adjustedColor(d, true))
	  .style('stroke-width', '4')
          .style('stroke', (d, i) => adjustedColor(d, false));

    // For each series create a rect element for each viralLoadLog
    const rectSelection = seriesGroupSelection.selectAll('rect.histbar')
	  .data((d) => d, d => d.data.viralLoadLog)
	  .join("rect")
	  .classed("histbar", true)
    	  .attr('width', (barWidth+1))
	  .attr('x', d => xScale(d.data.viralLoadLogMin))
	  .attr('y', d => d[1])
	  .style('stroke', 'none')
	  .attr('height', d => d[0] - d[1]);

    // Outline upper edge
    const lineSelection = seriesGroupSelection.selectAll('line')
          .data((d) => traceUpperEdge(d, xScale, barWidth))
          .join("line")
	  .attr('x1', d => d.x1)
	  .attr('x2', d => d.x2)
	  .attr('y1', d => d.y1)
	  .attr('y2', d => d.y2);

    //Adds in the X axis with ticks
    let xAxis = group.selectAll("g.x-axis").data(d => [d]).join("g")
        .classed("x-axis", true)
        .attr("transform", `translate(0, ${height})`);
    xAxis.selectAll("line")
	.data([0])
	.join("line")
	.attr("x1", xScale(0))
	.attr("x2", xScale(12))
	.attr("y1", 0)
	.attr("y2", 0)
	.attr("stroke", "black");
    let tickBox = xAxis.selectAll("g.tick")
	.data([0, 3, 6, 9, 12])
	.join("g")
	.classed("tick", true)
	.attr("transform", d => `translate(${xScale(d)},0)`);
    tickBox.selectAll("line")
	.data(d => [d])
	.join("line")
	.attr("x1", 0)
	.attr("x2", 0)
	.attr("y1", 0)
	.attr("y2", 5)
	.attr("stroke", "black");
    tickBox.selectAll("foreignObject")
	.data(d => [d])
	.join("svg:foreignObject")
	.attr("width", "2em")
	.attr("height", "2em")
	.attr("x", "-1em")
	.attr("y", "0.5em")
    .selectAll("div.exponentlabel")
	.data(d => [d])
	.join("xhtml:div")
	.classed("exponentlabel", true)
	.html(n => `10<sup>${n}</sup>`);

    // Add X axis label:
    group.selectAll("text.xlabel").data(["Viral load (copies of mRNA/mL)"]).join("text")
        .classed("xlabel", true)
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", height + margin.top + 44)
        .text(d => d);

}

function traceUpperEdge(data, xScale, barWidth) {
    let lines = [];
    let prevY = null;
    data.forEach( bar => {
	let x = xScale(bar.data.viralLoadLogMin);
	if (x < xScale(0)) {
	    x = xScale(0);
	}
	let width = xScale(bar.data.viralLoadLogMax) - x;
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

function updateSelectedGroup(arg) {
    gData.selectedGroup = arg;
}

function displayGroupRadioButtons(info) {
    if (!d3) return;
    if (info.length < 2) {
	info = [];
    }
    let box = d3.select("#group_radio");
    let span = box.selectAll("span")
	.data(info.filter(d => shouldShowHistogram(d)))
	.join("span")
    	.classed("first_radio", d => { return (d.label == gData.selectedGroup); });
    span.selectAll("input")
	.data(d => [d])
	.join("input")
	.attr("type", "radio")
	.attr("id", d => d.label)
	.attr("name", "group_for_performance")
	.on('click', function(e) {
	    updateSelectedGroup(e.target.id);
	    displayAntigenTestHistogram();
	});;
    span.selectAll("label.radio_button_label")
	.data(d => [d])
	.join("label")
	.classed("radio_button_label", true)
	.attr("for", d => d.label)
	.text(d => d.label);
    span.selectAll("br.splitradio")
	.data(d => [d])
	.join("br")
	.classed("splitradio", true);
    box.select(`span.first_radio input`)
    	.property("checked", true);
}

//doQuery();