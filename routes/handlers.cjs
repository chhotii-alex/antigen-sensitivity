// Database connection stuff
const { Pool } = require('pg');
const { credentials } = require('./config.cjs');

const { host, port, dbname, connect_timeout, user, password } = credentials;
const pool = new Pool({user: user,
    password: password,
    database: dbname, 
    host: host,
    port: port});

let d3promise = import('d3');

const { sanitizeDateInput } = require('./util.cjs');

const colors  = require('./colors.cjs');
const assays = require('./antigenTests.cjs');

console.log("handlers blah blah...")

exports.home = function(req, res, next) {
    console.log("home page");
    res.render('index');
  }

exports.vars = function(req, res, next) {
    let retval = {
      items: [
        { id: 'loc', displayName: "Patient Location"},
        { id: 'sex', displayName: "Sex"},
	{ id: 'age', displayName: "Age"},
	{ id: 'vax', displayName: "Vaccination Status"},
	{ id: 'var', displayName: "Presumed Variant"},
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

  /* TODO: I think we will be saving the viral load, NOT the log10 of the
  viral load; adjust query, and do a log10 before binning the numbers. */
  exports.datafetch = async function(req, res, next) {
    let d3 = await d3promise; // hack for importing the wrong kind of module
    let bin = d3.bin().domain([0,13]).thresholds(12).value(d => d.viralloadlog);
    let baseQuery = "SELECT log(viral_load) viralloadlog FROM covidtestresults WHERE is_positive AND viral_load IS NOT NULL AND viral_load < 1000000000000 ";
  
    if ('minDate' in req.query) {
        let minDate = sanitizeDateInput(req.query.minDate);
        if (minDate) {
            baseQuery += `AND collection_when >= '${minDate}' `;
        }
    }
    if ('maxDate' in req.query) {
        let maxDate = sanitizeDateInput(req.query.maxDate);
        if (maxDate) {
            baseQuery += `AND collection_when <= '${maxDate}' `;
        }
    }
    let queries = {};
    queries[baseQuery] = "All Patients";
    if ('vars' in req.query) {
      if (req.query.vars == "sex") {
        let newQueries = {};
        for (let query in queries) {
          newQueries[`${query} AND sex = 'F' `] = "Female";
          newQueries[`${query} AND sex = 'M' `] = "Male";
        }
        queries = newQueries;
      }
      else if (req.query.vars == "loc") {
        let newQueries = {};
        for (let query in queries) {
          newQueries[`${query} AND patient_location = 'INPATIENT' `] = "Inpatients";
          newQueries[`${query} AND patient_location = 'OUTPATIENT' `] = "Outpatients";
	  newQueries[`${query} AND patient_location = 'EMERGENCY UNIT' `] = "Emergency";
	  newQueries[`${query} AND patient_location = 'INSTITUTIONAL' `] = "Institutional";
	  newQueries[`${query} AND patient_location = 'INTER-LAB' `] = "Inter-lab";
        }
        queries = newQueries;
      }
      else if (req.query.vars == "age") {
        let newQueries = {};
        for (let query in queries) {
          newQueries[`${query} AND age < 30 `] = "Young (<30)";
          newQueries[`${query} AND age >= 30 AND age < 60 `] = "Middle (30 - 59)";
          newQueries[`${query} AND age >= 60 `] = "Old (60+)";
        }
        queries = newQueries;
      }
      else if (req.query.vars == "vax") {
        let newQueries = {};
        for (let query in queries) {
          newQueries[`${query} AND vax_count > 0 `] = "Vaccinated";
          newQueries[`${query} AND vax_count = 0 `] = "Unvaccinated";
          newQueries[`${query} AND vax_count is null `] = "Unknown";
        }
        queries = newQueries;
      }
      else if (req.query.vars == "var") {
        let newQueries = {};
        for (let query in queries) {
          newQueries[`${query} AND collection_when > '2022-01-03' `] = "Omicron";
          newQueries[`${query} AND collection_when > '2021-07-07' AND collection_when < '2021-12-06' `] = "Delta";
          newQueries[`${query} AND collection_when < '2021-06-07' `] = "Early Variants";
        }
        queries = newQueries;
      }
    }
    let phonyData = [];
    for (let query in queries) {
      let { rows } = await pool.query(query);
      let bins = bin(rows);
      let mean = calculateMeanFromLogValues(rows);
      let pop = { "label" : queries[query], "colors": colors.getColorSchema(), "mean" : mean};
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

  /* Messy that I'm hard-coding the property name, but this will be going away. */
  function calculateMeanFromLogValues(values) {
    let count = 0;
    let total = 0;
    for (let val of values) {
      count += 1;
      let actual = Math.pow(10, parseFloat(val["viralloadlog"]));
      total += actual;
    }
    return total/count;
  }
