const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
    },
    type: {
      type: String,
      enum: ["admin", "hr"],
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    requestType: {
      type: String,
      enum: ["Leave", "Complaint", "Update Info", "Benefits", "Other"],
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Completed"],
      default: "Pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Generate request ID before saving
requestSchema.pre("save", async function () {
  if (!this.requestId) {
    const count = await mongoose.model("Request").countDocuments();
    this.requestId = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
});

module.exports = mongoose.model("Request", requestSchema);
