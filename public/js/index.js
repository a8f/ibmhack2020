"use strict";

function uuid() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g,
        (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}

let uid = null;

const createRoom = async () => {
    document.querySelector("#loading-room").style.display = "block";
    document.querySelector("#create-button").style.display = "none";
    const res = await fetch("/api/create-room", { method: "POST" });
    const roomId = await res.text();
    window.location.replace(roomId);
};

window.onload = () => {
    const id = localStorage.getItem("id");
    if (id) {
        uid = id;
    } else {
        uid = uuid();
        localStorage.setItem("id", uid);
    }
    document.querySelector("#create-button").addEventListener("click", createRoom);
};
