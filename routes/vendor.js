const express = require("express");
const Vendor = require("../models/vendor");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// Get all vendors
router.get("/loadvendors", authMiddleware, async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json(vendors);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching vendors", error: error.message });
  }
});

// Create vendor (admin only)
router.post("/vendors", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    const vendor = new Vendor({
      name,
      email,
      phone,
      address,
      createdBy: req.userId,
    });

    await vendor.save();
    res.status(201).json(vendor);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating vendor", error: error.message });
  }
});

// Update vendor (admin only)
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json(vendor);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating vendor", error: error.message });
  }
});

// Delete vendor (admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.json({ message: "Vendor deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting vendor", error: error.message });
  }
});

module.exports = router;
