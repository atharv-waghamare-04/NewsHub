const multer = require("multer");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const uploadPath = path.resolve(__dirname, "..", "statics", "uploads");
fs.mkdirSync(uploadPath, { recursive: true });

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByMimeType = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const storage = multer.diskStorage({
  destination(_req, _file, callback) { callback(null, uploadPath); },
  filename(_req, file, callback) {
    const extension = extensionByMimeType[file.mimetype];
    if (!extension) return callback(new Error("Unsupported image type."));
    callback(null, `${crypto.randomBytes(16).toString("hex")}${extension}`);
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, fieldSize: 100 * 1024, parts: 12 },
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) return callback(new Error("Only JPEG, PNG, and WebP images are allowed."));
    callback(null, true);
  },
}).single("news-image");
