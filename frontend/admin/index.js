const sliderContainer = document.querySelector('.chart-container');
const slideTrack = document.querySelector('.chart');
const nextButton = document.querySelector('.next-button');
const prevButton = document.querySelector('.prev-button');
const slides = document.querySelectorAll('.chart-slide');
const slideWidth = slides[0].clientWidth;

let currentSlide = 0;
const chartTrack = document.querySelector(".chart"); 
const totalSlides = slides.length;

document.querySelector(".next-button").addEventListener("click", () => {
  currentSlide++;
  if (currentSlide >= totalSlides) currentSlide = 0; // loop back
  updateSlide();
});

document.querySelector(".prev-button").addEventListener("click", () => {
  currentSlide--;
  if (currentSlide < 0) currentSlide = totalSlides - 1; // loop to last
  updateSlide();
});

function updateSlide() {
  const slideWidth = slides[0].offsetWidth;
  chartTrack.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
}

// Initialize Charts
const ctxHarvest = document.getElementById("harvestChart").getContext("2d");
new Chart(ctxHarvest, {
  type: "bar",
  data: {
    labels: ["Jan", "Feb", "Mar", "Apr"],
    datasets: [{
      label: "Harvest (kg)",
      data: [12000, 19000, 30000, 5000],
      backgroundColor: "green"
    }]
  }
});

const ctxSales = document.getElementById("salesChart").getContext("2d");
new Chart(ctxSales, {
  type: "line",
  data: {
    labels: ["Q1", "Q2", "Q3", "Q4"],
    datasets: [{
      label: "Sales ($)",
      data: [5000, 15000, 10000, 20000],
      borderColor: "blue",
      fill: false
    }]
  }
});
