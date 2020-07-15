const Cloudant = require("@cloudant/cloudant");
const fs = require("fs");

const db = {};

const savedCreds = JSON.parse(fs.readFileSync("db_creds.json"));
const creds = { url: savedCreds.url, plugins: { iamauth: { iamApiKey: savedCreds.apikey } } };
Cloudant(creds, (err, cloudant) => {
    if (err) {
        console.log(`Error connecting to database: ${err.message}`);
        process.exit(1);
    }
    db.connection = cloudant.db.use("hackathon2020");
});
module.exports = db;
