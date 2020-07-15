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
let cameraEnabled = false;
const updateRate = 30000; // ms between updates
const room = window.location.pathname.slice(1);

const createRoom = async () => {
    const res = await apiFetch("/create-room", { method: "POST" });
    const roomId = await res.text();
    window.location.href = roomId;
};

const updateContent = () => {
    const loadingDiv = document.querySelector("#loading");
    const statusDiv = document.querySelector("#status");
    if (!status) {
        statusDiv.style.display = "none";
        loadingDiv.style.display = "block";
        return;
    }

    const connectedCount = document.querySelector("#connected-count");
    connectedCount.textContent = `${status.connectedCount} connected`;
    // TODO
    loadingDiv.style.display = "none";
    statusDiv.style.display = "block";
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
    // TODO intermittently post camera image to the server
};

window.onload = () => {
    const id = localStorage.getItem("id");
    if (id) {
        uid = id;
    } else {
        uid = uuid();
        localStorage.setItem("id", uid);
    }
    const createButton = document.querySelector("#create-button");
    const participateButton = document.querySelector("#participate-button");
    if (room) {
        createButton.style.display = "none";
        participateButton.addEventListener("click", enableCamera);
        getStatusForever();
    } else {
        createButton.addEventListener("click", createRoom);
        participateButton.style.display = "none";
        document.querySelector("#loading").style.display = "none";
    }
};
