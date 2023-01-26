/* 
    TODOs:

    The word "Infectious" tends to be obscured by bar(s) on the histogram.
*/

import * as d3 from "https://cdn.skypack.dev/pin/d3@v7.6.1-1Q0NZ0WZnbYeSjDusJT3/mode=imports,min/optimized/d3.js"
//import * as d3 from "https://cdn.skypack.dev/d3@7.6";

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
    let box = d3.select("#displaybox");
    if (gData) {
	displayData(gData, box);
    }
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
const boxWidth = 530;
const boxHeight = 250;
const width = boxWidth - margin.left - margin.right;
const height = boxHeight - margin.top - margin.bottom;

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
        {"title" : "Non-infectious", "color" : "#f7f6f2", "min" : 0, "max" : d.infectivityThreshold },
        {"title" : "Infectious", "color" : "white", "min" : d.infectivityThreshold, "max" : 12},
    ];
    return result;
}

function displayData(info, box) { 
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
      
    /* It would make sense to use d => d.label as the key function for this data
        binding. But, I think, if we do that, we don't get re-use of the existing
        DOM elements, and I worry about the effects on performance in that case. Also,
        I want whiz-bang transitions, with the old bars mutating into the new bars,'
        for which we need to re-use the existing DOM elements?
    */
    let div = box.selectAll("div.top").data(info).join(
        enter => enter.append("div")
            .classed("top", true),
    );
    let svg = div.selectAll("svg.histogram").data(d => [d]).join("svg")
            .classed("histogram", true)
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);
    let group = svg.selectAll("g.histgroup").data(d => [d]).join("g")
        .classed("histgroup", true)
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Show regions of viral load non-ifectivity/infectivity
    let regiong = group.selectAll("g.i_region")
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
                             
    //Adds in the X axis with ticks
    let xAxis = group.selectAll("g.x-axis").data(d => [d]).join("g")
        .classed("x-axis", true)
        .attr("transform", `translate(0, ${height})`);
    d3.axisBottom(xScale)
        .tickValues([0, 4, 8, 12])
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
    group.selectAll("text.xlabel").data(["Viral load (copies/mL)"]).join("text")
        .classed("xlabel", true)
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", height + margin.top + 24)
        .text(d => d);        

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

    // Show calculation of "sensitivity" (according to infectivity)    
    div.selectAll("p.sensitivity").data(d => d.distributionsWithSensitivityCalc)
        .join("p")
        .classed("sensitivity", true)
        .html(d => markupForSensitivity(d));
  
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
