import mongoose from "mongoose";
import config from "../config/config.js";

export default async function connectDatabase() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
}
