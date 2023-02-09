const env = process.env.NODE_ENV || 'development';
let credentials = null;
if (process.env.DATABASE_URL) {
   console.log("Found DATABASE_URL");
   credentials = {
     "host" : process.env.DATABASE_URL,
    "port" : 5432,
    "dbname" : "deident",
    "connect_timeout" : 10,
    "user" : "webapp",
    "password" : "LieutenantCommander"
   };
   console.log("Using: ", credentials);
}
else {
   credentials = require(`./credentials.${env}.json`);
}
module.exports = { credentials };
