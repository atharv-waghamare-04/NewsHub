const express = require("express");

const {
  create_new_news,
  delete_existing_news,
  edit_existing_news,
  fetch_all_news,
  update_exist_news_image,
  fetch_all_paid_news,
} = require("../controller/news.controller");

const verify_token = require("../middleware/verifyToken");
const requireRole = require("../middleware/requireRole");
const requireAdmin = requireRole("admin");
const { body } = require("express-validator");
const upload = require("../services/diskStorage");
const validateNewsImage = require("../middleware/validateNewsImage");

const router = express.Router();

function parseMultipartContent(req, res, next) {
  if (typeof req.body.content !== "string") return next();
  try {
    req.body.content = JSON.parse(req.body.content);
    return next();
  } catch {
    if (req.file) {
      const fs = require("node:fs");
      fs.unlink(req.file.path, () => {});
    }
    return res.status(400).json({ message: "Content must contain valid JSON.", success: false });
  }
}

router.post(
  "/create-new-news",
  verify_token,
  requireAdmin,
  upload,
  validateNewsImage,
  parseMultipartContent,
  [
    body("title")
      .isString()
      .isLength({ min: 5, max: 150 }),

    body("description")
      .isString()
      .isLength({ min: 20 }),

    body("category_name")
      .isString()
      .isLength({ min: 3, max: 50 }),

    body("author")
      .isString()
      .isLength({ min: 3, max: 50 }),

    body("content")
      .isArray({ min: 1 })
      .withMessage("Content must be an array with at least one item"),

    body("content.*.headline")
      .trim()
      .notEmpty()
      .isString(),

    body("content.*.description")
      .trim()
      .notEmpty()
      .isString(),
  ],
  create_new_news
);

router.post(
  "/fetch-all-news",
  verify_token,
  requireAdmin,
  [
    body("category_name").isString().trim().isLength({ max: 50 }).withMessage("Invalid Category"),
    body("search").isString().trim().isLength({ max: 100 }).withMessage("Invalid Search value"),
    body("skip").isInt({ min: 0, max: 1000000 }).withMessage("Invalid Skip Value"),
  ],
  fetch_all_news,
);

router.post(
  "/fetch-all-paid-news",
  [
    body("category_name").isString().trim().isLength({ max: 50 }).withMessage("Invalid Category"),
    body("search").isString().trim().isLength({ max: 100 }).withMessage("Invalid Search value"),
    body("skip").isInt({ min: 0, max: 1000000 }).withMessage("Invalid Skip Value"),
    body("token_id").isString().withMessage("Invalid Token"),
  ],
  fetch_all_paid_news,
);

router.put(
  "/update-exist-news",
  verify_token,
  requireAdmin,
  [
    body("_id").isMongoId().withMessage("Invalid id"),
    body("title")
      .isString()
      .withMessage("Invalid Title")
      .isLength({ min: 5, max: 150 })
      .withMessage("title length 5 to 150 characters"),
    body("description")
      .isString()
      .withMessage("Invalid Description")
      .isLength({ min: 20 })
      .withMessage("description must be more than 20 characters"),
    body("category_name")
      .isString()
      .withMessage("Invalid Category Name")
      .isLength({ min: 3, max: 50 })
      .withMessage("Category length 3 to 50 characters"),
    body("author")
      .isString()
      .withMessage("Invalid Author Name")
      .isLength({ min: 3, max: 50 })
      .withMessage("Author length 3 to 50 characters"),
    body("content")
      .isArray({ min: 1 })
      .withMessage("Content must be an array with at least one item"),
    body("content.*.headline")
      .trim()
      .notEmpty()
      .withMessage("Headline is required")
      .isString()
      .withMessage("Headline must be a string"),
    body("content.*.description")
      .trim()
      .notEmpty()
      .withMessage("Description is required")
      .isString()
      .withMessage("Description must be a string"),
    body("status").isIn(["Active", "Inactive"]).withMessage("Invalid status"),
  ],
  edit_existing_news,
);

router.put(
  "/update-specific-news-image",
  verify_token,
  requireAdmin,
  upload,
  validateNewsImage,
  body("_id").isMongoId().withMessage("Invalid id"),
  update_exist_news_image,
);

router.delete(
  "/delete-specific-news",
  verify_token,
  requireAdmin,
  [body("_id").isMongoId().withMessage("Invalid id")],
  delete_existing_news,
);

module.exports = router;
