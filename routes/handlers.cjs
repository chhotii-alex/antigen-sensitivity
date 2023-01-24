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

/* Where in Python we would use, for example,
     s = ", ".join(clauses)
  use this function like so:
     s = stringJoin(", ", clauses);
*/ 
function stringJoin(connecter, items) {
  result = "";
  first = true;
  for (const item of items) {
     if (first) {
         first = false;
     }
     else {
         result += connecter;
     }
     result += item;
  }
  return result;
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

let comorbidities = null;

async function getComorbidities() {
  if (!comorbidities) {
       query = "SELECT tag, description, grouping, on_by_default from ComorbidityRef order by grouping, sort_key";
       let currentGrouping = null;
       let { rows } = await pool.query(query);
       comorbidities = [];
       for (const elem of rows) {
           tag = elem.tag.trim();
           descr = elem.description;
	   grouping = elem.grouping;
	   onByDefault = elem.on_by_default;
	   if (currentGrouping == null || currentGrouping.name != grouping) {
	      currentGrouping = { "name" : grouping, subdivisions : [] };
	      comorbidities.push(currentGrouping);
	   }
	   currentGrouping.subdivisions.push({ "tag" : tag, "descr" : descr, "onByDefault" : onByDefault } );
        }
  }
  return comorbidities;
}

let treatments = null;
let treatmentLookup = null;
  
async function getTreatments() {
  if (!treatments) {
        query = " SELECT tag, description from TreatmentRef order by sort_key";
       let { rows } = await pool.query(query);
       treatments = [];
       treatmentLookup = {};
       for (const elem of rows) {
           tag = elem.tag.trim();
           descr = elem.description;
	   treatments.push( { "tag":tag,
	   		    "name":descr,
			  });
           treatmentLookup[tag] = descr;
        }
  }
  return treatments;
}

exports.vars = async function(req, res, next) {
    let items = [
        { id: 'sex', displayName: "Sex"},
	{ id: 'age', displayName: "Age"},
	{ id: 'eth', displayName: "Race/Ethnicity"},
	{ id: 'ses', displayName: "Socio-economic Status"},
        { id: 'loc', displayName: "Patient Location"},
	{ id: 'vax', displayName: "Vaccination Status"},
	{ id: 'var', displayName: "Presumed Variant"},
	{ id: 'vitals', displayName: "Vital Signs Presentation"},
	{ id: 'outcome', displayName: "Outcome"},
	{ id: 'preg', displayName: "Pregnancy Status"},
	{ id: 'bmi', displayName: "Body Mass Index"},
	{ id: 'smoke', displayName: "Smoking Status"},
	{ id: 'immuno', displayName: "Immunosuppressed"},
      ];

    const comorbid = await getComorbidities();
    for (const grouping of comorbid) {
        items.push( { "id":grouping.subdivisions[0].tag, "displayName":grouping.name,
	    "category":"Comorbidities",
	    "subdivisions":grouping.subdivisions} );
    }

    const treat = await getTreatments();
    for (const t of treat) {
        items.push( { "id":t.tag, "displayName":t.name, "category":"Treatments"} );
    }

    let retval = {
      items: items, 
      version: 0,
    };
    res.json(retval);
  }

class PatientSetDescription {
    constructor(baseObj = null, noun = null, adjective = null, modifier = null) {
       console.log("Base:", baseObj, (typeof baseObj));
       if (baseObj) {
              console.log(baseObj.adjectives);
       }
       if (baseObj) {
             this.noun = baseObj.noun;
	     this.adjectives = baseObj.getAdjectives().slice();
	     this.modifiers = baseObj.modifiers.slice();
       }
       else {
              this.noun = "patients";
       	      this.adjectives = [];
       	      this.modifiers = [];
      }
      if (noun) {
         this.setNoun(noun);
      }
      if (adjective) {
          this.addAdjective(adjective);
      }
      if (modifier) {
          this.addModifier(modifier);
      }
      console.log("Adjectives: ", this.adjectives, this.getAdjectives());
    };
    toString() {
        let adj = stringJoin(" ", this.adjectives);
	let mod = stringJoin(" ", this.modifiers);
	return `${adj} ${this.noun} ${mod}`;
    };
    addModifier(s) {
       this.modifiers.push(s);
    };
    setNoun(s) {
       if (this.noun == "patients") {
              this.noun = s;
       }
       else {
           this.noun = `${this.noun}, ${s}`;
       }
    };
    addAdjective(s) {
      this.adjectives.push(s);
    };
    getAdjectives() {
     return this.adjectives;
   };
}

class QuerySet {
   constructor() {
      this.queries = {};
      this.descriptions = {};
   };
   addQuery(description, query) {
       console.log("Adding query for: ", description, query);
       this.queries[description.toString()] = query;
       this.descriptions[description.toString()] = description;
   };
   getLabels() {
    return Object.keys(this.queries);
   };
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


function makeNewQueries(queries, updaterList) {
    let newQueries = new QuerySet();
    for (let label of queries.getLabels()) {
        queryParts = queries.queries[label];
	oldSet = queries.descriptions[label];
	for (let updaters of updaterList) {
	    descriptionUpdater = updaters[0];
	    queryUpdater = updaters[1];
	    let newSet = new PatientSetDescription(oldSet, descriptionUpdater.noun,
	             descriptionUpdater.adjective, descriptionUpdater.modifier);
            let newQueryParts = queryUpdater(queryParts);
	    newQueries.addQuery(newSet, newQueryParts);
	}
    }
    return newQueries;
}

/* TODO: I think we will be saving the viral load, NOT the log10 of the
viral load; adjust query, and do a log10 before binning the numbers. */
exports.datafetch = async function(req, res, next) {
    let d3 = await d3promise; // hack for importing the wrong kind of module
    let bin = d3.bin().domain([0,13]).thresholds(24).value(d => d.viralloadlog);
    let baseQuery = `SELECT log(viral_load) viralloadlog
          FROM covidtestresults `
    let joins = ` `
    // TODO: how many results does this upper limit trim off? Do we believe this upper limit?
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
    let queries = new QuerySet();

    queries.addQuery(new PatientSetDescription(),
          {"base":baseQuery, "joins":joins, "where":whereClause});
    if ('comorbid' in req.query) {
         if ((typeof req.query.comorbid) == 'string') {
	    if (req.query.comorbid == "nothing") {
	      tags = [];
	    }
	    else {
              tags = [req.query.comorbid];
	    }
	 }
	 else {
	    tags = req.query.comorbid;
	 }
	 let newQueries = new QuerySet();
	 for (let query of queries.getLabels()) {
	   queryParts = queries.queries[query];
	   oldSet = queries.descriptions[query];
	   baseQuery = queryParts["base"];
	   joins = queryParts["joins"];
	   whereClause = queryParts["where"];
	   orClauses = [];
	   if (tags.length < 1) {
	   	 descr = "nothing selected";
	       whereClause += ' AND true = false ';
	   }
	   else {
   	     for (const tag of tags) {
	       for (const grouping of await getComorbidities()) {
	          for (const sub of grouping.subdivisions) {
		     if (tag == sub.tag) {
		        descr = grouping.name;
		     }
		   }
	       }
	       tableAbbrev = `c_${tag}`;
	       joins += `
	           LEFT OUTER JOIN Comorbidity ${tableAbbrev} on covidtestresults.id = ${tableAbbrev}.result_id
	                    and (${tableAbbrev}.tag = '${tag}' OR ${tableAbbrev}.tag IS NULL)
	       `;
	       orClauses.push(` ${tableAbbrev}.tag IS NOT NULL `);
	     }
	     whereClause += "AND (" + stringJoin(" OR ", orClauses) + ")";
	   }
	   newQueries.addQuery(new PatientSetDescription(oldSet, null, descr),
	       {"base" : baseQuery, "joins" : joins, "where" : whereClause });
	 }
	 queries = newQueries;
    }
    if ('vars' in req.query) {
      if (req.query.vars in treatmentLookup) {
         tag = req.query.vars;
	 descr = `treated with ${treatmentLookup[tag]}`;
          let newQueries = new QuerySet();
          for (let query of queries.getLabels()) {
	    queryParts = queries.queries[query];
	    description = queries.descriptions[query];
	    baseQuery = queryParts["base"];
  	    joins = queryParts["joins"];
  	    whereClause = queryParts["where"];
	    tableAbbrev = `c_${tag}`;
	    joins = joins + ` INNER JOIN Treatment ${tableAbbrev}
	                          ON covidtestresults.id = ${tableAbbrev}.result_id `;
            whereClause = whereClause + ` and ${tableAbbrev}.tag = '${tag}' `;
	    let newSet = new PatientSetDescription(description, null, null, descr);
	    newQueries.addQuery(newSet, {"base" : baseQuery, "joins" : joins, "where" : whereClause });
	  }
          queries = newQueries;
        }
      // TODO: arch whereby we do not keep search if tag found above
      if (req.query.vars == "sex") {
        queries = makeNewQueries(queries, [
	       [{"noun":"females"}, q => andWhere(q, "sex = 'F'")],
	       [{"noun":"males"}, q => andWhere(q, "sex = 'M'")],
	    ]);
      }      
      else if (req.query.vars == "loc") {
        queries = makeNewQueries(queries, [
	       [{"modifier":"in inpatient settings"},
	             q => andWhere(q, ` patient_location = 'INPATIENT' `)],
	       [{"modifier":"in outpatients settings"},
	            q => andWhere(q, ` patient_location = 'OUTPATIENT' `)],
	       [{"modifier":"in the Emergency Department"},
	           q => andWhere(q, ` patient_location = 'EMERGENCY UNIT' `)],
	       [{"modifier": "at other instituions"},
	           q => andWhere(queryParts, ` patient_location = 'INSTITUTIONAL' `)],
	     ]);
      }
      else if (req.query.vars == "bmi") {
        let newQueries = new QuerySet();
        for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];	
	   oldSet = queries.descriptions[query];
	  newQueries.addQuery(new PatientSetDescription(oldSet, null, "Underweight"),
	     andWhere(queryParts, ` bmi < 18.5 AND age > 17`));
	  newQueries.addQuery(new PatientSetDescription(oldSet, null, "Healthy Weight"),
	      andWhere(queryParts, ` bmi >= 18.5 AND bmi < 25 AND age > 17`));
	  newQueries.addQuery(new PatientSetDescription(oldSet, null, "Overweight"),
	        andWhere(queryParts, ` bmi >= 25 AND bmi < 30 AND age > 17`));
	  newQueries.addQuery(new PatientSetDescription(oldSet, null, "Obese"),
	      andWhere(queryParts, `bmi >= 30 AND age > 17`));
        }
        queries = newQueries;
      }
      else if (req.query.vars == "immuno") {
        let newQueries = new QuerySet();
	for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];
	   oldSet = queries.descriptions[query];
	  newQueries.addQuery(new PatientSetDescription(oldSet, null, "Immunosuppressed"),
	      andWhere(queryParts, ` immuno `));
	  newQueries.addQuery(new PatientSetDescription(oldSet, null, "Immunocompetent"),
	      andWhere(queryParts, ` NOT immuno `));
	}
	queries = newQueries;
      }
      else if (req.query.vars == "smoke") {
        let newQueries = new QuerySet();
        for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];	
	   oldSet = queries.descriptions[query];
	  newQueries.addQuery(new PatientSetDescription(oldSet, "Current Smokers"),
	     andWhere(queryParts, ` tobacco_status = 'current' `));
	  newQueries.addQuery(new PatientSetDescription(oldSet, "Former Smokers"),
	        andWhere(queryParts, ` tobacco_status = 'former' `));
	  newQueries.addQuery(new PatientSetDescription(oldSet, null, null, "who never smoked"),
	    andWhere(queryParts, ` tobacco_status = 'never' `));
        }
        queries = newQueries;
      }
      else if (req.query.vars == "vitals") {
        let newQueries = new QuerySet();
        for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];	
	   oldSet = queries.descriptions[query];
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
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Sick Appearing"),
	     andWhere(queryParts, sick));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Well Appearing"),
	     andWhere(queryParts, well));
        }
        queries = newQueries;
      }
      else if (req.query.vars == "age") {
        let newQueries = new QuerySet();
        for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];
	  oldSet = queries.descriptions[query];
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "young (<30 y.o.)"),
	  			  andWhere(queryParts, ` age < 30 `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "30 - 59 y.o."),
	      andWhere(queryParts, `age >= 30 AND age < 60 `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "old (60+ y.o.)"),
	     andWhere(queryParts, ` age >= 60 `));
        }
        queries = newQueries;
      }
      else if (req.query.vars == "ses") {
        let newQueries = new QuerySet();
        for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];
	  oldSet = queries.descriptions[query];
	  let sesbins = { 1 : "< $52,000",
	                 2 : "$52,000 to $78,000",
			 3 : "$78,000 to $104,000",
			 4 : "$104,000 to $130,000",
			 5 : "> $130,000",
			};
	  for (let b in sesbins) {
	      let qKey = `from ZCTAs with Median Household Income ${sesbins[b]}`;
	      newQueries.addQuery(new PatientSetDescription(oldSet, null, null, qKey),
	          andWhere(queryParts, ` sesbin = ${b} `));
	  }
        }
        queries = newQueries;
      }
      else if (req.query.vars == "vax") {
        let newQueries = new QuerySet();
        for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];	
	  oldSet = queries.descriptions[query];
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Vaccinated"),
	     andWhere(queryParts, ` vax_count > 0 `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Unvaccinated"),
	     andWhere(queryParts, ` vax_count = 0 `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, null,
	      "having unknown vaccination status"),
	      andWhere(queryParts, ` vax_count is null `));
        }
        queries = newQueries;
      }
      else if (req.query.vars == "var") {
        let newQueries = new QuerySet();
        for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];	
	  oldSet = queries.descriptions[query];
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Omicron era"),
	      andWhere(queryParts, ` collection_when > '2022-01-03' `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Delta era"),
	    andWhere(queryParts, `collection_when > '2021-07-07' AND collection_when < '2021-12-06' `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Early Variant era"),
	     andWhere(queryParts, ` collection_when < '2021-06-07' `));
        }
        queries = newQueries;
      }
      else if (req.query.vars == "eth") {
        let newQueries = new QuerySet();
        for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];
	  oldSet = queries.descriptions[query];
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "White"),
	      andWhere(queryParts, ` ethnicity = 'WH' `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Black"),
	  			  andWhere(queryParts, ` ethnicity = 'BL' `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Asian/Pacific"),
	     andWhere(queryParts, ` ethnicity = 'AS' `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Hispanic"),
	        andWhere(queryParts, `ethnicity = 'HS' `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Native American"),
	       andWhere(queryParts, ` ethnicity = 'NA' `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Unknown/Other"),
	           andWhere(queryParts, ` ethnicity is NULL `));
	}
        queries = newQueries;
      }
      else if (req.query.vars == "preg") {
        let newQueries = new QuerySet();
        for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];	
	  oldSet = queries.descriptions[query];
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Pregnant"),
	      andWhere(queryParts, ` pregnancy_status = 'Y' `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, "Puerperium"),
	       andWhere(queryParts, ` pregnancy_status = 'P' `));
	  newQueries.addQuery(new PatientSetDescription(oldSet, null, "Non-pregnant"),
	     andWhere(queryParts, ` pregnancy_status = '-' `));
        }
        queries = newQueries;
      }
      else if (req.query.vars == "outcome") {
        let newQueries = new QuerySet();
        for (let query of queries.getLabels()) {
	  queryParts = queries.queries[query];	
          newQueries.addQuery(new PatientSetDescription(oldSet, null, null, "who died of COVID"),
	     andWhere(queryParts, ` outcome = 'D' `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, null, "who died, COVID contributing"),
	        andWhere(queryParts, ` outcome = 'C' `));
          newQueries.addQuery(new PatientSetDescription(oldSet, null, null, "who survived"),
	      andWhere(queryParts, ` outcome IS NULL `));
        }
        queries = newQueries;
      }

    }
    let phonyData = [];
    let index = 0;
    for (let label of queries.getLabels()) {
      queryParts = queries.queries[label];
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
      let pop = {
              "label" : label,
              "colors": colors.getColorSchema(index++),
	      "mean" : mean_val};
      pop["data"] = bins.map(r => {
         	     return {"viralLoadLog" : r.x0, "count" : r.length };
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

async function getTagsRef(table) {
  let query = `SELECT tag from ${table}`;
  let { rows } = await pool.query(query);
  return rows.map(r => r.tag.trim());
}

async function getJoins(table) {
  comorbidityTags = await getTagsRef(table);
  comorbidityColumns = comorbidityTags.map(c => `(${c}.tag IS NOT NULL) as "${c}"`);
  comorbidityJoins = comorbidityTags.map(
     c => `LEFT OUTER JOIN Comorbidity ${c} on ${c}.result_id = r.id
          AND (${c}.tag = '${c}' ) `);
  return {
  	 "tags": comorbidityTags,
  	 "columns": comorbidityColumns,
	 "joins": comorbidityJoins};
}

exports.dataset = async function(req, res, next) {
  let columns = ["patient_id", "specimen_id", "print_key",
     "patient_location", "ct_value", "viral_load", "age", "sex", "ethnicity",
     "sesbin", "vax_count", "vax_days", "pregnancy_status", "outcome",
     "systolic", "diastolic", "o2", "heartrate", "resprate", "temperature",
     "bmi", "smoker", "tobacco_status", "tobacco_freq", "tobacco_amount", "pack_years",
     "immuno"];
  let headers = [...columns];
  columns.push("TO_CHAR(DATE_TRUNC('month', collection_when::TIMESTAMP), 'Mon YYYY') as date");
  headers.push("date");
  let joins = [];

  for (const table of ['ComorbidityRef', 'TreatmentRef']) {
    a = await getJoins(table);
    tags = a["tags"]; tagColumns = a["columns"]; tagJoins = a["joins"];

    columns = columns.concat(tagColumns);
    headers = headers.concat(tags);
    joins = joins.concat(tagJoins);
  }

  let limit = '';

  let query = `SELECT ${columns.join(',\n       ')} 
      from CovidTestResults r
      ${joins.join('\n')}
      where is_positive and viral_load is not null ${limit};`;

   console.log(query)

  let data = "";
  for (const header of headers) {
     data += header;
     data += "\t";
  }
  data += "\r";
  let { rows } = await pool.query(query);
  for (const row of rows) {
     for (const header of headers) {
         if (row[header] != null) {
           data += row[header];
	 }
	 data += "\t";
     }
     data += "\r";
  }
  
  res.attachment("viralloads.csv");
  res.status(200).send(data);
}
