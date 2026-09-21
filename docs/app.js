(() => {
  "use strict";

  const form = document.getElementById("searchForm");
  const address = document.getElementById("address");
  const browserAddress = document.getElementById("browserAddress");
  const results = document.getElementById("results");
  const status = document.getElementById("status");
  const home = document.getElementById("home");
  const browser = document.getElementById("browser");
  const frameHost = document.getElementById("frameHost");

  const { ScramjetController } = $scramjetLoadController();

  const scramjet = new ScramjetController({
    files: {
      wasm: "/scram/scramjet.wasm.wasm",
      all: "/scram/scramjet.all.js",
      sync: "/scram/scramjet.sync.js"
    }
  });

  scramjet.init();

  const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
  let currentFrame = null;

  function normalizeUrl(input) {
    input = input.trim();

    try {
      return new URL(input).toString();
    } catch {}

    try {
      const url = new URL(`http://${input}`);
      if (url.hostname.includes(".")) return url.toString();
    } catch {}

    return null;
  }

  function showStatus(message = "") {
    status.textContent = message;
  }

  function showBrowser() {
    home.classList.add("hidden");
    browser.classList.remove("hidden");
  }

  function showHome() {
    browser.classList.add("hidden");
    home.classList.remove("hidden");
  }

  async function openProxy(target) {
    const url = normalizeUrl(target);

    if (!url) {
      await searchWeb(target);
      return;
    }

    showStatus("");
    showBrowser();
    browserAddress.value = url;

    try {
      await registerSW();

      const wispUrl =
        (location.protocol === "https:" ? "wss" : "ws") +
        "://" + location.host + "/wisp/";

      if ((await connection.getTransport()) !== "/libcurl/index.mjs") {
        await connection.setTransport("/libcurl/index.mjs", [
          { websocket: wispUrl }
        ]);
      }

      frameHost.innerHTML = "";
      currentFrame = scramjet.createFrame();
      currentFrame.frame.id = "sj-frame";
      frameHost.appendChild(currentFrame.frame);
      currentFrame.go(url);
    } catch (error) {
      showStatus("Proxy error: " + error);
      console.error(error);
    }
  }

  async function searchWeb(query) {
    query = query.trim();
    if (!query) return;

    showBrowser();
    frameHost.innerHTML = "";
    browserAddress.value = query;
    results.innerHTML = "";
    showStatus("Searching Brave...");

    try {
      const response = await fetch("/api/search?q=" + encodeURIComponent(query));
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Search failed");

      const items = data?.web?.results || [];

      if (!items.length) {
        showStatus("No results found");
        return;
      }

      showStatus(`${items.length} results`);

      home.classList.remove("hidden");
      browser.classList.add("hidden");

      results.innerHTML = items.map((item) => {
        const safeUrl = encodeURIComponent(item.url || "");
        const title = escapeHtml(item.title || item.url || "Result");
        const description = escapeHtml(item.description || "");
        const domain = escapeHtml(item.meta_url || item.url || "");
        return `
          <article class="result">
            <button class="result-link" data-url="${safeUrl}">
              <span class="result-domain">${domain}</span>
              <strong>${title}</strong>
              <p>${description}</p>
            </button>
          </article>
        `;
      }).join("");

      results.querySelectorAll(".result-link").forEach((button) => {
        button.addEventListener("click", () => {
          openProxy(decodeURIComponent(button.dataset.url));
        });
      });
    } catch (error) {
      showStatus("Search error: " + error.message);
    }
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = address.value.trim();

    if (!value) return;

    if (normalizeUrl(value)) {
      openProxy(value);
    } else {
      searchWeb(value);
    }
  });

  document.getElementById("goBtn").addEventListener("click", () => {
    openProxy(browserAddress.value);
  });

  browserAddress.addEventListener("keydown", (event) => {
    if (event.key === "Enter") openProxy(browserAddress.value);
  });

  document.getElementById("homeBtn").addEventListener("click", () => {
    showHome();
  });

  document.getElementById("homeBrowserBtn").addEventListener("click", () => {
    showHome();
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    try {
      history.back();
    } catch {}
  });

  document.getElementById("fullBtn").addEventListener("click", () => {
    browser.requestFullscreen?.();
  });
})();