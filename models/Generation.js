const mongoose = require("mongoose");

const generationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
    },

    type: {
      type: String,
      enum: [
        "slogan",
        "billboard",
        "reel-script",
      ],
    },

    content: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model(
    "Generation",
    generationSchema
  );