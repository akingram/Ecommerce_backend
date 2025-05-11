const jwt = require("jsonwebtoken");


const verifyToken = async (req, res, next) => {
    const token = req.cookies.access_token || req.headers.authorization?.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ 
            message: "Access denied", 
            success: false,
            error: "No token provided"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch the complete user from database
        const user = await userSchema.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        // Attach both the decoded token and full user to the request
        req.user = {
            ...decoded,
            userData: {
                _id: user._id,
                email: user.email,
                name: user.name
                // Add other needed user fields
            }
        };
        
        next();
    } catch (error) {
        return res.status(401).json({ 
            message: "Invalid token", 
            success: false,
            error: error.message 
        });
    }
};
// const verifyAdmin = (req, res, next)=> {
//     if (!req.user || req.user.role!== "admin") {
//         return res.status(403).json({ message: "Access denied, you are not an admin", success: false });
//     }
//     next();
// }


  

module.exports = {verifyToken}