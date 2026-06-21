const mongoose = require("mongoose");

const startupSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    startupName: {
      type: String,
      required: true,
    },
    logo: {
  type: String,
  default: "",
},
    industry: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    targetAudience: {
      type: String,
      required: true,
    },

    website: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Startup", startupSchema);