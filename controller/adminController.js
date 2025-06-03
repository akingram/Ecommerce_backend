const { productValidation } = require("../middleware/joivalidation");
const Product = require("../model/productModel");
const userSchema = require("../model/userModel");
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

    if (req.user?.role === "seller") {
      query.user = req.user.id;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .populate("user", "name email");

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

const postProduct = async (req, res) => {
  try {
    const userid = req.user.id;

    const { error } = productValidation(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category does not exist",
      });
    }

    if (!req.files?.images) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image",
      });
    }

    const hostname = `${req.protocol}://${req.get("host")}`;
    const images = Array.isArray(req.files.images)
      ? req.files.images
      : [req.files.images];

    const imageArray = await Promise.all(
      images.map(async (item) => {
        const imageID = uuidv4();
        const extension = sanitize(item.name.split(".").pop());
        const filename = sanitize(`${imageID}.${extension}`);
        const path = `public/uploads/${filename}`;

        await item.mv(path);
        return `${hostname}/public/uploads/${filename}`;
      })
    );

    const product = await Product.create({
      ...req.body,
      images: imageArray,
      user: userid,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
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

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (req.user.role !== "admin" && product.user.toString() !== req.user.id) {
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
      const catExists = await Category.findById(req.body.category);
      if (!catExists) {
        return res.status(400).json({
          success: false,
          message: "Provided category does not exist",
        });
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

    if (req.user.role !== "admin" && product.user.toString() !== req.user.id) {
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

module.exports = {
  getProduct,
  postProduct,
  updateProduct,
  deleteProduct,
};
