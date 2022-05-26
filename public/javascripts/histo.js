import * as d3 from "https://cdn.skypack.dev/d3@7";

export function loadVariableOptions(data) {
    let options = data.items;
    let select = document.getElementById("variable");
    for (let item of options) {
        let id = item.id;
        let label = item.displayName;
        let opt = document.createElement("option");
        opt.value = id;
        opt.text = label;
        select.add(opt);
    }
}

export function loadAssayOptions(data) {
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

export function doQuery(variable, assay) {
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
    fetch(url)
        .then(response => response.json())
        .then(data => loadData(data));
}

function loadData(data) {
    let box = d3.select("#displaybox");
    displayData(data, box);
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
            for (let key of Object.keys(item.catagories)) { sum += d[key]; }
            sum += 30;
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
    let region = group.selectAll("rect.region").data(d => [d]).join("rect")
        .classed("region", true)
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", xScale(5))
        .attr("height", height)
        .style("fill", "#f7f6f2");
    group.selectAll("text.f00").data(["Non-infectious", "Infectious"]).join("text")
        .classed("f00", true)
        .attr("y", "1em")
        .text(d => d)
        .attr("x", (d, i) => 15 + i * xScale(5));
                             
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
                .style('fill', (d) => d.color),
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
                .attr('x', d => xScale(d.data.viralLoadLog))
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
  
}

doQuery();
