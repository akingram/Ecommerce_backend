const userSchema = require("../model/userModel");
const mailSending = require("../middleware/emailSetup"); 
const otpGenerator = require("../middleware/otpgenerator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {createAccount, loginAccount } = require("../middleware/joivalidation");

const registerAccount = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;  // accept role too

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required", success: false });
    }

    // Validate email format
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format", success: false });
    }

    // Check if email already exists
    const existingUser = await userSchema.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already exists", success: false });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with role (default to customer if not provided)
    const user = await userSchema.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'customer'
    });

    // Generate JWT token (adjust your JWT secret and payload accordingly)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return token and user info (omit password)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return res.status(201).json({
      token,
      user: userData,
      success: true,
      message: "Account created successfully"
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      message: "Oops!!! an error occurred",
      success: false,
      error: error.message,
    });
  }
};


const signinAccount = async (req, res) => {
  try {
    // 1. Validate input
    const { error } = loginAccount(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password } = req.body;

    // 2. Find user by email
    const user = await userSchema.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // 3. Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // 4. Generate JWT token (24h expiration)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 5. Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // 6. Send response with user data
    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later."
    });
  }
};

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { // FIXED: Ensure email is required
      return res
        .status(401)
        .json({ message: "Email is required", success: false });
    }
    const checkEmail = await userSchema.findOne({ email: email });
    if (!checkEmail) {
      return res
        .status(404)
        .json({ message: "Email not found", success: false });
    }
    const otp = await otpGenerator(email);
    checkEmail.otp = otp;
    const date = new Date();
    date.setMinutes(date.getMinutes() + 10);
    checkEmail.otpExpires = date;

    const option = {
      email: email,
      subject: "OTP for password reset",
      text: `Your OTP is ${otp}. This OTP will expire in 10 minutes.`,
    };

    await mailSending(option);
    await checkEmail.save();
    return res.status(200).json({
      message: "OTP sent successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Oops!!! an error occurred",
      success: false,
      error: error.message,
    });
  }
};


const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res
        .status(401)
        .json({ message: "OTP is required", success: false });
    }

    const checkOtp = await userSchema.findOne({ otp: otp });
    if (!checkOtp) {
      return res.status(401).json({ message: "invalid otp", success: false });
    }

    const date = new Date();
    if (date > checkOtp.otpExpires) {
      return res.status(401).json({ message: "OTP expired", success: false });
    } else {
      return res
        .status(200)
        .json({ message: "otp verified successfully", success: true });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Oops!!! an error occured",
      success: false,
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    let { otp } = req.params;
    otp = otp.replace(/^:/, "").toLowerCase(); // Remove colon & convert to lowercase

    if (!otp) {
      return res.status(400).json({
        message: "OTP is required, failed to reset password",
        success: false,
      });
    }

    const { password, retypePassword } = req.body;
    if (!password || !retypePassword || password.trim() === "" || retypePassword.trim() === "") {
      return res.status(400).json({
        message: "Password fields cannot be empty",
        success: false,
      });
    }

    if (password !== retypePassword) {
      return res.status(400).json({
        message: "Passwords do not match",
        success: false,
      });
    }

    console.log("Searching for OTP:", otp);
    
    // Fetch all user records to debug
    const allUsers = await userSchema.find({}, { email: 1, otp: 1, otpExpires: 1 });
    console.log("All OTP records in DB:", allUsers);

    const checkOtp = await userSchema.findOne({ otp: otp });

    if (!checkOtp) {
      console.log("No matching OTP found.");
      return res.status(400).json({
        message: "Invalid OTP, failed to reset password",
        success: false,
      });
    }

    console.log("Found OTP record:", checkOtp);

    // Check if OTP has expired
    const currentTime = new Date();
    if (currentTime > checkOtp.otpExpires) {
      console.log("OTP has expired.");
      return res.status(400).json({
        message: "OTP expired, failed to reset password",
        success: false,
      });
    }

    // Hash new password and update user record
    checkOtp.password = await bcrypt.hash(password, 10);
    checkOtp.otp = ""; // Clear OTP after use
    checkOtp.otpExpires = null;
    await checkOtp.save();

    console.log("Password reset successfully for:", checkOtp.email);

    return res.status(200).json({
      message: "Password reset successfully",
      success: true,
    });

  } catch (error) {
    console.error("Error in resetPassword:", error.message);
    return res.status(500).json({
      message: "An error occurred",
      success: false,
      error: error.message,
    });
  }
};





      

module.exports = {
  registerAccount,
  signinAccount,
  forgetPassword,
  verifyOTP,
  resetPassword,
};
