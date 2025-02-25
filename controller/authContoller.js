const userSchema = require("../model/userModel");
const otpGenerator = require("../middleware/otpgenerator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {createAccount, loginAccount } = require("../middleware/joivalidation");

const registerAccount = async (req, res) => {
    try {
      const { error } = createAccount(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message, success: false });
      }
      
      const { name, email, password, retypePassword } = req.body;
      if (password !== retypePassword) {
        return res.status(400).json({ error: "Passwords do not match", success: false });
      }
      
      const checkEmail = await userSchema.findOne({ email });
      if (checkEmail) {
        return res.status(409).json({ error: "Email already exists", success: false });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await userSchema.create({
        name,
        email,
        password: hashedPassword,  // ✅ Correct field name
      });

      return res.status(200).json({ message: "Account created successfully", success: true });

    } catch (error) {
      return res.status(500).json({
        message: "Oops!!! an error occurred",
        success: false,
        error: error.message,
      });
    }
};

const signinAccount = async (req, res) => {
    try {
        const { error } = loginAccount(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message, success: false });
        }

        const { email, password } = req.body;
        const checkUser = await userSchema.findOne({ email });

        if (!checkUser) {
            return res.status(400).json({ message: "Email and password mismatch", success: false });
        }

        console.log("User found:", checkUser);  // ✅ Debugging

        const checkPassword = bcrypt.compareSync(password, checkUser.password);  // ✅ Correct field name
        if (!checkPassword) {
            return res.status(400).json({ message: "Wrong credentials", success: false });
        }

        console.log("JWT_SECRET:", process.env.JWT_SECRET);

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in the environment variables.");
        }

        const token = jwt.sign({ id: checkUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res
            .cookie("access_token", token, { maxAge: 60 * 60 * 1000, httpOnly: true })
            .status(200)
            .json({ message: "Logged in successfully", success: true });

    } catch (error) {
        return res.status(500).json({
            message: "Oops!!! an error occurred",
            success: false,
            error: error.message,
        });
    }
};

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      return res
        .status(401)
        .json({ message: "email is required", success: false });
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

    await MailSending(option);
    await checkEmail.save();
    return res.status(200).json({
      message: "OTP sent successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Oops!!! an error occured",
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
    const resetPassword = async (req, res) => {
        try {
          const otp = req.params.otp;
          if (!otp) {
            return res.status(401).json({
              message: "OTP is required, failed to reset password",
              success: false,
            });
          }
      
          const { password, retypePassword } = req.body;
          if (!password || !retypePassword || password.trim() === "" || retypePassword.trim() === "") {
            return res.status(401).json({
              message: "This field cannot be empty",
              success: false,
            });
          }
      
          if (password !== retypePassword) {
            return res.status(401).json({
              message: "Passwords do not match",
              success: false,
            });
          }
      
          // OTP validation should be outside the password match check
          const checkOtp = await userSchema.findOne({ otp: otp });
          if (!checkOtp) {
            return res.status(401).json({
              message: "Invalid OTP, failed to reset password",
              success: false,
            });
          }
      
          const date = new Date();
          if (date > checkOtp.otpExpires) {
            return res.status(401).json({
              message: "OTP expired, failed to reset password",
              success: false,
            });
          }
      
          checkOtp.password = bcrypt.hashSync(password, 10);
          checkOtp.otp = "";
          checkOtp.otpExpires = "";
          await checkOtp.save();
      
          return res.status(200).json({
            message: "Password reset successfully",
            success: true,
          });
      
        } catch (error) {
          return res.status(500).json({
            message: "An error occurred",
            success: false,
            error: error.message,
          });
        }
    }
      };
      

module.exports = {
  registerAccount,
  signinAccount,
  forgetPassword,
  verifyOTP,
  resetPassword,
};
