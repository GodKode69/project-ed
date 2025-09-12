// preload.js - expose limited safe APIs to renderer
const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("api", {});
