import * as d3 from "https://cdn.skypack.dev/d3@7";

let colorAngles = [];

function generateColorAngles() {
    let newArray = [];
    for (let i = 90; i < 360; i += 180) {
        newArray.push(i);
    }
    for (let i = 45; i < 360; i += 90) {
        newArray.push(i);
    }
    for (let i = 22; i < 360; i += 45) {
        newArray.push(i);
    }
    return newArray;
} // END function generateColorAngles

function getColorSchema() {
    if (!colorAngles.length) {
        colorAngles = generateColorAngles();
    }
    let angle = colorAngles.shift();
    return {"negatives" : `hsl(${angle},80%,50%)`,
            "positives" : `hsl(${angle},80%,85%)`};
}

function doQuery() {
    fetch('api/data/viralloads')
        .then(response => response.json())
        .then(data => loadData(data));
}

function loadData(data) {
    let box = d3.select("#displaybox");
    displayData(data, box);
}

document.getElementById("clickme").onclick = doQuery();
const categories = ["negatives", "positives"];

function getTotal(data) {
    let total = 0;
    for (let segment of data) {
        for (let cat of categories) {
            total += segment[cat];
        }
    }
    return total;
}

const stack = d3.stack()
        .keys(categories); 

const margin = {top: 10, right: 30, bottom: 30, left: 80};
const boxWidth = 800;
const boxHeight = 250;
const width = boxWidth - margin.left - margin.right;
const height = boxHeight - margin.top - margin.bottom;

function linearScale(values, width) {
    return d3.scaleLinear()
        .domain(d3.extent(values))
        .range([0, width]);
}

function prepareDataForStackedHistogram(info) {
    let stackedData = stack(info.data);
    stackedData.forEach( (f) => {
        f.color = info.colors[f.key];
        f.forEach( (a) => {
            a[0] = info.yScale(a[0]);
            a[1] = info.yScale(a[1]);
        });
    });
    return stackedData;
}

function displayData(info, box) { 
    let firstData = info[0].data;
    
    // We are very much assuming that all histograms will have the same x axis.        
    const xScale = linearScale(firstData.map( (d) => d['viralLoadLog'] ), width);
    const barWidth = width/(firstData.length); 

    // Using a different y axis scaling for each histogram.
    for (let item of info) {
        item.yScale = d3.scaleLinear().range([height,0]);
        let  maxPValues = item.data.map( (d) => {
            let sum = 0;
            for (let key of categories) { sum += d[key]; }
            sum += 30;
            return sum;
        });

        item.yScale.domain( d3.extent(maxPValues.concat([0])) );
    }
      
    let div = box.selectAll("div").data(info, d => d.label).join("div");
    div.selectAll("h3").data(d => [d.label]).join("h3").text(d => d);
    let svg = div.selectAll("svg").data(d => [d]).join("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);
    let group = svg.selectAll("g").data(d => [d]).join("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);   
                             
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
        .selectAll("div").data(d => [d]).join("xhtml:div")
            .html(function(n) {return `10<sup>${n}</sup>`;});

    // Add X axis label:
    group.selectAll("text.xlabel").data(["Viral load (copies/mL)"]).join("text")
        .classed("xlabel", true)
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", height + margin.top + 18)
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
        //.attr("y", -margin.left+10)
        .attr("y", -margin.left/2)
        .attr("x", -height/2)
        .text(d => `${getTotal(d.data)} total patients`) ;   
          
    // Create a g element for each series
    /* We can make there be transitions here, by passing functions to join(). See
        https://observablehq.com/@d3/selection-join */
    const seriesGroupSelection = group
        .selectAll('g.series')
        .data(d => prepareDataForStackedHistogram(d), d => d.key)
        .join('g');
    seriesGroupSelection.classed('series', true)
        .style('fill', (d) => d.color);
  
    // For each series create a rect element for each viralLoadLog
    const rectSelection = seriesGroupSelection.selectAll('rect')
        .data((d) => d, d => d.data.viralLoadLog)
        .join('rect');
    rectSelection.attr('width', barWidth)
        .attr('y', d =>  d[1])
        .attr('x', d => xScale(d.data.viralLoadLog)   )
        .attr('height', d => d[0] -  d[1]);
}

doQuery();
