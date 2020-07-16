const uuid = require("uuid").v4;
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const VisualRecognitionV3 = require("watson-developer-cloud/visual-recognition/v3");
const db = require("./db");

const TIMEOUT_MS = 20000;

const visualRecognition = new VisualRecognitionV3({
    version: "2018-03-19",
    iam_apikey: process.env.IAM_APIKEY,
});

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));

const TEST_MODE = false;

let numUsers = 0;
const start = Date.now();

const getRoomStatus = (room) => {
    const users = Object.keys(room.users);
    const status = { connectedCount: users.length, counts: {} };
    users.forEach((u) => {
        const user = room.users[u];
        status.counts[user.value] = (status.counts[user.value] || 0) + 1;
    });
    // Add some fake test data for doing the demo since we can't easily get more than 5 people
    const getRandomInt = (max) => Math.floor(Math.random() * Math.floor(max));
    if (TEST_MODE && Date.now() - start > 10000 && numUsers < 10) {
        numUsers += 2;
        let total = numUsers;
        const ang = getRandomInt(4);
        total -= ang;
        const neu = getRandomInt(5);
        total -= neu;
        const sur = getRandomInt(4);
        status.counts = {
            ...status.counts,
            ANG: ang < 0 ? 0 : ang,
            NEU: (neu + total) < 0 ? 0 : neu + total,
            SUR: sur < 0 ? 0 : sur,
        };
    }
    return status;
};

router.post("/create-room", (req, res) => {
    const room = { _id: uuid(), created: Date.now(), users: {} };
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
    const userIds = Object.keys(room.users);
    const toDelete = [];
    for (const u of userIds) {
        if (Date.now() - room.users[u].statusTime > TIMEOUT_MS) {
            toDelete.push(u);
        }
    }
    if (toDelete.length) {
        for (const id of toDelete) {
            delete room.users[id];
        }
        await db.connection.insert(room).catch((e) => {
            console.log("error inserting", room, ":", e);
            res.sendStatus(500);
        });
    }
    const status = getRoomStatus(room);
    res.json(status);
});

const gotUserEmotions = async (classes, user, roomId, res) => {
    let bestClass = { score: 0 };
    for (const cls of classes) {
        if (cls.score > bestClass.score) {
            bestClass = cls;
        }
    }
    const room = await db.connection.get(roomId);
    const newRoom = { ...room };
    if (bestClass.name) {
        newRoom.users[user] = {
            value: bestClass,
            statusTime: Date.now(),
        };
        await db.connection.insert(newRoom).catch((e) => {
            console.log("error inserting", newRoom, ":", e);
            res.sendStatus(500);
        });
    }
    res.json(getRoomStatus(newRoom));
};

router.post("/getEmotions", async (req, res) => {
    if (!req.body || !req.body.image || !req.body.user || !req.body.room) {
        res.sendStatus(400);
        return;
    }

    const base64Data = req.body.image.replace(/^data:image\/png;base64,/, "");

    // TODO shouldn't need to hit disk here but I can't figure out how to make a working stream from memory
    const filename = `${uuid()}.png`;
    fs.writeFile(filename, base64Data, "base64", (err) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        const params = {
            images_file: fs.createReadStream(filename),
            classifier_ids: ["fullSource_317313030"],
            threshold: 0.6,
        };

        visualRecognition.classify(params, (e, response) => {
            if (e || !response.images || !response.images.length) {
                console.log(e || "No images in response");
                res.sendStatus(500);
            } else {
                fs.unlinkSync(filename);
                gotUserEmotions(response.images[0].classifiers[0].classes, req.body.user, req.body.room, res);
            }
        });
    });
});

/*
// gets the ai's best classification of a passed image
async function classifyImage(imagesFile, owners, threshold) {
    console.log("made");
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
*/
module.exports = router;
