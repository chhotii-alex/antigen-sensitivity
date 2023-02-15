
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
      "count" : convertToRGB(d.negatives),
      }
}

let colorPairs = [
{"negatives":
'#6a3d9a', //dark purple
"positives":
'#cab2d6', //light purple
},
{"negatives":
'#1f78b4', //dark blue
"positives":
'#a6cee3', //light blue
},
{"negatives":
'#33a02c', //dark green
"positives":
'#b2df8a', //light green
},
{"negatives":
'#d8ac60', //dark yellow
"positives":
'#ffff99', //light yellow
},
{"negatives":
'#ff7f00', //dark orange
"positives":
'#fdbf6f', //light orange
},
{"negatives":
'#e31a1c', //dark red
"positives":
'#fb9a99', //light red
},
];

colorPairs = colorPairs.map(d => convertColors(d));
console.log(colorPairs);

exports.getColorSchema = function(index) {
   return colorPairs[index % colorPairs.length];
}
    
