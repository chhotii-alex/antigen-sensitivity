/* Color-related stuff (where do we want the responsibility for
  picking colors, back- or front-end?) */
  
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
    
exports.getColorSchema = function() {
        if (!colorAngles.length) {
            colorAngles = generateColorAngles();
        }
        let angle = colorAngles.shift();
        return {"negatives" : `hsl(${angle},80%,50%)`,
                "positives" : `hsl(${angle},80%,85%)`};
  }
    
