const { pool } = require('./database.cjs');

let mwu_promise = import('./mannwhitneyu.js');

let d3promise = import('d3');

const { sanitizeDateInput } = require('./util.cjs');
const colors  = require('./colors.cjs');

console.log("webapp routes launching...")

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
   };
}

let cachedVars = null;
let gSplits = null;

async function getVariableSplits(splits) {
    const query = `SELECT variable, variableDisplayName,
                        value, valueDisplayName, noun, adjective, modifier, whereClause
                    FROM UIVars ORDER BY sort`;
    let {rows} = await pool.query(query);
    for (const row of rows) {
        new PatientSplitSpecifier(row, splits);
    }
}

async function getTreatmentSplits(splits) { 
   query = "SELECT tag, description from TreatmentRef order by tag";
   let {rows} = await pool.query(query);
   for (const row of rows) {
       let tag = row.tag;
       let description = row.description;
       let d = {
           variable: tag,
           variabledisplayname: description,
           value: `true_${tag}`,
           valuedisplayname: `received ${description}`,
           noun: null,
           modifier: `getting ${description}`,
           adjective: null,
           whereclause: tag.toLowerCase()
       };
       new PatientSplitSpecifier(d, splits);
       d.value = `false_${tag}`;
       d.valuedisplayname = `did not receive ${description}`;
       d.modifier = `not getting ${description}`;
       d.whereclause = `not ${tag.toLowerCase()}`;
       new PatientSplitSpecifier(d, splits);
   }
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
                let tag = prev_group;
                let d = {
                    variable: tag,
                    variabledisplayname: group_description,
                    value: `true_${tag}`,
                    valuedisplayname: `has ${group_description}`,
                    noun: null,
                    modifier: `having ${group_description}`,
                    adjective: null,
                    whereclause: "(" + stringJoin(" OR ", tags) + ")",
                };
                new PatientSplitSpecifier(d, splits);
                d.value = `false_${tag}`;
                d.valuedisplayname = `not having ${group_description}`;
                d.modifier = `not having ${group_description}`;
                d.whereclause = "(" + stringJoin(" AND ",
                                                 tags.map(s => ` NOT ${s} `))
                                + ")";
                new PatientSplitSpecifier(d, splits);
            }
            tags = [];
       }
       tags.push(row['tag']);
       group_description = row['group_name'];
       prev_group = group_tag;
   }
}

async function fetchVars() {
    console.log("Getting vars");
    if (!(cachedVars && gSplits)) {
        let splits = new Map();
	await getVariableSplits(splits);
	await getTreatmentSplits(splits);
        await getComorbiditySplits(splits);
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
        gSplits = splits;
    }
    return {"vars" : cachedVars, "splits": gSplits};
}

exports.vars = async function(req, res, next) {
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

function compareArrays(arr1, arr2, mwu) {
    if (arr1.length < 1 || arr2.length < 1) {
        return null;
    }
    result = mwu.test(arr1, arr2);
    return result.p;
}

// From MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#sequence_generator_range
const range = (start, stop, step) =>
  Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step);

exports.datafetch = async function(req, res, next) {
    console.log("doing datafetch");
    const { vars, splits } = await fetchVars();
    let d3 = await d3promise; // hack for importing the wrong kind of module
    let mwu = await mwu_promise;
    let bin = d3.bin().domain([-0.25,13.25]).thresholds(range(-0.25, 13.25, 0.5));
    let baseQuery = `SELECT log(viral_load) viralloadlog
                     FROM DeidentResults `
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
                     {"base":baseQuery, "where":whereClause});
    for (const variable in req.query) {
        if (splits.get(variable)) {
            let values = req.query[variable];
            let groupsToFetch = splits.get(variable).splits.filter(
            spec => values.indexOf(spec.value) >= 0 );
            queries = makeNewQueries(queries, groupsToFetch);
        }
    }

    let rawDataPrev = [];
    let results = [];
    let index = 0;
    try {
        for (let label of queries.getLabels()) {
            queryParts = queries.queries[label];
            baseQuery = queryParts["base"];
            whereClause = queryParts["where"];
            query = `${baseQuery} ${whereClause}`;
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
            pop["data"] = bins.filter( r => r.x1 > r.x0 ).map(r => {
                return {
                    "viralLoadLog" : (r.x0+r.x1)/2,
                    "viralLoadLogMin" : r.x0,
                    "viralLoadLogMax" : r.x1,
                    "count" : r.length,
                };
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
    catch (error) {
        console.log("Error fetching patient data:");
        console.error(error);
        next(error);
    }
}

exports.dataset = async function(req, res, next) {
    let query = "SELECT * from DeidentResults";
    let { rows } = await pool.query(query);
    let headers = null;
    let data = "";
    for (const row of rows) {
        if (headers == null) {
            headers = Object.keys(row);
            for (const header of headers) {
                data += header;
                data += ",";
            }
            data += "\r";
        }
        for (const header of headers) {
            if (row[header] != null) {
                data += row[header];
            }
            data += ",";
        }   
        data += "\r";
    }
    
    res.attachment("viralloads.csv");
    res.status(200).send(data);
}

function intervalFunc() {
    console.log('node app is running', new Date());
    ++intervalCount;
    if (intervalCount > 10) {
        interval = interval * 2;
        clearInterval(intervalID);
        intervalID = setInterval(intervalFunc, interval);
        intervalCount = 0;
    }  
}

let interval = 4000;
let intervalID = setInterval(intervalFunc, interval);
let intervalCount = 0;
