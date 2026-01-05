import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
  },
  logChannel: {
    type: String,
    default: null,
  },
  mmChannel: {
    type: String,
    default: null,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Settings", settingsSchema);
