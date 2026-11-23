const { validationResult } = require("express-validator");
const CategoryModel = require("../models/category.model");
const AdminModel = require("../models/admin.model");
const NewsModel = require("../models/news.model");

function validationFailure(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  return res.status(400).json({ message: "Validation Errors", errors: errors.array(), success: false });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getExistingAdmin(req) {
  return AdminModel.findById(req.token?._id).select("_id");
}

const create_new_category = async (req, res) => {
  try {
    const invalid = validationFailure(req, res);
    if (invalid) return invalid;
    const admin = await getExistingAdmin(req);
    if (!admin) return res.status(401).json({ message: "Invalid Authentication", success: false });

    const name = req.body.name.trim();
    const duplicate = await CategoryModel.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: "i" } });
    if (duplicate) return res.status(409).json({ message: "A category with this name already exists.", success: false });

    const newCategory = await CategoryModel.create({ name });
    return res.status(201).json({ message: "Category created successfully.", success: true, data: newCategory });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A category with this name already exists.", success: false });
    console.error("Create category error:", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

const edit_category = async (req, res) => {
  try {
    const invalid = validationFailure(req, res);
    if (invalid) return invalid;
    const admin = await getExistingAdmin(req);
    if (!admin) return res.status(401).json({ message: "Invalid Authentication", success: false });

    const category = await CategoryModel.findById(req.body._id);
    if (!category) return res.status(404).json({ message: "Category not found.", success: false });

    const name = req.body.name.trim();
    const duplicate = await CategoryModel.findOne({
      _id: { $ne: category._id },
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    });
    if (duplicate) return res.status(409).json({ message: "A category with this name already exists.", success: false });

    category.name = name;
    await category.save();
    return res.status(200).json({ message: "Category updated successfully.", success: true, data: category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A category with this name already exists.", success: false });
    console.error("Update category error:", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

const delete_category = async (req, res) => {
  try {
    const invalid = validationFailure(req, res);
    if (invalid) return invalid;
    const admin = await getExistingAdmin(req);
    if (!admin) return res.status(401).json({ message: "Invalid Authentication", success: false });

    const category = await CategoryModel.findById(req.body._id);
    if (!category) return res.status(404).json({ message: "Category not found.", success: false });

    const linkedNewsCount = await NewsModel.countDocuments({ category_name: category.name });
    if (linkedNewsCount > 0) {
      return res.status(409).json({
        message: "This category is assigned to news articles. Reassign or delete those articles first.",
        success: false,
        linked_news_count: linkedNewsCount,
      });
    }

    await CategoryModel.deleteOne({ _id: category._id });
    return res.status(200).json({ message: "Category deleted successfully.", success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

const fetch_category = async (_req, res) => {
  try {
    const data = await CategoryModel.find({}).select("name").sort({ name: 1 }).lean();
    return res.status(200).json({ message: "Categories fetched successfully.", success: true, data });
  } catch (error) {
    console.error("Fetch categories error:", error);
    return res.status(500).json({ message: "Internal Server Error", success: false });
  }
};

module.exports = { create_new_category, fetch_category, edit_category, delete_category };
