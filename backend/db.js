const mongoose = require("mongoose");

//connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/farmDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;

//event listeners
db.on("error", console.error.bind(console, "Connection Error!"));
db.once("open", () => {
    console.log("MongoDB Conection successfully!");
});

module.export = db;