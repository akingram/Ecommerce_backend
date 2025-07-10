const ProductSchema = require("../model/productModel");
const CartSchema = require("../model/cartModel");
const UserSchema = require("../model/userModel");
const Order = require("../model/orderModel");
const mongoose = require("mongoose");

const getText = (req, res) => {
  try {
    const hostname = `${req.protocol}://${req.get("host")}`;
    return res.send(
      `welcome to the user route, you can get the text from the url ${hostname}`
    );
  } catch (error) {
    res.status(500);
    console.log(error.message);
  }
};

const getPostedProducts = async (req, res) => {
  try {
    const { category } = req.query;
    let filter = {};
    if (category) {
      filter.category = category;
    }

    // Fixed: Use ProductSchema instead of Product
    const products = await ProductSchema.find(filter).populate(
      "createdBy",
      "-password"
    );

    if (!products || products.length === 0) {
      return res.status(404).json({
        message: "No products found",
        success: false,
        data: [],
      });
    }

    return res.status(200).json({
      message: "Products found successfully",
      success: true,
      data: products,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
};

const getCart = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "You must be logged in to view the cart",
        success: false,
      });
    }

    const userId = req.user.id;
    const currentUser = await UserSchema.findById(userId);

    if (!currentUser) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    // Find the user's cart and populate product details
    const cart = await CartSchema.findOne({ user: userId }).populate({
      path: "items.product",
      model: "Product",
    });

    if (!cart || cart.items.length === 0) {
      return res
        .status(200)
        .json({ message: "Cart is empty", success: true, cart: [] });
    }

    let totalAmount = 0;
    const cartItems = cart.items
      .map((item) => {
        if (!item.product) {
          console.log("Item has no product:", item);
          return null;
        }

        const image =
          item.product.images && item.product.images.length > 0
            ? item.product.images[0]
            : null;

        totalAmount += item.product.price * item.quantity;
        return {
          productId: item.product._id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          total: item.product.price * item.quantity,
          image: image,
        };
      })
      .filter((item) => item !== null);

    return res.status(200).json({
      message: "Cart retrieved successfully",
      success: true,
      cartItems,
      totalAmount,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
};

const addToCart = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "You must be logged in to add items to your cart",
        success: false,
      });
    }

    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID format",
        success: false,
      });
    }

    const ObjectId = mongoose.Types.ObjectId;
    const product = await ProductSchema.findOne({
      _id: new ObjectId(productId),
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
        success: false,
      });
    }

    let cart = await CartSchema.findOne({ user: userId });

    if (!cart) {
      cart = new CartSchema({
        user: userId,
        items: [{ product: new ObjectId(productId), quantity: quantity || 1 }],
      });
    } else {
      const existingItem = cart.items.find((item) => {
        if (item.product && item.product.toString) {
          return item.product.toString() === productId;
        }
        return false;
      });

      if (existingItem) {
        existingItem.quantity += quantity || 1;
      } else {
        cart.items.push({
          product: new ObjectId(productId),
          quantity: quantity || 1,
        });
      }
    }

    await cart.save();

    return res.status(200).json({
      message: "Product added to cart successfully",
      success: true,
      cart,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }

};

const deleteCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const cart = await CartSchema.findOne({ user: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ message: "Cart not found", success: false });
    }

    if (productId) {
      cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId
      );
      await cart.save();

      return res.status(200).json({
        message: "Product removed from cart successfully",
        success: true,
        cart,
      });
    } else {
      await CartSchema.deleteOne({ user: userId });

      return res.status(200).json({
        message: "Cart deleted successfully",
        success: true,
      });
    }
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || products.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No products provided" });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of products) {
      // Fixed: Use ProductSchema instead of Product
      const product = await ProductSchema.findById(item.product);
      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            message: `Product not found: ${item.product}`,
          });
      }

      totalAmount += product.price * item.quantity;
      orderItems.push({ product: product._id, quantity: item.quantity });
    }

    const newOrder = new Order({
      user: req.user.id,
      products: orderItems,
      totalAmount,
    });

    await newOrder.save();

    return res
      .status(201)
      .json({
        success: true,
        message: "Order placed successfully",
        order: newOrder,
      });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate(
      "products.product",
      "name price"
    );

    return res
      .status(200)
      .json({
        success: true,
        message: "Orders retrieved successfully",
        orders,
      });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "products.product",
      "name price"
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Order details retrieved", order });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Added the missing payment function
const payment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to make a payment",
      });
    }

    // For now, this is a placeholder. You might want to integrate with your payment logic
    // or redirect to the payment controller
    return res.status(200).json({
      success: true,
      message: "Payment functionality - integrate with your payment service",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      message: "Server error",
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  getText,
  getPostedProducts,
  addToCart,
  getCart,
  deleteCart,
  placeOrder,
  getUserOrders,
  getOrderById,
  payment, // Added this to exports
};
