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
function totalRevenue(crops){
    return crops.reduce((sum, crop) => {
        let harvest = crop.harvest.reduce((a, b) => a + b, 0);
        return sum + (harvest * crop.pricePerKg);
    }, 0);
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
}
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
// --- Form Handlers ---
//add crop from handler
document.getElementById("addcropForm").addEventListener('submit', function(e){
    e.preventDefault();

    let name = document.getElementById('cropName').value;
    let harvest = document.getElementById('cropHarvest').value.split(',').map(Number);
    let price = parseFloat(document.getElementById('cropPrice').value);

    farm.crops.push({name, harvest, pricePerKg: price});

    renderHarvestChart();
    updateCropList();
    saveFarmData()
    e.target.reset();
});
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

// --- Initial Load ---
loadFarmData();
renderHarvestChart();
updateCropList();

