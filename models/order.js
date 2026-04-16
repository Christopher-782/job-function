const mongoose = require("mongoose");

// Inline Counter Schema (no separate file needed)
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    vendorName: {
      type: String,
      required: true,
    },
    products: [
      {
        productName: { type: String, required: true },
        size: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    status: {
      type: String,
      enum: ["Pending", "Processing", "Completed"],
      default: "Pending",
    },
    totalItems: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: { type: String, required: true },
  },
  { timestamps: true },
);

// FIXED: Atomic counter
orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const year = new Date().getFullYear();

    try {
      const counter = await Counter.findByIdAndUpdate(
        `order_${year}`,
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );

      this.orderId = `ORD-${year}-${String(counter.seq).padStart(4, "0")}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Order", orderSchema);
