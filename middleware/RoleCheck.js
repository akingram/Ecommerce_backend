const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ 
      success: false,
      message: "Admin access required" 
    });
  }
  next();
};

const isSeller = (req, res, next) => {
  if (req.user?.role !== "seller") {
    return res.status(403).json({ 
      success: false,
      message: "Seller access required" 
    });
  }
  next();
};

const isSellerOrAdmin = (req, res, next) => {
  if (!["seller", "admin"].includes(req.user?.role)) {
    return res.status(403).json({ 
      success: false,
      message: "Seller or admin access required" 
    });
  }
  next();
};

module.exports = { isAdmin, isSeller, isSellerOrAdmin };