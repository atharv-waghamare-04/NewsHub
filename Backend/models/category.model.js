const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: true, collection: "nh_category_details" },
);

const CategoryModel = mongoose.model("nh_category_details", categorySchema);

module.exports = CategoryModel;
