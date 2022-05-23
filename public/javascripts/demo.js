import * as d3 from "https://cdn.skypack.dev/d3@7";

let box = d3.select("#displaybox");

drawHistogram(box, "#6d26d1", Array.from({length: 100}, d3.randomNormal(0.5, 0.2)));
drawHistogram(box, "#ba57d9", Array.from({length: 100}, d3.randomNormal(0.7, 0.4)));

function drawHistogram(box, color, data) {

    let margin = {top: 10, right: 30, bottom: 30, left: 40};
    let width = 460 - margin.left - margin.right;
    let height = 400 - margin.top - margin.bottom;

    let svg = box
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);
    let group = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    //scale the x axis        
    let x = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width]);
    // draw the x axis    
    group.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x));

    let histogram = d3.histogram()
        .domain(x.domain())
        .thresholds(x.ticks(10));
    let bins = histogram(data);
    console.log(bins);

    let y = d3.scaleLinear()
        .domain([0, d3.max(bins, function(d) { return d.length; })])
        .range([height, 0]);

    group.append("g")
        .call(d3.axisLeft(y));
   
    group.selectAll("rect").data(bins)
        .enter()
        .append("rect")
            .attr("x", 1)
            .attr("transform",  function(d) { return `translate(${x(d.x0)},${y(d.length)})`; })
            .attr("width", function(d) { return x(d.x1) - x(d.x0) ; })
            .attr("height", function(d) { return height - y(d.length); })
            .style("fill", color);
}



