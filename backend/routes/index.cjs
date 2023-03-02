/*
  TODO:
  
  If we are going to use any ES modules (such as d3), convert all this to .mjs? I'm using the
  dynamic import() to get around the module-type mismatch, but there's a warning 
  "ExperimentalWarning: The ESM module loader is experimental."

*/

var express = require('express');
var cors = require('cors');
var router = express.Router();

const handlers = require('./handlers.cjs');

/* Currently everything and the kitchen sink in this file.
  Refactor into modules, please. */

    

router.get('/api/variables', cors(), handlers.vars);

router.get('/api/assays', cors(), handlers.assays);

router.get('/api/data/viralloads', cors(), handlers.datafetch);

/* NOPE router.get('/dataset', cors(), handlers.dataset);  */

module.exports = router;

console.log("Did index.cjs");
