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

console.log("webapp routes launching...")

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
	{ id: 'eth', displayName: "Race/Ethnicity"},
	{ id: 'preg', displayName: "Pregnancy Status"},
	{ id: 'outcome', displayName: "Outcome"},
	{ id: 'ses', displayName: "Socio-economic Status"},
	{ id: 'vitals', displayName: "Vital Signs Presentation"},
	{ id: 'bmi', displayName: "Body Mass Index"},
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
    let bin = d3.bin().domain([0,13]).thresholds(24).value(d => d.viralloadlog);
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
      else if (req.query.vars == "bmi") {
        let newQueries = {};
        for (let query in queries) {
	  newQueries[`${query} AND bmi < 18.5 AND age > 17`] = "Underweight";
	  newQueries[`${query} AND bmi >= 18.5 AND bmi < 25 AND age > 17`] = "Healthy Weight";
	  newQueries[`${query} AND bmi >= 25 AND bmi < 30 AND age > 17`] = "Overweight";
	  newQueries[`${query} AND bmi >= 30 AND age > 17`] = "Obese";
        }
        queries = newQueries;
      }
      else if (req.query.vars == "vitals") {
        let newQueries = {};
        for (let query in queries) {
	  let sick = ` systolic < 90 OR
	      diastolic < 60 OR
	      heartrate > 100 OR
	      resprate > 18 OR
	      temperature > 99.1 OR
	      o2 < 95
	  `;
	  let well = ` (systolic >= 90 OR systolic IS NULL) AND
	      (diastolic >= 60 OR diastolic IS NULL) AND
	      (heartrate <= 100 OR heartrate IS NULL) AND
	      (resprate <= 18 OR resprate IS NULL) AND
	      (temperature <= 99.1 OR temperature IS NULL) AND
	      (o2 >= 95 OR o2 IS NULL) AND
	      COALESCE(systolic, diastolic, heartrate, resprate, temperature, o2) IS NOT NULL
	  `
          newQueries[`${query} AND (${sick}) `] = "Sick Appearing";
          newQueries[`${query} AND (${well}) `] = "Well Appearing";
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
      else if (req.query.vars == "ses") {
        let newQueries = {};
        for (let query in queries) {
          newQueries[`${query} AND sesbin = 1 `] = "ZCTA Median Household Income < $52,000";
          newQueries[`${query} AND sesbin = 2 `] = "ZCTA Median Household Income $52,000 to $78,000";
          newQueries[`${query} AND sesbin = 3 `] = "ZCTA Median Household Income $78,000 to $104,000";
          newQueries[`${query} AND sesbin = 4 `] = "ZCTA Median Household Income $104,000 to $130,000";
          newQueries[`${query} AND sesbin = 5 `] = "ZCTA Median Household Income > $130,000";
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
      else if (req.query.vars == "eth") {
        let newQueries = {};
        for (let query in queries) {
          newQueries[`${query} AND ethnicity = 'WH' `] = "White";
          newQueries[`${query} AND ethnicity = 'BL' `] = "Black";
          newQueries[`${query} AND ethnicity = 'AS' `] = "Asian/Pacific";
          newQueries[`${query} AND ethnicity = 'HS' `] = "Hispanic";
          newQueries[`${query} AND ethnicity = 'NA' `] = "Native American";
          newQueries[`${query} AND ethnicity is NULL `] = "Unknown/Other";
	}
        queries = newQueries;
      }
      else if (req.query.vars == "preg") {
        let newQueries = {};
        for (let query in queries) {
          newQueries[`${query} AND pregnancy_status = 'Y' `] = "Pregnant";
          newQueries[`${query} AND pregnancy_status = 'P' `] = "Puerperium";
        }
        queries = newQueries;
      }
      else if (req.query.vars == "outcome") {
        let newQueries = {};
        for (let query in queries) {
          newQueries[`${query} AND outcome = 'D' `] = "Died of COVID";
          newQueries[`${query} AND outcome = 'C' `] = "Died, COVID contributing";
          newQueries[`${query} AND outcome IS NULL `] = "Survived";
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
