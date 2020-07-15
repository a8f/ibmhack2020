const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const steamifier = require('streamifier');
const VisualRecognitionV3 = require('ibm-watson/visual-recognition/v3');
const { IamAuthenticator } = require('ibm-watson/auth');

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
        const table = {};
        for (const file of req.files) {
            try {
                await classifyImage(steamifier.createReadStream(file.buffer), ['IBM'], 0.0);
            } catch (e) {
                console.log(e); // continues classifying images
            }
        }
        return res.send("pass")
    });
});

// gets the ai's classification of the uploaded image
async function classifyImage(imagesFile, classifier_ids, threshold) {
    const { result } = await visualRecognition.classify({
        imagesFile: imagesFile,
        classifier_ids: classifier_ids, //! change to 'me' in the future to use personal classification
        threshold: threshold // minimum confidence interval
    })
    const classifications = {}
    console.log(result.images[0].classifiers[0])
    for (const classification of result.images[0].classifiers[0].classes) {
        classifications[classification.class] = classification.score;
    }
    return classifications;
}

module.exports = router;
