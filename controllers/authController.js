const User = require("../models/User");

const googleLogin = async (req, res) => {

  try {

    const {
      sub,
      name,
      email,
      picture
    } = req.body;

    let user = await User.findOne({
      email
    });

    if (!user) {

      user = await User.create({
        googleId: sub,
        name,
        email,
        picture
      });

    }

    res.json({
      success: true,
      user
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

module.exports = {
  googleLogin
};