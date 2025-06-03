const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/verifyToken");
const { isAdmin, isSellerOrAdmin } = require("../middleware/RoleCheck");

// Import controllers
const adminController = require("../controller/adminController");
const userController = require("../controller/userController");
const authController = require("../controller/authController");
const paymentController = require("../controller/paymentController");

// Auth routes
router.get('/auth/verifytoken', verifyToken, (req, res) => {
  res.json({ 
    success: true, 
    user: req.user 
  });
});

router.get('/user/profile', verifyToken, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Public routes
router.get("/products", adminController.getProduct);
router.get("/products/:id", adminController.getProduct);
router.post("/register", authController.registerAccount);
router.post("/signin", authController.signinAccount);
router.post("/forgetpassword", authController.forgetPassword);
router.post("/verifyotp", authController.verifyOTP);
router.post("/resetpassword/:otp", authController.resetPassword);

// Protected product routes with validation
router.post("/products", verifyToken, isSellerOrAdmin, adminController.postProduct);
router.patch("/products/:productId", verifyToken, isSellerOrAdmin, adminController.updateProduct);
router.delete("/products/:productId", verifyToken, isSellerOrAdmin, adminController.deleteProduct);

// Admin-only category routes
router.get("/admin/categories", verifyToken, isAdmin, adminController.getCategory);
router.post("/admin/categories", verifyToken, isAdmin, adminController.postCategory);
router.delete("/admin/categories/:id", verifyToken, isAdmin, adminController.deleteCategory);

// Cart routes
router.post("/cart", verifyToken, userController.addToCart);
router.get("/cart", verifyToken, userController.getCart);
router.delete("/cart/:id?", verifyToken, userController.deleteCart);

// Order routes
router.post("/orders", verifyToken, userController.placeOrder);
router.get("/orders", verifyToken, userController.getUserOrders);
router.get("/orders/:id", verifyToken, userController.getOrderById);

// Payment routes
router.post("/payment", verifyToken, userController.payment);
router.get("/payment/callback", paymentController.callBack);

module.exports = router;
