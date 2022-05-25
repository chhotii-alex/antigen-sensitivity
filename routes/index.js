var express = require('express');
var router = express.Router();

/* Currently everything and the kitchen sink in this file.
  Refactor into modules, please. */

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
  
function getColorSchema() {
      if (!colorAngles.length) {
          colorAngles = generateColorAngles();
      }
      let angle = colorAngles.shift();
      return {"negatives" : `hsl(${angle},80%,50%)`,
              "positives" : `hsl(${angle},80%,85%)`};
}
  
    

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

let phonyData1 = [
  {
      "label": "Vaccinated Population",
      "data": [
          {
              "viralLoadLog": 0,
              "negatives": 12,
              "positives": 0
          },
          {
              "viralLoadLog": 1,
              "negatives": 67,
              "positives": 0
          },
          {
              "viralLoadLog": 2,
              "negatives": 300,
              "positives": 0
          },
          {
              "viralLoadLog": 3,
              "negatives": 130,
              "positives": 20
          },
          {
              "viralLoadLog": 4,
              "negatives": 88,
              "positives": 48
          },
          {
              "viralLoadLog": 5,
              "negatives": 2,
              "positives": 148
          },
          {
              "viralLoadLog": 6,
              "negatives": 0,
              "positives": 148
          },
          {
              "viralLoadLog": 7,
              "negatives": 0,
              "positives": 248
          },
          {
              "viralLoadLog": 8,
              "negatives": 0,
              "positives": 148
          },
          {
              "viralLoadLog": 9,
              "negatives": 0,
              "positives": 200
          },
          {
              "viralLoadLog": 10,
              "negatives": 0,
              "positives": 100
          },
          {
              "viralLoadLog": 11,
              "negatives": 0,
              "positives": 20
          },
          {
              "viralLoadLog": 12,
              "negatives": 0,
              "positives": 1
          }
      ],
      "colors": getColorSchema(),
  },
  {
      "label": "Unvaccinated Population",
      "data": [
          {
              "viralLoadLog": 0,
              "negatives": 0,
              "positives": 0
          },
          {
              "viralLoadLog": 1,
              "negatives": 30,
              "positives": 5
          },
          {
              "viralLoadLog": 2,
              "negatives": 50,
              "positives": 9
          },
          {
              "viralLoadLog": 3,
              "negatives": 50,
              "positives": 9
          },
          {
              "viralLoadLog": 4,
              "negatives": 80,
              "positives": 17
          },
          {
              "viralLoadLog": 5,
              "negatives": 200,
              "positives": 64
          },
          {
              "viralLoadLog": 6,
              "negatives": 209,
              "positives": 77
          },
          {
              "viralLoadLog": 7,
              "negatives": 304,
              "positives": 99
          },
          {
              "viralLoadLog": 8,
              "negatives": 50,
              "positives": 98
          },
          {
              "viralLoadLog": 9,
              "negatives": 90,
              "positives": 83
          },
          {
              "viralLoadLog": 10,
              "negatives": 60,
              "positives": 40
          },
          {
              "viralLoadLog": 11,
              "negatives": 0,
              "positives": 50
          },
          {
              "viralLoadLog": 12,
              "negatives": 0,
              "positives": 13
          }
      ],
      "colors": getColorSchema()
  }
];

let phonyData2 = [
  {
      "label": "Star-belly Sneetches",
      "data": [
          {
              "viralLoadLog": 0,
              "negatives": 10,
              "positives": 0
          },
          {
              "viralLoadLog": 1,
              "negatives": 50,
              "positives": 0
          },
          {
              "viralLoadLog": 2,
              "negatives": 160,
              "positives": 0
          },
          {
              "viralLoadLog": 3,
              "negatives": 100,
              "positives": 20
          },
          {
              "viralLoadLog": 4,
              "negatives": 10,
              "positives": 48
          },
          {
              "viralLoadLog": 5,
              "negatives": 2,
              "positives": 148
          },
          {
              "viralLoadLog": 6,
              "negatives": 0,
              "positives": 148
          },
          {
              "viralLoadLog": 7,
              "negatives": 0,
              "positives": 248
          },
          {
              "viralLoadLog": 8,
              "negatives": 0,
              "positives": 148
          },
          {
              "viralLoadLog": 9,
              "negatives": 0,
              "positives": 200
          },
          {
              "viralLoadLog": 10,
              "negatives": 0,
              "positives": 100
          },
          {
              "viralLoadLog": 11,
              "negatives": 0,
              "positives": 20
          },
          {
              "viralLoadLog": 12,
              "negatives": 0,
              "positives": 1
          }
      ],
      "colors": getColorSchema(),
  },
  {
      "label": "Non-star-belly Sneetches",
      "data": [
          {
              "viralLoadLog": 0,
              "negatives": 0,
              "positives": 0
          },
          {
              "viralLoadLog": 1,
              "negatives": 40,
              "positives": 5
          },
          {
              "viralLoadLog": 2,
              "negatives": 123,
              "positives": 9
          },
          {
              "viralLoadLog": 3,
              "negatives": 80,
              "positives": 9
          },
          {
              "viralLoadLog": 4,
              "negatives": 8,
              "positives": 17
          },
          {
              "viralLoadLog": 5,
              "negatives": 20,
              "positives": 64
          },
          {
              "viralLoadLog": 6,
              "negatives": 20,
              "positives": 77
          },
          {
              "viralLoadLog": 7,
              "negatives": 20,
              "positives": 99
          },
          {
              "viralLoadLog": 8,
              "negatives": 10,
              "positives": 98
          },
          {
              "viralLoadLog": 9,
              "negatives": 0,
              "positives": 83
          },
          {
              "viralLoadLog": 10,
              "negatives": 0,
              "positives": 40
          },
          {
              "viralLoadLog": 11,
              "negatives": 0,
              "positives": 12
          },
          {
              "viralLoadLog": 12,
              "negatives": 0,
              "positives": 3
          }
      ],
      "colors": getColorSchema()
  }
];

router.get('/api/data/viralloads', function(req, res, next) {
  let phonyData = phonyData1;
  if ('vars' in req.query) {
    if (req.query.vars == "sneetch") {
      phonyData = phonyData2;
    }
  }
  res.json(phonyData);
})

module.exports = router;
