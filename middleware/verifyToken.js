const jwt = require("jsonwebtoken");


const verifyToken= (req,res,next)=>{
    const token = req.cookies.access_token || req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Access denied" , success: false});

    }
    try {
        const isVerify = jwt.verify(token, process.env.JWT_SECRET)
        req.user =isVerify
        next()
        
    } catch (error) {
        return res.status(401).json({ message: "invalid token", success: false });
        
    }
}


  

module.exports = {verifyToken}