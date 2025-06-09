const userModel = require("../model/userModel");
const cartModel = require("../model/cartModel");
const checkOutModel = require("../model/checkOutModel");
const { initializePayment, verifyPaymentStatus } = require("../middleware/paystack");

const payment = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to make a payment",
      });
    }

    const userId = req.user.id;
    const currentUser = await userModel.findOne({ _id: userId });
    
    // Fixed: Use consistent field names - should be 'user' not 'userId' based on your cart schema
    const userCart = await cartModel.findOne({ user: userId }).populate("items.product");

    if (!userCart || !userCart.items.length) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    let totalAmount = 0;
    userCart.items.forEach(item => {
      if (item.product && item.product.price) {
        totalAmount += item.product.price * item.quantity;
      }
    });

    const transactionData = {
      email: currentUser.email,
      userId: currentUser._id,
      name: req.body.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
      firstName: req.body.firstName || currentUser.firstName,
      lastName: req.body.lastName || currentUser.lastName,
      totalAmount: totalAmount,
      items: userCart.items,
      callback_url: "https://ecommerce-backend-ne86.onrender.com/api/vp1/payment/callback",
    };

    const paymentResponse = await initializePayment(transactionData);
    
    if (paymentResponse && paymentResponse.data && paymentResponse.data.authorization_url) {
      const { authorization_url } = paymentResponse.data;
      
      // Return JSON response instead of redirect for API consistency
      return res.status(200).json({
        success: true,
        message: "Payment initialized successfully",
        authorization_url: authorization_url
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to initialize payment"
      });
    }

  } catch (error) {
    console.error("Payment initialization error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server Error",
      error: error.message 
    });
  }
};

const callBack = async (req, res) => {
  try {
    const { reference, trxref } = req.query;

    if (!reference && !trxref) {
      return res.status(400).json({
        success: false,
        message: "Missing payment reference"
      });
    }

    // Verify payment status
    const paymentStatus = await verifyPaymentStatus(trxref || reference);

    if (!paymentStatus || !paymentStatus.data) {
      return res.status(400).json({
        success: false,
        message: "Unable to verify payment"
      });
    }

    // Extract user information from payment metadata if available
    const userId = paymentStatus.data.metadata?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Unable to identify user"
      });
    }

    const currentUser = await userModel.findOne({ _id: userId });
    const userCart = await cartModel.findOne({ user: userId }).populate("items.product");

    if (!userCart || !userCart.items.length) {
      return res.status(400).json({ 
        success: false, 
        message: "Cart is empty or not found" 
      });
    }

    let totalAmount = 0;
    const products = userCart.items.map((item) => {
      if (item.product && item.product.price) {
        totalAmount += item.product.price * item.quantity;
      }
      return {
        product: item.product._id,
        quantity: item.quantity
      };
    });

    if (paymentStatus.data.status === "success") {
      // Create successful checkout record
      await checkOutModel.create({
        userId: userId,
        product: products,
        reference: reference || "",
        trxref: trxref || "",
        status: true,
        totalAmount: totalAmount,
        createdAt: new Date()
      });

      // Clear the cart after successful payment
      await cartModel.deleteOne({ user: userId });

      // If this is a web request, render the page
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        res.render("checkout", {
          message: "Payment successful",
          success: true,
          currentUser
        });
      } else {
        // Return JSON response for API requests
        return res.status(200).json({
          success: true,
          message: "Payment successful",
          order: {
            reference: reference || trxref,
            totalAmount: totalAmount,
            products: products
          }
        });
      }
    } else {
      // Create failed checkout record
      await checkOutModel.create({
        userId: userId,
        product: products,
        reference: reference || "",
        trxref: trxref || "",
        status: false,
        totalAmount: totalAmount,
        createdAt: new Date()
      });

      // If this is a web request, render the page
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        res.render("checkout", {
          message: "Payment failed",
          success: false,
          currentUser,
          userCart: userCart.items,
          totalAmount
        });
      } else {
        // Return JSON response for API requests
        return res.status(400).json({
          success: false,
          message: "Payment failed",
          totalAmount: totalAmount
        });
      }
    }

  } catch (error) {
    console.error("Error processing payment callback:", error);
    
    // Handle both web and API responses
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      res.status(500).render("error", {
        message: "Payment processing error"
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Server Error",
        error: error.message 
      });
    }
  }
};

module.exports = {
  payment,
  callBack
};