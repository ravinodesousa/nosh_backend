const Category = require("../model/Category");
const Notification = require("../model/Notification");

const router = require("express").Router();

/* 
  params - 
    1] userId - user id
    
  result - Returns array of category objects
*/
router.post("/add-category", async (req, res) => {
  try {
    const category = await Category.create({
      name: req.body?.name,
      image: req.body?.image,
    });

    return res.status(200).json(category);
  } catch (error) {
    console.log("err123", error);
    return res
      .status(500)
      .json({ message: "request failed. Please try again." });
  }
});

/* 
  params - 
    1] userId - user id
    
  result - Returns array of category objects
*/
router.post("/update", async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.body?.id });

    if (category) {
      category.name = req.body?.name;
      category.image = req.body?.image;

      await category.save();
      return res.status(200).json(category);
    } else {
      return res.status(500).json({ message: "Category not found" });
    }
  } catch (error) {
    console.log("err123", error);

    return res
      .status(500)
      .json({ message: "request failed. Please try again." });
  }
});

/* 
  params - 
    1] userId - user id
    
  result - Returns array of category objects
*/
router.post("/update-status", async (req, res) => {
  try {
    const category = await Category.findOne({ _id: req.body?.id });

    if (category) {
      category.is_active = !category.is_active;

      await category.save();
      return res.status(200).json(category);
    } else {
      return res.status(500).json({ message: "Category not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "request failed. Please try again." });
  }
});

/* 
  params - 
    1] userId - user id
    
  result - Returns array of category objects
*/
router.post("/", async (req, res) => {
  try {
    let query = { is_active: true };
    if (req.body?.showAll) {
      query = {};
    }
    console.log(req.body);
    const categoryList = await Category.find(query).sort({
      name: "asc",
    });

    return res.status(200).json(categoryList);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "request failed. Please try again." });
  }
});

module.exports = router;
