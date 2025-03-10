const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category:{
        type: String,
        required: true
    },
    
    image: [{ type: String }], // Optional image URL
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Seller/Admin
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Product", ProductSchema);
