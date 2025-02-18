const { productValidation } = require("../middleware/joivalidation");
const Product = require("../model/productModel");
const ProductSchema = require("../model/productModel");
const userSchema = require("../model/userModel"); // ✅ Import User Schema
const Category = require("../model/categoryModel"); 
const { v4: uuidv4 } = require("uuid");

const getProduct = async (req, res) => {
  try {
    let { search, page, limit } = req.query;

    page = parseInt(page) || 1; // Default to page 1
    limit = parseInt(limit) || 10; // Default to 10 products per page
    const skip = (page - 1) * limit;

    let query = {}; // Default: get all products

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }, // Case-insensitive search in name
        { description: { $regex: search, $options: "i" } }, // Case-insensitive search in description
      ];
    }

    // Fetch products with search and pagination
    const products = await Product.find(query).skip(skip).limit(limit);

    // Count total products (for pagination metadata)
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    return res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      products,
      pagination: {
        currentPage: page,
        totalPages,
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
    if (!req.user) {
      return res.status(401).json({
        message: "Access Denied, you are not logged in",
        success: false,
      });
    }

    const userid = req.user.id;
    const check = await userSchema.findById(userid);

    if (!check || check.role !== "admin" && check.role !== "seller") {
      return res.status(403).json({
        message: "Access Denied, you are not an admin",
        success: false,
      });
    }

    // ✅ Validate product input before processing
    const { error } = productValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message, success: false });
    }

    // ✅ Ensure images are uploaded
    if (!req.files || !req.files.images) {
      return res.status(400).json({ message: "Please upload at least one image", success: false });
    }

    let images = req.files.images;
    if (!Array.isArray(images)) {
      images = [images]; // Convert single image to array
    }

    // ✅ Proper hostname formatting
    const hostname = `${req.protocol}://${req.get("host")}`;
    let imageArray = [];

    await Promise.all(
      images.map(async (item) => {
        const imageID = uuidv4();
        const imageExtension = item.name.split(".").pop();
        const newImageName = `${imageID}.${imageExtension}`;
        const imagePath = `${hostname}/public/uploads/${newImageName}`;
        const imageDr = `public/uploads/${newImageName}`;

        await item.mv(imageDr);
        imageArray.push(imagePath);
      })
    );

    const { name, price, category, description } = req.body;

    // ✅ Create product entry
    const newProduct = await ProductSchema.create({
      name,
      price,
      category,
      description,
      images: imageArray,
      user: userid,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(201).json({ message: "Product created successfully", success: true, product: newProduct })
  } catch (error) {
    return res.status(500).json({ message: "Server error", success: false, error: error.message });
  }
}

const updateProduct = async (req, res) => {
  try {
    if (req.user) {
      const userid = req.user.id;
      const user = await userSchema.findOne({ _id: userid });
      if (user.role === "admin") {
        const updateid = req.params.productId;
        const checkproduct = await ProductSchema.findOne({ _id: updateid });

        if (!checkproduct) {
          return res
            .status(404)
            .json({ message: "Product not found", success: false });
        }
        const { name, price, description } = req.body;
        if (name) {
          checkproduct.name = name;
        }
        if (price) {
          checkproduct.price = price;
        }
        if (description) {
          checkproduct.description = description;
        }

        await checkproduct.save();
        return res
          .status(200)
          .json({ message: "Product updated successfully", success: true });
      } else {
        return res
          .status(401)
          .json({ message: "access denied", success: false });
      }
    } else {
      return res
        .status(401)
        .json({ message: "you are not authorised", success: false });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error occured", success: false, error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    if (req.user) {
      const userid = req.user.id;
      const user = await userSchema.findOne({ _id: userid });
      if (user.role === "admin" || user.role ===  "seller") {
        const deleteid = req.params.productId;
        const checkproduct = await ProductSchema.findOne({ _id: deleteid });
        if (!checkproduct) {
          return res
            .status(404)
            .json({ message: "Product not found", success: false });
        }
        await ProductSchema.findByIdAndDelete(deleteid);
        return res
          .status(200)
          .json({ message: "Product deleted successfully", success: true });
      } else {
        return res
          .status(401)
          .json({ message: "Access denied", success: false });
      }
    }
  } catch (error) {
    return res
      .status(401)
      .json({ message: "you are not authorized", success: false });
  }
};

const getCategory = async (req, res) => {
  try {
    const categories = await Category.find();
    return res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      categories,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}


const postCategory = async (req, res) => {

  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const newCategory = new Category({ name });
    await newCategory.save();

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}

const deleteCategory = async (req, res)=> {


  try {
    const categoryId = req.params.categoryId;

    if (!categoryId) {
      return res.status(400).json({ success: false, message: "Category ID is required" });
    }

    const deletedCategory = await Category.findByIdAndDelete(categoryId);

    if (!deletedCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}



module.exports = { postProduct,getProduct, updateProduct,deleteProduct,getCategory,deleteCategory,postCategory };
