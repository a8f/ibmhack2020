const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
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
app.use(bodyParser.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "./public")));

// Routes
app.use("/api", api);
app.get("/:id", (req, res) => {
    res.sendFile("public/room.html", { root: __dirname });
});

// Start the server
const port = process.env.PORT || 3333;
app.listen(port, () => console.log(`Started on port ${port}`));
