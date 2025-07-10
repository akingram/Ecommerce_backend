const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/verifyToken");
const { isAdmin, isSellerOrAdmin } = require("../middleware/RoleCheck");

// Controllers
const adminController = require("../controller/adminController");
const userController = require("../controller/userController");
const authController = require("../controller/authController");
const paymentController = require("../controller/paymentController");

// ===================== Auth Routes =====================

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

router.post("/register", authController.registerAccount);
router.post("/signin", authController.signinAccount);
router.post("/forgetpassword", authController.forgetPassword);
router.post("/verifyotp", authController.verifyOTP);
router.post("/resetpassword/:otp", authController.resetPassword);

// ===================== Product Routes =====================
router.get("/products", adminController.getProduct);
router.get("/products/:id", adminController.getProductById);
router.post("/products", verifyToken, isSellerOrAdmin, adminController.postProduct);
router.patch("/products/:productId", verifyToken, isSellerOrAdmin, adminController.updateProduct);
router.delete("/products/:productId", verifyToken, isSellerOrAdmin, adminController.deleteProduct);

// ===================== Admin/Seller Specific Routes =====================
// Get products posted by the current admin/seller
router.get("/admin/my-products", verifyToken, isSellerOrAdmin, adminController.getMyProducts);

// ===================== Category Routes (Admin Only) =====================
router.get("/admin/categories", verifyToken, isAdmin, adminController.getCategory);
router.post("/admin/categories", verifyToken, isAdmin, adminController.postCategory);
router.delete("/admin/categories/:id", verifyToken, isAdmin, adminController.deleteCategory);

// ===================== Cart Routes =====================
router.post("/cart", verifyToken, userController.addToCart);
router.get("/cart", verifyToken, userController.getCart);
router.delete("/cart/:productId?", verifyToken, userController.deleteCart);

// ===================== Order Routes =====================
router.post("/orders", verifyToken, userController.placeOrder);
router.get("/orders", verifyToken, userController.getUserOrders);
router.get("/orders/:id", verifyToken, userController.getOrderById);

// ===================== Payment Routes =====================
// Use the dedicated payment controller for payment processing
router.post("/payment", verifyToken, paymentController.payment);
router.get("/payment/callback", paymentController.callBack);

// Optional: Keep a simple payment endpoint in user controller for basic info
router.get("/payment/info", verifyToken, userController.payment);

module.exports = router;