/*
  TODO:
  
  If we are going to use any ES modules (such as d3), convert all this to .mjs? I'm using the
  dynamic import() to get around the module-type mismatch, but there's a warning 
  "ExperimentalWarning: The ESM module loader is experimental."

*/

var express = require('express');
var router = express.Router();

// Database connection stuff
const { Pool } = require('pg');
const { credentials } = require('./config');
console.log(credentials);
const { connectionString } = credentials;
console.log(connectionString);
const pool = new Pool({connectionString});

let d3promise = import('d3');

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

router.get('/api/data/viralloads', async function(req, res, next) {
  let d3 = await d3promise;
  let bin = d3.bin().domain([0,13]).thresholds(12).value(d => d.viralloadlog);

  let queries = {
    'SELECT viralLoadLog FROM test_results WHERE positive ' : "All Patients"
  };
  if ('vars' in req.query) {
    if (req.query.vars == "sneetch") {
      let newQueries = {};
      for (let query in queries) {
        newQueries[`${query} AND sneetchType = 's' `] = "Star-belly Sneetches";
        newQueries[`${query} AND sneetchType = 'n' `] = "Non-star-belly Sneetches";
      }
      queries = newQueries;
    }
    else if (req.query.vars == "vacc") {
      let newQueries = {};
      for (let query in queries) {
        newQueries[`${query} AND vaccinated `] = "Vaccinated Population";
        newQueries[`${query} AND NOT vaccinated `] = "Unvaccinated Population";
      }
      queries = newQueries;
    }
  }
  let phonyData = [];
  for (let query in queries) {
    let { rows } = await pool.query(query);
    let bins = bin(rows);
    let pop = { "label" : queries[query], "colors": getColorSchema()};
    pop["data"] = bins.map(r => {
      return {"viralLoadLog" : r.x0, "count" : r.length};
    });
    phonyData.push(pop);
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
