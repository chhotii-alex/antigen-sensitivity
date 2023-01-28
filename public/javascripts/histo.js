/* 
    TODOs:

    The word "Infectious" tends to be obscured by bar(s) on the histogram.
*/

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
    return `<em>p</em>=${match[1]}x10<sup>${match[2]}</sup>`;
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
	variables[item.id] = [];
	let checky = createCheckbox(item.id, item.displayName, div, "variablename");
	checky.addEventListener('click', updateVariables);
	let splits = item.splits;
	for (let subItem of splits) {
	    variables[item.id].push(subItem.value);
	    variableValues[subItem.value] = item.id;
	    checky = createCheckbox(subItem.value, subItem.valueDisplayName, div, "valuename");
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

function loadAssayOptions(data) {
    let options = data.items;
    let select = document.getElementById("antigenTest");
    for (let item of options) {
        let id = item.id;
        let label = item.displayName;
        let opt = document.createElement("option");
        opt.value = id;
        opt.text = label;
        select.add(opt);
    }
}

/* Called directly when a checkbox is clicked */
export function updateQuery() {
    let assay = document.getElementById("antigenTest").value;
    let minDate = null;
    let maxDate = null;
    if (minDateAvail()) {
      minDate = document.getElementById("minDate").value;
    }
    if (maxDateAvail()) {
      maxDate = document.getElementById("maxDate").value;
    }
    doQuery(assay, minDate, maxDate);
  }

  function minDateAvail() {
    return document.getElementById("minDate") != null;
  }

  function maxDateAvail() {
    return document.getElementById("maxDate") != null;
  }

  document.getElementById("antigenTest").onchange = updateQuery;
  if (minDateAvail()) {
    document.getElementById("minDate").onchange = updateQuery;
  }
  if (maxDateAvail()) {
    document.getElementById("maxDate").onchange = updateQuery;
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


export function doQuery(assay=null, minDate=null, maxDate=null) {
    if (assay == "none") {
        assay = null;
    }
    let url = 'api/data/viralloads?';

    for (let variable in variables) {
	for (let value of variables[variable]) {
	    if (document.getElementById(value).checked) {
		url += `${variable}[]=${value}&`;
	    }
	}
    }
    
    if (assay) {
        url += `assay=${assay}&`;
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

let gData = null;
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
	displayData(gData, d3.select("#displaybox"));
	displayComparisons(gData);
	displayCommentary(gData);
    }
}

function getLOD() {
    return 5; //TODO
}

function displayCommentary(items) {
    let text = "Data is from ";
    for (let i = 0; i < items.length; ++i) {
	let item = items[i];
	if (i > 0) {
	    if (items.length > 2) {
		text += ', ';
	    }
	    if ((i+1) == items.length) {
		text += " and ";
	    }
	}
	text += `<br/>${item.count} ${item.label.trim()}`;
    }
    text += " from the Beth Israel Deaconess Medical Center.";
    text += " A test with an ";
    text += `<span class="lodisred">LOD of 10<sup>${getLOD()}</sup></span> `;
    text += " would have a sensitivity of ";
    document.getElementById("commentary").innerHTML = text;
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

function prepareDataForStackedHistogram(info) {
    let stack = d3.stack().keys(Object.keys(info.catagories));
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

function componseAnnotationOnMean(d) {
    let value = d.mean;
    if (!value) {
        return "";
    }
    value = parseFloat(value);
    let str = numberFormatter.format(value);

    return `mean viral load: ${str} copies/mL`;
}

function prepareInfectivityRegions(d) {
    let result = [
        {"title" : "Non-contagious", "color" : "#f7f6f2", "min" : 0, "max" : d.infectivityThreshold },
        {"title" : "Contagious", "color" : "white", "min" : d.infectivityThreshold, "max" : 12},
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
    if (numberOfComparisons(info) < 4) {
	displayTextComparisons(info);
	displayPyramid([]);
    }
    else {
	displayTextComparisons([]);
	displayPyramid(info);
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
    return maxLen;
}

function displayPyramid(info) {
    let container = document.getElementById("pyramid_container");
    if (info.length < 2) {
	container.style.display = "none";
    }
    else {
	container.style.display = "block";
    }
    let pyramidElem = document.getElementById("pyramid");
    const rectSize = 25;
    const totalWidth = rectSize*(info.length-1);
    const topMargin = maxLabelLen(info)*5.6;
    const leftMargin = 0;
    let box = d3.select("#pyramid");
    let w = pyramidElem.getBoundingClientRect().width;
    const scale = w/(totalWidth+2*topMargin);
    function x(i) {
	return scale*(0+totalWidth-(i+1)*rectSize);
    }
    function y(i) {
	return scale*(topMargin+totalWidth-i*rectSize);
    }
    box.attr('transform-origin', '50% 50%');
    box.attr('transform', "rotate(-45)");
    let row = box.selectAll('g.pyramidrow')
        .data(range(1, info.length))
	.join('g')
	.classed('pyramidrow', true);
    let label1 = box.selectAll('text.row_labels')
	.data(range(1, info.length))
	.join('text')
	.classed('row_labels', true)
	.text(d => labelAtIndex(info, d))
	.attr('x', scale*(leftMargin+totalWidth+10))
	.attr('y', d => scale*(topMargin+(info.length-d)*rectSize-10))
	.attr('font-size', `${10*scale}px`);
    let label2 = box.selectAll('text.col_labels')
	.data(range(0, info.length-1))
	.join('text')
	.classed('col_labels', true)
	.text(d => labelAtIndex(info, d))
	.attr('x', d => scale*(totalWidth-(d+0.5)*rectSize))
	.attr('y', scale*(topMargin-10))
	.attr("text-anchor", "end")
    	.attr("transform", d => `rotate(90 ${scale*(totalWidth-(d+0.5)*rectSize)} ${scale*(topMargin-10)})`)
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
	.attr('font-size', `${6.8*scale}px`)
	.text(d => `${shortPValue(info, d[0], d[1])}`); 
}

function displayTextComparisons(info) {
    let box = d3.select("#comparisons");
    let comparisons = [];
    for (let i = 1; i < info.length; ++i) {
	for (let j = 0; j < i; ++j) {
	    let d = {};
	    d.pvalue = info[i].comparisons[j];
	    if (d.pvalue == null) {
		continue;
            }
	    d.label1 = info[i].label;
	    d.label2 = info[j].label;
	    d.conclusion = " is similar to ";
	    if (d.pvalue < 0.05) {
		d.conclusion = " differs from ";
	    }
	    d.color1 = info[i].colors.negatives;
	    d.color2 = info[j].colors.negatives;
	    comparisons.push(d);
	}
    }
    console.log(comparisons);
    let conclusiontext = box.selectAll("div.conclusiontext")
        .data(comparisons)
        .join("div")
        .classed("conclusiontext", true);
    conclusiontext.selectAll("span.vl_prefix")
        .data(d => [d])
        .join("span")
        .classed("vl_prefix", true)
        .text(d => "Viral load for ");
    conclusiontext.selectAll("span.group1noun")
        .data(d => [d])
        .join("span")
        .classed("group1noun", true)
        .text(d =>  d.label1)
        .style('color', (d) => d.color1);
    conclusiontext.selectAll("span.conclusion")
        .data(d => [d])
        .join("span")
        .classed("conclusion", true)
        .text(d => d.conclusion);
    conclusiontext.selectAll("span.group2noun")
        .data(d => [d])
        .join("span")
        .classed("group2noun", true)
        .text(d =>  d.label2)
        .style('color', (d) => d.color2);
    conclusiontext.selectAll("span.pvalue")
        .data(d => [d])
        .join("span")
        .classed("pvalue", true)
        .html(d =>  formatPValue(d.pvalue));
}

function displayData(info, box) {
    let elem = document.getElementById("displaybox");
    let rect = elem.getBoundingClientRect();
    let width = rect.width - (margin.left + margin.right);
    let height = rect.height - (margin.top + margin.bottom);
    console.log(width, height);
    let y_scale = Array.from(document.getElementsByName("y_scale")).find(radio =>
	radio.checked).value;
    let yScalesIndependent = true;
    if (y_scale == 'scale_shared') {
	yScalesIndependent = false;
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
            for (let key of Object.keys(item.catagories)) { sum += d[key]; }
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
    regiong.selectAll("line.leftedge")
        .data(d => [d])
        .join("line")
        .classed("leftedge", true)
        .attr("x1", d => xScale(d.min - 0.5))
        .attr("y1", 0)
        .attr("x2", d => xScale(d.min - 0.5))
        .attr("y2", height)
        .attr("stroke", d => (d.min==0)?null:"black");
    regiong.selectAll("text.i_label")
        .data(d => [d])
        .join("text")
        .classed("i_label", true)
        .attr("y", "1em")
        .text(d => d.title)
        .attr("x", (d) => xScale(d.min));
                             
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
        .text(d => "Relative frequency");

    // Create a g element for each series
    /* We can make there be transitions here, by passing functions to join(). See
        https://observablehq.com/@d3/selection-join */
    const seriesGroupSelection = group
        .selectAll('g.series')
        .data(d => prepareDataForStackedHistogram(d), d => d.key)
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
