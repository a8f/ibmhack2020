"use strict";

const BASE_API_URL = "/api";
const apiUrl = (l) => `${BASE_API_URL + (!l || !l.length ? "" : (l[0] === "/" ? l : `/${l}`))}`;

function uuid() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g,
        (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

/*
 * Wrapper around fetch API to send requests to BASE_API_URL/path with options options
 * If body is set to an object then it is converted to JSON and headers are set for JSON
 *
 * path is a URL or a path relative to BASE_API_URL
 * options are fetch API options
 */
const apiFetch = async (path, options) => {
    const reqOptions = { ...options, credentials: "include" };
    if (options && options.body && typeof options.body !== "string") {
        reqOptions.body = JSON.stringify(options.body);
        reqOptions.headers = { "Content-type": "application/json; charset=UTF-8" };
    }
    return fetch(path.startsWith("http") ? path : apiUrl(path), reqOptions);
};

let uid = null;
let status = null;
let video;
let webcamStream;
let camContext;
let cameraEnabled = false;
const updateRate = 30000; // ms between updates
const room = window.location.pathname.slice(1);

const updateContent = () => {
    const loadingDiv = document.querySelector("#loading");
    const statusDiv = document.querySelector("#status");
    if (!status) {
        statusDiv.style.display = "none";
        loadingDiv.style.display = "block";
        return;
    }

    const connectedCount = document.querySelector("#connected-count-value");
    connectedCount.textContent = status.connectedCount || 0;
    const statusBreakdown = document.querySelector("#status-breakdown");
    statusBreakdown.innerHTML = "";
    Object.keys(status.counts).forEach((emotion) => {
        const div = document.createElement("div");
        div.className = "emotion-count";
        div.appendChild(document.createTextNode(`${status.counts[emotion]} ${emotion}`));
        statusBreakdown.appendChild(div);
    });
    // TODO
    loadingDiv.style.display = "none";
    statusDiv.style.display = "flex";
};

const updateStatus = async () => {
    const res = await apiFetch(`/status/${room}`);
    status = await res.json();
    console.log("got updated status", status);
};

const getStatusForever = async () => {
    if (cameraEnabled) {
        return;
    }
    updateStatus().then(updateContent).then(setTimeout(getStatusForever, updateRate));
};

const enableCamera = () => {
    cameraEnabled = true;
    initCam();
    document.getElementById("participate-button").style.display = "none";
    document.getElementById("stop-participate-button").style.display = "block";
    // TODO intermittently post camera image to the server
};

const disableCamera = () => {
    cameraEnabled = false;
    document.getElementById("participate-button").style.display = "block";
    document.getElementById("stop-participate-button").style.display = "none";
};

const copyCurrentUrl = () => {
    const copyText = document.getElementById("copy-dummy");
    copyText.type = "text";
    copyText.value = window.location.href;
    copyText.select();
    document.execCommand("copy");
    copyText.type = "hidden";
    const copied = document.getElementById("copied");
    copied.style.display = "inline-block";
    setTimeout(() => {
        copied.style.display = "none";
    }, 1000);
};

const initCam = () => {
    const canvas = document.getElementById("camCanvas");
    camContext = canvas.getContext("2d");
    navigator.getUserMedia = (navigator.getUserMedia
                             || navigator.webkitGetUserMedia
                             || navigator.mozGetUserMedia
                             || navigator.msGetUserMedia);
    if (navigator.getUserMedia) {
        navigator.getUserMedia(

            // constraints
            {
                video: true,
                audio: false,
            },

            // successCallback
            (localMediaStream) => {
                video = document.querySelector("video");
                video.srcObject = localMediaStream;
                webcamStream = localMediaStream;
            },

            // errorCallback
            (err) => {
                console.log(`The following error occured: ${err}`);
            },
        );
    } else {
        console.log("getUserMedia not supported");
    }

    setTimeout(getCamSnapshot, 3000);
};

const getCamSnapshot = () => {
    if (!video) {
        console.log("tried to take image when camera not enabled");
        return;
    }
    camContext.drawImage(video, 0, 0, 400, 400);
};

window.onload = () => {
    const id = localStorage.getItem("id");
    if (id) {
        uid = id;
    } else {
        uid = uuid();
        localStorage.setItem("id", uid);
    }
    document.getElementById("participate-button").addEventListener("click", enableCamera);
    document.getElementById("stop-participate-button").addEventListener("click", disableCamera);
    document.getElementById("copy-link").addEventListener("click", copyCurrentUrl);
    getStatusForever();
};
