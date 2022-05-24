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

function loadData() {

    let box = d3.select("#displaybox");

displayData(
    [
    {"label" : "Star-belly Sneetches",
    "data" : [
{viralLoadLog: 0, negatives: 10, positives: 0},
{viralLoadLog: 1, negatives: 50, positives: 0},
{viralLoadLog: 2, negatives: 160, positives: 0},
{viralLoadLog: 3, negatives:  100, positives:  20},
{viralLoadLog: 4, negatives:  10, positives:  48},
{viralLoadLog: 5, negatives:  2, positives:  148},
{viralLoadLog: 6, negatives:  0, positives:  148},
{viralLoadLog: 7, negatives:  0, positives:  248},
{viralLoadLog: 8, negatives:  0, positives:  148},
{viralLoadLog: 9, negatives:  0, positives:  200},
{viralLoadLog: 10, negatives:  0, positives:  100},
{viralLoadLog: 11, negatives:  0, positives:  20},
{viralLoadLog: 12, negatives:  0, positives:  1},
],
    colors: getColorSchema()},
    {"label" : "Non-star-belly Sneetches",
      "data" : [
{viralLoadLog: 0, negatives: 0, positives: 0},
{viralLoadLog: 1, negatives: 40, positives: 5},
{viralLoadLog: 2, negatives: 123, positives: 9},
{viralLoadLog: 3, negatives:  80, positives:  9},
{viralLoadLog: 4, negatives:  8, positives:  17},
{viralLoadLog: 5, negatives:  20, positives:  64},
{viralLoadLog: 6, negatives:  20, positives:  77},
{viralLoadLog: 7, negatives:  20, positives:  99},
{viralLoadLog: 8, negatives:  10, positives:  98},
{viralLoadLog: 9, negatives:  0, positives:  83},
{viralLoadLog: 10, negatives:  0, positives:  40},
{viralLoadLog: 11, negatives:  0, positives:  12},
{viralLoadLog: 12, negatives:  0, positives:  3},
],
colors: getColorSchema()},
],
box);
}

document.getElementById("clickme").onclick = loadData;
/*
function makeYAxis(data, categories, yscale){
    const maxPValues = data.map( (d) => {
          let sum = 0;
          for (let key of categories) { sum += d[key]; }
          sum += 30;
          return sum;
        });
    const maxNValues = [0]; 

    let yDomain = d3.extent(maxPValues.concat(maxNValues));
    yscale.domain(yDomain);
    return d3.axisLeft(yscale)
        .ticks(3);
}  // END makeYAxis
*/
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

function displayData(info, box) { 
    let firstData = info[0].data;
    
    // We are very much assuming that all histograms will have the same x axis.        
    const xScale = linearScale(firstData.map( (d) => d['viralLoadLog'] ), width);
    const barWidth = width/(firstData.length); 

    // For now, assume we will use the same y axis scaling for all. This should probably change.
    const yScale = d3.scaleLinear().range([height,0]);
    const maxPValues = firstData.map( (d) => {
        let sum = 0;
        for (let key of categories) { sum += d[key]; }
        sum += 30;
        return sum;
      });

    let yDomain = d3.extent(maxPValues.concat([0]));
    yScale.domain(yDomain);
    const yAxisMaker = d3.axisLeft(yScale).ticks(3);
      
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
        .call(yAxisMaker);   
        
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
        .data(d => stack(d.data).map( f => {f["color"] = d.colors[f.key]; return f; }), d => d.key)
        .join('g');
    seriesGroupSelection.classed('series', true)
        .style('fill', (d) => d.color);
  
    // For each series create a rect element for each viralLoadLog
    const rectSelection = seriesGroupSelection.selectAll('rect')
        .data((d) => d, d => d.data.viralLoadLog)
        .join('rect');
    rectSelection.attr('width', barWidth)
        .attr('y', (d) => yScale(d[1]))
        .attr('x', (d) => xScale(d.data.viralLoadLog)   )
        .attr('height', (d) => yScale(d[0]) -  yScale(d[1]));
}

