const express = require("express");
const Request = require("../models/request");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();

// Create request
router.post("/requests", authMiddleware, async (req, res) => {
  try {
    console.log("Received request body:", req.body); // Debug
    console.log("User:", { userId: req.userId, userName: req.user.name }); // Debug

    const { type, title, description, requestType } = req.body;

    // Validate required fields
    if (!type || !description) {
      return res.status(400).json({
        message: "Missing required fields: type and description are required",
      });
    }

    // Validate type
    if (!["admin", "hr"].includes(type)) {
      return res.status(400).json({
        message: "Invalid type. Must be 'admin' or 'hr'",
      });
    }

    // Create request based on type
    let requestData = {
      type,
      description,
      createdBy: req.userId,
      userName: req.user.name,
    };

    if (type === "admin") {
      if (!title) {
        return res
          .status(400)
          .json({ message: "Title is required for admin requests" });
      }
      requestData.title = title;
      requestData.requestType = null;
    } else if (type === "hr") {
      if (!requestType) {
        return res
          .status(400)
          .json({ message: "Request type is required for HR requests" });
      }
      requestData.requestType = requestType;
      requestData.title = null;
    }

    const request = new Request(requestData);
    await request.save();

    console.log("Request created:", request); // Debug

    res.status(201).json(request);
  } catch (error) {
    console.error("Error creating request:", error);
    res
      .status(500)
      .json({ message: "Error creating request", error: error.message });
  }
});

// Get requests
router.get("/getrequests", authMiddleware, async (req, res) => {
  try {
    let requests;
    if (req.user.role === "admin") {
      requests = await Request.find()
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 });
    } else {
      requests = await Request.find({ createdBy: req.userId }).sort({
        createdAt: -1,
      });
    }
    res.json(requests);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching requests", error: error.message });
  }
});

// Update request status (admin only)
router.put(
  "/request/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { status } = req.body;

      // Validate status - matches Order pattern but with Completed
      const validStatuses = ["Pending", "Processing", "Completed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const request = await Request.findByIdAndUpdate(
        req.params.id,
        { status },
        { returnDocument: "after", runValidators: true },
      );

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error updating request:", error);
      res
        .status(500)
        .json({ message: "Error updating request", error: error.message });
    }
  },
);
// Delete request (admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ message: "Request deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting request", error: error.message });
  }
});

module.exports = router;
