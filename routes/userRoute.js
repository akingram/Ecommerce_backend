const express = require("express");
const {
  postProduct,
  updateProduct,
  deleteProduct,
  getCategory,
  postCategory,
  deleteCategory,
  getProduct,
} = require("../controller/adminController");
const { verifyToken, verifyAdmin } = require("../middleware/verifyToken");
const { getText, getPostedProducts, addToCart, getCart, deleteCart, placeOrder, getUserOrders, getOrderById } = require("../controller/userController");
const {
  registerAccount,
  signinAccount,
  forgetPassword,
  verifyOTP,
  resetPassword,
} = require("../controller/authContoller");
const { payment, callBack } = require("../controller/paymentContoller");

const router = express.Router();

router.get("/send", getText);
router.get("/getproduct", getPostedProducts);
router.get("/search", getProduct)
router.post("/register", registerAccount);
router.post("/signin", signinAccount);
router.patch("/update/:productId", verifyToken, updateProduct);
router.post("/products", verifyToken, postProduct);
router.delete("/delete/:productId", verifyToken, deleteProduct);
router.post("/forgetpassword", forgetPassword);
router.post("/verifyotp", verifyOTP);
router.post("/resetpassword/:otp", resetPassword);
router.post("/addCart", verifyToken,addToCart)
router.get("/cart",verifyToken,getCart)
router.delete("/deletecart", verifyToken,deleteCart)
router.get("/getcarte",verifyToken,getCategory)
router.post("/postcarte",verifyToken,postCategory)
router.delete("/delcarte/:categoryId", verifyToken,deleteCategory)
router.post("/order", verifyToken,placeOrder)
router.get("/getorder",verifyToken,getUserOrders)
router.get("/getorderbyid/:order_id",verifyToken,getOrderById)
router.post("/payment",verifyToken,payment)
router.get("/callback",verifyToken,callBack)



module.exports = router;
