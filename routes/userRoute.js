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


// ===================== Admin Dashboard Routes =====================

// Dashboard Statistics
router.get("/admin/dashboard-stats", verifyToken, isAdmin, adminController.getDashboardStats);

// Recent Orders for Admin
router.get("/admin/recent-orders", verifyToken, isAdmin, adminController.getRecentOrders);

// Admin Notifications
router.get("/admin/notifications", verifyToken, isAdmin, adminController.getNotifications);

// Mark notification as read
router.patch("/admin/notifications/:id/read", verifyToken, isAdmin, adminController.markNotificationRead);

// ===================== Enhanced Order Management =====================

// Get all orders (admin view)
router.get("/admin/orders", verifyToken, isAdmin, adminController.getAllOrders);

// Update order status
router.patch("/admin/orders/:orderId/status", verifyToken, isAdmin, adminController.updateOrderStatus);

// Get order analytics
router.get("/admin/analytics/orders", verifyToken, isAdmin, adminController.getOrderAnalytics);

// ===================== Enhanced Product Analytics =====================

// Get product analytics
router.get("/admin/analytics/products", verifyToken, isAdmin, adminController.getProductAnalytics);

// Get low stock products
router.get("/admin/products/low-stock", verifyToken, isAdmin, adminController.getLowStockProducts);

// ===================== User Management (Admin) =====================

// Get all users
router.get("/admin/users", verifyToken, isAdmin, adminController.getAllUsers);

// Update user status
router.patch("/admin/users/:userId/status", verifyToken, isAdmin, adminController.updateUserStatus);

// ===================== Settings Routes =====================

// Get admin settings
router.get("/admin/settings", verifyToken, isAdmin, adminController.getSettings);

// Update admin settings
router.patch("/admin/settings", verifyToken, isAdmin, adminController.updateSettings);

module.exports = router;