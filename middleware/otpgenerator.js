const userSchema = require("../model/userModel");
const crypto = require("crypto")

const otpGenerator = async(email) => {
    let timestap = Date.now()
    let date = new Date(). toDateString()
    let hash = crypto
    .createHash("sha256")
    .update(email+timestap+date)
    .digest("hex")

    let otp = hash.substring(0,6)
    let checkOtp = await userSchema.findOne({ otp: otp })
    while(checkOtp) {
        let timestap = Date.now()
        let date = new Date(). toDateString()
        let hash = crypto
        .createHash("sha256")
        .update(email+timestap+date)
        .digest("hex")

        let otp = hash.substring(0,6)
        let checkOtp = await userSchema.findOne({ otp: otp })
    }

    return otp
}

module.exports = otpGenerator