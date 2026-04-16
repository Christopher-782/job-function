const mongoose = require("mongoose");

// Inline Counter Schema
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

// FIXED: Removed next() + updated deprecated option
orderSchema.pre("save", async function () {
  if (!this.orderId) {
    const year = new Date().getFullYear();

    const counter = await Counter.findByIdAndUpdate(
      `order_${year}`,
      { $inc: { seq: 1 } },
      {
        returnDocument: "after",
        upsert: true,
      },
    );

    this.orderId = `ORD-${year}-${String(counter.seq).padStart(4, "0")}`;
  }
});

module.exports = mongoose.model("Order", orderSchema);
