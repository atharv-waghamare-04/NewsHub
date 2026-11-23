const express = require("express");
const { body } = require("express-validator");
const verifyToken = require("../middleware/verifyToken");
const requireRole = require("../middleware/requireRole");
const requireAdmin = requireRole("admin");
const { create_new_category, delete_category, edit_category, fetch_category } = require("../controller/category.controller");

const router = express.Router();
const categoryNameRule = body("name").isString().withMessage("Category name must be a string.").trim().isLength({ min: 3, max: 50 }).withMessage("Category name must be between 3 and 50 characters.");

router.post("/create-new-category", verifyToken, requireAdmin, categoryNameRule, create_new_category);
router.get("/fetch-all-categories", fetch_category);
router.put("/edit-specfic-category", verifyToken, requireAdmin, categoryNameRule, body("_id").isMongoId().withMessage("Invalid category ID."), edit_category);
router.delete("/delete-specific-category", verifyToken, requireAdmin, body("_id").isMongoId().withMessage("Invalid category ID."), delete_category);

module.exports = router;
