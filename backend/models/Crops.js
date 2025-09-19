const mongoose = require("mongoose");

//crop Schema
const cropSchema = new mongoose.Schema({
    name: {type: String, required: true},
    quantity: { type: Number, required: true },
    price: {type: Number, required: true},
});

//Export Model
module.exports = mongoose.model("Crops", cropSchema);

