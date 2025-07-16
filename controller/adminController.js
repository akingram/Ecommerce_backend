const { productValidation } = require("../middleware/joivalidation");
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const Order = require("../model/orderModel"); // ADD THIS
const User = require("../model/userModel");
const { v4: uuidv4 } = require("uuid");
const sanitize = require("sanitize-filename");
const path = require("path"); 


// Add this function to your adminController.js

const getMyProducts = async (req, res) => {
  try {
    const adminId = req.user._id; // Get admin ID from verified token
    
    // Assuming your Product model has a 'createdBy' or 'seller' field
    // Adjust the field name based on your schema
    const products = await Product.find({ createdBy: adminId })
      .sort({ createdAt: -1 }) // Sort by newest first
      .populate('category', 'name') // If you have category reference
      .select('name description price image category createdAt updatedAt');
    
    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: products,
      count: products.length
    });
    
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

const getProduct = async (req, res) => {
  try {
    console.log('🔍 getProduct called with query:', req.query);
    console.log('👤 User:', req.user);

    let { search, page, limit, category } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};

    // Role-based filtering
    if (req.user?.role === "seller") {
      query.createdBy = req.user.id;
      console.log('🏪 Seller query - filtering by createdBy:', req.user.id);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
      console.log('🔍 Search query applied:', query.$or);
    }

    // Category filtering
    if (category) {
      // Trim whitespace and handle empty categories
      const trimmedCategory = category.trim();
      if (trimmedCategory) {
        query.category = trimmedCategory;
        console.log('📂 Category filter applied:', trimmedCategory);
      }
    }

    console.log('📋 Final MongoDB query:', JSON.stringify(query, null, 2));

    // Execute the query with error handling
    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .lean(); // Use lean() for better performance

    console.log('📦 Products found:', products.length);

    // Get total count
    const totalProducts = await Product.countDocuments(query);
    console.log('📊 Total products count:', totalProducts);

    // Return success response
    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        hasNextPage: page < Math.ceil(totalProducts / limit),
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    console.error('❌ Error in getProduct:', error);
    console.error('📋 Stack trace:', error.stack);
    
    // Return detailed error for debugging
    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error",
      details: process.env.NODE_ENV === 'development' ? {
        query: req.query,
        user: req.user ? { id: req.user.id, role: req.user.role } : null,
        stack: error.stack
      } : undefined
    });
  }
};



const getProductById = async (req, res) => {
  try {
    console.log('🔍 getProductById called with ID:', req.params.id);
    
    // Validate MongoDB ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const product = await Product.findById(req.params.id)
      .populate("createdBy", "name email")
      .lean();

    if (!product) {
      console.log('❌ Product not found with ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log('✅ Product found:', product.name);

    return res.status(200).json({
      success: true,
      data: product,
    });

  } catch (error) {
    console.error('❌ Error in getProductById:', error);
    
    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error",
    });
  }
};

// Additional helper function for debugging
const debugProductSchema = async (req, res) => {
  try {
    // Get a sample product to check schema
    const sampleProduct = await Product.findOne().lean();
    
    if (!sampleProduct) {
      return res.status(200).json({
        success: true,
        message: "No products in database",
        schema: "Cannot determine schema - no products exist"
      });
    }

    // Get all unique field names from the collection
    const allProducts = await Product.find({}).limit(10).lean();
    const allFields = new Set();
    
    allProducts.forEach(product => {
      Object.keys(product).forEach(key => allFields.add(key));
    });

    return res.status(200).json({
      success: true,
      message: "Schema debug info",
      data: {
        sampleProduct,
        allFields: Array.from(allFields),
        totalProducts: await Product.countDocuments(),
        productModel: Product.schema.paths ? Object.keys(Product.schema.paths) : "Schema not accessible"
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Debug failed",
      error: error.message
    });
  }
};

const postProduct = async (req, res) => {
  try {
    // Debug logging
    console.log('=== DEBUG INFO ===');
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);
    console.log('==================');

    const userid = req.user?.id;
    const { name, description, price, category } = req.body;
    
    // Basic validation
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, description, price, category) are required",
      });
    }

    // Check for image upload - express-fileupload uses req.files
    if (!req.files || !req.files.image) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image",
      });
    }

    const imageFile = req.files.image;

    // Validate file type
    if (!imageFile.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    // Check if category exists by NAME
    let categoryExists = await Category.findOne({ name: category });
    if (!categoryExists) {
      // Create the category if it doesn't exist
      categoryExists = await Category.create({ name: category });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(imageFile.name);
    const newFileName = `image-${uniqueSuffix}${fileExtension}`;
    const uploadPath = path.join(__dirname, '../uploads', newFileName);

    // Move the file to uploads directory
    await imageFile.mv(uploadPath);

    // Create the product
    const product = await Product.create({
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category: category,
      image: `uploads/${newFileName}`, // Store relative path
      createdBy: userid,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error('Error in postProduct:', error);
    
    // Handle file upload errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.',
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Fix: Use 'createdBy' instead of 'user' to match your schema
    if (req.user.role !== "admin" && product.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this product",
      });
    }

    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.price) updates.price = req.body.price;
    if (req.body.description) updates.description = req.body.description;
    if (req.body.category) {
      // Fix: Check category by name instead of ObjectId
      const catExists = await Category.findOne({ name: req.body.category });
      if (!catExists) {
        // Create category if it doesn't exist
        await Category.create({ name: req.body.category });
      }
      updates.category = req.body.category;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.productId,
      updates,
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Fix: Use 'createdBy' instead of 'user' to match your schema
    if (req.user.role !== "admin" && product.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this product",
      });
    }

    await Product.findByIdAndDelete(req.params.productId);
    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// New Category Functions
const getCategory = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

const postCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    const newCategory = await Category.create({ name });
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }
    
    // Optional: Remove this category from all products
    await Product.updateMany(
      { category: req.params.id },
      { $unset: { category: "" } }
    );

    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
// Add these methods to your adminController.js

// Dashboard Statistics
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get products count for this admin
    const totalProducts = await Product.countDocuments({ createdBy: userId });
    
    // Get orders related to this admin's products
    const adminProducts = await Product.find({ createdBy: userId }).select('_id');
    const productIds = adminProducts.map(p => p._id);
    
    const orders = await Order.find({ 
      'items.product': { $in: productIds } 
    });
    
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    
    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => {
        if (productIds.includes(item.product.toString())) {
          return itemSum + (item.price * item.quantity);
        }
        return itemSum;
      }, 0);
    }, 0);
    
    // Get low stock items
    const lowStockItems = await Product.countDocuments({ 
      createdBy: userId,
      stock: { $lt: 10, $gt: 0 }
    });
    
    // Mock recent views (you can implement proper analytics later)
    const recentViews = Math.floor(Math.random() * 1000) + 500;
    
    res.json({
      success: true,
      data: {
        totalProducts,
        totalRevenue,
        totalOrders,
        pendingOrders,
        lowStockItems,
        recentViews
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// Recent Orders
const getRecentOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get admin's products
    const adminProducts = await Product.find({ createdBy: userId }).select('_id name');
    const productIds = adminProducts.map(p => p._id);
    
    // Get recent orders containing admin's products
    const orders = await Order.find({ 
      'items.product': { $in: productIds } 
    })
    .populate('user', 'name email')
    .populate('items.product', 'name price')
    .sort({ createdAt: -1 })
    .limit(10);
    
    const recentOrders = orders.map(order => ({
      id: order._id,
      customerName: order.user.name,
      customerEmail: order.user.email,
      productName: order.items.map(item => item.product.name).join(', '),
      amount: order.totalAmount,
      status: order.status,
      date: order.createdAt
    }));
    
    res.json({
      success: true,
      data: recentOrders
    });
  } catch (error) {
    console.error('Recent orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent orders'
    });
  }
};

// Admin Notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Mock notifications (implement proper notification system later)
    const notifications = [
      {
        id: 1,
        message: 'New order received for your product',
        time: '5 minutes ago',
        read: false,
        type: 'order'
      },
      {
        id: 2,
        message: 'Product inventory running low',
        time: '2 hours ago',
        read: false,
        type: 'inventory'
      },
      {
        id: 3,
        message: 'Payment received for order #12345',
        time: '1 day ago',
        read: true,
        type: 'payment'
      }
    ];
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
};

// Mark Notification as Read
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock implementation - in real app, update notification in database
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
};

// Get All Orders (Admin View)
const getAllOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get admin's products
    const adminProducts = await Product.find({ createdBy: userId }).select('_id');
    const productIds = adminProducts.map(p => p._id);
    
    // Get all orders containing admin's products
    const orders = await Order.find({ 
      'items.product': { $in: productIds } 
    })
    .populate('user', 'name email')
    .populate('items.product', 'name price')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Update Order Status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    order.status = status;
    await order.save();
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// Get Low Stock Products
const getLowStockProducts = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const lowStockProducts = await Product.find({
      createdBy: userId,
      stock: { $lt: 10, $gt: 0 }
    }).sort({ stock: 1 });
    
    res.json({
      success: true,
      data: lowStockProducts
    });
  } catch (error) {
    console.error('Low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products'
    });
  }
};

// Product Analytics
const getProductAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get admin's products with basic analytics
    const products = await Product.find({ createdBy: userId });
    
    // Mock analytics data (implement proper analytics later)
    const analytics = products.map(product => ({
      ...product.toObject(),
      views: Math.floor(Math.random() * 100) + 10,
      sales: Math.floor(Math.random() * 50) + 1,
      revenue: Math.floor(Math.random() * 1000) + 100
    }));
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Product analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product analytics'
    });
  }
};

// Get All Users (Admin Only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Update User Status
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    user.status = status;
    await user.save();
    
    res.json({
      success: true,
      message: 'User status updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

// Get Settings
const getSettings = async (req, res) => {
  try {
    // Mock settings (implement proper settings system later)
    const settings = {
      notifications: {
        email: true,
        sms: false,
        push: true
      },
      dashboard: {
        showRevenue: true,
        showOrders: true,
        showProducts: true
      },
      privacy: {
        profileVisible: true,
        contactInfo: false
      }
    };
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
};

// Update Settings
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    
    // Mock implementation (implement proper settings update later)
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
};


// Add missing getOrderAnalytics function
const getOrderAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get admin's products
    const adminProducts = await Product.find({ createdBy: userId }).select('_id');
    const productIds = adminProducts.map(p => p._id);
    
    // Get orders containing admin's products
    const orders = await Order.find({ 
      'items.product': { $in: productIds } 
    });
    
    // Calculate analytics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(order => order.status === 'completed').length;
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
    
    // Monthly data (last 6 months)
    const monthlyData = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthOrders = orders.filter(order => 
        order.createdAt >= month && order.createdAt < nextMonth
      );
      
      monthlyData.push({
        month: month.toLocaleString('default', { month: 'short', year: 'numeric' }),
        orders: monthOrders.length,
        revenue: monthOrders.reduce((sum, order) => sum + order.totalAmount, 0)
      });
    }
    
    res.json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        monthlyData
      }
    });
  } catch (error) {
    console.error('Order analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order analytics'
    });
  }
};



// Get seller sales data
const getSellerSales = async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    
    // Verify the seller can only access their own data
    if (req.user._id.toString() !== sellerId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    // Get seller's products
    const sellerProducts = await Product.find({ seller: sellerId });
    const productIds = sellerProducts.map(p => p._id);

    // Get orders containing seller's products
    const orders = await Order.find({
      'items.product': { $in: productIds },
      status: { $ne: 'cancelled' }
    }).populate('items.product');

    // Calculate sales metrics
    let totalSales = 0;
    let totalOrders = 0;
    let monthlyRevenue = 0;
    const salesTrend = [];

    // Process orders to calculate seller-specific metrics
    orders.forEach(order => {
      const sellerItems = order.items.filter(item => 
        productIds.some(id => id.toString() === item.product._id.toString())
      );
      
      if (sellerItems.length > 0) {
        totalOrders++;
        const orderSellerTotal = sellerItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        );
        totalSales += orderSellerTotal;
        
        // Add to monthly revenue if order is from current month
        const currentMonth = new Date().getMonth();
        const orderMonth = new Date(order.createdAt).getMonth();
        if (orderMonth === currentMonth) {
          monthlyRevenue += orderSellerTotal;
        }
      }
    });

    // Generate sales trend (last 6 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = months[monthDate.getMonth()];
      
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.getMonth() === monthDate.getMonth() && 
               orderDate.getFullYear() === monthDate.getFullYear();
      });
      
      const monthSales = monthOrders.reduce((sum, order) => {
        const sellerItems = order.items.filter(item => 
          productIds.some(id => id.toString() === item.product._id.toString())
        );
        return sum + sellerItems.reduce((itemSum, item) => 
          itemSum + (item.price * item.quantity), 0
        );
      }, 0);
      
      salesTrend.push({
        month: monthName,
        sales: monthSales
      });
    }

    res.json({
      success: true,
      data: {
        totalSales,
        totalOrders,
        monthlyRevenue,
        salesTrend
      }
    });
  } catch (error) {
    console.error('Error fetching seller sales:', error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get seller orders
const getSellerOrders = async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    
    // Verify the seller can only access their own data
    if (req.user._id.toString() !== sellerId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    // Get seller's products
    const sellerProducts = await Product.find({ seller: sellerId });
    const productIds = sellerProducts.map(p => p._id);

    // Get orders containing seller's products
    const orders = await Order.find({
      'items.product': { $in: productIds }
    }).populate('items.product').populate('user', 'name email').sort({ createdAt: -1 });

    // Filter and format orders for seller
    const recentOrders = orders.map(order => {
      const sellerItems = order.items.filter(item => 
        productIds.some(id => id.toString() === item.product._id.toString())
      );
      
      if (sellerItems.length > 0) {
        const sellerTotal = sellerItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        );
        
        return {
          id: order._id,
          customerName: order.user.name,
          customerEmail: order.user.email,
          date: order.createdAt,
          total: sellerTotal,
          status: order.status,
          items: sellerItems
        };
      }
      return null;
    }).filter(order => order !== null);

    // Count pending orders
    const pendingOrders = recentOrders.filter(order => order.status === 'pending').length;

    res.json({
      success: true,
      data: {
        recentOrders: recentOrders.slice(0, 10), // Return latest 10
        pendingOrders
      }
    });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get seller products with sales data
const getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    
    // Verify the seller can only access their own data
    if (req.user._id.toString() !== sellerId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    // Get seller's products
    const products = await Product.find({ seller: sellerId }).populate('category');
    const productIds = products.map(p => p._id);

    // Get orders to calculate sales for each product
    const orders = await Order.find({
      'items.product': { $in: productIds },
      status: { $ne: 'cancelled' }
    }).populate('items.product');

    // Calculate sales for each product
    const productSales = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (productIds.some(id => id.toString() === item.product._id.toString())) {
          const productId = item.product._id.toString();
          if (!productSales[productId]) {
            productSales[productId] = 0;
          }
          productSales[productId] += item.quantity;
        }
      });
    });

    // Format products with sales data
    const topProducts = products.map(product => ({
      id: product._id,
      name: product.name,
      category: product.category ? product.category.name : 'Uncategorized',
      price: product.price,
      sold: productSales[product._id.toString()] || 0,
      stock: product.stock,
      status: product.status
    })).sort((a, b) => b.sold - a.sold);

    res.json({
      success: true,
      data: {
        totalProducts: products.length,
        topProducts
      }
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get all seller dashboard data in one request
const getSellerDashboard = async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    
    // Verify the seller can only access their own data
    if (req.user._id.toString() !== sellerId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    // Get seller's products
    const sellerProducts = await Product.find({ seller: sellerId }).populate('category');
    const productIds = sellerProducts.map(p => p._id);

    // Get orders containing seller's products
    const orders = await Order.find({
      'items.product': { $in: productIds }
    }).populate('items.product').populate('user', 'name email').sort({ createdAt: -1 });

    // Calculate all metrics
    let totalSales = 0;
    let totalOrders = 0;
    let monthlyRevenue = 0;
    let pendingOrders = 0;
    const recentOrders = [];
    const productSales = {};

    // Process orders
    orders.forEach(order => {
      const sellerItems = order.items.filter(item => 
        productIds.some(id => id.toString() === item.product._id.toString())
      );
      
      if (sellerItems.length > 0) {
        totalOrders++;
        const orderSellerTotal = sellerItems.reduce((sum, item) => {
          const productId = item.product._id.toString();
          if (!productSales[productId]) {
            productSales[productId] = 0;
          }
          productSales[productId] += item.quantity;
          return sum + (item.price * item.quantity);
        }, 0);
        
        totalSales += orderSellerTotal;
        
        if (order.status === 'pending') {
          pendingOrders++;
        }
        
        // Add to monthly revenue if order is from current month
        const currentMonth = new Date().getMonth();
        const orderMonth = new Date(order.createdAt).getMonth();
        if (orderMonth === currentMonth) {
          monthlyRevenue += orderSellerTotal;
        }
        
        // Add to recent orders
        if (recentOrders.length < 10) {
          recentOrders.push({
            id: order._id,
            customerName: order.user.name,
            date: order.createdAt,
            total: orderSellerTotal,
            status: order.status
          });
        }
      }
    });

    // Top products
    const topProducts = sellerProducts.map(product => ({
      name: product.name,
      category: product.category ? product.category.name : 'Uncategorized',
      price: product.price,
      sold: productSales[product._id.toString()] || 0
    })).sort((a, b) => b.sold - a.sold).slice(0, 5);

    res.json({
      success: true,
      data: {
        totalSales,
        totalOrders,
        totalProducts: sellerProducts.length,
        pendingOrders,
        monthlyRevenue,
        recentOrders,
        topProducts
      }
    });
  } catch (error) {
    console.error('Error fetching seller dashboard:', error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


module.exports = {
   getSellerSales,
  getSellerOrders,
  getSellerProducts,
  getSellerDashboard,
   getDashboardStats,
   getOrderAnalytics,
  getRecentOrders,
  getNotifications,
  markNotificationRead,
  getAllOrders,
  updateOrderStatus,
  getLowStockProducts,
  getProductAnalytics,
  getAllUsers,
  updateUserStatus,
  getSettings,
  updateSettings,
  getMyProducts,
  getProduct,
  getProductById,
  postProduct,
  updateProduct,
  deleteProduct,
  getCategory,
  postCategory,
  deleteCategory
};
