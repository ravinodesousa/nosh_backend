const router = require("express").Router();
const upload = require("../helper/UploadHelper");
const Product = require("../model/Product");

router.post("/items", async (req, res) => {
  try {
    let query = {};

    if (req.body?.userId) {
      query = { ...query, user: req.body?.userId };
    }
    if (req.body?.is_active) {
      query = { ...query, is_active: req.body?.is_active };
    }

    let allItems = await Product.find(query);

    return res.status(200).json(allItems);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

// router.post("/add-item", upload.single("image"), async (req, res) => {
router.post("/add-item", async (req, res) => {
  try {
    console.log("req123", req);
    console.log("req.file.path", req.file);

    let newProduct = new Product();
    newProduct.name = req.body?.name;
    newProduct.image = req.body?.image;
    newProduct.price = req.body?.price;
    newProduct.category = req.body?.category;
    newProduct.type = req.body?.type;
    // newProduct.description = req.body?.description;
    newProduct.user = req.body?.userId;
    newProduct.is_active = true;

    await newProduct.save();

    return res.status(200).json(newProduct);
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

module.exports = router;
