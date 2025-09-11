const apiKey = "f00c38e0279b7bc85480c3fe775d518c";
const weatherIcon = document.querySelector(".weather-icon");
const tempEl = document.querySelector(".temp");
const descEl = document.querySelector(".description");
const locationEl = document.querySelector(".location");
const forecastEl = document.getElementById("forecast");
const farmerTipEl = document.getElementById("farmer-tip");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const pressureEl = document.getElementById("pressure");

// Get user location
navigator.geolocation.getCurrentPosition(success, error);

function success(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  getWeather(lat, lon);
}

function error() {
  alert("Unable to retrieve location. Please enable GPS.");
}

async function getWeather(lat, lon) {
  // Current Weather
  let res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
  let data = await res.json();

  tempEl.textContent = `${Math.round(data.main.temp)}°C`;
  humidityEl.textContent = `${data.main.humidity}%`;
  windEl.textContent = `${data.wind.speed} m/s`;
  pressureEl.textContent = `${data.main.pressure} hPa`;
  descEl.textContent = data.weather[0].description;
  locationEl.textContent = `${data.name}, ${data.sys.country}`;
  weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

    changeBackground(data.weather[0].main);
    giveFarmerTips(data.weather[0].main);


  // 7-day forecast
  let forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
  let forecastData = await forecastRes.json();

  forecastEl.innerHTML = "";
  for (let i = 0; i < forecastData.list.length; i += 8) { // every 24 hrs
    let day = forecastData.list[i];
    let card = `
      <div class="card">
        <p>${new Date(day.dt_txt).toLocaleDateString("en-US", { weekday: "short" })}</p>
        <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" />
        <p>${Math.round(day.main.temp)}°C</p>
      </div>
    `;
    forecastEl.innerHTML += card;
  }
}

// Background change based on weather
function changeBackground(weather) {
  const bg = document.getElementById("animated-bg");
  bg.innerHTML = ""; // clear old animations

  if (weather.includes("Clear")) {
    document.body.style.background = "linear-gradient(to top, #2980b9, #6dd5fa, #ffffff)";
    let sun = document.createElement("div");
    sun.classList.add("sun");
    bg.appendChild(sun);
  }

  else if (weather.includes("Cloud")) {
    document.body.style.background = "linear-gradient(to top, #757f9a, #d7dde8)";
    for (let i = 0; i < 3; i++) {
      let cloud = document.createElement("div");
      cloud.classList.add("cloud");
      cloud.style.top = `${50 + i * 80}px`;
      cloud.style.left = `${i * 200}px`;
      bg.appendChild(cloud);
    }
  }

  else if (weather.includes("Rain")) {
    document.body.style.background = "linear-gradient(to top, #283e51, #485563)";
    for (let i = 0; i < 50; i++) {
      let drop = document.createElement("div");
      drop.classList.add("raindrop");
      drop.style.left = `${Math.random() * window.innerWidth}px`;
      drop.style.animationDuration = `${0.5 + Math.random()}s`;
      bg.appendChild(drop);
    }
  }

  else if (weather.includes("Snow")) {
    document.body.style.background = "linear-gradient(to top, #e6dada, #274046)";
    for (let i = 0; i < 30; i++) {
      let snow = document.createElement("div");
      snow.classList.add("snowflake");
      snow.innerHTML = "❄";
      snow.style.left = `${Math.random() * window.innerWidth}px`;
      snow.style.animationDuration = `${3 + Math.random() * 3}s`;
      bg.appendChild(snow);
    }
  }

  else {
    document.body.style.background = "linear-gradient(to top, #2c3e50, #bdc3c7)";
  }
}

// Farmer recommendations
function giveFarmerTips(weather) {
  let tip;
  if (weather.includes("Rain")) tip = "🌧️ Expect rains. Prepare drainage and store harvested crops safely.";
  else if (weather.includes("Clear")) tip = "☀️ Sunny weather! Good time for planting and drying harvest.";
  else if (weather.includes("Cloud")) tip = "☁️ Cloudy skies. Monitor for possible rain, reduce irrigation.";
  else if (weather.includes("Snow")) tip = "❄️ Snow expected. Protect crops and livestock.";
  else tip = "🌱 Monitor weather updates to adjust farming activities.";

  farmerTipEl.textContent = tip;
}

