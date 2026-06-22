const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const User = require("./models/User");
const connectDB = require("./config/db");
const app = express();
const authRoutes = require("./routes/authRoutes");
const startupRoutes = require("./routes/startupRoutes");
const aiRoutes = require("./routes/aiRoutes");
const videoRoutes = require("./routes/videoRoutes");
const multer = require("multer");

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://branfy-five.vercel.app",
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    exposedHeaders: ["X-Render-Version"],
  })
);
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});
app.use(express.json({ limit: "2mb" }));
app.use("/api/startups", startupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/video", videoRoutes);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Logo must be smaller than 5 MB."
        : "Upload a PNG, JPG, WebP, or SVG logo.";

    return res.status(400).json({
      success: false,
      message,
    });
  }

  console.error("Unhandled request error:", error);

  return res.status(500).json({
    success: false,
    message: "The server could not complete this request.",
  });
});
app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});
app.get("/api/create-user", async (req, res) => {

  const user = await User.create({
    name: "Shash",
    email: "shash@test.com",
  });

  res.json(user);

});
app.get("/api/test", (req, res) => {
  res.json({
    message: "Hello from Backend",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server Running On Port ${PORT}`);
  });
};

startServer();
