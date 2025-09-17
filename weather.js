const apiKey = "3a0dc5c777e980f94325c779c5e20602";
const weatherIcon = document.querySelector(".weather-summary-img");
const tempEl = document.querySelector(".temp");
const descEl = document.querySelector(".description");
const locationEl = document.querySelector(".location");
const humidityEl = document.querySelector(".humidity-value-txt");
const windEl = document.querySelector(".wind-value-txt");
const currentDateTxt = document.querySelector(".current-date-txt");
const forecastEl = document.querySelector(".forecast-item-container");

// Get user location
navigator.geolocation.getCurrentPosition(success, error);

function success(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  getWeather(lat, lon);
}

// Error if GPS not enabled
function error() {
  alert("Unable to retrieve location. Please enable GPS.");
}

// Get weather icon based on condition ID
function getWeatherIcon(id) {
  if (id <= 232) return "thunderstorm.svg";
  if (id <= 321) return "drizzle.svg";
  if (id <= 531) return "rain.svg";
  if (id <= 622) return "snow.svg";
  if (id <= 781) return "atmosphere.svg";
  if (id === 800) return "clear.svg";
  return "clouds.svg";
}

// Current date
function getCurrentDate() {
  const currentDate = new Date();
  const options = {
    weekday: "short",
    day: "2-digit",
    month: "short",
  };
  return currentDate.toLocaleDateString("en-GB", options);
}

async function getWeather(lat, lon) {
  // Current weather
  let res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
  );
  let data = await res.json();
  const id = data.weather[0].id;

  locationEl.textContent = `${data.name}, ${data.sys.country}`;
  tempEl.textContent = `${Math.round(data.main.temp)}°C`;
  descEl.textContent = data.weather[0].description;
  weatherIcon.src = `images/assets/weather/${getWeatherIcon(id)}`;
  humidityEl.textContent = `${data.main.humidity}%`;
  const windSpeedKmh = (data.wind.speed * 3.6).toFixed(1);
  windEl.textContent = `${windSpeedKmh} km/h`;
  currentDateTxt.textContent = getCurrentDate();

  await updateForecastInfo(lat, lon);
  setBackground(data);
}

async function updateForecastInfo(lat, lon) {
  // Fetch 5-day / 3-hour forecast
  let forecastRes = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
  );
  let forecastData = await forecastRes.json();

  forecastEl.innerHTML = "";

  for (let i = 8; i < forecastData.list.length; i += 8) {
    let day = forecastData.list[i];
    let id = day.weather[0].id;
    let icon = getWeatherIcon(id);

    let card = `
      <div class="forecast-item">
        <h5 class="forecast-item-date regular-txt">
          ${new Date(day.dt_txt).toLocaleDateString("en-US", { weekday: "short" })}
        </h5>
        <img src="images/assets/weather/${icon}" alt="" class="forecast-item-img">
        <h5 class="forecast-item-temp">${Math.round(day.main.temp)}°C</h5>
      </div>
    `;
    forecastEl.innerHTML += card;
  }
}

function setBackground(data) {
  const now = data.dt;
  const sunrise = data.sys.sunrise;
  const sunset = data.sys.sunset;
  const isDaytime = now >= sunrise && now < sunset;

  let condition = data.weather[0].main.toLowerCase();
  const windSpeed = (data.wind.speed * 3.6).toFixed(1);

  const weatherSection = document.querySelector(".weather-section");
  const effectsLayer = document.querySelector(".effects");
  weatherSection.className = "weather-section"; // reset
  effectsLayer.innerHTML = ""; // reset

  if (isDaytime) {
    weatherSection.classList.add("day");

    if (condition.includes("clear")) {
      effectsLayer.innerHTML += '<div class="sun"></div>';
    } else if (condition.includes("cloud")) {
      weatherSection.classList.add("clouds");
      effectsLayer.innerHTML += '<div class="sun"></div>'; 
      spawnClouds(effectsLayer, 3); // multiple clouds
    } else if (condition.includes("rain") || condition.includes("drizzle")) {
      weatherSection.classList.add("rain");
      spawnRain(effectsLayer);
    } else if (condition.includes("snow")) {
      weatherSection.classList.add("snow");
      spawnSnow(effectsLayer);
    } else if (condition.includes("thunderstorm")) {
      weatherSection.classList.add("storm");
    }

  } else {
    weatherSection.classList.add("night");
    effectsLayer.innerHTML += '<div class="moon"></div>';
    createStars(effectsLayer, 80);

    if (condition.includes("cloud")) {
      spawnClouds(effectsLayer, 2);
    } else if (condition.includes("rain") || condition.includes("drizzle")) {
      weatherSection.classList.add("rain");
      spawnRain(effectsLayer);
    } else if (condition.includes("snow")) {
      weatherSection.classList.add("snow");
      spawnSnow(effectsLayer);
    } else if (condition.includes("thunderstorm")) {
      weatherSection.classList.add("storm");
    }
  }

  // 🌬️ Wind gusts if strong
  if (windSpeed > 29) {
    spawnWind(effectsLayer, windSpeed);
  }
}

// 🌞 Clouds generator
function spawnClouds(container, count = 2) {
  for (let i = 0; i < count; i++) {
    const cloud = document.createElement("div");
    cloud.classList.add("cloud");
    cloud.style.left = `${Math.random() * 100}vw`;
    cloud.style.top = `${10 + Math.random() * 30}%`;
    cloud.style.animationDuration = `${20 + Math.random() * 20}s`;
    container.appendChild(cloud);
  }
}

// 🌧️ Rain generator
function spawnRain(container) {
  for (let i = 0; i < 100; i++) {
    const drop = document.createElement("div");
    drop.classList.add("raindrop");
    drop.style.left = `${Math.random() * 100}vw`;
    drop.style.animationDuration = `${0.5 + Math.random()}s`;
    drop.style.animationDelay = `${Math.random()}s`;
    drop.style.opacity = Math.random();
    container.appendChild(drop);
  }
}

// ❄️ Snow generator
function spawnSnow(container) {
  for (let i = 0; i < 60; i++) {
    const flake = document.createElement("div");
    flake.classList.add("snowflake");
    const size = 5 + Math.random() * 10;
    flake.style.width = `${size}px`;
    flake.style.height = `${size}px`;
    flake.style.left = `${Math.random() * 100}vw`;
    flake.style.animationDuration = `${4 + Math.random() * 4}s`;
    flake.style.animationDelay = `${Math.random() * 5}s`;
    flake.style.opacity = 0.6 + Math.random() * 0.4;
    container.appendChild(flake);
  }
}

// 🌬️ Wind gust generator
function spawnWind(container, windSpeed) {
  const gustCount = Math.min(Math.floor(windSpeed / 5), 20);
  for (let i = 0; i < gustCount; i++) {
    const gust = document.createElement("div");
    gust.classList.add("wind-gust");
    gust.style.top = `${Math.random() * 100}vh`;
    const duration = Math.max(3 - windSpeed / 20, 1);
    gust.style.animationDuration = `${duration + Math.random()}s`;
    container.appendChild(gust);
  }
}


// ✨ Stars generator
function createStars(container, count = 50) {
  for (let i = 0; i < count; i++) {
    const star = document.createElement("div");
    star.classList.add("star");
    const size = Math.random() * 2 + 1;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.animationDuration = `${Math.random() * 3 + 2}s`;
    star.style.animationDelay = `${Math.random() * 5}s`;
    container.appendChild(star);
  }
}
