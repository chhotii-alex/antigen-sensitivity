
/*
TODO: tie colors used to particular query somehow? Will have to think through query componsiting first.
*/
const colorSchemes = [
['rgb(118,42,131)','rgb(153,112,171)','rgb(194,165,207)','rgb(231,212,232)','rgb(217,240,211)','rgb(166,219,160)','rgb(90,174,97)','rgb(27,120,55)'],
['rgb(140,81,10)','rgb(191,129,45)','rgb(223,194,125)','rgb(246,232,195)','rgb(199,234,229)','rgb(128,205,193)','rgb(53,151,143)','rgb(1,102,94)'],
['rgb(197,27,125)','rgb(222,119,174)','rgb(241,182,218)','rgb(253,224,239)','rgb(230,245,208)','rgb(184,225,134)','rgb(127,188,65)','rgb(77,146,33)'],
['rgb(179,88,6)','rgb(224,130,20)','rgb(253,184,99)','rgb(254,224,182)','rgb(216,218,235)','rgb(178,171,210)','rgb(128,115,172)','rgb(84,39,136)'],
['rgb(178,24,43)','rgb(214,96,77)','rgb(244,165,130)','rgb(253,219,199)','rgb(209,229,240)','rgb(146,197,222)','rgb(67,147,195)','rgb(33,102,172)'],
];

let colorPairs = [];
for (let cs of colorSchemes) {
  let pair;
  pair = [cs[0], cs[2]];
  colorPairs.push(pair);
  pair = [cs[6], cs[4]];
  colorPairs.push(pair);
  pair = [cs[1], cs[3]];
  colorPairs.push(pair);
  pair = [cs[7], cs[5]];
  colorPairs.push(pair);
}

exports.getColorSchema = function(index) {
   d = {};
   pair = colorPairs[index % colorPairs.length];
   d["negatives"] = pair[0];
   d["count"] = d["negatives"];
   d["positives"] = pair[1];
   return d;
}
    
