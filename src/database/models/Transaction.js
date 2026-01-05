import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  buyer: {
    userId: String,
    username: String,
  },
  seller: {
    userId: String,
    username: String,
  },
  middleman: {
    userId: String,
    username: String,
  },
  priceRange: {
    type: String,
    required: true,
  },
  fee: {
    type: Number,
    required: true,
  },
  threadId: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "completed", "cancelled"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

export default mongoose.model("Transaction", transactionSchema);
