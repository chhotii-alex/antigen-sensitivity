// Database connection stuff
const { Pool } = require('pg');
const { credentials } = require('./config.cjs');

pool = new Pool(credentials);
pool
  .connect()
  .then(client => {
     console.log("Connected to database!");
     client.release();
     })
  .catch(err => console.error('error connecting', err.stack));
  
exports.pool = pool;
