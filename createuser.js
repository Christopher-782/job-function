const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// User Schema
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

async function createUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB");

    // User details - you can modify these
    const userEmail = "glory@sambethel.com";
    const userName = "Glory O";
    const userPassword = "Clement12@56";

    // Check if user already exists
    const existingUser = await User.findOne({ email: userEmail });
    if (existingUser) {
      console.log(`User with email ${userEmail} already exists!`);
      console.log("User details:");
      console.log(`Name: ${existingUser.name}`);
      console.log(`Email: ${existingUser.email}`);
      console.log(`Role: ${existingUser.role}`);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    // Create regular user
    const user = new User({
      name: userName,
      email: userEmail,
      password: hashedPassword,
      role: "user", // 'user' role for regular users
    });

    await user.save();
    console.log("\n✅ Regular user created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:", userEmail);
    console.log("🔑 Password:", userPassword);
    console.log("👤 Name:", userName);
    console.log("🎭 Role: User (Regular Staff)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nYou can now login with these credentials");
  } catch (error) {
    console.error("❌ Error creating user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Run the function
createUser();
