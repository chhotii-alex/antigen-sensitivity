// Database connection stuff
const { Pool } = require('pg');
const { credentials } = require('./config.cjs');

// Doesn't work:
//const { mannwhitneyu } = require('./mannwhitneyu.js');

let mwu_promise = import('./mannwhitneyu.js');

console.log(mwu_promise);

//mannwhitneyu.test([0, 1], [3, 4]);

const { host, port, dbname, connect_timeout, user, password } = credentials;
const pool = new Pool({user: user,
    password: password,
    database: dbname, 
    host: host,
    port: port});

let d3promise = import('d3');

const { sanitizeDateInput } = require('./util.cjs');

const colors  = require('./colors.cjs');

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

let splits = new Map();

class PatientSplit {
   constructor(variable, variableDisplayName){
      this.variable = variable;
      this.variableDisplayName = variableDisplayName;
      this.splits = [];
   };
   addSplit(splitSpecifier) {
      this.splits.push(splitSpecifier);
   };
}

class PatientSplitSpecifier {
   constructor(row) {
      let variable = row.variable;
      let split = splits.get(variable);
      if (!split) {
         let variableDisplayName = row.variabledisplayname;
         split = new PatientSplit(variable, variableDisplayName);
	 splits.set(variable, split);
      }
      split.addSplit(this);
      this.value = row.value;
      this.valueDisplayName = row.valuedisplayname;
      this.noun = row.noun;
      this.modifier = row.modifier;
      this.adjective = row.adjective;
      this.whereClause = row.whereclause;
   };
}

let cachedVars = null;

exports.vars = async function(req, res, next) {
    if (!cachedVars) {
       query = `SELECT variable, variableDisplayName,
          value, valueDisplayName, noun, adjective, modifier, whereClause
            FROM UIVars ORDER BY sort`;
       let {rows} = await pool.query(query);
       for (const row of rows) {
           new PatientSplitSpecifier(row);
       }
       let items = [];
       splits.forEach( (split, variable, map) => {
          let divisions = [];
          for (const spec of split.splits) {
	     divisions.push({"value":spec.value, "valueDisplayName":spec.valueDisplayName});
	  }
	  items.push({id : split.variable,
	        displayName : split.variableDisplayName,
		splits:divisions});
       });
       cachedVars = items;
    }
    let retval = {
      items: cachedVars, 
      version: 0,
    };
    res.json(retval);
  }

class PatientSetDescription {
    constructor(baseObj = null, noun = null, adjective = null, modifier = null) {
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
	for (let updater of updaterList) {
	    let newSet = new PatientSetDescription(oldSet, updater.noun,
	        updater.adjective, updater.modifier);
            let newQueryParts = andWhere(queryParts, updater.whereClause);
	    newQueries.addQuery(newSet, newQueryParts);
	}
    }
    return newQueries;
}

exports.datafetch = async function(req, res, next) {
    let d3 = await d3promise; // hack for importing the wrong kind of module
    let mwu = await mwu_promise;
    let bin = d3.bin().domain([0,13]).thresholds(24);
    let baseQuery = `SELECT log(viral_load) viralloadlog
          FROM DeidentResults `
    let joins = ` `
    // TODO: how many results does this upper limit trim off? Do we believe this upper limit?
    let whereClause =` WHERE viral_load IS NOT NULL AND viral_load < 1000000000000 `;
  
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
    for (const variable in req.query) {
       if (splits.get(variable)) {
          let values = req.query[variable];
           let groupsToFetch = splits.get(variable).splits.filter(
	      spec => values.indexOf(spec.value) >= 0 );
           queries = makeNewQueries(queries, groupsToFetch);
       }
    }
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
    if (false) { 
      if (treatmentLookup && req.query.vars in treatmentLookup) {
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
    }
    let rawDataPrev = [];
    let results = [];
    let index = 0;
    for (let label of queries.getLabels()) {
      queryParts = queries.queries[label];
      baseQuery = queryParts["base"];
      joins = queryParts["joins"];
      whereClause = queryParts["where"];
      query = `${baseQuery} ${joins} ${whereClause}`;
      query = query.trim(); 
      console.log(query);
      let { rows } = await pool.query(query);
      if (rows.length < 1) {
         continue;
     }
      let rawData = rows.map(r => parseFloat(r["viralloadlog"]));
      let bins = bin(rawData);
      let mean_val = Math.pow(10, mean(rawData))
      let pop = {
              "label" : label,
              "colors": colors.getColorSchema(index++),
	      "mean" : mean_val,
	      "count" : rawData.length,
	      "comparisons" : []};
      pop["data"] = bins.map(r => {
         	     return {"viralLoadLog" : r.x0, "count" : r.length };
         });
      for (const prev of rawDataPrev) {
         pvalue = compareArrays(prev, rawData, mwu);
	 pop.comparisons.push(pvalue);
      }
      results.push(pop);
      rawDataPrev.push(rawData);
    }

    for (let pop of results) {
       pop["catagories"] = { "count" : "Count" };
    }
   
    res.json(results);
  }

  function mean(values) {
    let count = 0;
    let total = 0;
    for (let num of values) {
      count += 1;
      total += num;
    }
    return total/count;
  }

function compareArrays(arr1, arr2, mwu) {
   if (arr1.length < 1 || arr2.length < 1) {
      return null;
   }
   result = mwu.test(arr1, arr2);
   return result.p;
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
    let query = "SELECT * from DeidentResults";
    let { rows } = await pool.query(query);
    let headers = null;
    let data = "";
    for (const row of rows) {
    	if (headers == null) {
	    headers = Object.keys(row);
	    console.log(headers);
	    for (const header of headers) {
	        data += header;
		data += "\t";
	    }
	    data += "\r";
	}
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
