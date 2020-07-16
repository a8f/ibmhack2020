const uuid = require("uuid").v4;
const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const steamifier = require("streamifier");
const fs = require("fs");
const VisualRecognitionV3 = require("ibm-watson/visual-recognition/v3");
const { IamAuthenticator } = require("ibm-watson/auth");

const db = require("./db");

const TIMEOUT_MS = 20000;

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));

router.post("/create-room", (req, res) => {
    const room = { _id: uuid(), created: Date.now(), users: [] };
    db.connection.insert(room, (err, result) => {
        if (err) {
            console.log("error inserting", room, ":", err);
            res.sendStatus(500);
        } else {
            res.status(200).send(room._id);
        }
    });
});

router.get("/status/:roomId", async (req, res) => {
    const room = await db.connection.get(req.params.roomId);
    const users = room.users.filter((u) => Date.now() - u.statusTime < TIMEOUT_MS);
    if (users !== room.users) {
        room.users = users;
        await db.connection.insert(room).catch((e) => {
            console.log("error inserting", room, ":", e);
            res.sendStatus(500);
        });
    }
    const status = { average: "happy", connectedCount: room.users.length, counts: {} };
    room.users.forEach((u) => {
        status.counts[u.value] = (status.counts[u.value] || 0) + 1;
    });
    status.counts = { happy: 5, sad: 4, neutral: 9 }; // TODO remove
    res.json(status);
});


const visualRecognition = new VisualRecognitionV3({
    version: process.env.WATSON_VISUAL_RECOGNITION_VERSION,
    authenticator: new IamAuthenticator({
        apikey: process.env.WATSON_VISUAL_RECOGNITION_APIKEY,
    }),
    url: process.env.WATSON_VISUAL_RECOGNITION_URL,
});
/*
(async () => {
    // train w/ passed files
    // const response = await visualRecognition.createClassifier({
    //     name: "emotions_binary_withNegatives",
    //     positiveExamples: {
    //         positive: fs.createReadStream('/Users/vlad/Downloads/positive.zip'),
    //         negative: fs.createReadStream('/Users/vlad/Downloads/negative.zip'),
    //         neutral: fs.createReadStream('/Users/vlad/Downloads/neutral.zip'),
    //     },
    //     negativeExamples: fs.createReadStream('/Users/vlad/Downloads/negatives.zip')
    // })

    // delete created classifier
    // console.log(JSON.stringify(response, null, 2));
    // await visualRecognition.deleteClassifier({
    //     classifierId: "emotions_924462837"
    // });

    console.log((await visualRecognition.listClassifiers({
        verbose: true,
    })).result);
})();
*/

// endpoint accepts an array of images (<999) to classify. Image will NOT be classified if > 10MB
// temporarily stores images as a buffer (w/o saving them to local storage)
router.post("/getEmotions", async (req, res) => {
    console.log("REACHED")
    console.log(req.body)
    const stream = fs.createReadStream(s[0]);
    const classification = await classifyImage(stream, ["me"], 0.0); //! since we're only doing one image at a time this is fine.
    res.send(classification);

    // const upload = multer({ storage: multer.memoryStorage() }).array("image");
    // upload(req, res, async (err) => {
    //     if (err) {
    //         return res.send(`Error: ${err}`);
    //     }
    //     if (!req.files) {
    //         return res.send("Error: you must pass a files with data label 'image' to this endpoint"); // curl -F 'image=@/path/to/image' localhost:3333/api/emotions
    //     }
    //     if (req.files.length > 999) {
    //         return res.send("Error: You may not send more than 999 files at a time to this endpoint");
    //     }
    //     const classificationTable = {};
    //     console.log(req.file)
    //     for (const file of req.files) {
    //         console.log(file, "file")
    //         try {
    //             // keeps track of the best 3 classifications
    //             const tempClassification = await classifyImage(steamifier.createReadStream(file.buffer), ["me"], 0.0);
    //             if (Object.values(classificationTable).length < 3) {
    //                 if (classificationTable[tempClassification.class]) { // classification is already in the table, add score and average
    //                     classificationTable[tempClassification.class] = (classificationTable[tempClassification.class] + tempClassification.score) / 2.0;
    //                 } else { // not in table
    //                     classificationTable[tempClassification.class] = tempClassification.score;
    //                 }
    //             } else {
    //                 // checks if the smallest saved classification score is less than the current classification score, if it is, replaces them
    //                 const worstClassificationClass = Object.keys(classificationTable).reduce((a, b) => (classificationTable[a] < classificationTable[b] ? a : b));
    //                 if (classificationTable[worstClassificationClass] < tempClassification.score) {
    //                     delete classificationTable[worstClassificationClass];
    //                     classificationTable[tempClassification.class] = tempClassification.score;
    //                 }
    //             }
    //         } catch (e) {
    //             console.log(e); // continues classifying images
    //         }
    //     }
    //     console.log(classificationTable, 2)
    //     return res.send(classificationTable);
    // });
});

// gets the ai's best classification of a passed image
async function classifyImage(imagesFile, owners, threshold) {
    console.log("made")
    const { result } = await visualRecognition.classify({
        imagesFile,
        owners, // use ['me'] for watson to use your dataset to analize image
        threshold, // minimum confidence interval
    });
    let bestClassification = { class: "", score: 0 };
    for (const classification of result.images[0].classifiers[0].classes) {
        console.log(classification);
        if (classification.score > bestClassification.score) {
            bestClassification = classification;
        }
    }
    return bestClassification;
}

module.exports = router;
