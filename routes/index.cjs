/*
  TODO:
  
  If we are going to use any ES modules (such as d3), convert all this to .mjs? I'm using the
  dynamic import() to get around the module-type mismatch, but there's a warning 
  "ExperimentalWarning: The ESM module loader is experimental."

*/

var express = require('express');
var router = express.Router();

const handlers = require('./handlers.cjs');

/* Currently everything and the kitchen sink in this file.
  Refactor into modules, please. */

    

/* GET home page. */
router.get('/', handlers.home);

router.get('/api/variables', handlers.vars);

router.get('/api/assays', handlers.assays)

router.get('/api/data/viralloads', handlers.datafetch);

module.exports = router;
