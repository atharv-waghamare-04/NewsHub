const fs = require("node:fs/promises");

function matchesImageSignature(buffer, mimeType) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

async function validateNewsImage(req, res, next) {
  if (!req.file) return res.status(400).json({ message: "News image is required.", success: false });
  try {
    const handle = await fs.open(req.file.path, "r");
    const header = Buffer.alloc(12);
    try { await handle.read(header, 0, 12, 0); } finally { await handle.close(); }
    if (!matchesImageSignature(header, req.file.mimetype)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: "The uploaded file is not a valid supported image.", success: false });
    }
    return next();
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => {});
    return next(error);
  }
}

module.exports = validateNewsImage;
