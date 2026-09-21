"use strict";

const stockSW = "./sw.js";
const swAllowedHostnames = ["localhost", "127.0.0.1"];

async function registerSW() {
  if (!navigator.serviceWorker) {
    if (
      location.protocol !== "https:" &&
      !swAllowedHostnames.includes(location.hostname)
    ) {
      throw new Error("Service workers need HTTPS outside localhost.");
    }
    throw new Error("Your browser does not support service workers.");
  }

  await navigator.serviceWorker.register(stockSW);
}