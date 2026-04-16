// migration.js
const Counter = require("./models/Counter");
const Order = require("./models/Order");

async function migrate() {
  const year = new Date().getFullYear();
  const count = await Order.countDocuments({
    orderId: { $regex: `^ORD-${year}-` },
  });

  await Counter.findByIdAndUpdate(
    { _id: `orderId_${year}` },
    { seq: count },
    { upsert: true },
  );

  console.log(`Counter initialized at ${count}`);
}

migrate();
