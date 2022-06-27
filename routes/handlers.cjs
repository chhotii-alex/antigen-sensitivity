// Database connection stuff
const { Pool } = require('pg');
const { credentials } = require('./config.cjs');
console.log(credentials);
const { connectionString } = credentials;
console.log(connectionString);
const pool = new Pool({connectionString});

let d3promise = import('d3');

const { sanitizeDateInput } = require('./util.cjs');

const colors  = require('./colors.cjs');
const assays = require('./antigenTests.cjs');

exports.home = function(req, res, next) {
    res.render('index');
  }

exports.vars = function(req, res, next) {
    let retval = {
      items: [
        { id: 'vacc', displayName: "Vaccination status"},
        { id: 'sneetch', displayName: "Placeholder variable 2"},
      ],
      version: 0,
    };
    res.json(retval);
  }

exports.assays = function(req, res, next) {
    let retval = {
      items: [
        {id: 1, displayName: "Antigen test - AcmeCo."},
        {id: 2, displayName: "Antigen test - Placeholder Vendor 2"},
      ]
    };
    res.json(retval);
  }  

  exports.datafetch = async function(req, res, next) {
    let d3 = await d3promise;
    let bin = d3.bin().domain([0,13]).thresholds(12).value(d => d.viralloadlog);
    let baseQuery = "SELECT viralLoadLog FROM test_results WHERE positive  ";
  
    if ('minDate' in req.query) {
        let minDate = sanitizeDateInput(req.query.minDate);
        if (minDate) {
            baseQuery += `AND collectionTime >= '${minDate}' `;
        }
    }
    if ('maxDate' in req.query) {
        let maxDate = sanitizeDateInput(req.query.maxDate);
        if (maxDate) {
            baseQuery += `AND collectionTime <= '${maxDate}' `;
        }
    }
    let queries = {};
    queries[baseQuery] = "All Patients";
    if ('vars' in req.query) {
      if (req.query.vars == "sneetch") {
        let newQueries = {};
        for (let query in queries) {
          newQueries[`${query} AND sneetchType = 's' `] = "Group A";
          newQueries[`${query} AND sneetchType = 'n' `] = "Group B";
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
      let pop = { "label" : queries[query], "colors": colors.getColorSchema()};
      pop["data"] = bins.map(r => {
        return {"viralLoadLog" : r.x0, "count" : r.length};
      });
      phonyData.push(pop);
    }
   
    let assay = assays.assayForIdentifier(req.query.assay);
    for (let pop of phonyData) {
      for (let bin of pop.data) {
        bin.positives = assay.positiveCount(bin.viralLoadLog, bin.count);
        bin.negatives = assay.negativeCount(bin.viralLoadLog, bin.count);
      }
      pop["catagories"] = assay.distinguishedCatagories();
    }
  
    res.json(phonyData);
  }
