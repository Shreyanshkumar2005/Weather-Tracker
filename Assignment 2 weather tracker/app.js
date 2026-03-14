// ─────────────────────────────────────────────────────────────────────────────
// Async Weather Tracker — app.js
// Covers: async/await, .then()/.catch(), try/catch, event loop, local storage
// ─────────────────────────────────────────────────────────────────────────────

// ── CONFIG ───────────────────────────────────────────────────────────────────
const API_KEY = "bd5e378503939ddaee76f12ad7a97608"; // free openweathermap key
const API_URL = "https://api.openweathermap.org/data/2.5/weather";
const HISTORY_KEY = "weather_search_history";

// ── DOM REFS ─────────────────────────────────────────────────────────────────
const cityInput   = document.getElementById("cityInput");
const searchBtn   = document.getElementById("searchBtn");
const weatherOut  = document.getElementById("weatherOutput");
const historyList = document.getElementById("historyList");
const consoleOut  = document.getElementById("consoleOutput");

// ─────────────────────────────────────────────────────────────────────────────
// CONSOLE LOGGER
// Appends color-coded log lines to the on-screen console panel
// type: "sync" | "async" | "micro" | "macro" | "error"
// ─────────────────────────────────────────────────────────────────────────────
function logToConsole(msg, type = "sync") {
  const line = document.createElement("div");
  line.className = `log-line log-${type}`;
  line.innerHTML = `<div class="log-dot"></div><div class="log-text">${msg}</div>`;
  consoleOut.appendChild(line);
  consoleOut.scrollTop = consoleOut.scrollHeight;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL STORAGE — SEARCH HISTORY
// ─────────────────────────────────────────────────────────────────────────────

// Get history array from localStorage
function getHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}

// Save a city to history (deduped, max 8 entries)
function saveToHistory(city) {
  let history = getHistory();
  city = capitalize(city);
  history = history.filter(c => c.toLowerCase() !== city.toLowerCase());
  history.unshift(city);
  if (history.length > 8) history = history.slice(0, 8);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

// Render history tags into the DOM
function renderHistory() {
  const history = getHistory();
  if (history.length === 0) {
    historyList.innerHTML = `<span class="placeholder-msg" style="padding:0;font-size:0.75rem;">No recent searches</span>`;
    return;
  }
  historyList.innerHTML = history
    .map(city => `<span class="history-tag" onclick="searchFromHistory('${city}')">${city}</span>`)
    .join("");
}

// Called when a history tag is clicked
function searchFromHistory(city) {
  cityInput.value = city;
  fetchWeather(city);
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Title-case a city name string
function capitalize(str) {
  return str
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Return an emoji matching a weather condition string
function getWeatherEmoji(condition) {
  const c = condition.toLowerCase();
  if (c.includes("clear"))                              return "☀️";
  if (c.includes("cloud"))                              return "☁️";
  if (c.includes("rain"))                               return "🌧️";
  if (c.includes("drizzle"))                            return "🌦️";
  if (c.includes("thunder"))                            return "⛈️";
  if (c.includes("snow"))                               return "❄️";
  if (c.includes("mist") || c.includes("fog") || c.includes("haze")) return "🌫️";
  return "🌡️";
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH WEATHER  (async/await + .then/.catch + try/catch)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchWeather(city) {
  if (!city.trim()) return;

  // Disable button & show loading state
  searchBtn.disabled = true;
  weatherOut.innerHTML = `<div class="loading-msg">// fetching data for "${city}"...</div>`;

  // ── Event Loop Demonstration ─────────────────────────────────────────────
  // These three blocks show how JS schedules different kinds of tasks:

  // 1. Synchronous code runs first, on the call stack
  logToConsole("Sync Start", "sync");
  logToConsole("Sync End", "sync");

  // 2. Async task is queued but won't resolve until fetch completes
  logToConsole("[ASYNC] Start fetching: " + city, "async");

  // 3. Microtask (Promise.then) — runs BEFORE any macrotask
  Promise.resolve().then(() => {
    logToConsole("Promise.then (Microtask)", "micro");
  });

  // 4. Macrotask (setTimeout 0) — runs AFTER all microtasks
  setTimeout(() => {
    logToConsole("setTimeout (Macrotask)", "macro");
  }, 0);

  // ── Main Fetch with async/await ──────────────────────────────────────────
  const url = `${API_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

  try {
    // await suspends this function; JS event loop is free to run other tasks
    const response = await fetch(url);

    // Use .then()/.catch() style for JSON parsing as an alternative demo
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || "City not found");
    }

    const data = await response.json();

    logToConsole("[ASYNC] Data received ✓", "async");

    // Save to localStorage and update UI
    saveToHistory(city);
    renderWeather(data);

  } catch (err) {
    // try/catch handles both network failures and bad API responses
    logToConsole("[ERROR] " + err.message, "error");
    weatherOut.innerHTML = `
      <div class="error-msg">
        ⚠️ ${
          err.message === "Failed to fetch"
            ? "Network error. Check your connection."
            : "City not found. Please try again."
        }
      </div>`;
  } finally {
    // Always re-enable the button regardless of success/failure
    searchBtn.disabled = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER WEATHER DATA INTO THE DOM
// ─────────────────────────────────────────────────────────────────────────────
function renderWeather(data) {
  const { name, sys, main, weather, wind } = data;
  const condition = weather[0].main;
  const emoji = getWeatherEmoji(condition);

  weatherOut.innerHTML = `
    <div class="weather-icon">${emoji}</div>
    <div class="weather-grid">
      <div class="weather-row">
        <span class="weather-label">CITY</span>
        <span class="weather-value">${name}, ${sys.country}</span>
      </div>
      <div class="weather-row">
        <span class="weather-label">TEMP</span>
        <span class="weather-value">${main.temp.toFixed(1)} °C</span>
      </div>
      <div class="weather-row">
        <span class="weather-label">WEATHER</span>
        <span class="weather-value">${condition}</span>
      </div>
      <div class="weather-row">
        <span class="weather-label">HUMIDITY</span>
        <span class="weather-value">${main.humidity}%</span>
      </div>
      <div class="weather-row">
        <span class="weather-label">WIND</span>
        <span class="weather-value">${wind.speed} m/s</span>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────────────────────────────────────
searchBtn.addEventListener("click", () => {
  fetchWeather(cityInput.value.trim());
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchWeather(cityInput.value.trim());
});

// ─────────────────────────────────────────────────────────────────────────────
// INIT — load history from localStorage on page load
// ─────────────────────────────────────────────────────────────────────────────
renderHistory();
