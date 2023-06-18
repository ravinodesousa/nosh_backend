const router = require("express").Router();
const upload = require("../helper/UploadHelper");
const Product = require("../model/Product");

router.post("/items", async (req, res) => {
  try {
    let query = {};

    console.log("query", query);

    if (req.body?.userId) {
      query = { ...query, user: req.body?.userId };
    }
    if (req.body?.is_active) {
      query = { ...query, is_active: req.body?.is_active };
    }
    if (req.body?.category) {
      query = { ...query, category: req.body?.category };
    }

    console.log("query", query);

    let allItems = await Product.find(query);

    return res.status(200).json(allItems);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

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

router.post("/update-item", async (req, res) => {
  try {
    console.log("req123", req);
    // console.log("req.file.path", req.file);

    let product = await Product.findOne({ _id: req.body?.id });
    console.log("product", product);
    product.name = req.body?.name;
    product.image = req.body?.image;
    product.price = req.body?.price;
    product.category = req.body?.category;
    product.type = req.body?.type;
    // product.description = req.body?.description;
    product.user = req.body?.userId;

    await product.save();

    return res.status(200).json(product);
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

router.post("/update-item-status", async (req, res) => {
  try {
    console.log("req123", req.body);
    // console.log("req.file.path", req.file);

    let product = await Product.findOne({ _id: req.body?.id });
    product.is_active = req.body?.status;

    await product.save();

    return res.status(200).json(product);
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

router.post("/trending-items", async (req, res) => {
  try {
    let query = { is_active: true };

    if (req.body?.userId) {
      query = { ...query, user: req.body?.userId };
    }

    let trendingFoods = await Product.find({
      ...query,
    })
      .sort({ total_orders: -1 })
      .limit(5);

    let fastFoods = await Product.find({
      ...query,
      category: "Fast Food",
    }).limit(5);

    let desserts = await Product.find({
      ...query,
      category: "Dessert",
    }).limit(5);

    let drinks = await Product.find({
      ...query,
      category: "Drinks",
    }).limit(5);

    return res.status(200).json({
      fastFoods,
      desserts,
      drinks,
      trendingFoods,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

router.post("/search", async (req, res) => {
  try {
    let query = { is_active: true };

    if (req.body?.canteenId) {
      query = { ...query, user: req.body?.canteenId };
    }

    if (req.body?.searchedItem) {
      query = {
        ...query,
        name: { $regex: ".*" + req.body?.searchedItem + ".*", $options: "i" },
      };
    }

    console.log("query", query);
    let matchedItems = await Product.find({
      ...query,
    });

    console.log("matchedItems", matchedItems);

    return res.status(200).json(matchedItems);
  } catch (error) {
    console.log("err1222", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

module.exports = router;
