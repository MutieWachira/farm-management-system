//dealing with strings
let farmer = "John";
let crop = "Wheat";

console.log(`${farmer} grows ${crop}.`)

//dealing with arrays
let crops = ["Wheat", "maize", "rice"];
console.log(crops);
crops.push("barley");
console.log(crops);

//dealing with objects
let farm = {
  name: "Green Valley",
  location: "Nairobi",
  crops: ["Maize", "Beans"],
  size: 50
};

console.log(farm.name);         // Green Valley
console.log(farm.location);  // Nairobi
console.log(farm.crops[0]);     // Maize


let cropss = ["Maize", "Beans", "Rice"];

for (let i = 0; i < cropss.length; i++) {
  console.log(cropss[i]);
}

for (let crop of cropss) {
  console.log(crop);
}

//conditional statements
let harvest = [12, 28, 7, 19, 25, 3, 14, 30, 9, 22, 17, 6];
//for loop (classic, most flexible)
//Best when you need the index (i).
//Very flexible (can count up, down, or skip steps).
for (let x = 0; x < harvest.length; x++) {
    if (harvest[x] >= 10) {
        console.log("Week", x + 1, ": Good harvest (" + harvest[x] + ")");
    } else {
        console.log("Week", x + 1, ": Poor harvest (" + harvest[x] + ")");
    }
}

//while loop
//Best when you don’t know how many times you’ll loop, just the stopping condition.
//Example: keep watering crops until soil moisture reaches 70%.
let y = 0;
while (y < harvest.length) {
  console.log("Harvest:", harvest[y]);
  y++;
}

//. for...of loop
//Best when you only care about the values (not indexes).
//Short and clean.
for (let value of harvest) {
    console.log("Harvest value:", value);
}
//forEach method
//Best when working directly with arrays.
//Looks cleaner but you can’t break early (loops all items always).
harvest.forEach((value, index) => {
    console.log("Week", index + 1, ":", value);
});

//functions
function calculateTotal(harvests) {
    let total = 0;
    for (let value of harvests) {
        total += value;
    }
    return total;
}
function isProfitable(harvests){
  if(harvests >= 10){
    return "Profitable harvest";
  }else{
    return "Unprofitable harvest";
  }
  }

let harvests = [12, 8, 15, 20];
console.log("Total harvest:", calculateTotal(harvests));
console.log(isProfitable(20));
console.log(isProfitable(5));
