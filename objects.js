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
function totalHarvest(crops){
    return crops.reduce((sum, crop) => sum + crop.harvest.reduce((a, b) => a + b, 0), 0);
}

function calculateTotalPay(workers){
    return workers.reduce((sum, w) => {
        let hours = w.hoursWorked.reduce((a, b) => a + b, 0);
        return sum + (hours * w.hourlyRate);
    }, 0);
}

function totalExpenses(expenses){
    return expenses.reduce((sum, e) => sum + e.seeds + e.fertilizer + e.equipment, 0);
}

function totalRevenue(crops){
    return crops.reduce((sum, crop) => {
        let harvest = crop.harvest.reduce((a, b) => a + b, 0);
        return sum + (harvest * crop.pricePerKg);
    }, 0);
}

function calculateProfit(farm){
    return totalRevenue(farm.crops) - totalExpenses(farm.expenses) - calculateTotalPay(farm.workers);
}

// --- DOM Updates ---
function refreshDashboard(){
    //document.getElementById("farmName").innerText = farm.name;
    //document.getElementById("farmLocation").innerText = farm.location;
    document.getElementById("farmRevenue").innerText = formatCurrency(totalRevenue(farm.crops));
    document.getElementById("farmExpenses").innerText = formatCurrency(totalExpenses(farm.expenses));

    let profitEl = document.getElementById("farmProfit");
    let profit = calculateProfit(farm);
    profitEl.innerText = formatCurrency(profit);
    profitEl.style.color = profit >= 0 ? "green" : "red";
}

// --- Crop List Display ---
function updateCropList(){
    let cropList = document.getElementById('cropTableBody');
    cropList.innerHTML = ''; // Clear existing rows

    farm.crops.forEach(crop => {
            let totalHarvest = crop.harvest.reduce((a, b) => a + b, 0);
            let row = `
        <tr>
            <td>${crop.name}</td>
            <td>${totalHarvest}</td>
            <td>${formatCurrency(crop.pricePerKg)}</td>
        </tr>
        `;
            cropList.innerHTML += row;
    });
    refreshDashboard();}

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
    refreshDashboard();
}

// --- Expense List Display ---
function updateExpenseList(){
    let expenseList = document.getElementById('expenseBodyTable');
    expenseList.innerHTML = '';

    farm.expenses.forEach(expense => {
       let row = `
        <tr>
            <td>${formatCurrency(expense.seeds)}</td>
            <td>${formatCurrency(expense.equipment)}</td>
            <td>${formatCurrency(expense.fertilizer)}</td>
        </tr>
      `;
      expenseList.innerHTML += row;
    });
    refreshDashboard();
}

// --- Revenue List Display ---
function updateRevenueList(){
    let revenueList = document.getElementById('revenueBodyTable');
    revenueList.innerHTML = '';

    farm.revenues.forEach(revenue => {
       let row = `
        <tr>
            <td>${revenue.source}</td>
            <td>${formatCurrency(revenue.amount)}</td>
        </tr>
      `;
      revenueList.innerHTML += row;
    });
    refreshDashboard();
}

// --- Chart Functions ---
let harvestChartInstance, revenueChartInstance;
//harvest chat display
function renderHarvestChart(){
    let ctx = document.getElementById("harvestChart").getContext("2d");
    if (harvestChartInstance) harvestChartInstance.destroy();

    harvestChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: farm.crops.map(c => c.name),
            datasets: [{
                label: "Total Harvest (Kg)",
                data: farm.crops.map(c => c.harvest.reduce((a, b) => a + b, 0)),
                backgroundColor: "rgba(46, 204, 113, 0.6)"
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}
//revenue chart display
function renderRevenueChart(){
    let ctx = document.getElementById("revenueChart").getContext("2d");
    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: farm.crops.map(c => c.name),
            datasets: [{
                label: "Revenue Distribution",
                data: farm.crops.map(c => c.harvest.reduce((a, b) => a + b, 0) * c.pricePerKg),
                backgroundColor: ["#1abc9c", "#3498db", "#9b59b6", "#f1c40f"]
            }]
        },
        options: { responsive: true }
    });
}
// --- Profit Chart (Line Chart) ---
function renderProfitChart(){
    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Aug", "Oct", "Nov", "Dec"];
    //calculate profit per month from harvest(for demo we assume each harvest array index = month)
    let monthlyProfit = farm.crops[0].harvest.map((_, index) => {
        let revenue = farm.crops.reduce((sum, crop) => sum + (crop.harvest[index] || 0) * crop.pricePerKg, 0);
        let expense = totalExpenses(farm.expenses) / farm.crops[0].harvest.length; //avg monthly expense
        let workerPay = calculateTotalPay(farm.workers) / farm.crops[0].harvest.length; //avg monthly worker pay
        return revenue - expense - workerPay;
    });

    let ctx = document.getElementById("profitChart").getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Profit/Loss',
                data: monthlyProfit,
                borderColor: 'Green',
                backgroundColour: 'rgba(0, 255,0, 0.2)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins:{
                title:{
                    display: true,
                    text: "Monthly Profit/loss"
                }
            }
        }
    });
}
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
//add crop from handler
// document.getElementById("addcropForm").addEventListener('submit', function(e){
//     e.preventDefault();

//     let name = document.getElementById('cropName').value;
//     let harvest = document.getElementById('cropHarvest').value.split(',').map(Number);
//     let price = parseFloat(document.getElementById('cropPrice').value);

//     farm.crops.push({name, harvest, pricePerKg: price});

//     refreshDashboard();
//     updateCropList();
//     renderHarvestChart();
//     renderRevenueChart();
//     saveFarmData()
//     e.target.reset();
// });

// //add worker form handler
// document.getElementById('addWorkerForm').addEventListener('submit', function(e){
//     e.preventDefault();

//     let name = document.getElementById('workerName').value;
//     let role = document.getElementById('workerRole').value;
//     let hoursWorked = document.getElementById('hoursWorked').value.split(',').map(Number);
//     let hourlyRate = parseFloat(document.getElementById('hourlyRate').value);

//     farm.workers.push({name, role, hoursWorked, hourlyRate});

//     refreshDashboard();
//     updateWorkerList();
//     saveFarmData()
//     e.target.reset();
// });

// //add revenue form handler
// document.getElementById('addRevenueForm').addEventListener('submit', function(e){
//     e.preventDefault();

//     let source = document.getElementById('sourceRevenue').value;
//     let amount = parseFloat(document.getElementById('revenueAmount').value);

//     farm.revenues.push({source, amount});

//     updateRevenueList();
//     saveFarmData()
//     e.target.reset();
// });

// //add expense form handler
// document.getElementById('addExpenseForm').addEventListener('submit', function(e){
//     e.preventDefault();

//     let seeds = parseFloat(document.getElementById('seedExpense').value);
//     let equipment = parseFloat(document.getElementById('equipmentExpense').value);
//     let fertilizer = parseFloat(document.getElementById('fertilizerExpense').value);

//     farm.expenses.push({seeds, equipment, fertilizer});

//     refreshDashboard();
//     updateExpenseList();
//     saveFarmData()
//     e.target.reset();
// });

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
//
function updateSummaryCards() {
    let savedFarm = JSON.parse(localStorage.getItem("farm")) || farm;

    let revenue = totalRevenue(savedFarm.crops);
    let expenses = totalExpenses(savedFarm.expenses);
    let profit = revenue - expenses - calculateTotalPay(savedFarm.workers);

    document.getElementById("totalRevenue").innerText = formatCurrency(revenue);
    document.getElementById("totalExpenses").innerText = formatCurrency(expenses);
    document.getElementById("totalProfit").innerText = formatCurrency(profit);
}
// --- Initial Load ---
loadFarmData();
refreshDashboard();
updateCropList();
updateWorkerList();
updateExpenseList();
updateRevenueList();
renderHarvestChart();
renderRevenueChart();
renderProfitChart();
renderWorkerHoursChart();
