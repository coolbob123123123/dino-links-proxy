const { ScramjetController } = $scramjet

const scramjet = new ScramjetController({
  files: {
    wasm: "/scram/scramjet.wasm.wasm",
    all: "/scram/scramjet.all.js"
  }
})

const searchForm = document.getElementById("searchForm")
const address = document.getElementById("address")
const status = document.getElementById("status")
const results = document.getElementById("results")

const home = document.getElementById("home")
const browser = document.getElementById("browser")
const frameHost = document.getElementById("frameHost")

const browserAddress = document.getElementById("browserAddress")

const homeBtn = document.getElementById("homeBtn")
const homeBrowserBtn = document.getElementById("homeBrowserBtn")
const backBtn = document.getElementById("backBtn")
const goBtn = document.getElementById("goBtn")
const fullBtn = document.getElementById("fullBtn")

let currentFrame = null

function showStatus(message) {
  status.textContent = message || ""
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function normalizeUrl(input) {
  input = input.trim()

  if (!input) return null

  if (/^https?:\/\//i.test(input)) {
    return input
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(input)) {
    return "https://" + input
  }

  return null
}

async function setupScramjet() {
  try {
    await scramjet.init()

    console.log("Scramjet initialized")

    if (typeof BareMuxConnection !== "undefined") {
      const connection = new BareMuxConnection("/baremux/worker.js")

      await connection.setTransport(
        "/libcurl/index.mjs",
        [
          {
            wisp: location.origin + "/wisp/"
          }
        ]
      )

      console.log("BareMux initialized")
    } else {
      console.warn("BareMuxConnection was not found")
    }
  } catch (error) {
    console.error("Scramjet initialization failed:", error)
    showStatus("Proxy initialization failed: " + error.message)
  }
}

async function openProxy(url) {
  try {
    showStatus("Loading " + url)

    home.classList.add("hidden")
    browser.classList.remove("hidden")

    browserAddress.value = url

    if (!currentFrame) {
      currentFrame = scramjet.createFrame()

      currentFrame.frame.style.width = "100%"
      currentFrame.frame.style.height = "100%"
      currentFrame.frame.style.border = "0"
      currentFrame.frame.style.display = "block"

      frameHost.innerHTML = ""
      frameHost.appendChild(currentFrame.frame)
    }

    await currentFrame.go(url)

    showStatus("")
  } catch (error) {
    console.error("Proxy error:", error)

    frameHost.innerHTML = `
      <div style="
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        flex-direction:column;
        background:#050805;
        color:white;
        font-family:Arial,sans-serif;
        text-align:center;
        padding:30px;
      ">
        <h2>Unable to load this website</h2>
        <p style="opacity:.6">
          ${escapeHtml(error.message || "Unknown error")}
        </p>
      </div>
    `

    showStatus("")
  }
}

async function searchWeb(query) {
  query = query.trim()

  if (!query) return

  const directUrl = normalizeUrl(query)

  if (directUrl) {
    await openProxy(directUrl)
    return
  }

  showStatus("Searching...")
  results.innerHTML = ""

  try {
    const response = await fetch(
      "/api/search?q=" + encodeURIComponent(query)
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Search failed")
    }

    const items = data.results || []

    if (!items.length) {
      showStatus("No results found")
      return
    }

    showStatus(`${items.length} results`)

    results.innerHTML = items.map((item) => {
      let domain = ""

      try {
        domain = new URL(item.url).hostname
      } catch {}

      return `
        <article class="result">
          <button
            class="result-link"
            type="button"
            data-url="${encodeURIComponent(item.url || "")}"
          >
            <span class="result-domain">
              ${escapeHtml(domain)}
            </span>

            <strong>
              ${escapeHtml(item.title || "Result")}
            </strong>

            <p>
              ${escapeHtml(item.description || "")}
            </p>
          </button>
        </article>
      `
    }).join("")

    results.querySelectorAll(".result-link").forEach((button) => {
      button.addEventListener("click", () => {
        const url = decodeURIComponent(button.dataset.url)
        openProxy(url)
      })
    })
  } catch (error) {
    console.error("Search error:", error)

    showStatus("Search error: " + error.message)
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault()
  searchWeb(address.value)
})

goBtn.addEventListener("click", () => {
  const url = normalizeUrl(browserAddress.value)

  if (url) {
    openProxy(url)
  } else {
    showStatus("Enter a valid URL")
  }
})

browserAddress.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const url = normalizeUrl(browserAddress.value)

    if (url) {
      openProxy(url)
    } else {
      showStatus("Enter a valid URL")
    }
  }
})

homeBtn.addEventListener("click", () => {
  browser.classList.add("hidden")
  home.classList.remove("hidden")
})

homeBrowserBtn.addEventListener("click", () => {
  browser.classList.add("hidden")
  home.classList.remove("hidden")
})

backBtn.addEventListener("click", () => {
  if (currentFrame) {
    try {
      currentFrame.back()
    } catch (error) {
      console.error(error)
    }
  }
})

fullBtn.addEventListener("click", () => {
  if (!browser.requestFullscreen) return

  browser.requestFullscreen().catch((error) => {
    console.error(error)
  })
})

setupScramjet()