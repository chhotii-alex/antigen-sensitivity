import credentialsModule from "./config.js";
const connectionString = credentialsModule.credentials.connectionString;

import * as d3 from "d3";

console.log('using d3');
console.log(d3.randomNormal(0.4, 0.1)());
console.log("Using d3 again");
console.log(d3.randomNormal(50, 10)());

import pgModule from 'pg';
const Client = pgModule.Client;

const client = new Client({ connectionString });

const createScript = `
    CREATE TABLE IF NOT EXISTS test_results (
        id serial PRIMARY KEY,
        positive boolean,
        viralLoadLog real,
        sneetchType char(1) NULL,
        vaccinated boolean
    );
`;

const getRecordCount = async client => {
    const { rows } = await client.query("SELECT COUNT(*) FROM test_results");
    return Number(rows[0].count);
}

const insertStatement = `
    INSERT INTO test_results(
        positive, 
        viralLoadLog,
        sneetchType,
        vaccinated
    ) VALUES ($1, $2, $3, $4)`;

// Add more data here    (loop)
const popPhoneyData = async client => {
    console.log("inserting data...");
    let sneetchTypes = {'s' : 2, 'n' : 4};
    let bools = {'y' : 3, 'n': 7};
    for (let sn in sneetchTypes) {
        for (let v in bools) {
            let generator = d3.randomNormal(bools[v], sneetchTypes[sn]);
            for (let j = 0; j < 20; ++j) {
                let vl = generator();
                if (vl > 0 && vl < 12) {
                    await client.query(insertStatement, ['y', vl, sn, v]);
                }
            }
        }
    }
    console.log("Done!");
} 

client.connect()
    .then(async () => {
        try {
            console.log("Creating database schema if needed");
            await client.query(createScript);
            const recordCount = await getRecordCount(client);
            console.log(`Currently ${recordCount} rows in db`);
            if (recordCount < 1000) {
                console.log("populating some phoney data");
                await popPhoneyData(client);
            }
        }
        catch (err) {
            console.log('ERROR: could not initialize database');
            console.log(err.message);
        }
        finally {
            client.end();
        }
    })
    .catch( err => {
        console.log("Failed to connect to database");
        console.log(err);
    });
