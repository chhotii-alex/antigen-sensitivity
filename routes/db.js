const { credentials } = require('./config');

const { Client } = require( 'pg' );
const { connectionString } = credentials.connectionString;
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
    ) VALUES ($1, $2, $3, $3)`;

// Add more data here    (loop)
const popPhoneyData = async client => {
    await client.query(insertStatement, ['n', 0, 's', 'y']);
}    

client.connect()
    .then(async () => {
        try {
            console.log("Creating database schema if needed");
            await client.query(createScript);
            const recordCount = await getRecordCount(client);
            if (recordCount < 1) {
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
