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

/* Obviously this is going to be removed,
  when we hook up to a data source.
  */
let phonyData1 = [
  {
      "label": "Vaccinated Population",
      "data": [
          {
              "viralLoadLog": 0,
              "count" : 12,
          },
          {
              "viralLoadLog": 1,
              "count" : 67,
          },
          {
              "viralLoadLog": 2,
              "count" : 300,
          },
          {
              "viralLoadLog": 3,
              "count" : 155,
          },
          {
              "viralLoadLog": 4,
              "count" : 120,
          },
          {
              "viralLoadLog": 5,
              "count" : 101,
          },
          {
              "viralLoadLog": 6,
              "count" : 39,
          },
          {
              "viralLoadLog": 7,
              "count" : 31,
          },
          {
              "viralLoadLog": 8,
              "count" : 20,
          },
          {
              "viralLoadLog": 9,
              "count" : 19,
          },
          {
              "viralLoadLog": 10,
              "count" : 10,
          },
          {
              "viralLoadLog": 11,
              "count" : 11,
          },
          {
              "viralLoadLog": 12,
              "count" : 0,
          }
      ],
      "colors": getColorSchema(),
  },
  {
      "label": "Unvaccinated Population",
      "data": [
          {
              "viralLoadLog": 0,
              "count" : 0,
          },
          {
              "viralLoadLog": 1,
              "count" : 2,
          },
          {
              "viralLoadLog": 2,
              "count" : 12,
          },
          {
              "viralLoadLog": 3,
              "count" : 15,
          },
          {
              "viralLoadLog": 4,
              "count" : 45,
          },
          {
              "viralLoadLog": 5,
              "count" : 99,
          },
          {
              "viralLoadLog": 6,
              "count" : 203,
          },
          {
              "viralLoadLog": 7,
              "count" : 403,
          },
          {
              "viralLoadLog": 8,
              "count" : 298,
          },
          {
              "viralLoadLog": 9,
              "count" : 280,
          },
          {
              "viralLoadLog": 10,
              "count" : 123,
          },
          {
              "viralLoadLog": 11,
              "count" : 50,
          },
          {
              "viralLoadLog": 12,
              "count" : 13,
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
              "count" : 10,
          },
          {
              "viralLoadLog": 1,
              "count" : 50,
          },
          {
              "viralLoadLog": 2,
              "count" : 100,
          },
          {
              "viralLoadLog": 3,
              "count" : 120,
          },
          {
              "viralLoadLog": 4,
              "count" : 111,
          },
          {
              "viralLoadLog": 5,
              "count" : 109,
          },
          {
              "viralLoadLog": 6,
              "count" : 166,
          },
          {
              "viralLoadLog": 7,
              "count" : 155,
          },
          {
              "viralLoadLog": 8,
              "count" : 99,
          },
          {
              "viralLoadLog": 9,
              "count" : 88,
          },
          {
              "viralLoadLog": 10,
              "count" : 34,
          },
          {
              "viralLoadLog": 11,
              "count" : 12,
          },
          {
              "viralLoadLog": 12,
              "count" : 2,
          }
      ],
      "colors": getColorSchema(),
  },
  {
      "label": "Non-star-belly Sneetches",
      "data": [
          {
              "viralLoadLog": 0,
              "count" : 0,
          },
          {
              "viralLoadLog": 1,
              "count" : 33,
          },
          {
              "viralLoadLog": 2,
              "count" : 99,
          },
          {
              "viralLoadLog": 3,
              "count" : 123,
          },
          {
              "viralLoadLog": 4,
              "count" : 54,
          },
          {
              "viralLoadLog": 5,
              "count" : 32,
          },
          {
              "viralLoadLog": 6,
              "count" : 31,
          },
          {
              "viralLoadLog": 7,
              "count" : 30,
          },
          {
              "viralLoadLog": 8,
              "count" : 17,
          },
          {
              "viralLoadLog": 9,
              "count" : 3,
          },
          {
              "viralLoadLog": 10,
              "count" : 4,
          },
          {
              "viralLoadLog": 11,
              "count" : 0,
          },
          {
              "viralLoadLog": 12,
              "count" : 0,
          }
      ],
      "colors": getColorSchema()
  }
];

router.get('/api/variables', function(req, res, next) {
  let retval = {
    items: [
      { id: 'vacc', displayName: "Vaccination status"},
      { id: 'sneetch', displayName: "Sneetch type"},
    ],
    version: 0,
  };
  res.json(retval);
});

router.get('/api/assays', function(req, res, next) {
  let retval = {
    items: [
      {id: 1, displayName: "Antigen test - AcmeCo."},
      {id: 2, displayName: "Antigen test - Binax"},
    ]
  };
  res.json(retval);
})

router.get('/api/data/viralloads', function(req, res, next) {
  let phonyData = phonyData1;
  if ('vars' in req.query) {
    if (req.query.vars == "sneetch") {
      phonyData = phonyData2;
    }
    else {
      phonyData = phonyData1;
    }
  }
  else {
    phonyData = [{
      "label" : "All Patients",
      "data" : [],
      "colors": getColorSchema(),
    }];
    for (let i = 0; i < phonyData1[0].data.length; ++i) {
      let bin = phonyData1[0].data[i];
      phonyData[0].data.push(
        { "viralLoadLog" : bin.viralLoadLog,
          "count" : bin.count + phonyData1[1].data[i].count
        }
      )
    }
  }
  let f;
  let catagories;
  if ('assay' in req.query) {
    catagories = {"negatives" : "Antigen negatives",
            "positives" : "Antigen positives"};
    if (req.query.assay == 1) {
      f = (log, count) => {
        if (log < 3) {
          return 0;
        }
        else if (log > 8) {
          return count;
        }
        else {
          return Math.round(count * (log - 3) * 0.2);
        }
      }
    }
    else {
      f = (log, count) => {
        if (log < 2) {
          return 0;
        }
        else if (log > 9) {
          return count;
        }
        else {
          return Math.round(count * (log - 2) * 0.1);
        }
      }
    }
  }
  else {
    catagories = {"negatives" : null, "positives" : null};
    f = (log, count) => 0;
  }
  for (let pop of phonyData) {
    for (let bin of pop.data) {
      bin.positives = f(bin.viralLoadLog, bin.count);
      bin.negatives = bin.count - bin.positives;
    }
    pop["catagories"] = catagories;
  }
  res.json(phonyData);
});

module.exports = router;
