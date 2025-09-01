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
    ]
};

// --- Functions ---
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
    document.getElementById("farmName").innerText = farm.name;
    document.getElementById("farmLocation").innerText = farm.location;
    document.getElementById("farmRevenue").innerText = totalRevenue(farm.crops);
    document.getElementById("farmExpenses").innerText = totalExpenses(farm.expenses);
    document.getElementById("farmProfit").innerText = calculateProfit(farm);
}

// --- Crop List Display ---
function updateCropList(){
    let cropList = document.getElementById('cropTableBody');
    //cropList.innerHTML = ''; // Clear existing rows

    farm.crops.forEach(crop => {
        let row = `
      <tr>
        <td>${crop.name}</td>
        <td>${crop.harvest}</td>
        <td>${crop.pricePerKg}</td>
      </tr>
    `;
    cropList.innerHTML += row;
    });
    // Update totals every time the crop list changes
    refreshDashboard();
}

// --- Handle crop submission form ---
document.getElementById("addcropForm").addEventListener('submit', function(e){
    e.preventDefault();

    let name = document.getElementById('cropName').value;
    let harvest = document.getElementById('cropHarvest').value.split(',').map(Number);
    let price = parseFloat(document.getElementById('cropPrice').value);

    farm.crops.push({name, harvest, pricePerKg: price});

    refreshDashboard();
    updateCropList();
    e.target.reset();
});

function updateWorkerList(){
    let workerList = document.getElementById('workerBodyTable');
    workerList.innerHTML = ''; // clear old rows  
    
    farm.workers.forEach(worker => {
         let row = `
        <tr>
            <td>${worker.name}</td>
            <td>${worker.role}</td>
            <td>${worker.hoursWorked.join(',')}</td>
            <td>${worker.hourlyRate}</td>
            <td>${totalPay}</td>
        </tr>
      `;
      workerList.innerHTML += row;
    }); 
       
    }

// --- Initial Load ---
refreshDashboard();
updateCropList();
updateWorkerList();
