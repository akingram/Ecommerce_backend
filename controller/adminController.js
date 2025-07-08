const { productValidation } = require("../middleware/joivalidation");
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const { v4: uuidv4 } = require("uuid");
const sanitize = require("sanitize-filename");

const getProduct = async (req, res) => {
  try {
    let { search, page, limit, category } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Fix: Use 'createdBy' instead of 'user' to match your schema
    if (req.user?.role === "seller") {
      query.createdBy = req.user.id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category; // This works since category is stored as string
    }

    // Fix: Use 'createdBy' instead of 'user' in populate
    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email");

    const totalProducts = await Product.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    // Fix: Use 'createdBy' instead of 'user' in populate
    const product = await Product.findById(req.params.id).populate("createdBy", "name email");
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const postProduct = async (req, res) => {
  try {
    const userid = req.user?.id; // Make optional in case auth is not working

    // Basic validation - replace your productValidation if needed
    const { name, description, price, category } = req.body;
    
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, description, price, category) are required",
      });
    }

    // Check if category exists by NAME (not ObjectId)
    let categoryExists = await Category.findOne({ name: category });
    if (!categoryExists) {
      // Create the category if it doesn't exist
      categoryExists = await Category.create({ name: category });
    }

    // Check for single image upload (your frontend sends 'image', not 'images')
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image",
      });
    }

    // Create the product with the correct field names
    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category: category, // Store as string (matches your schema)
      image: req.file.path, // Single image path (matches your schema)
      createdBy: userid, // Use createdBy (matches your schema)
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error('Error in postProduct:', error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Fix: Use 'createdBy' instead of 'user' to match your schema
    if (req.user.role !== "admin" && product.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this product",
      });
    }

    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.price) updates.price = req.body.price;
    if (req.body.description) updates.description = req.body.description;
    if (req.body.category) {
      // Fix: Check category by name instead of ObjectId
      const catExists = await Category.findOne({ name: req.body.category });
      if (!catExists) {
        // Create category if it doesn't exist
        await Category.create({ name: req.body.category });
      }
      updates.category = req.body.category;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.productId,
      updates,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Fix: Use 'createdBy' instead of 'user' to match your schema
    if (req.user.role !== "admin" && product.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this product",
      });
    }

    await Product.findByIdAndDelete(req.params.productId);
    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// New Category Functions
const getCategory = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

const postCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    const newCategory = await Category.create({ name });
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    
    // Optional: Remove this category from all products
    await Product.updateMany(
      { category: req.params.id },
      { $unset: { category: "" } }
    );

    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

module.exports = {
  getProduct,
  getProductById,
  postProduct,
  updateProduct,
  deleteProduct,
  getCategory,
  postCategory,
  deleteCategory
};
