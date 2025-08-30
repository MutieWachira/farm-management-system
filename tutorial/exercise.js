let name = "Christopher";

let crops = ["Beans", "Mango", "Avocado"];
console.log(crops[1]);

let farm = {
    name: "Boulevard",
    location: "Nyeri",
    size: 200
};
console.log(farm.name);

const square = y => y * y;
console.log(square(3));

const x = 10;
for(let i = 1; i <= x; i++){
    console.log(i);
}

let harvest = [12, 28, 7, 19, 25, 3, 14, 30, 9, 22, 17, 6];
let totalHarvest = harvest.reduce((sum, value) => sum + value, 0);
console.log(totalHarvest);
// to find minimum and maximum harvest
//let maxHarvest = harvest.reduce((max, value) => {
    //return value > max ? value : max;
//});
//console.log(maxHarvest);

let minHarvest = harvest.reduce((min, value) => {
    return value < min ? value : min;
});
console.log(minHarvest);

//assignment of functions
function calculateTotal(harvest){
    return harvest.reduce((sum, value) => sum + value, 0);
}

function averageHarvest(harvest){
    let total = calculateTotal(harvest);
    return total / harvest.length;
}

function isProfitable(harvest){
    for(let i = 0; i < harvest.length; i++){
        if (harvest[i] >= 10) {
            console.log("Good Harvest")
        }else{
            console.log("Poor Harvest")
        }
    }
}

function maxHarvest(harvest){
    return harvest.reduce((max, value) => {
        return value > max ? value : max;
    }, harvest[0]);
}

console.log(calculateTotal(harvest));
console.log(averageHarvest(harvest));
console.log(isProfitable(harvest));
console.log(maxHarvest(harvest));