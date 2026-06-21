const Startup = require("../models/Startup");
const User = require("../models/User");
const mongoose = require("mongoose");
const cloudinary =
require(
"../config/cloudinary"
);
const createStartup = async (req, res) => {
  try {
    const {
      userId,
      startupName,
      industry,
      description,
      targetAudience,
      website = "",
    } = req.body;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Sign in before creating a startup.",
      });
    }

    const userExists = await User.exists({ _id: userId });

    if (!userExists) {
      return res.status(401).json({
        success: false,
        message: "Your account could not be verified. Please sign in again.",
      });
    }

    let logoUrl = "";

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        {
          folder: "brandfoundry/logos",
          resource_type: "image",
          transformation: [
            {
              width: 800,
              height: 800,
              crop: "limit",
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        }
      );

      logoUrl = uploadResult.secure_url;
    }

    const startup = await Startup.create({
      userId,
      startupName,
      industry,
      description,
      targetAudience,
      website,
      logo: logoUrl,
    });

    return res.status(201).json({
      success: true,
      startup,
    });
  } catch (error) {
    console.error("Create startup failed:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "The startup could not be created.",
    });
  }
};
const getStartupById = async (
  req,
  res
) => {

  try {

    const startup =
      await Startup.findById(
        req.params.id
      );

    res.json({
      success: true,
      startup,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};
const getAllStartups = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "A user account is required to load startup profiles.",
      });
    }

    const startups = await Startup.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      startups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createStartup,
  getAllStartups,
  getStartupById
};
