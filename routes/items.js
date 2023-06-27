const router = require("express").Router();
const Product = require("../model/Product");
const Category = require("../model/Category");

/* 
  params - 
    1] userId - user id
    
  result - Returns array of notification objects
*/
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

    if (req.body?.status == "ACTIVE") {
      query = { ...query, is_active: true };
    } else if (req.body?.status == "INACTIVE") {
      query = { ...query, is_active: false };
    } else if (req.body?.status == "SPECIAL MENU") {
      query = { ...query, is_special_item: true };
    }

    console.log("query", query);

    let allItems = await Product.find(query).populate("category");

    return res.status(200).json(allItems);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] userId - user id
    
  result - Returns array of notification objects
*/
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
    newProduct.description = req.body?.description;
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

/* 
  params - 
    1] userId - user id
    
  result - Returns array of notification objects
*/
router.post("/update-item", async (req, res) => {
  try {
    console.log("req123", req.body);
    // console.log("req.file.path", req.file);

    let product = await Product.findOne({ _id: req.body?.id });
    console.log("product123", product);
    product.name = req.body?.name;
    product.image = req.body?.image;
    product.price = req.body?.price;
    product.category = req.body?.category;
    product.type = req.body?.type;
    product.description = req.body?.description;
    product.user = req.body?.userId;

    await product.save();
    console.log("product456", product);
    return res.status(200).json(product);
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] userId - user id
    
  result - Returns array of notification objects
*/
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

/* 
  params - 
    1] userId - user id
    
  result - Returns array of notification objects
*/
router.post("/update-special-menu", async (req, res) => {
  try {
    console.log("req123", req.body);
    // console.log("req.file.path", req.file);

    let product = await Product.findOne({ _id: req.body?.id });
    product.is_special_item = !product.is_special_item;

    await product.save();

    return res.status(200).json(product);
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] userId - user id
    
  result - Returns array of notification objects
*/
router.post("/trending-items", async (req, res) => {
  try {
    let query = { is_active: true };

    if (req.body?.userId) {
      query = { ...query, user: req.body?.userId };
    }

    let categories = await Category.find({
      is_active: true,
    });

    let trendingFoods = await Product.find({
      ...query,
    })
      .populate("category")
      .sort({ total_orders: -1 })
      .limit(5);

    let data = [],
      filteredCategories = [];

    for (const category of categories) {
      let items = await Product.find({
        ...query,
        category: category.id,
      })
        .populate("category")
        .limit(5);

      if (items.length > 0) {
        let temp = {};
        temp["id"] = category.id;
        temp["name"] = category.name;
        temp["items"] = items;

        data.push(temp);
        filteredCategories.push(category);
      }
    }

    console.log("filteredCategories", filteredCategories);
    console.log("data", data);
    console.log("trendingFoods", trendingFoods);

    return res.status(200).json({
      filteredCategories,
      // filteredCategories: categories,
      data,
      trendingFoods,
    });
  } catch (error) {
    console.log("err", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] userId - user id
    
  result - Returns array of notification objects
*/
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
    }).populate("category");

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
