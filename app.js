const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const logger = require("morgan");
const bodyParser = require("body-parser");

const api = require("./api");

const app = express();

// Middleware
app.use(logger("dev"));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "./public")));

// Routes
app.use("/api", api);

// Database
const dbUrl = process.env.DB_URL || "mongodb://localhost/ibmhack2020";
mongoose.connect(dbUrl, {
    useNewUrlParser: true, useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", (e) => {
    console.log(e, "\nError connecting to database, exiting");
    process.exit();
});
db.on("open", () => console.log(`Connected to database at ${dbUrl}`));

// Start the server
const port = process.env.PORT || 3333;
app.listen(port, () => console.log(`Started on port ${port}`));
