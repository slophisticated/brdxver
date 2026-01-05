import mongoose from "mongoose";

const whitelistSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
  },
  whitelistedBy: {
    type: String,
    required: true,
  },
  whitelistedByUsername: {
    type: String,
    required: true,
  },
  note: {
    type: String,
    default: null,
  },
  whitelistCount: {
    type: Number,
    default: 1,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Index untuk auto-delete expired whitelist
whitelistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Whitelist", whitelistSchema);
