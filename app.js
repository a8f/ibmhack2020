const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const bodyParser = require("body-parser");
const VisualRecognitionV3 = require("watson-developer-cloud/visual-recognition/v3");
const fs = require("fs");
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
app.get("/:id", (req, res) => {
    res.sendFile("public/room.html", { root: __dirname });
});

// Start the server
const port = process.env.PORT || 3333;
app.listen(port, () => console.log(`Started on port ${port}`));

// Classifier
const visualRecognition = new VisualRecognitionV3({
    version: "2018-03-19",
    iam_apikey: "ijUdnh5zOWte6BT1d2ZPKDjOGunx6ottz7XxRVHxjSai",
});

const params = {
    images_file: fs.createReadStream("/Users/zhuoyue/Desktop/1.jpg"),
    classifier_ids: ["fullSource_317313030"],
    threshold: 0.6,
};

visualRecognition.classify(params, (err, response) => {
    if (err) {
        console.log(err);
    } else {
        console.log(JSON.stringify(response, null, 2));
    }
});
