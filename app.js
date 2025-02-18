const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const cookie = require("cookie-parser");
const path = require("path");
const allRoutes = require("./routes/userRoute");
const expressfileupload = require("express-fileupload");
const MONGODB = process.env.MONGODB_URL;

mongoose.connect(MONGODB)
    .then(() => {
        console.log("DB connection established");
    })
    .catch((error) => {
        console.log(error);
    });

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(expressfileupload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie());

app.use("/api/vp1", allRoutes);

const port = process.env.PORT || 3000;  // Default to port 3000 if not provided
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);  // Use 'port' here
});
