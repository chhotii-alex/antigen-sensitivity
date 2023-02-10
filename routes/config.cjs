const env = process.env.NODE_ENV || 'development';
let credentials = null;
if (process.env.DATABASE_URL) {
   console.log("Found DATABASE_URL");
   connectionString = process.env.DATABASE_URL;
   // This is a hack:
   connectionString = connectionString.replace("require", "allow");
   credentials = {connectionString,};
   console.log("Using: ", credentials);
}
else {
   credentials = require(`./credentials.${env}.json`);
}
module.exports = { credentials };
