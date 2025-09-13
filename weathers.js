const apiKey = "3a0dc5c777e980f94325c779c5e20602";
const weatherIcon = document.querySelector(".weather-summary-img");
const tempEl = document.querySelector(".temp");
const descEl = document.querySelector(".description");
const locationEl = document.querySelector(".location");
const humidityEl = document.querySelector(".humidity-value-txt");
const windEl = document.querySelector(".wind-value-txt");
const currentDateTxt = document.querySelector(".current-date-txt")
const forecastEl = document.querySelector(".forecast-item-container")

//get user location
navigator.geolocation.getCurrentPosition(sucess, error);

function sucess(position){
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    getWeather(lat, lon);
}
//to display error message if gps is not enabled
function error(){
    alert('Unable to retrieve location. Please enale GPS.');
}
//function to get the weather icon
function getWeatherIcon(id){
    if(id <= 232) return 'thunderstorm.svg'
    if(id <= 321) return 'drizzle.svg'
    if(id <= 531) return 'rain.svg'
    if(id <= 622) return 'snow.svg'
    if(id <= 781) return 'atmosphere.svg'
    if(id <= 800) return 'clear.svg'
    else return 'clouds.svg'
}
//function to get the current date
function getCurrentDate(){
    const currentDate = new Date();
    const options ={
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    }
    return currentDate.toLocaleDateString('en-GB', options)
}

async function getWeather(lat, lon){
    //current weather
    let res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
    let data = await res.json();
    const id = data.weather[0].id;

    locationEl.textContent = `${data.name}, ${data.sys.country}`
    tempEl.textContent = `${Math.round(data.main.temp)}°C`;
    descEl.textContent = data.weather[0].description;
    weatherIcon.src = `images/assets/weather/${getWeatherIcon(id)}`;
    humidityEl.textContent = `${data.main.humidity}%`;
    const windSpeedKmh = (data.wind.speed * 3.6).toFixed(1); // Convert m/s → km/h
    windEl.textContent = `${windSpeedKmh} km/h`; 
    currentDateTxt.textContent = getCurrentDate();
    

    await updateForecastInfo(lat, lon)
}
async function updateForecastInfo(lat, lon) {
    // fetch 5-day / 3-hour forecast
    let forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
    let forecastData = await forecastRes.json();

    forecastEl.innerHTML = "";

    // pick every 8th item ≈ one forecast per day (24h interval)
    for (let i = 1; i < forecastData.list.length; i += 8) {
        let day = forecastData.list[i];
        let id = day.weather[0].id;  // ✅ extract weather ID
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
