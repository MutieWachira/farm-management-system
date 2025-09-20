// --- Farm object ---
let farm = {
    name: "Green Valley",
    location: "Nairobi",
    crops: [
        {name: "Maize", harvest: [12, 3, 7, 10], pricePerKg: 50},
        {name: "Beans", harvest: [5, 8, 6, 9], pricePerKg: 80}
    ],
    workers: [
        {name: "John", role: "Harvestor", hoursWorked: [7, 4, 6, 2, 7, 1, 3], hourlyRate: 30},
        {name: "Esther", role: "Farmer", hoursWorked: [2, 5, 8, 4, 7, 3, 1], hourlyRate: 25}
    ],
    expenses:[
        {seeds: 5000, fertilizer: 3000, equipment: 2000},
        {seeds: 8972, fertilizer: 2765, equipment: 92476},
    ],
    revenues: [
        {source: "Local Market", amount: 15000},
        {source: "Export", amount: 25000}
    ]
};
// --- Utility Functions ---
function calculateTotalPay(workers){
    return workers.reduce((sum, w) => {
        let hours = w.hoursWorked.reduce((a, b) => a + b, 0);
        return sum + (hours * w.hourlyRate);
    }, 0);
}

// --- Worker List Display ---
function updateWorkerList(){
    let workerList = document.getElementById('workerBodyTable');
    workerList.innerHTML = '';

    farm.workers.forEach(worker => {
        let totalHours = worker.hoursWorked.reduce((a, b) => a + b, 0);
        let totalPay = totalHours * worker.hourlyRate;

        let row = `
        <tr>
            <td>${worker.name}</td>
            <td>${worker.role}</td>
            <td>${totalHours}</td>
            <td>${formatCurrency(worker.hourlyRate)}</td>
            <td>${formatCurrency(totalPay)}</td>
        </tr>
      `;
      workerList.innerHTML += row;
    });
    
}
// --- Chart Functions ---
//worker chart display
function renderWorkerHoursChart() {
  let ctx = document.getElementById("workerHoursChart").getContext("2d");

  let workerNames = farm.workers.map(w => w.name);
  let totalHours = farm.workers.map(w => w.hoursWorked.reduce((a, b) => a + b, 0));

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: workerNames,
      datasets: [{
        label: "Total Hours Worked",
        data: totalHours,
        backgroundColor: "rgba(54, 162, 235, 0.6)"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
// --- Form Handlers ---
//add worker form handler
document.getElementById('addWorkerForm').addEventListener('submit', function(e){
    e.preventDefault();

    let name = document.getElementById('workerName').value;
    let role = document.getElementById('workerRole').value;
    let hoursWorked = document.getElementById('hoursWorked').value.split(',').map(Number);
    let hourlyRate = parseFloat(document.getElementById('hourlyRate').value);

    farm.workers.push({name, role, hoursWorked, hourlyRate});

    refreshDashboard();
    updateWorkerList();
    saveFarmData()
    e.target.reset();
});
//save farm data to local Storage
function saveFarmData(){
    localStorage.setItem("farmData", JSON.stringify(farm));
}

//load farm data from localStorage
function loadFarmData(){
    const storedData = localStorage.getItem("farmData");
    if (storedData){
        farm = JSON.parse(storedData);
    }
}
//Format numbers as Kenyan Shillings (KES)
function formatCurrency(amount){
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
}

// --- Initial Load ---
loadFarmData();
updateWorkerList();
renderWorkerHoursChart();