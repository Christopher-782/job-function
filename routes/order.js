const express = require("express");
const Order = require("../models/order");
const Vendor = require("../models/vendor");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// Create order
router.post("/create", authMiddleware, async (req, res) => {
  try {
    // LOG EVERYTHING that comes in
    console.log("=== ORDER CREATION REQUEST ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("vendorId value:", req.body.vendorId);
    console.log("vendorId type:", typeof req.body.vendorId);
    console.log("Products:", req.body.products);
    console.log("User from auth:", {
      userId: req.userId,
      userRole: req.user?.role,
      userName: req.user?.name,
    });

    const { vendorId, products } = req.body;

    // Validate vendorId exists
    if (!vendorId) {
      console.log("ERROR: No vendorId provided");
      return res.status(400).json({ message: "vendorId is required" });
    }

    // Check if vendorId is a valid MongoDB ObjectId
    const mongoose = require("mongoose");
    const isValidObjectId = mongoose.Types.ObjectId.isValid(vendorId);
    console.log("Is valid ObjectId:", isValidObjectId);

    // Try to find the vendor
    console.log("Attempting to find vendor with ID:", vendorId);
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      console.log("Vendor not found for ID:", vendorId);

      // Optional: List all vendors to debug
      const allVendors = await Vendor.find({}, "_id name");
      console.log(
        "All vendors in DB:",
        allVendors.map((v) => ({
          id: v._id.toString(),
          name: v.name,
        })),
      );

      return res.status(404).json({
        message: "Vendor not found",
        receivedId: vendorId,
        validObjectId: isValidObjectId,
      });
    }

    console.log("Vendor found:", { id: vendor._id, name: vendor.name });

    const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);

    const order = new Order({
      vendor: vendorId,
      vendorName: vendor.name,
      products,
      totalItems,
      createdBy: req.userId,
      userName: req.user.name,
    });

    console.log("Order object to save:", JSON.stringify(order, null, 2));

    await order.save();
    console.log("Order saved successfully with ID:", order._id);

    res.status(201).json(order);
  } catch (error) {
    console.error("ERROR in order creation:", error);
    res
      .status(500)
      .json({ message: "Error creating order", error: error.message });
  }
});

// Get orders (admin: all, user: own)
router.get("/getorder", authMiddleware, async (req, res) => {
  try {
    let orders;
    if (req.user.role === "admin") {
      orders = await Order.find()
        .populate("vendor", "name email")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 });
    } else {
      orders = await Order.find({ createdBy: req.userId })
        .populate("vendor", "name email")
        .sort({ createdAt: -1 });
    }
    res.json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
});

// Update order (admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: "after" },
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating order", error: error.message });
  }
});

// Delete order (admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting order", error: error.message });
  }
});

module.exports = router;
