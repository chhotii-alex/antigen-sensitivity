const { pool } = require('./database.cjs');

let seedrandom = require('seedrandom');
let mwu_promise = import('./mannwhitneyu.js');

let d3promise = import('d3');

const { sanitizeDateInput } = require('./util.cjs');
const colors  = require('./colors.cjs');

let noisyLog = false;

console.log("webapp routes launching...")

exports.assays = function(req, res, next) {
    if (noisyLog) {
        console.log("Doing assays endpoint");
        console.log(JSON.stringify(req.headers));
    }
    
    let data = {
        "items":[
	    {"id":"binax","displayName":"BinaxNOW&trade; COVID-19 Ag Card","coef":1.1843183,"intercept":-5.37500995},
	    {"id":"ginko","displayName":"CareStart COVID-19 Antigen Home Test","coef":1.14230231,"intercept":-5.70535991}
	    ]
	  };
    for (let j = 0; j < data.items.length; ++j) {
       data.items[j].ld50 = -(data.items[j].intercept/data.items[j].coef);
    }
    res.json(data);
}

/*
  Parameter:
  k : width of window
  Returns:
  kernel density function with signature:
      Parameter:
      v : float value
      Returns:
      Value of Epanechnikov function at (v/k). See https://en.wikipedia.org/wiki/Kernel_(statistics)#/media/File:Kernel_epanechnikov.svg
        for shape of Epanechnikov function.
*/
function kernelEpanechnikov(k) {
  return function(v) {
    return (Math.abs(v /= k) <= 1) ? (2 * 0.75 * (1 - v * v) / k) : 0;
  };
}

/*
  Parameters:
  kernel: a kernel density function
  X: an array of X values
  Returns:
  function with signature:
     Parameters:
     V: an array of values (whose distribtion we want to estimate)
     Returns:
     estimated density at each value of X, as estimated based on samples in V
*/
function kernelDensityEstimator(kernel, X, d3) {
  return function(V) {
    return X.map(function(x) {
      return [x, d3.mean(V, function(v) { return kernel(x - v); })];
    });
  };
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
    whereClause = queryParts["where"];
    whereClause = `${whereClause} AND ${cond} `;
    return {
        "base" : baseQuery,
        "where" : whereClause
    };
}

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
   constructor(row, splits) {
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
      this._checked = row.initiallychecked;
   };
}

let cachedVars = null;
let gSplits = null;

async function getVariableSplits(splits) {
    const query = `SELECT variable, variableDisplayName,
                        value, valueDisplayName, noun, adjective, modifier, whereClause,
                      initiallyChecked
                    FROM UIVars ORDER BY sort`;
    let {rows} = await pool.query(query);
    for (const row of rows) {
        new PatientSplitSpecifier(row, splits);
    }
}

function capitalized(s) {
    if (s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
    else {
        return '';
    }
}

function titleCase(s) {
    return s.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function getTreatmentSplits(splits) { 
   query = "SELECT tag, description from TreatmentRef order by tag";
   let {rows} = await pool.query(query);
   for (const row of rows) {
       let tag = row.tag;
       let description = row.description;
       let d = {
           variable: tag,
           variabledisplayname: titleCase(description),
           value: `true_${tag}`,
           valuedisplayname: `Received ${description.toLowerCase()}`,
           noun: null,
           modifier: `getting ${description.toLowerCase()}`,
           adjective: null,
           whereclause: tag.toLowerCase()
       };
       new PatientSplitSpecifier(d, splits);
       d.value = `false_${tag}`;
       d.valuedisplayname = `Did not receive ${description.toLowerCase()}`;
       d.modifier = `not getting ${description.toLowerCase()}`;
       d.whereclause = `not ${tag.toLowerCase()}`;
       new PatientSplitSpecifier(d, splits);
   }
}

function splitSpecifierForComorbidity(splits, tag, tags, group_description, flag) {
    let flagString = "false_";
    let valueStringPrefix = "No reported";
    let modifierPrefix = "with no";
    if (flag) {
        flagString = "true_";
        valueStringPrefix = "Known";
        modifierPrefix = "with";
    }
    let whereClause;
    if (flag) {
        whereClause = "(" + stringJoin(" OR ", tags) + ")";
    }
    else {
        whereClause = "(" + stringJoin(" AND ",  tags.map(s => ` NOT ${s} `))
	     + ")";
    }	
    let d = {
        variable: tag,
        variabledisplayname: titleCase(group_description),
        value: `${flagString}${tag}`,
        valuedisplayname: `${valueStringPrefix} ${group_description.toLowerCase()}`,
        noun: null,
        modifier: `${modifierPrefix} ${group_description.toLowerCase()}`,
        adjective: null,
        whereclause: whereClause,
    };
    new PatientSplitSpecifier(d, splits);
}

async function getComorbiditySplits(splits) {
   query = `SELECT g.tag group_tag, g.description group_name,
                   r.tag, r.description,
                   r.on_by_default
            from ComorbidityGroup g,
                         ComorbidityRef r
            WHERE g.tag = r.grouping
            order by g.sort_key, r.sort_key`;
   let { rows } = await pool.query(query);
   rows.push({'group_tag' : null });
   let prev_group = null;
   let group_description = null;
   let tags;
   for (const row of rows) {
       let group_tag = row['group_tag'];
       if (group_tag != prev_group) {
            if (prev_group != null) {
	        splitSpecifierForComorbidity(splits, prev_group, tags,
		    group_description, true);
	        splitSpecifierForComorbidity(splits, prev_group, tags,
		    group_description, false);
            }
            tags = [];
       }
       tags.push(row['tag']);
       group_description = row['group_name'];
       prev_group = group_tag;
   }
}

async function fetchVars() {
    if (!(cachedVars && gSplits)) {
        let splits = new Map();
	await getVariableSplits(splits);
	await getTreatmentSplits(splits);
        await getComorbiditySplits(splits);
        let items = [];
        splits.forEach( (split, variable, map) => {
          let divisions = [];
          for (const spec of split.splits) {
              divisions.push({"value":spec.value,
                 "valueDisplayName":spec.valueDisplayName,
                 "_checked":spec._checked,
                });
          }
          items.push({id : split.variable,
                      displayName : split.variableDisplayName,
                      splits:divisions});
        });
        cachedVars = items;
        gSplits = splits;
    }
    return {"vars" : cachedVars, "splits": gSplits};
}

exports.vars = async function(req, res, next) {
    if (noisyLog) {
        console.log("Doing vars endpoint");
        console.log(JSON.stringify(req.headers));
    }
    
    try {
        const { vars, splits } = await fetchVars();
        let retval = {
            items: vars,
            version: 0,
        };
        res.json(retval);
    }
    catch (error) {
        console.error(error);
        next(error);
    }
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
    constructor(limitHit=false) {
        this.queries = {};
        this.descriptions = {};
        this.sizeLimit = 32;
        this.count = 0;
        this.limitHit = limitHit;
    };
    addQuery(description, query) {
        if (this.isAtMaxSize()) {
           this.limitHit = true;
           return;
        }
        this.queries[description.toString()] = query;
        this.descriptions[description.toString()] = description;
        this.count++;
    };
    getLabels() {
        return Object.keys(this.queries);
    };
    getCount() {
       return this.count;
    };
    isAtMaxSize() {
       return (this.count >= this.sizeLimit);
    }
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

function mean(values) {
    let count = 0;
    let total = 0;
    for (let num of values) {
        count += 1;
        total += num;
    }
    return total/count;
}

function median(values) {
    values.sort((a, b) => a-b);
    if (values % 2 == 1) {
        let mid = (values.length-1)/2;
	return values[mid];
    }
    else {
        let mid = (values.length-1)/2;
	let low = Math.floor(mid);
	let high = Math.ceil(mid);
	return (values[low]+values[high])/2;
    }
}

function compareArrays(arr1, arr2, mwu) {
    if (arr1.length < 1 || arr2.length < 1) {
        return null;
    }
    result = mwu.test(arr1, arr2);
    p = result.p;
    return Number.parseFloat(p.toPrecision(3));
}

// From MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#sequence_generator_range
const range = (start, stop, step) =>
  Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);

async function makeBinFunction() {
    let d3 = await d3promise; // hack for importing the wrong kind of module
    let bin = d3.bin().domain([-0.25,13.25]).thresholds(range(-0.25, 13.25, 0.5));
    return bin;
}

function makeBaseQuery() {
    return `SELECT viral_load_log viralloadlog
                     FROM DeidentResults `;
}

function makeBaseWhereClause(variableObj) {
    // TODO: how many results does this upper limit trim off? Do we believe this upper limit?
    let whereClause =` WHERE viral_load_log IS NOT NULL `;
    if ('minDate' in variableObj) {
        let minDate = sanitizeDateInput(variableObj.minDate);
        if (minDate) {
            whereClause += `AND collection_when >= '${minDate}' `;
        }
    }
    if ('maxDate' in variableObj) {
        let maxDate = sanitizeDateInput(variableObj.maxDate);
        if (maxDate) {
            whereClause += `AND collection_when <= '${maxDate}' `;
        }
    }
    return whereClause;
}

function splitQueries(queries, splits, variableObj) {
    let variableCount = 0;
    let splitVariableCount = 0;
    let fetchedAllGroups = false;
    let splitDescription = null;
    for (const variable in variableObj) {
        if (splits.get(variable)) {
            let values = variableObj[variable];
	    let split = splits.get(variable);
            let groupsToFetch = split.splits.filter(
                spec => values.indexOf(spec.value) >= 0 );
            ++variableCount;
            if (groupsToFetch.length > 1) {
                ++splitVariableCount;
            }
            if (splitVariableCount > 5) {
               return [ new QuerySet(true), null];
            }
	    if (groupsToFetch.length == split.splits.length) {
	        fetchedAllGroups = true;
		splitDescription = `Across ${split.variableDisplayName}`;
	    }
            queries = makeNewQueries(queries, groupsToFetch);
        }
    }
    if (variableCount != 1 || !fetchedAllGroups) {
        splitDescription = null;
    }
    return [queries, splitDescription];
}

let salt = process.env.JITTER_SALT;
if (!salt) {
   console.error("Warning! Environment var JITTER_SALT not set!!!");
   salt = '';
}

function getJitter(query) {
    let rng = seedrandom(query+salt);
    let jitter = Math.round(7*rng()-3.5);
    return jitter;
}

async function runQuery(label, queryParts) {
    const bin = await makeBinFunction();
    let baseQuery = queryParts["base"];
    let whereClause = queryParts["where"];
    let query = `${baseQuery} ${whereClause}`;
    query = query.trim();
    let jitter = getJitter(query);
    let { rows } = await pool.query(query);
    if (rows.length < 4) {
        return null;
    }
    if (rows.length + jitter < 4) {
       return null;
    }
    let rawData = rows.map(r => parseFloat(r["viralloadlog"]));
    let mean_val = Math.pow(10, mean(rawData));
    mean_val = Number.parseFloat(mean_val.toPrecision(4));
    let pop = {
               "label" : label,
               "mean" : mean_val,
               "count" : rawData.length,
               "comparisons" : []};
    if (pop.count >= 60) {
        //let bins = bin(rawData);
        let d3 = await d3promise; // hack for importing the wrong kind of module
        let densityPoints = d3.scaleLinear().domain([0, 11]).ticks(500);
        let density = kernelDensityEstimator(kernelEpanechnikov(0.5), densityPoints, d3)(rawData);
        /*pop["data"] = bins.filter( r => r.x1 > r.x0 ).map(r => {
                return {
                    "viralLoadLog" : (r.x0+r.x1)/2,
                    "viralLoadLogMin" : r.x0,
                    "viralLoadLogMax" : r.x1,
                    "count" : r.length,
                };
        });*/
        let densityBinWidth = density[2][0] - density[1][0];
        let halfBin = densityBinWidth/2;
        pop["data"] = density.map(a => {
             return {
                    "viralLoadLog" : a[0],
	            "viralLoadLogMin" : a[0] - halfBin,
	            "viralLoadLogMax" : a[0] + halfBin,
	            "count" : a[1]*rawData.length,
             };
        });
    }
    return {rawData: rawData, pop: pop};
}

function peak(data) {
    let maxVal = data[0].count;
    let bestX = data[0].viralLoadLog;
    for (let i = 1; i < data.length; ++i) {
        if (data[i].count > maxVal) {
	    maxVal = data[i].count;
	    bestX = data[i].viralLoadLog;
	}
    }
    return bestX;
}

exports.datafetch = async function(req, res, next) {
    if (noisyLog) {
        console.log("Doing datafetch endpoint");
        console.log(JSON.stringify(req.headers));
    }

    let tooManyQueries = false;
    let mwu = await mwu_promise;
    const { vars, splits } = await fetchVars();
  
    let queries = new QuerySet();
    let splitDescription;
    queries.addQuery(new PatientSetDescription(),
                     {"base":makeBaseQuery(), "where":makeBaseWhereClause(req.query)});
    [queries, splitDescription] = splitQueries(queries, splits, req.query);

    let results = [];
    try {
        let numberOfQueriesAttempted = 0;
        for (let label of queries.getLabels()) {
	    if (results.length >= 8 || numberOfQueriesAttempted >= 32) {
	        tooManyQueries = true;
	        break;
	    }
	    result = await runQuery(label, queries.queries[label]);
            ++numberOfQueriesAttempted;
            if (result) {
	        result.pop.rawData = result.rawData;
                results.push(result.pop);
            }
        }

        for (let pop of results) {
            pop["catagories"] = { "count" : "Count" };
	    pop["median"] = median(pop.rawData);
            if (pop.data) {
            	 pop["peak"] = peak(pop.data);
            }
            else {
                 pop["peak"] = pop["median"];
            }
        }
	//results.sort((a, b) => a.peak - b.peak);
	results.sort((a, b) => a.median - b.median);
	//results.sort((a, b) => a.mean - b.mean);

	for (let i = 0; i < results.length; ++i) {
	    for (let j = 0; j < i; ++j) {
		pop = results[i];
	        rawData = pop.rawData;
		prev = results[j].rawData;
                pvalue = compareArrays(prev, rawData, mwu);
                pop.comparisons.push(pvalue);
	    }
	}

	let colorIndex = 0;
	for (let pop of results) {
           if (pop.data) {
	       pop.shouldPlot = true;
	       pop.colors = colors.getColorSchema(colorIndex++);
           }
           else {
               pop.shouldPlot = false;
	       pop.colors = colors.getPlainColors();
	   }
	   delete pop.peak;
	   delete pop.median;
	   delete pop.rawData;
	}

        res.json({"populations":results, "tooManyQueries":tooManyQueries,
               "tooManyVariables":queries.limitHit,
	       "splitDescription":splitDescription, });
    }
    catch (error) {
        console.log("Error fetching patient data:");
        console.error(error);
        next(error);
    }
}

async function getSpreadsheetHeaders() {
    let query = "SELECT column_name, output_header from OutputColumnNames ORDER BY output_header";
    let {rows} = await pool.query(query);
    let spreadsheetColumnHeaders = {};
    for (const row of rows) {
        let columnName = row["column_name"];
        let outputHeader = row["output_header"];
	spreadsheetColumnHeaders[columnName] = outputHeader;
    }
    return spreadsheetColumnHeaders;
}

async function getLookupTables() {
    let query = "SELECT column_name, lookup_table FROM OutputColumnNames WHERE lookup_table IS NOT NULL";
    let {rows} = await pool.query(query);
    let lookupLookup = {};
    for (const row of rows) {
        let id = row["column_name"];
	lookupLookup[id] = row["lookup_table"];
    }
    return lookupLookup;
}

exports.dataset = async function(req, res, next) {
    let spreadsheetColumnHeaders = await getSpreadsheetHeaders();
    let lookupLookup = await getLookupTables();
    let query = "SELECT ";
    let columns_for_query = [];
    let joins = " ";
    for (const col of Object.keys(spreadsheetColumnHeaders)) {
        if (lookupLookup[col]) {
	    let lookupTableName = lookupLookup[col];
	    columns_for_query.push(`"${lookupTableName}".description ${col}`);
	    joins += `LEFT OUTER JOIN "${lookupTableName}" on "${lookupTableName}".code = ${col}\n`;
	}
	else {
	    columns_for_query.push(col);
	}
    }
    query = `${query} ${stringJoin(", ", columns_for_query)} from DeidentResults \n ${joins}`;
    let { rows } = await pool.query(query);
    let headers = null;
    let data = "";
    for (const row of rows) {
        if (headers == null) {
            headers = Object.keys(row);
            for (const header of headers) {
	        if (!spreadsheetColumnHeaders[header]) {
		   spreadsheetColumnHeaders[header] = header;
		}
                data += `"${spreadsheetColumnHeaders[header]}"`;
                data += ",";
            }
            data += "\r";
        }
        for (const header of headers) {
            if (row[header] != null) {
                data += `"${row[header]}"`;
            }
            data += ",";
        }   
        data += "\r";
    }
    
    res.attachment("viralloads.csv");
    res.status(200).send(data);
}

