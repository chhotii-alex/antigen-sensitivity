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
}

function getColorSchema() {
    if (!colorAngles.length) {
        colorAngles = generateColorAngles();
    }
    let angle = colorAngles.shift();
    return {"negatives" : `hsl(${angle},80%,50%)`,
            "positives" : `hsl(${angle},80%,85%)`};
}

function loadData() {

displayData("Star-belly Sneetches",
[
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
"#displaybox");

displayData("Non-star-belly Sneetches",
  [
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
"#displaybox");

}

document.getElementById("clickme").onclick = loadData;

function makeXAxis(data, key, xscale){
    const xValues = data.map( (d) => d[key] );
    xscale.domain([xValues[0], 1+xValues[xValues.length - 1]]);
    return d3.axisBottom(xscale)
        .tickValues([0, 4, 8, 12])
        .tickFormat('');
}  // END makeXAxis()

function makeYAxis(data, categories, yscale){
    const maxPValues = data.map( (d) => {
          let sum = 0;
          for (let key of categories) { sum += d[key]; }
          sum += 30;
          return sum;
        });
    const maxNValues = [0,0]; 

    let yDomain = d3.extent(maxPValues.concat(maxNValues));
    yscale.domain(yDomain);
    return d3.axisLeft(yscale)
        .ticks(3);
}  // END makeYAxis

const categories = ["negatives", "positives"];

function displayData(label, data, boxId) { 
    let total = 0;
    for (let segment of data) {
        for (let cat of categories) {
            total += segment[cat];
        }
    }

    let colorSchema = getColorSchema();
    
    const stack = d3.stack()
        .keys(categories);
    
    const stackedSeries = stack(data);
  
    let margin = {top: 10, right: 30, bottom: 30, left: 80};
    let boxWidth = 800;
    let boxHeight = 250;
    let width = boxWidth - margin.left - margin.right;
    let height = boxHeight - margin.top - margin.bottom;

    let box = d3.select(boxId);
    let div = box.append("div");
    div.append("h3").text(label);
    let svg = div.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);
    let group = svg.append("g")   // append returns a selection object
            .attr("transform", `translate(${margin.left}, ${margin.top})`);   
                      
    const xScale = d3.scaleLinear()
        .range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 650]).range([height,0]);
    const colorScale = d3.scaleOrdinal()
        .domain(["negatives", "positives"])
        .range([colorSchema["negatives"], colorSchema["positives"]]); 
    const barWidth = width/(data.length); 
        
    //Adds in the X axis with ticks
    let ticks = group.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(makeXAxis(data, "viralLoadLog", xScale));
    ticks.selectAll(".tick").append("svg:foreignObject")
            .attr("width","2em")
            .attr("height","2em")
            .attr("x", "-1em")
            .attr("y", "0.5em")
        .append("xhtml:div")
            .html(function(n) {return `10<sup>${n}</sup>`;});

    // Add X axis label:
    group.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width/2)
        .attr("y", height + margin.top + 18)
        .text("Viral load (copies/mL)");        

    //Adds in the Y axis
    group.append("g")
        .call(makeYAxis(data, categories, yScale));   
        
    // Y axis label:
    group.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        //.attr("y", -margin.left+10)
        .attr("y", -margin.left/2)
        .attr("x", -height/2)
        .text(`${total} total patients`) ;   
          
    // Create a g element for each series
    const sel = group
        .selectAll('g.series')
        .data(stackedSeries)
        .join('g')
        .classed('series', true)
        .style('fill', (d) => colorScale(d.key));
  
    // For each series create a rect element for each viralLoadLog
    sel.selectAll('rect')
        .data((d) => d)
        .join('rect')
        .attr('width', barWidth)
        .attr('y', (d) => yScale(d[1]))
        .attr('x', (d) => xScale(d.data.viralLoadLog)   )
        .attr('height', (d) => yScale(d[0]) -  yScale(d[1]));
}

