const Cloudant = require("@cloudant/cloudant");
const fs = require("fs");

const db = {};

// const savedCreds = JSON.parse(fs.readFileSync("db_creds.json"));
// const creds = { url: savedCreds.url, plugins: { iamauth: { iamApiKey: savedCreds.apikey } } };
const creds = { url: "https://4e3044f8-e34f-463d-924a-638151ba13cf-bluemix.cloudantnosqldb.appdomain.cloud", plugins: { iamauth: { iamApiKey: "6UnH3Iw-MRytC2bUn6WhjS_1dgeeLo5OqO5_02Lsnit0" } } };
Cloudant(creds, (err, cloudant) => {
    if (err) {
        console.log(`Error connecting to database: ${err.message}`);
        process.exit(1);
    }
    db.connection = cloudant.db.use("hackathon2020");
});
module.exports = db;
