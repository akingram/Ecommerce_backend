const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/verifyToken");
const { isAdmin, isSellerOrAdmin } = require("../middleware/RoleCheck");

// Controllers
const adminController = require("../controller/adminController");
const userController = require("../controller/userController");
const authController = require("../controller/authController");
const paymentController = require("../controller/paymentController");

// Optional: Debugging check (remove in production)
// console.log("=== CONTROLLER FUNCTION DEBUGGING ===");

// console.log("Admin Controller Functions:", {
//   getProduct: typeof adminController.getProduct,
//   getProductById: typeof adminController.getProductById,
//   postProduct: typeof adminController.postProduct,
//   updateProduct: typeof adminController.updateProduct,
//   deleteProduct: typeof adminController.deleteProduct,
//   getCategory: typeof adminController.getCategory,
//   postCategory: typeof adminController.postCategory,
//   deleteCategory: typeof adminController.deleteCategory
// });

// console.log("User Controller Functions:", {
//   getText: typeof userController.getText,
//   getPostedProducts: typeof userController.getPostedProducts,
//   addToCart: typeof userController.addToCart,
//   getCart: typeof userController.getCart,
//   deleteCart: typeof userController.deleteCart,
//   placeOrder: typeof userController.placeOrder,
//   getUserOrders: typeof userController.getUserOrders,
//   getOrderById: typeof userController.getOrderById,
//   payment: typeof userController.payment
// });

// console.log("Auth Controller Functions:", {
//   registerAccount: typeof authController.registerAccount,
//   signinAccount: typeof authController.signinAccount,
//   forgetPassword: typeof authController.forgetPassword,
//   verifyOTP: typeof authController.verifyOTP,
//   resetPassword: typeof authController.resetPassword
// });

// console.log("Payment Controller Functions:", {
//   payment: typeof paymentController.payment,
//   callBack: typeof paymentController.callBack
// });

// console.log("=== END DEBUGGING ===");

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