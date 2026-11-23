const { validationResult } = require("express-validator");
const AdminModel = require("../models/admin.model");
const CategoryModel = require("../models/category.model");
const NewsModel = require("../models/news.model");
const SubscriptionModel = require("../models/subscription.model");
const fs = require("fs");
const path = require("path");

const delete_existing_file = (filename) => {
  try {
    if (!filename) return;

    const uploadPath = path.resolve(
      __dirname,
      "..",
      "statics",
      "uploads",
      path.basename(filename),
    );

    if (fs.existsSync(uploadPath)) {
      fs.unlinkSync(uploadPath);
    }
  } catch (error) {
    console.error("File deletion error:", error);
  }
};

const send_validation_errors = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation Errors",
      errors: errors.array(),
      success: false,
    });
  }

  return null;
};

function escapeRegex(value) {
  return String(value || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findCategoryByName(name) {
  return CategoryModel.findOne({
    name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
  });
}

// CREATE NEWS
const create_new_news = async (req, res) => {
  try {
    const validationResponse = send_validation_errors(req, res);
    if (validationResponse) {
      if (req.file) delete_existing_file(req.file.filename);
      return validationResponse;
    }

    if (!req.file) {
      return res.status(400).json({
        message: "News image is required",
        success: false,
      });
    }

    const exist_admin = await AdminModel.findById(req.token?._id);

    if (!exist_admin) {
      delete_existing_file(req.file.filename);

      return res.status(401).json({
        message: "Invalid Authentication",
        success: false,
      });
    }

    const exist_category = await findCategoryByName(req.body.category_name);

    if (!exist_category) {
      delete_existing_file(req.file.filename);

      return res.status(400).json({
        message: "Category doesn't exist",
        success: false,
      });
    }

    let content = req.body.content;

    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch {
        delete_existing_file(req.file.filename);

        return res.status(400).json({
          message: "Content must be valid JSON",
          success: false,
        });
      }
    }

    if (!Array.isArray(content) || content.length === 0) {
      delete_existing_file(req.file.filename);

      return res.status(400).json({
        message: "Content must be a non-empty array",
        success: false,
      });
    }

    const newNews = await NewsModel.create({
      title: req.body.title,
      description: req.body.description,
      image: req.file.filename,
      category_name: req.body.category_name,
      author: req.body.author,
      content,
    });

    return res.status(201).json({
      message: "News Created Successfully",
      success: true,
      data: newNews,
    });
  } catch (error) {
    console.error("Create news error:", error);

    if (req.file) {
      delete_existing_file(req.file.filename);
    }

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// FETCH ALL NEWS
const fetch_all_news = async (req, res) => {
  try {
    const validationResponse = send_validation_errors(req, res);
    if (validationResponse) return validationResponse;

    const { category_name, search } = req.body;
    const skip = Math.max(0, Number.parseInt(req.body.skip, 10) || 0);

    const exist_admin = await AdminModel.findById(req.token?._id);

    if (!exist_admin) {
      return res.status(401).json({
        message: "Invalid Authentication",
        success: false,
      });
    }

    const query = {};

    if (category_name && category_name !== "All") {
      query.category_name = category_name;
    }

    if (typeof search === "string" && search.trim()) {
      query.$text = {
        $search: search.trim(),
      };
    }

    const [total_documents, data] = await Promise.all([
      NewsModel.countDocuments(query),
      NewsModel.find(query).sort({ _id: -1 }).skip(skip).limit(100),
    ]);

    return res.status(200).json({
      message: "Data Fetched Successfully",
      success: true,
      data,
      count: total_documents,
    });
  } catch (error) {
    console.error("Fetch all news error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// FETCH ALL PAID NEWS
const fetch_all_paid_news = async (req, res) => {
  try {
    const validationResponse = send_validation_errors(req, res);
    if (validationResponse) return validationResponse;

    const { category_name, search, token_id } = req.body;
    const skip = Math.max(0, Number.parseInt(req.body.skip, 10) || 0);

    if (typeof token_id !== "string" || token_id.length < 32 || token_id.length > 256) {
      return res.status(401).json({
        message: "A valid subscription token is required.",
        success: false,
      });
    }

    const exist_subscription = await SubscriptionModel.findOne({
      token_id,
      status: "Active",
      subscription_end_date: { $gt: new Date() },
    });

    if (!exist_subscription) {
      return res.status(400).json({
        message: "Invalid Request",
        success: false,
      });
    }

    if (
      new Date(exist_subscription.subscription_end_date).getTime() <= Date.now()
    ) {
      return res.status(403).json({
        message: "Subscription Expired",
        success: false,
      });
    }

    const query = { status: "Active" };

    if (category_name && category_name !== "All") {
      query.category_name = category_name;
    }

    if (typeof search === "string" && search.trim()) {
      query.$text = {
        $search: search.trim(),
      };
    }

    const [total_documents, data] = await Promise.all([
      NewsModel.countDocuments(query),
      NewsModel.find(query).sort({ _id: -1 }).skip(skip).limit(100),
    ]);

    return res.status(200).json({
      message: "Data Fetched Successfully",
      success: true,
      data,
      count: total_documents,
    });
  } catch (error) {
    console.error("Fetch paid news error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// UPDATE EXISTING NEWS
const edit_existing_news = async (req, res) => {
  try {
    const validationResponse = send_validation_errors(req, res);
    if (validationResponse) return validationResponse;

    const exist_admin = await AdminModel.findById(req.token?._id);

    if (!exist_admin) {
      return res.status(401).json({
        message: "Invalid Authentication",
        success: false,
      });
    }

    const exist_news = await NewsModel.findById(req.body._id);

    if (!exist_news) {
      return res.status(404).json({
        message: "News not found",
        success: false,
      });
    }

    const exist_category = await findCategoryByName(req.body.category_name);

    if (!exist_category) {
      return res.status(400).json({
        message: "Category doesn't exist",
        success: false,
      });
    }

    exist_news.title = req.body.title;
    exist_news.description = req.body.description;
    exist_news.content = req.body.content;
    exist_news.author = req.body.author;
    exist_news.category_name = req.body.category_name;
    exist_news.status = req.body.status;

    await exist_news.save();

    return res.status(200).json({
      message: "News has Updated",
      success: true,
      data: exist_news,
    });
  } catch (error) {
    console.error("Update news error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// UPDATE NEWS IMAGE
const update_exist_news_image = async (req, res) => {
  try {
    const validationResponse = send_validation_errors(req, res);

    if (validationResponse) {
      if (req.file) delete_existing_file(req.file.filename);
      return validationResponse;
    }

    if (!req.file) {
      return res.status(400).json({
        message: "News image is required",
        success: false,
      });
    }

    const exist_admin = await AdminModel.findById(req.token?._id);

    if (!exist_admin) {
      delete_existing_file(req.file.filename);

      return res.status(401).json({
        message: "Invalid Authentication",
        success: false,
      });
    }

    const exist_news = await NewsModel.findById(req.body._id);

    if (!exist_news) {
      delete_existing_file(req.file.filename);

      return res.status(404).json({
        message: "Invalid News",
        success: false,
      });
    }

    const oldImage = exist_news.image;

    exist_news.image = req.file.filename;

    await exist_news.save();

    if (oldImage && oldImage !== req.file.filename) {
      delete_existing_file(oldImage);
    }

    return res.status(200).json({
      message: "News Image Updated",
      success: true,
      data: exist_news,
    });
  } catch (error) {
    console.error("Update news image error:", error);

    if (req.file) {
      delete_existing_file(req.file.filename);
    }

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

// DELETE EXISTING NEWS
const delete_existing_news = async (req, res) => {
  try {
    const validationResponse = send_validation_errors(req, res);
    if (validationResponse) return validationResponse;

    const exist_admin = await AdminModel.findById(req.token?._id);

    if (!exist_admin) {
      return res.status(401).json({
        message: "Invalid Authentication",
        success: false,
      });
    }

    const exist_news = await NewsModel.findById(req.body._id);

    if (!exist_news) {
      return res.status(404).json({
        message: "Invalid News",
        success: false,
      });
    }

    await NewsModel.deleteOne({
      _id: exist_news._id,
    });

    delete_existing_file(exist_news.image);

    return res.status(200).json({
      message: "News Deleted",
      success: true,
    });
  } catch (error) {
    console.error("Delete news error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
      success: false,
    });
  }
};

module.exports = {
  create_new_news,
  fetch_all_news,
  edit_existing_news,
  delete_existing_news,
  update_exist_news_image,
  fetch_all_paid_news,
};
