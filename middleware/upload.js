const multer = require("multer");

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(
        new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname)
      );
    }

    return callback(null, true);
  },
});
