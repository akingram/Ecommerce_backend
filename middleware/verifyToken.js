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

const verifyAdmin = (req, res, next)=> {
    if (!req.user || req.user.role!== "admin") {
        return res.status(403).json({ message: "Access denied, you are not an admin", success: false });
    }
    next();
}


  

module.exports = {verifyToken}