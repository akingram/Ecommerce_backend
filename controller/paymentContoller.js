const userModel = require("../model/userModel");
const cartModel = require("../model/cartModel");
const checkOutModel = require("../model/checkOutModel");
const { initializePayment, verifyPaymentStatus } = require("../middleware/paystack");

// const calculateCartTotal = (userCart) => {
//   return userCart.items.reduce((total, item) => {
//     return total + item.product.price * item.quantity;
//   }, 0);
// };
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
      const userCart = await cartModel.findOne({ userId: userId }).populate("product");
  
      let totalAmount = 0;
      userCart.items.forEach(item => { 
        totalAmount += item.product.price * item.quantity;
      });
  
      const transactionData = {
        email: currentUser.email,
        userId: currentUser._id,
        name: req.body.name,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        totalAmount: totalAmount,
        items: userCart.items,
        callback_url: "https://localhost:3000/callback",
      };
  
      const paymentResponse = await initializePayment(transactionData);
      const { authorization_url } = paymentResponse.data;
      res.redirect(authorization_url);
  
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: "Server Error" });
    }
  };
  

  const callBack = async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect("/login");
      }
  
      const userId = req.user.id;
      const currentUser = await userModel.findOne({ _id: userId });
      const userCart = await cartModel.findOne({ userId: userId }).populate("product");
  
      let totalAmount = 0;
      userCart.items.forEach(item => { 
        totalAmount += item.product.price * item.quantity;

      });
      if (!userCart || !userCart.items.length) {
        return res.status(400).json({ success: false, message: "Cart is empty" });
    }    
  
      const { reference, trxref } = req.query;
      const paymentStatus = await verifyPaymentStatus(trxref);
  
      if (paymentStatus.data.status === "success") {
        const products = userCart.items.map((item) => ({
          product: item.product._id,
          quantity: item.quantity
        }));
  
        await checkOutModel.create({
          userId: userId,
          product: products,
          reference: reference || "",
          trxref: trxref || "",
          status: true,
        });
  
        await cartModel.deleteMany({ userId: userId });
  
        res.render("checkout", {
          message: "Payment successful",
          success: true,
          currentUser
        });
      } else {
        await checkOutModel.create({
          userId: userId,
          product: products,
          reference: reference || "",
          trxref: trxref || "",
          status: false,
        });
  
        res.render("checkout", {
          message: "Payment failed",
          currentUser,
          userCart: userCart.items,
          totalAmount
        });
      }
  
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  };
  

module.exports = {
    payment,
    callBack
}