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

// --- functions ---
function totalHarvest(crops){
    let total = 0;
    for(let crop of crops){
        total += crop.harvest.reduce((sum, value) => sum + value, 0);
    }
    return total;
}

function calculateTotalPay(workers){
    let totalPay = 0;
    for(let worker of workers){
        let totalHours = worker.hoursWorked.reduce((sum, value) => sum + value, 0);
        totalPay += totalHours * worker.hourlyRate;
    }
    return totalPay;
}

function totalExpenses(expenses){
    let total = 0;
    for(let expense of expenses){
        total += expense.seeds + expense.fertilizer + expense.equipment;
    }
    return total;
}

function totalRevenue(crops){
    let revenue = 0;
    for(let crop of crops){
        let harvest = crop.harvest.reduce((sum, v) => sum + v, 0);
        revenue += harvest * crop.pricePerKg;
    }
    return revenue;
}

function calculateProfit(farm){
    return totalRevenue(farm.crops) - totalExpenses(farm.expenses) - calculateTotalPay(farm.workers);
}

// --- DOM updates ---
document.getElementById("farmName").innerText = farm.name;
document.getElementById("farmLocation").innerText = farm.location;
document.getElementById("farmRevenue").innerText = totalRevenue(farm.crops);
document.getElementById("farmExpenses").innerText = totalExpenses(farm.expenses);
document.getElementById("farmProfit").innerText = calculateProfit(farm);

//handle crop submission form
document.getElementById("addcropForm").addEventListener('submit', function(e){
    e.preventDefault(); //stop page refresh

    let crop_Name =  document.getElementById('cropName').value;
    let crop_Harvest = document.getElementById('cropHarvest').value.split(',').map(Number);
    let crop_Price = parseFloat(document.getElementById('cropPrice').value);

    //add new crop to farm
    farm.crops.push({name: crop_Name, harvest: crop_Harvest, pricePerKg: crop_Price});

    // Refresh dashboard
    document.getElementById("farmRevenue").innerText = totalRevenue(farm.crops);
    document.getElementById("farmProfit").innerText = calculateProfit(farm);

    // Reset form
    e.target.reset();

})
// to handle the crop list display
function updateCropList(){
    let cropList = document.getElementById('cropList');
    cropList.innerHTML = ''; // Clear existing list

    farm.crops.forEach(crop => {
        let td = document.createElement('td');
        td.innerText = `${crop.name} - Harvest: ${crop.harvest.join(', ')} - Price/Kg: ${crop.pricePerKg}`;
        cropList.appendChild(td);
    });

}
document.getElementById("addcropForm").addEventListener("submit", function(event) {
  event.preventDefault();

  let name = document.getElementById("cropName").value;
  let harvest = document.getElementById("cropHarvest").value.split(",").map(Number);
  let price = Number(document.getElementById("cropPrice").value);

  let crop = { name, harvest, pricePerKg: price };
  farm.crops.push(crop);

  updateCropList(); // refresh UI
  document.getElementById("addCropForm").reset();
});