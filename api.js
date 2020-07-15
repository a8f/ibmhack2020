const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const steamifier = require('streamifier');
const VisualRecognitionV3 = require('ibm-watson/visual-recognition/v3');
const { IamAuthenticator } = require('ibm-watson/auth');
const { MaxKey } = require('mongodb');

const visualRecognition = new VisualRecognitionV3({
    version: process.env.WATSON_VISUAL_RECOGNITION_VERSION,
    authenticator: new IamAuthenticator({
        apikey: process.env.WATSON_VISUAL_RECOGNITION_APIKEY,
    }),
    url: process.env.WATSON_VISUAL_RECOGNITION_URL,
})

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));

// endpoint accepts an array of images (<999) to classify
// temporarily stores images as a buffer (w/o saving them to local storage)
// returns top 3 classifications and their prevalence
router.post('/getEmotions', (req, res) => {
    let upload = multer({ storage: multer.memoryStorage() }).array('image');
    upload(req, res, async (err) => {
        if (err) {
            return res.send("Error: " + err);
        }
        if (!req.files) {
            return res.send("you must pass a files with data label 'image' to this endpoint"); // curl -F 'image=@/path/to/image' localhost:3333/api/emotions
        }
        if (req.files.length > 999) {
            return res.send("You may not send more than 999 files at a time to this endpoint")
        }
        // todo: get top 3 classifications not just 1
        const classificationTable = {};
        for (const file of req.files) {
            try {
                // keeps track of the best 3 classifications
                const tempClassification = await classifyImage(steamifier.createReadStream(file.buffer), ['IBM'], 0.0);
                if (Object.values(classificationTable).length < 3) {
                    if (classificationTable[tempClassification.class]) { // classification is already in the table, add score and average
                        classificationTable[tempClassification.class] = (classificationTable[tempClassification.class] + tempClassification.score)/2.0
                    } else { // not in table
                        classificationTable[tempClassification.class] = tempClassification.score;
                    }
                } else {
                    // checks if the smallest saved classification score is less than the current classification score, if it is, replaces them
                    const worstClassificationClass = Object.keys(classificationTable).reduce((a, b) => classificationTable[a] < classificationTable[b] ? a : b);
                    if (classificationTable[worstClassificationClass] < tempClassification.score) {
                        delete classificationTable[worstClassificationClass];
                        classificationTable[tempClassification.class] = tempClassification.score;
                    }
                }
            } catch (e) {
                console.log(e); // continues classifying images
            }
        }
        console.log(classificationTable)
        return res.send("pass")
    });
});

// gets the ai's best classification of a passed image
async function classifyImage(imagesFile, classifier_ids, threshold) {
    const { result } = await visualRecognition.classify({
        imagesFile: imagesFile,
        classifier_ids: classifier_ids, //! change to 'me' in the future to use personal classification
        threshold: threshold // minimum confidence interval
    });
    let bestClassification = { class: "", score: 0 }
    for (const classification of result.images[0].classifiers[0].classes) {
        if (classification.score > bestClassification.score) {
            bestClassification = classification;
        }
    }
    return bestClassification;
}

module.exports = router;
