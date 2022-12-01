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

function andWhere(queryParts, cond) {
  baseQuery = queryParts["base"];
  joins = queryParts["joins"];
  whereClause = queryParts["where"];
  whereClause = `${whereClause} AND ${cond} `;
  return { "base" : baseQuery,
           "joins" : joins,
	   "where" : whereClause };
}

lookups = {}
  
exports.vars = async function(req, res, next) {
    let items = [
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
	{ id: 'smoke', displayName: "Smoking Status"},
      ];

    for (const refTable of ["TreatmentRef", "ComorbidityRef"]) {
        query = ` SELECT tag, description from ${refTable}`;
	lookup = {};
        let { rows } = await pool.query(query);
        for (const elem of rows) {
           tag = elem.tag.trim();
           descr = elem.description;
	   lookup[tag] = descr;
           items.push( {"id":tag, "displayName": descr});
        }
	lookups[refTable] = lookup;
    }

    let retval = {
      items: items, 
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
    let baseQuery = `SELECT log(viral_load) viralloadlog
          FROM covidtestresults `
    let joins = ` `
    let whereClause =` WHERE is_positive AND viral_load IS NOT NULL AND viral_load < 1000000000000 `;
  
    if ('minDate' in req.query) {
        let minDate = sanitizeDateInput(req.query.minDate);
        if (minDate) {
            whereClause += `AND collection_when >= '${minDate}' `;
        }
    }
    if ('maxDate' in req.query) {
        let maxDate = sanitizeDateInput(req.query.maxDate);
        if (maxDate) {
            baseQuery += `AND collection_when <= '${maxDate}' `;
        }
    }
    let queries = {};
    queries["All Patients"] = {"base":baseQuery, "joins":joins, "where":whereClause}
    if ('vars' in req.query) {
      for (const refTable of ["TreatmentRef", "ComorbidityRef"]) { 
        if (req.query.vars in lookups[refTable]) {
	  table = refTable.replace('Ref', '')
          tag = req.query.vars;
          descr = lookups[refTable][tag];
          let newQueries = {};
          for (let query in queries) {
	    queryParts = queries[query]
	    baseQuery = queryParts["base"];
  	    joins = queryParts["joins"];
  	    whereClause = queryParts["where"];
	    tableAbbrev = `c_${tag}`;
	    joins = joins + ` INNER JOIN ${table} ${tableAbbrev} ON covidtestresults.id = ${tableAbbrev}.result_id `;
            whereClause = whereClause + ` and ${tableAbbrev}.tag = '${tag}'`;
	    newQueries[descr] = {"base" : baseQuery, "joins" : joins, "where" : whereClause };
	  }
          queries = newQueries;
        }
      }
      // TODO: arch whereby we do not keep search if tag found above
      if (req.query.vars == "sex") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query]
	  newQueries["Female"] = andWhere(queryParts, "sex = 'F'");
	  newQueries["Male"] = andWhere(queryParts, "sex = 'M'");
        }
        queries = newQueries;
      }      
      else if (req.query.vars == "loc") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];
          newQueries["Inpatients"] = andWhere(queryParts, ` patient_location = 'INPATIENT' `);
          newQueries["Outpatients"] = andWhere(queryParts, ` patient_location = 'OUTPATIENT' `);
	  newQueries["Emergency"] = andWhere(queryParts, ` patient_location = 'EMERGENCY UNIT' `);
	  newQueries["Institutional"] = andWhere(queryParts, ` patient_location = 'INSTITUTIONAL' `);
	  newQueries["Inter-lab"] = andWhere(queryParts, `patient_location = 'INTER-LAB' `);
        }
        queries = newQueries;
      }
      else if (req.query.vars == "bmi") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];	
	  newQueries["Underweight"] = andWhere(queryParts, ` bmi < 18.5 AND age > 17`);
	  newQueries["Healthy Weight"] = andWhere(queryParts, ` bmi >= 18.5 AND bmi < 25 AND age > 17`);
	  newQueries["Overweight"] = andWhere(queryParts, ` bmi >= 25 AND bmi < 30 AND age > 17`);
	  newQueries["Obese"] = andWhere(queryParts, `bmi >= 30 AND age > 17`);
        }
        queries = newQueries;
      }
      else if (req.query.vars == "smoke") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];	
	  newQueries["Current Smoker"] = andWhere(queryParts, ` tobacco_status = 'current' `);
	  newQueries["Former Smoker"] = andWhere(queryParts, ` tobacco_status = 'former' `);
	  newQueries["Never Smoked"] = andWhere(queryParts, ` tobacco_status = 'never' `);
        }
        queries = newQueries;
      }
      else if (req.query.vars == "vitals") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];	
	  let sick = ` ( systolic < 90 OR
	      diastolic < 60 OR
	      heartrate > 100 OR
	      resprate > 18 OR
	      temperature > 99.1 OR
	      o2 < 95 )
	  `;
	  let well = ` (systolic >= 90 OR systolic IS NULL) AND
	      (diastolic >= 60 OR diastolic IS NULL) AND
	      (heartrate <= 100 OR heartrate IS NULL) AND
	      (resprate <= 18 OR resprate IS NULL) AND
	      (temperature <= 99.1 OR temperature IS NULL) AND
	      (o2 >= 95 OR o2 IS NULL) AND
	      COALESCE(systolic, diastolic, heartrate, resprate, temperature, o2) IS NOT NULL
	  `
          newQueries["Sick Appearing"] = andWhere(queryParts, sick);
          newQueries["Well Appearing"] = andWhere(queryParts, well);
        }
        queries = newQueries;
      }
      else if (req.query.vars == "age") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];
          newQueries["Young (<30)"] = andWhere(queryParts, ` age < 30 `);
          newQueries["Middle (30 - 59)"] = andWhere(queryParts, `age >= 30 AND age < 60 `);
          newQueries["Old (60+)"] = andWhere(queryParts, ` age >= 60 `);
        }
        queries = newQueries;
      }
      else if (req.query.vars == "ses") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];	
          newQueries["ZCTA Median Household Income < $52,000"] = andWhere(queryParts, ` sesbin = 1 `);
          newQueries["ZCTA Median Household Income $52,000 to $78,000"] = andWhere(queryParts, `sesbin = 2 `);
          newQueries["ZCTA Median Household Income $78,000 to $104,000"] = andWhere(queryParts, ` sesbin = 3 `);
          newQueries["ZCTA Median Household Income $104,000 to $130,000"] = andWhere(queryParts, ` sesbin = 4 `);
          newQueries["ZCTA Median Household Income > $130,000"] = andWhere(queryParts, ` sesbin = 5 `);
        }
        queries = newQueries;
      }
      else if (req.query.vars == "vax") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];	
          newQueries["Vaccinated"] = andWhere(queryParts, ` vax_count > 0 `);
          newQueries["Unvaccinated"] = andWhere(queryParts, ` vax_count = 0 `);
          newQueries["Unknown"] = andWhere(queryParts, ` vax_count is null `);
        }
        queries = newQueries;
      }
      else if (req.query.vars == "var") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];	
          newQueries["Omicron"] = andWhere(queryParts, ` collection_when > '2022-01-03' `);
          newQueries["Delta"] = andWhere(queryParts, `collection_when > '2021-07-07' AND collection_when < '2021-12-06' `);
          newQueries["Early Variants"] = andWhere(queryParts, ` collection_when < '2021-06-07' `);
        }
        queries = newQueries;
      }
      else if (req.query.vars == "eth") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];	
          newQueries["White"] = andWhere(queryParts, ` ethnicity = 'WH' `);
          newQueries["Black"] = andWhere(queryParts, ` ethnicity = 'BL' `);
          newQueries["Asian/Pacific"] = andWhere(queryParts, ` ethnicity = 'AS' `);
          newQueries["Hispanic"] = andWhere(queryParts, `ethnicity = 'HS' `);
          newQueries["Native American"] = andWhere(queryParts, ` ethnicity = 'NA' `);
          newQueries["Unknown/Other"] = andWhere(queryParts, ` ethnicity is NULL `);
	}
        queries = newQueries;
      }
      else if (req.query.vars == "preg") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];	
          newQueries["Pregnant"] = andWhere(queryParts, ` pregnancy_status = 'Y' `);
          newQueries["Puerperium"] = andWhere(queryParts, ` pregnancy_status = 'P' `);
	  newQueries["Not Pregnant"] = andWhere(queryParts, ` pregnancy_status = '-' `);
        }
        queries = newQueries;
      }
      else if (req.query.vars == "outcome") {
        let newQueries = {};
        for (let query in queries) {
	  queryParts = queries[query];	
          newQueries["Died of COVID"] = andWhere(queryParts, ` outcome = 'D' `);
          newQueries["Died, COVID contributing"] = andWhere(queryParts, ` outcome = 'C' `);
          newQueries["Survived"] = andWhere(queryParts, ` outcome IS NULL `);
        }
        queries = newQueries;
      }

    }
    let phonyData = [];
    let index = 0;
    for (let label in queries) {
      queryParts = queries[label];
      baseQuery = queryParts["base"];
      joins = queryParts["joins"];
      whereClause = queryParts["where"];
      query = ` ${baseQuery} ${joins} ${whereClause} `;
      console.log(query);
      let { rows } = await pool.query(query);
      let bins = bin(rows);
      //let mean_val = calculateMeanFromLogValues(rows);
      // Use geometric mean, not straight-up mean:
      let mean_val = Math.pow(10, mean(rows))
      let pop = { "label" : label, "colors": colors.getColorSchema(index++), "mean" : mean_val};
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

  function mean(values) {
    let count = 0;
    let total = 0;
    for (let val of values) {
      count += 1;
      let num = parseFloat(val["viralloadlog"]);
      total += num;
    }
    return total/count;
  }
  