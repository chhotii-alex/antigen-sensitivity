
/*
TODO: tie colors used to particular query somehow? Will have to think through query componsiting first.
*/

function convertToRGB(hexstr) {
  let r = hexstr.substring(1, 3);
  let g = hexstr.substring(3, 5);
  let b = hexstr.substring(5, 7);
  r = parseInt(r, 16);
  g = parseInt(g, 16);
  b = parseInt(b, 16);
  return `rgb(${r},${g},${b})`;
}

function convertColors(d) {
   return {
      "positives" : convertToRGB(d.positives),
      "negatives" : convertToRGB(d.negatives),
      "count" : [convertToRGB(d.negatives), convertToRGB(d.medium)],
      }
}

let colorPairs = [
{"negatives": '#6a3d9a', //dark purple
"positives": '#cab2d6', //light purple
"medium": "#8B6FB0",
},
{"negatives": '#1f78b4', //dark blue
"positives": '#a6cee3', //light blue
"medium": "#6D99C3",
},
{"negatives": '#33a02c', //dark green
"positives": '#b2df8a', //light green
"medium": "#7FB66F",
},
{"negatives": '#d8ac60', //dark yellow
"positives": '#ffff99', //light yellow
"medium": "#DDC291",
},
{"negatives": '#ff7f00', //dark orange
"positives": '#fdbf6f', //light orange
"medium": "#FF9F40",
},
{"negatives": '#e31a1c', //dark red
"positives": '#fb9a99', //light red
"medium": "#EA5455",
},
];

colorPairs.reverse();

colorPairs = colorPairs.map(d => convertColors(d));

exports.getColorSchema = function(index) {
   return colorPairs[index % colorPairs.length];
}
    
exports.getPlainColors = function() {
   return {"positives": "#000000", "negatives":"#000000",}
}