const env = process.env.NODE_ENV || 'development';
let credentials = null;
if (process.env.DATABASE_URL) {
   process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
   console.log("Found DATABASE_URL");
   connectionString = process.env.DATABASE_URL;
   credentials = {connectionString,};
   console.log("Using: ", credentials);
}
else {
   credentials = require(`./credentials.${env}.json`);
}
module.exports = { credentials };
