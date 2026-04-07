const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    password: String,
    role: String,
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

async function createUsers() {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB");

    // Create Admin
    const adminEmail = "chris@sambethel.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const admin = new User({
        name: "Christopher",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });
      await admin.save();
      console.log("✅ Admin created successfully!");
      console.log("   Email:", adminEmail);
      console.log("   Password: admin123");
    } else {
      console.log("ℹ️ Admin already exists");
    }

    // Create Staff User
    const staffEmail = "glory@sambethel.com";
    const existingStaff = await User.findOne({ email: staffEmail });

    if (!existingStaff) {
      const hashedPassword = await bcrypt.hash("glory123", 10);
      const staff = new User({
        name: "Glory",
        email: staffEmail,
        password: hashedPassword,
        role: "user",
      });
      await staff.save();
      console.log("✅ Staff user created successfully!");
      console.log("   Email:", staffEmail);
      console.log("   Password: glory123");
    } else {
      console.log("ℹ️ Staff user already exists");
    }

    console.log("\n🎉 Setup complete! You can now login with:");
    console.log("   Admin:  admin@example.com / admin123");
    console.log("   Staff:  staff@example.com / staff123");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

createUsers();
