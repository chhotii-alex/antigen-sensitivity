/* 
    TODOs:

    The word "Infectious" tends to be obscured by bar(s) on the histogram.
*/

import * as d3 from "https://cdn.skypack.dev/d3@7";

export function doQuery(variable, assay, minDate=null, maxDate=null) {
    if (variable == "none") {
        variable = null;
    }
    if (assay == "none") {
        assay = null;
    }
    let url = 'api/data/viralloads?';
    if (variable) {
        url += `vars=${variable}&`;
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

function presentData() {
    applyInfectivityThreshold(gData, gInfectivityThreshold);
    let box = d3.select("#displaybox");
    displayData(gData, box);
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
    return total;
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

function prepareLegend(info) {
    let legend = [];
    let catagories = Object.keys(info.catagories);
    for (let cat of catagories) {
        if (info.catagories[cat]) {
            legend.push({"name" : info.catagories[cat], "color" : info.colors[cat]});
        }
    }
    return legend;
}

function prepareInfectivityRegions(d) {
    let result = [
        {"title" : "Non-infectious", "color" : "#f7f6f2", "min" : 0, "max" : d.infectivityThreshold },
        {"title" : "Infectious", "color" : "white", "min" : d.infectivityThreshold, "max" : 12},
    ];
    return result;
}

function displayData(info, box) { 
    let firstData = info[0].data;
    
    // We are very much assuming that all histograms will have the same x axis.
    const xValues = firstData.map( (d) => d['viralLoadLog']);
    const xScale = linearScale(xValues, width);
    const barWidth = width/(xValues.length); 

    // Using a different y axis scaling for each histogram.
    for (let item of info) {
        item.yScale = d3.scaleLinear().range([height,0]);
        let  maxPValues = item.data.map( (d) => {
            let sum = 0;
            for (let key of Object.keys(item.catagories)) { sum += d[key]; }
            sum *= 1.1; /* Give headroom for "Infectious"/"Non-infectious" strings. Tweak if any relevant sizes change. */
            return sum;
        });

        item.yScale.domain( d3.extent(maxPValues.concat([0])) );
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
    div.selectAll("h3.drawlabel").data(d => [d.label])
        .join("h3")
        .classed("drawlabel", true)
        .text(d => d);
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

    //Adds in the Y axis
    group.selectAll("g.yaxis").data(d => [d]).join("g")
        .classed("yaxis", true)
        .each(function(d, i) {
            d3.select(this).call( d3.axisLeft(d.yScale).ticks(3) )
        });
        
    // Y axis label:
    group.selectAll("text.ylabel").data(d => [d]).join("text")
        .classed("ylabel", true)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left/2)
        .attr("x", -height/2)
        .text(d => `${getTotal(d.data, Object.keys(d.catagories))} total patients`) ;   
          
    // Create a g element for each series
    /* We can make there be transitions here, by passing functions to join(). See
        https://observablehq.com/@d3/selection-join */
    const seriesGroupSelection = group
        .selectAll('g.series')
        .data(d => prepareDataForStackedHistogram(d), d => d.key)
        .join(
            enter => enter.append('g')
                .classed('series', true)
                .style('fill', (d) => d.color)
                .style('stroke', "#000000"),
            update => update
                .call(update => update.transition()
                    .style('fill', (d) => d.color))
        ); 

    // For each series create a rect element for each viralLoadLog
    const rectSelection = seriesGroupSelection.selectAll('rect.histbar')
        .data((d) => d, d => d.data.viralLoadLog)
        .join(
            enter => enter.append("rect")
                .classed("histbar", true)
                .attr('width', barWidth)
                .attr('x', d => xScale(d.data.viralLoadLog-0.5))
                .attr('y', d =>  d[1])
                .attr('height', d => d[0] -  d[1]),
            update => update
                .call(update => update.transition()
                    .attr('y', d =>  d[1])
                    .attr('height', d => d[0] -  d[1]))
        );

    // Create the legend (if needed).
    // For each series, if there's a label, make an item in the legend. 
    const legend = group.selectAll('g.legend')
        .data((d) => prepareLegend(d))
        .join('g')
        .classed('legend', true)
        .attr("transform", (d,i) => `translate(${width-120}, ${6+i*20})`);
    legend.selectAll('circle.legend')
            .data(d => [d])
            .join('circle')
            .classed('legend', true)
            .attr("cx",10).attr("cy",-6).attr("r", 6).style("fill", d => d.color);
    legend.selectAll('text.legend')
        .data(d => [d])
        .join('text')
        .classed('legend', true)
        .attr("x", 16)
        .text(d => d.name);

    // Show calculation of "sensitivity" (according to infectivity)    
    div.selectAll("p.sensitivity").data(d => d.distributionsWithSensitivityCalc)
        .join("p")
        .classed("sensitivity", true)
        .html(d => markupForSensitivity(d));
  
}

function markupForSensitivity(d) {
    let ic = d.infectiousCount;
    let pc = d.truePositiveCount;
    let pr = Math.round(100*d.sensitivity);
    return `${ic} infectious people,<br>${pc} of whom are antigen-positive<br><b>= ${pr}% sensitivity</b>`;
}

doQuery();
