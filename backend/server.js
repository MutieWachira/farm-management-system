const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const cropRoutes = require("./routes/cropRoute");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/crops", cropRoutes);

mongoose.connect("mongodb://127.0.0.1:27017/farmDB")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Mongo Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
