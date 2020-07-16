"use strict";

const db = require("../../db");

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
// Variables for chart
const chartHeight = 500;
const chartData = [];
let globalX = 0;
let x;
let y;
const max = 500;
const step = 50;
const smoothLines = {};
const duration = 500;
let xAxis;
let axisX;
const paths = {};
let chart;
const EMOTION_COLORS = { sad: "red", happy: "green", neutral: "white" };

const updateRate = 9000; // ms between updates
const room = window.location.pathname.slice(1);

const updateContent = () => {
    const loadingDiv = document.querySelector("#loading");
    const statusDiv = document.querySelector("#status");
    if (!status) {
        statusDiv.style.display = "none";
        loadingDiv.style.display = "block";
        return;
    }

    let count = 0;
    const statusBreakdown = document.querySelector("#status-breakdown");
    statusBreakdown.innerHTML = "";
    Object.keys(status.counts).forEach((emotion) => {
        count += status.counts[emotion];
        const div = document.createElement("div");
        div.className = "emotion-count";
        div.style.display = "flex";
        div.style.flexDirection = "row";
        const circle = document.createElement("div");
        circle.className = "circle";
        circle.style.backgroundColor = EMOTION_COLORS[emotion];
        div.appendChild(circle);
        div.appendChild(document.createTextNode(`${status.counts[emotion]} ${emotion}`));
        statusBreakdown.appendChild(div);
    });
    const connectedCount = document.querySelector("#connected-count-value");
    connectedCount.textContent = count;
    loadingDiv.style.display = "none";
    statusDiv.style.display = "flex";
    updateChart(status);
};

const updateStatus = async () => {
    const res = await apiFetch(`/status/${room}`);
    status = await res.json();
    updateChart(status);
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

const getCamSnapshot = async () => { // TODO: get this to repeat every X seconds
    if (!video) {
        console.log("tried to take image when camera not enabled");
        return;
    }

    // TODO: send picture through post request,
    // TODO: end up locally saving image and passing path through post req.
    //camContext.drawImage(video, 0, 0, 400, 400);
    let imagepng = (document.getElementById("camCanvas")).toDataURL('image/png');
    let image = new Image;
    image.src = imagepng
    // console.log(fd)
    const classification = await $.ajax({
        url: 'http://localhost:3333/api/getEmotions',
        data: imagepng, //! cannot get this data to pass properlyyyyyy ugh
        type: 'POST',
        //dataType: false,
        //processData: false,
    });

    // classification is: { class: classification_name, score: classification_score }
    db.connection.insert(classification, (err, result) => { // TODO: confirm this is working as we want it
        if (err) {
            console.log("error inserting", classification, ":", err);
            res.sendStatus(500);
        } else {
            res.status(200).send();
        }
    });
};

// Charts adapted from http://bl.ocks.org/denisemauldin/ceb7065687c125223339a26a47d58a28
const initChart = () => {
    const width = 500;
    chart = d3.select("#chart")
        .attr("width", width + 50)
        .attr("height", chartHeight + 50);
    x = d3.scaleLinear().domain([0, 500]).range([0, 500]);
    y = d3.scaleLinear().domain([0, 10]).range([500, 0]);

    const line = d3.line()
        .x((d) => x(d.x))
        .y((d) => y(d.y));

    xAxis = d3.axisBottom().scale(x).tickValues([]);
    axisX = chart.append("g").attr("class", "x axis")
			     .attr("transform", "translate(0, 500)")
			     .call(xAxis);
    // TODO once we know all the classes they should all have a point drawn at 0 here so the first actual datapoint
    // has a line (atm the line is only drawn after the 2nd status update)
};

const updateChart = (newStatus) => {
    if (!newStatus.counts) return;
    const emotions = Object.keys(newStatus.counts);
    emotions.forEach((emotion) => {
        if (!paths[emotion]) {
            paths[emotion] = chart.append("path");
        }
        const point = { x: globalX, y: newStatus.counts[emotion] };
        if (!chartData[emotion]) {
            chartData[emotion] = [];
        }
        chartData[emotion].push(point);
        if (!smoothLines[emotion]) {
            smoothLines[emotion] = d3.line().curve(d3.curveCardinal)
                .x((d) => x(d.x))
                .y((d) => y(d.y));
        }
        paths[emotion].datum(chartData[emotion])
            .attr("class", "smoothline")
            .attr("style", `stroke: ${EMOTION_COLORS[emotion]}`)
            .attr("d", smoothLines[emotion]);
    });
    // Shift the chart left
    globalX += step;
    x.domain([globalX - (max - step), globalX]);
    axisX.transition()
        .duration(duration)
        .ease(d3.easeLinear, 2)
        .call(xAxis);
    emotions.forEach((emotion) => {
        paths[emotion].attr("transform", null)
            .transition()
            .duration(duration)
            .ease(d3.easeLinear, 2)
            .attr("transform", `translate(${x(globalX - max)})`);
        if (chartData[emotion].length > 30) chartData[emotion].shift();
    });
};

const toggleChart = () => {
    const chart = document.getElementById("chart");
    chart.style.display = chart.style.display === "none" ? "block" : "none";
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
    document.getElementById("chart-toggle").addEventListener("click", toggleChart);
    initChart();
    getStatusForever();
};


