const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const cookie = require("cookie-parser");
const path = require("path");
const cors = require("cors");   // <<== ADD THIS
const allRoutes = require("./routes/userRoute");
const expressfileupload = require("express-fileupload");
const MONGODB = process.env.MONGODB_URL;

// Database connection
mongoose.connect(MONGODB)
    .then(() => {
        console.log("DB connection established");
    })
    .catch((error) => {
        console.log(error);
    });

// Middlewares
app.use(cors({
    origin: 'http://localhost:5173', // Allow your frontend
    credentials: true                // Allow sending cookies if needed
}));

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(expressfileupload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookie());

// Routes
app.use("/api/vp1", allRoutes);

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
