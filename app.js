const express = require("express");
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const path = require("path");
const cors = require("cors");
const allRoutes = require("./routes/userRoute");
const fileUpload = require("express-fileupload");
const helmet = require("helmet");
const xssClean = require("xss-clean");
const rateLimit = require("express-rate-limit");

// Database connection
mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log("DB connection established"))
  .catch(error => console.error("DB connection error:", error));

// Fixed CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Add more origins as needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept',
    'X-Requested-With',
    'Access-Control-Allow-Origin'
  ], // Removed 'multipart/form-data' - this is not a header name
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Handle preflight requests explicitly
app.options('*', cors());

// File upload middleware with proper configuration
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  useTempFiles: true,
  tempFileDir: '/tmp/',
  debug: true // Enable debug logging
}));

// Other middlewares
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure helmet with CORS-friendly settings
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(xssClean());
// app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Routes
app.use("/api/vp1", allRoutes);

// Health check endpoint
app.get("/api/vp1/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// Error handling
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});