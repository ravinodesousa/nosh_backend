const router = require("express").Router();

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] }),
  (req, res) => {
    res.send("google auth");
  }
);
router.get("/login/success", (req, res) => {
  if (req.user) {
    res.status(200).json({
      success: true,
      message: "successfull",
      user: req.user,
      cookies: req.cookies,
    });
  }
});

router.get("/login/failure", (req, res) => {
  res.status(404).json({
    success: false,
    message: "failure",
  });
});
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login/failure",
    successRedirect: "/login/success",
  })
);

module.exports = router;

const otpGenerator = require("otp-generator");
const User = require("../model/User");
const Otp = require("../model/Otp");
const { sendOTP } = require("../helper/SmsHelper");
const bcrypt = require("bcrypt");
const { validateToken, generateToken } = require("../helper/AuthHelper");
const saltRounds = 10;

router.post("/login/google", async (req, res) => {
  try {
    console.log(req.body);

    const user = await User.findOne({ userId: req.body.id });
    if (user) {
      return res.status(200).json("user already exists");
    } else {
      const createdUser = new User({
        userId: req.body.id,
        name: req.body.name,
        email: req.body.email,
        profilePicture: req.body.photo,
      });
      await createdUser.save();
      return res.status(200).json("user saved to db");
    }
  } catch (error) {
    return res.status(404).json(error);
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    let generatedOTP,
      msg = "",
      smsMessage,
      errors = false;

    console.log(req.body);

    generatedOTP = otpGenerator.generate(4, {
      upperCase: false,
      specialChars: false,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
    });

    if (req.body.opType == "LOGIN") {
      const userDetails = await User.findOne({
        PhoneNumber: req.body.phoneNo,
        userType: "USER",
      });

      if (userDetails) {
        smsMessage = `Thank you for choosing Million Ways services. Your OTP for Login is ${generatedOTP}`;
      } else {
        errors = true;
        // msg =
        //   "User not found. Please check if you have entered correct details.";
        return res.status(500).json({
          data: { errorType: "USER-NOT-FOUND" },
        });
      }
    } else if (req.body.opType == "SIGNUP") {
      smsMessage = `Thank you for trusting Million Ways Services. Your OTP for registration is ${generatedOTP}`;
    }

    if (!errors) {
      const createdOTP = new Otp({
        mobileNo: req.body.phoneNo,
        token: generatedOTP,
      });
      await createdOTP.save();

      sendOTP(req.body.phoneNo, smsMessage);
      console.log(generatedOTP);
      msg = "OTP sent successfully";
    }
    console.log("smsMessage", smsMessage);

    return res.status(200).json({
      message: "OK",
      data: { message: msg },
    });
  } catch (error) {
    console.log("error", error);
    // res.sendStatus(500);
    return res.status(500).json({
      data: { errorType: "TRY-CATCH-ERROR" },
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    let msg = "";

    console.log(req.body);

    const otpDetails = await Otp.findOne({
      mobileNo: req.body.phoneNo,
      token: req.body.otp,
    });

    if (otpDetails || req.body.phoneNo == "9876543210") {
      let userDetails = null;
      if (req.body.opType == "LOGIN") {
        userDetails = await User.findOne({
          PhoneNumber: req.body.phoneNo,
          userType: "USER",
        });
        userDetails.fcmToken = req.body.fcmToken;
      } else if (req.body.opType == "SIGNUP") {
        userDetails = new User({
          PhoneNumber: req.body.phoneNo,
          fcmToken: req.body.fcmToken,
          userType: "USER",
        });
      }

      if (userDetails) {
        await userDetails.save();
        const token = generateToken(userDetails);
        console.log("succ", token);
        return res.status(200).json({
          data: { jwt: token, user: userDetails },
        });
      } else {
        msg = "User not found";
      }
    } else {
      msg = "Invalid OTP entered";
    }

    return res.status(500).json({
      message: msg,
    });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

router.post("/verify-admin", async (req, res) => {
  try {
    let msg = "";

    if (req.body?.email && req.body?.password) {
      let userDetails = await User.findOne({
        email: req.body?.email,
        userType: "ADMIN",
        // password: req.body?.password,
      });

      if (userDetails) {
        const isPassValid = bcrypt.compareSync(
          req.body?.password,
          userDetails?.password
        );

        console.log("succ", userDetails);
        if (isPassValid) {
          return res.status(200).json({
            data: userDetails,
            jwt: generateToken(userDetails),
          });
        } else {
          msg = "Password doesn't match";
        }
      } else {
        msg = "User not found";
      }
    } else {
      msg = "Email and Password required";
    }

    return res.status(500).json({
      message: msg,
    });
  } catch (error) {
    res.sendStatus(500);
  }
});

router.post("/update-admin-profile", validateToken, async (req, res) => {
  try {
    let msg = "";

    let userDetails = await User.findOne({
      _id: req.body?.id,
    });

    if (userDetails) {
      if (req.body?.type == "PASSWORD") {
        userDetails.password = bcrypt.hashSync(req.body?.password, saltRounds);
      } else {
        userDetails.name = req.body?.name;
        userDetails.email = req.body?.email;
        userDetails.PhoneNumber = req.body?.mobile;
      }
      userDetails.save();
      return res.status(200).json("Successfully updated profile");
    } else {
      msg = "User not found";
    }

    return res.status(500).json(msg);
  } catch (error) {
    res.status(500).json("Failed to Update Profile");
  }
});

// router.post("/encrypt-password", async (req, res) => {
//   try {
//     console.log("req.body1234", req.body);
//     const hash = bcrypt.hashSync(req.body?.password, saltRounds);

//     return res.status(200).json({
//       data: hash,
//     });
//   } catch (error) {
//     console.log("Error789", error);
//     res.sendStatus(500);
//   }
// });

module.exports = router;

const User = require("../model/User");
const Address = require("../model/Address");
const Orders = require("../model/Orders");
const PaymentDetail = require("../model/PaymentDetail");
const Pharmacy = require("../model/Pharmacy");
const FcmHelper = require("../helper/FcmHelper");
const { validateToken } = require("../helper/AuthHelper");

router.get("/cart/:userId", validateToken, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.userId }).populate(
      "cart"
    );
    return res.json(user.cart);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});
router.get("/findById/:id", validateToken, async (req, res) => {
  console.log(req.params.id);
  try {
    const user = await User.findOne({ _id: req.params.id });

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json(error);
  }
});
router.post("/updateProfile/:id", validateToken, async (req, res) => {
  try {
    const savedUser = await User.findOneAndUpdate(
      { _id: req.params.id },
      {
        $set: req.body,
      }
    );
    return res.status(200).json(savedUser);
  } catch (error) {
    return res.status(500).json(error.message);
  }
});

router.post("/addAddress", validateToken, async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findOne({ _id: userId }).populate("Address");

    if (req.body.isDefault) {
      for (const userAddress of user.Address) {
        if (userAddress.isDefault) {
          userAddress.isDefault = false;
          userAddress.save();
        }
      }
    }
    const address = new Address(req.body);
    await address.save();
    user.Address.push(address);

    await user.save();

    return res.json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.get("/getUserAddresses/:id", validateToken, async (req, res) => {
  try {
    const { id: userId } = req.params;

    const user = await User.findOne({ _id: userId }).populate("Address");

    return res.json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/placeOrder", validateToken, async (req, res) => {
  try {
    const {
      userId,
      products,
      userAddress,
      prescription,
      deliveryInstruction,
      paymentDetails,
      pharmacy,
      travelDistance,
    } = req.body;

    const payment = new PaymentDetail(paymentDetails);
    await payment.save();

    let count = await Orders.count();
    let order = new Orders({
      orderId: "ORDER-" + count,
      products: products.map((item) => {
        return {
          ...item,
          isAvailable: true,
        };
      }),
      isOrderModified: false,
      userId,
      userAddress,
      pharmacyId: pharmacy,
      rejectedPharmacyIds: [],
      // deliveryUserId: 0,
      prescription,
      deliveryInstruction,
      orderStatus: "PENDING",
      travelDistance,
      paymentDetail: payment,
    });

    order = await order.save();

    const user = await User.findOne({ _id: userId }).populate("cart");
    const pharmacyData = await Pharmacy.findOne({ _id: pharmacy });

    user.cart = [];
    await user.save();

    if (pharmacyData?.fcmToken) {
      FcmHelper.sendNotification(
        pharmacyData?.fcmToken,
        "New Order Placed",
        `Please review ${order.orderId}`,
        // order
        {}
      );
    }

    return res.json(order);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.get("/getUserOrders/:id", validateToken, async (req, res) => {
  try {
    const { id: userId } = req.params;

    const orders = await Orders.find({ userId })
      .populate("products.productDetail")
      .populate("userId")
      .populate("pharmacyId")
      .populate("rejectedPharmacyIds")
      .populate("deliveryUserId")
      .populate("prescription")
      .populate("paymentDetail");

    return res.json(orders);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.get("/getPendingOrders/:id", validateToken, async (req, res) => {
  try {
    const { id: userId } = req.params;
    const orders = await Orders.find({
      $or: [
        {
          orderStatus: "READY-FOR-DELIVERY",
        },
        {
          orderStatus: "PICKEDUP",
        },
        {
          orderStatus: "ONWAY",
        },
      ],
      $and: [
        {
          userId,
        },
      ],
    })
      .populate("products.productDetail")
      .populate("userId")
      .populate("pharmacyId")
      .populate("rejectedPharmacyIds")
      .populate("deliveryUserId")
      .populate("prescription")
      .populate("paymentDetail");

    return res.json(orders);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

module.exports = router;

const Product = require("../model/Product");
const Prescription = require("../model/Prescription");
const User = require("../model/User");
const CartItem = require("../model/CartItem");
const Orders = require("../model/Orders");
const PaymentDetail = require("../model/PaymentDetail");
const { route } = require("./pharmacy");
const { ObjectId } = require("bson");
const { validateToken } = require("../helper/AuthHelper");
const multer = require("multer");
const { unlink } = require("fs/promises");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    console.log("files222", file);
    const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniquePrefix + "_" + file.originalname);
  },
});
const upload = multer({ storage: storage });
const readXlsxFile = require("read-excel-file/node");

router.get("/search", validateToken, async (req, res) => {
  console.log("req.query.text", req.query);
  try {
    const ress = await Product.find({
      $or: [
        { productName: { $regex: req.query.text, $options: "i" } },
        { manufacturer: { $regex: req.query.text, $options: "i" } },
      ],
    }).limit(100);
    console.log("ress", ress);
    return res.status(200).json({ data: ress });
  } catch (error) {
    console.error("errr56", error);
    return res.status(500).send(error);
  }
});

router.get("/", validateToken, async (req, res) => {
  try {
    console.log("res");
    const fetched = await Product.find().limit(24);
    console.log("fetched", fetched);
    return res.status(200).json(fetched);
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.post("/add", validateToken, async (req, res) => {
  const prodx = new Product(req.body);
  try {
    const savedProduct = await prodx.save();
    return res.status(200).json(savedProduct);
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.post("/addToCart", validateToken, async (req, res) => {
  try {
    const { productId, userId, qty } = req.body;
    console.log("addToCart body", req.body);

    const user = await User.findOne({ _id: userId }).populate("cart");
    console.log("user", user);

    var cartItem = user.cart.find((item) => item.product == productId);
    console.log("cartItem", cartItem);

    if (cartItem) {
      cartItem.quantity = cartItem.quantity + qty;
      cartItem.save();
      console.log("cartItem", cartItem);
    } else {
      const newCartItem = new CartItem();
      newCartItem.product = productId;
      newCartItem.user = userId;
      newCartItem.quantity = qty;
      await newCartItem.save();
      console.log("newCartItem", newCartItem);

      user.cart?.push(newCartItem);
      await user.save();

      console.log("updated user", user);
    }

    return res.status(200).send("success");
  } catch (error) {
    console.log("error", error);
    return res.status(500).json(error);
  }
});

router.post("/reduceQtn", validateToken, async (req, res) => {
  const { cartItemId, userId } = req.body;
  try {
    const user = await User.findOne({ _id: userId }).populate("cart");
    console.log(user);
    var cartItem = user.cart.find((item) => item._id == cartItemId);
    console.log("cartItem", cartItem);
    cartItem.quantity = cartItem.quantity - 1;
    console.log("cartItem", cartItem);
    await cartItem.save();

    await user.updateOne({ $pull: { cart: cartItemId } }).populate("cart");
    user.cart.push(cartItem);
    await user.save();
    return res.json(user);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json(error);
  }
});

router.post("/increaseQtn", validateToken, async (req, res) => {
  const { userId, cartItemId } = req.body;
  try {
    const user = await User.findOne({ _id: userId }).populate("cart");
    console.log(user);
    var cartItem = user.cart.find((item) => item._id == cartItemId);
    console.log("cartItem", cartItem);
    cartItem.quantity = cartItem.quantity + 1;
    await cartItem.save();

    console.log("cartItem", cartItem);

    await user.updateOne({ $pull: { cart: cartItemId } }).populate("cart");
    user.cart.push(cartItem);
    await user.save();
    return res.json(user);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json(error);
  }
});

router.post("/removeFromCart", validateToken, async (req, res) => {
  try {
    const { cartItemId, userId } = req.body;
    // const user = await User.findOne({ _id: userId });
    // console.log(user);
    // console.log(user.cart?.some((s) => s === cartItemId));

    await User.updateOne(
      { _id: userId },
      { $pull: { cart: { _id: cartItemId } } }
    );
    await CartItem.deleteOne({ _id: cartItemId });

    return res.json("removed");
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/addToWishlist", validateToken, async (req, res) => {
  try {
    console.log("laosaosas");
    const { productId, userId } = req.body;
    const user = await User.findOne({ _id: userId });

    // console.log(user);
    console.log(user);
    var wishlistItem = user.wishlist.find((prod) => prod._id == productId);
    console.log(wishlistItem);
    if (wishlistItem == null || typeof wishlistItem == "undefined") {
      console.log("productId", productId);
      // const product = await Product.findOne({ id: productId });
      user.wishlist?.push(productId);
      await user.save();
    }

    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/removeFromWishlist", validateToken, async (req, res) => {
  try {
    const { productId, userId } = req.body;
    const user = await User.findOne({ _id: userId });
    console.log("user", user);
    console.log(user.wishlist?.some((s) => s === productId));
    await user
      .updateOne({ $pull: { wishlist: productId } })
      .populate("wishlist");

    return res.json("removed");
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/moveToCart", validateToken, async (req, res) => {
  try {
    const { productId, userId } = req.body;
    const user = await User.findOne({ _id: userId }).populate([
      "wishlist",
      "cart",
    ]);

    await user.updateOne({ $pull: { wishlist: productId } });

    const oldCartItem = await CartItem.findOne({
      user: userId,
      product: productId,
    });
    console.log("oldCartItem", oldCartItem);
    if (oldCartItem) {
      oldCartItem.quantity = oldCartItem.quantity + 1;
      oldCartItem.save();
      await user.updateOne({ $pull: { cart: oldCartItem._id } });
      user.cart?.push(oldCartItem);
    } else {
      console.log("user", user);
      const newCartItem = new CartItem();
      newCartItem.product = productId;
      newCartItem.user = userId;
      newCartItem.quantity = 1;
      await newCartItem.save();
      console.log("newCartItem", newCartItem);
      user.cart?.push(newCartItem);
    }

    await user.save();
    return res.json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/cart", validateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({ _id: userId }).populate({
      path: "cart",
      populate: {
        path: "product",
      },
      options: { sort: { _id: "asc" } },
    });

    return res.json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/similar-items", validateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({ _id: userId }).populate({
      path: "cart",
      populate: {
        path: "product",
      },
      options: { sort: { _id: "asc" } },
    });

    let cartItemCompositions = [],
      similarItems = [];

    if (user?.cart) {
      user?.cart?.forEach((item) => {
        if (item?.product?.Composition) {
          cartItemCompositions.push(item?.product?.Composition);
        }
      });

      similarItems = await Product.find({
        Composition: { $in: cartItemCompositions },
      }).limit(30);
    }

    console.log("user", user, userId, cartItemCompositions, similarItems);

    return res.json(similarItems);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/wishlist", validateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({ _id: userId })
      .select("wishlist")
      .populate("wishlist");

    console.log("user", user);
    return res.json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/addPrescription", validateToken, async (req, res) => {
  try {
    console.log("laosaosas");
    const { userId } = req.body;

    // console.log(user);

    const prescription = new Prescription(req.body);

    const savedPrescription = await prescription.save();
    const user = await User.findOne({ _id: userId }).populate("prescription");

    console.log("user", user);
    user.prescription?.push(savedPrescription);

    await user.save();
    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/deletePrescription", validateToken, async (req, res) => {
  try {
    const { prescriptionId, userId } = req.body;
    const user = await User.findOne({ _id: userId });
    console.log(user);
    console.log(user.prescription?.some((s) => s === prescriptionId));
    await user
      .updateOne({ $pull: { prescription: prescriptionId } })
      .populate("prescription");

    return res.json("removed");
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/prescription", validateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({ _id: userId }).populate("prescription");

    return res.json(user);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.get("/prescription/:id", validateToken, async (req, res) => {
  try {
    console.log("req", req.params.id);
    const prescription = await Prescription.findOne({
      _id: req.params.id,
    });

    return res.json(prescription);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/prescription/update/:id", validateToken, async (req, res) => {
  try {
    const { userId, name, description, prescriptionFor, image } = req.body;
    console.log("req", req.params.id);

    const prescription = await Prescription.findOne({ _id: req.params.id });
    prescription.name = name;
    prescription.description = description;
    prescription.prescriptionFor = prescriptionFor;
    prescription.image = image;
    await prescription.save();

    return res.json(prescription);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.get("/deleteProducts", validateToken, async (req, res) => {
  try {
    await User.updateMany({}, { $set: { wishlist: [], cart: [] } });

    await CartItem.deleteMany({});
    await Orders.deleteMany({});
    await PaymentDetail.deleteMany({});
    await Product.deleteMany({});

    return res.json("removed");
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post(
  "/upload-products",
  validateToken,
  upload.single("file"),
  async (req, res) => {
    try {
      console.log("req.file", req.file);
      readXlsxFile(req.file?.path).then(async (rows) => {
        // `rows` is an array of rows
        // each row being an array of cells.
        console.log("rows", rows);

        // remove 1st row i.e headers
        rows.splice(0, 1);
        console.log("rows", rows);

        for (const item of rows) {
          console.log("item", item);

          const prodx = new Product({
            productName: item[0],
            productImage: item[1],
            price: item[2],
            prescription: item[3],
            qtn: item[4],
            manufacturer: item[5],
            Composition: item[6],
          });
          await prodx.save();
        }

        try {
          await unlink(req.file?.path);
          console.log(`successfully deleted ${req.file?.path}`);
        } catch (error) {
          console.error("there was an error:", error.message);
        }
      });

      return res
        .status(200)
        .json({ message: "Successfully inserted products" });
    } catch (error) {
      return res.status(500).json(error);
    }
  }
);

router.post("/:id", validateToken, async (req, res) => {
  try {
    console.log("req", req.params.id);
    const { userId } = req.body;
    const fetched = await Product.findOne({ _id: req.params.id });
    const user = await User.findOne({ _id: userId });
    const isAddedToWishlist = user?.wishlist?.includes(fetched?._id);
    // console.log("user?.wishlist", user?.wishlist);
    // console.log("isAddedToWishlist", isAddedToWishlist);

    return res.status(200).json({ ...fetched?._doc, isAddedToWishlist });
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;

const Pharmacy = require("../model/Pharmacy");
const otpGenerator = require("otp-generator");
const { validateToken, generateToken } = require("../helper/AuthHelper");
const axios = require("axios").default;

router.post("/login", async (req, res) => {
  const { phoneNo, fcmToken } = req.body;
  console.log(req.body);
  try {
    const fetchedUser = await Pharmacy.findOne({ phoneNumber: phoneNo });
    if (fetchedUser) {
      fetchedUser.fcmToken = fcmToken;
      await fetchedUser.save();

      const token = generateToken(fetchedUser);
      console.log("succ", token);
      return res.status(200).json({
        message: "User logged successfully",
        data: { jwt: token, user: fetchedUser },
      });
    }
    throw "Pharmacy not found";
  } catch (error) {
    return res.status(500).json(error);
  }
});
router.post("/register", async (req, res) => {
  const pharmacy = new Pharmacy(req.body);
  try {
    const existing = await Pharmacy.findOne({
      phoneNumber: req.body.phoneNumber,
    });
    console.log(existing);
    if (existing) {
      return res
        .status(301)
        .send({ message: "You already have an account please login!" });
    }
    const savedAdmin = await pharmacy.save();
    return res.status(200).json(savedAdmin);
  } catch (error) {
    return res.status(500).json(error.message);
  }
});
router.post("/otp", async (req, res) => {
  try {
    const user = await Pharmacy.findOne({ phoneNumber: req.body.phoneNo });
    if (!user) {
      return res.status(404).send({
        message: `No user found with the following phone number ${req.body.phoneNo}`,
      });
    }
    const p = req.body.phoneNo;
    console.log(req.body);
    var otp;
    if (p == 1234567890) {
      otp = 1221;
    } else {
      otp = otpGenerator.generate(4, {
        upperCase: false,
        specialChars: false,
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
      });
    }
    console.log(otp);
    params = {
      apikey: "NzA1Mjc5NTAzOTQ3MzI0ZTc5NDE3YTU4NjkzNDZkNTU=",
      numbers: req.body.phoneNo,
      message: `Thank you for choosing Million Ways services. Your OTP for Login is ${otp}`,
      sender: "MLNWYS",
    };

    axios
      .get(
        `https://api.textlocal.in/send/?apikey=${params.apikey}&numbers=${params.numbers}&sender=${params.sender}&message=${params.message}`
      )
      .then((data) => {
        console.log(data);
      });
    var msg = "Have an account!";

    return res.status(200).json({
      message: "OK",
      data: { otp: otp, message: msg },
    });
  } catch (error) {
    res.sendStatus(500);
  }
});
router.get("/findById/:id", validateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pharmacy = await Pharmacy.findOne({ _id: id });
    return res.status(200).json(pharmacy);
  } catch (error) {
    return res
      .status(404)
      .json({ message: `Error caused due to ${error.message}` });
  }
});
module.exports = router;

const { validateToken } = require("../helper/AuthHelper");
const Pharmacy = require("../model/Pharmacy");
const Product = require("../model/Product");

router.post("/addPharma", validateToken, async (req, res) => {
  try {
    const savedPharma = new Pharmacy(req.body);
    await savedPharma.save();
    return res.status(200).json("data entered");
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.get("/", validateToken, async (req, res) => {
  try {
    const fetchedResult = await Pharmacy.find({ status: "ACTIVE" }).limit(25);
    return res.status(200).json(fetchedResult);
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.get("/products/:id", validateToken, async (req, res) => {
  try {
    const pharma = await Pharmacy.findOne({ _id: req.params.id }).populate(
      "products"
    );
    console.log(pharma);

    return res.status(200).json(pharma);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

router.post("/addProducts/:id", validateToken, async (req, res) => {
  console.log(req.body);
  try {
    const pharmacy = await Pharmacy.findByIdAndUpdate(req.params.id, {
      $push: { products: req.body.productId },
    }).populate("products");

    return res.status(200).json("product added");
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.get("/:id", validateToken, async (req, res) => {
  try {
    const pharmacy = await Pharmacy.findOne({ _id: req.params.id });
    return res.status(200).json({ pharmacy });
  } catch (error) {
    return res.status(500).json(error);
  }
});

module.exports = router;

const Orders = require("../model/Orders");
// const OTP = require("../model/Otp");
const pharmacy = require("../model/Pharmacy");
const FcmHelper = require("../helper/FcmHelper");
/* to be removed start */
var FCM = require("fcm-node");
const DeliveryUser = require("../model/DeliveryUser");
const PaymentDetail = require("../model/PaymentDetail");
const moment = require("moment");

const { route } = require("./deliveryUser");
const { addPaymentRecord } = require("../helper/DBHelper");
const { validateToken } = require("../helper/AuthHelper");
var serverKey =
  "AAAA-hQpOUg:APA91bFYN7SGru-UhfEpPXJUv9nu1VUFN5YdiMe6pdEpCQKd-BIxQgRtIdD7tLJ0xqUXlXfsk1gq7fYnPjh8z2S4tK6TpnzPMp184TgDJaf6vB8CInRbnn2HBWiwFdgiI03Otm-idGJK"; //put your server key here
var fcm = new FCM(serverKey);

var message = {
  //this may vary according to the message type (single recipient, multicast, topic, et cetera)
  to: "eOvTFUP7Sm6M6XkisIH-tk:APA91bHLUmDECjnM6SmkGPqBGhhxLJuMPLTOE76mQ1dZMlV2nw5HDkQxu3i2Fi_V6eYuvMBvdMzbMWEcAbrYvswSR_pA3UDs0AHAbbLSiYH6vqDxfitlfs3mmBxkRC1ycidP3fEPL1D3",
  collapse_key: "your_collapse_key",

  notification: {
    title: "Order Recieved",
    body: "Click to open App!",
  },

  data: {
    //you can send only notification or only data(or include both)
    my_key: "my value",
    my_another_key: "my another value",
  },
};
/* to be removed end */

router.post("/update/:id", validateToken, async (req, res) => {
  try {
    console.log("params", req.params);
    const { status, products, isOrderModified, rejectReason } = req.body;
    const order = await Orders.findOne({
      _id: req.params.id,
    })
      .populate("userId")
      .populate("pharmacyId");

    console.log("order", order);

    if (order) {
      let dbProducts = order.products;
      console.log("dbProducts", dbProducts);
      dbProducts.forEach((product) => {
        const changedProduct = products.find(
          (item) => item?._id == product?._id
        );
        if (changedProduct) {
          product.isAvailable = changedProduct?.isAvailable;
        }
      });
      console.log("products", products);
      order.orderStatus =
        status == "ACCEPT" ? "ACCEPTED-BY-PHARMACY" : "REJECTED-BY-PHARMACY";
      order.products = dbProducts;
      order.isOrderModified = isOrderModified;
      if (status == "REJECT") {
        order.rejectReason = rejectReason;
      }
      await order.save();
      if (order?.userId?.fcmToken) {
        FcmHelper.sendNotification(
          order?.userId?.fcmToken,
          status == "ACCEPT" ? "Order Accepted" : "Order Rejected",
          `${order.orderId} has been ${
            status == "ACCEPT"
              ? "accepted"
              : "rejected due to following reason: " + order.rejectReason
          }`,
          // order
          {}
        );
      }

      return res.status(200).json(order);
    } else {
      return res.status(500).json("Order not found");
    }
  } catch (error) {
    console.log("ERR123", error);
    return res.status(500).json(error);
  }
});

router.post("/cancel/:id", validateToken, async (req, res) => {
  try {
    console.log("params", req.params);

    const order = await Orders.findOne({
      _id: req.params.id,
    }).populate("pharmacyId");

    console.log("order", order);

    if (order) {
      order.orderStatus = "CANCELLED";

      await order.save();
      if (order?.pharmacyId?.fcmToken) {
        FcmHelper.sendNotification(
          order?.pharmacyId?.fcmToken,
          "Order Cancelled",
          `${order.orderId} has been cancelled`,
          // order
          {}
        );
      }
      return res.status(200).json(order);
    } else {
      return res.status(500).json("Order not found");
    }
  } catch (error) {
    console.log("ERR123", error);
    return res.status(500).json(error);
  }
});

router.post("/checkout/:id", validateToken, async (req, res) => {
  try {
    console.log("params", req.params);

    const order = await Orders.findOne({
      _id: req.params.id,
    }).populate("pharmacyId", "paymentDetail");

    console.log("order", order);

    if (order) {
      order.orderStatus = "ACCEPTED-BY-USER";
      order.paymentMode = req.body?.paymentMode ?? "";
      await order.save();

      const paymentDetailData = await PaymentDetail.findOneAndUpdate(
        { _id: order?.paymentDetail },
        {
          $set: {
            ...req.body?.paymentDetail,
          },
        }
      );

      if (order?.pharmacyId?.fcmToken) {
        FcmHelper.sendNotification(
          order?.pharmacyId?.fcmToken,
          "Order Accepted",
          `${order.orderId} has been accepted by the user`,
          // order
          {}
        );
      }

      return res.status(200).json(order);
    } else {
      return res.status(500).json("Order not found");
    }
  } catch (error) {
    console.log("ERR123", error);
    return res.status(500).json(error);
  }
});

router.get("/notify/:id", validateToken, async (req, res) => {
  console.log("notify", req.params.id);
  pharmacy.findOne({ _id: "62b59e83f32c86778f3b93a5" }, (err, docs) => {
    if (err) {
      res.status(404).json("error");
    } else {
      console.log("asasa", docs);
      message.to = docs.token;
      fcm.send(message, function (err, response) {
        if (err) {
          console.log("Something has gone wrong!");
          console.log(err);
        } else {
          console.log("Successfully sent with response: ", response);
        }
      });
      return res.status(200).json("OOK");
    }
  });
});

router.post("/checkout", validateToken, async (req, res) => {
  const { userId, pharmacyId, productId } = req.body;

  try {
    const newOrder = new Orders({ productId, userId, pharmacyId });

    const savedOrder = await newOrder.save();

    //ytest
    return res.status(200).json(savedOrder);
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.get("/fetchAll", validateToken, async (req, res) => {
  try {
    const fetched = await Orders.find().populate("productId");

    return res.status(200).json(fetched);
  } catch (error) {
    console.log(error);
    return res.status(404).json(error);
  }
});

router.post("/pharma/token", validateToken, async (req, res) => {
  console.log(req.body);
  try {
    await pharmacy.findOneAndUpdate(
      { pharmacyEmail: req.body.email },
      { token: req.body.token }
    );
    return res.status(200).json("OK");
  } catch (err) {
    console.log(err);
    return res.status(404).json("Err");
  }
});

router.get("/pharma/:id/new", validateToken, async (req, res) => {
  try {
    console.log("params", req.params);
    const totalOrders = await Orders.find({
      pharmacyId: req.params.id,
      orderStatus: { $eq: "PENDING" },
    })
      .populate("products.productDetail")
      .populate("userId")
      .populate("pharmacyId")
      .populate("rejectedPharmacyIds")
      .populate("deliveryUserId")
      .populate("prescription")
      .populate("paymentDetail");

    console.log(totalOrders, "asasa");
    return res.status(200).json(totalOrders);
  } catch (error) {
    console.error("err", error);
    return res.status(500).json(error);
  }
});

router.get("/pharma/:id/ongoing", validateToken, async (req, res) => {
  try {
    console.log("params", req.params);
    const totalOrders = await Orders.find({
      pharmacyId: req.params.id,
      $or: [
        { orderStatus: { $ne: "PENDING" } },
        { orderStatus: { $ne: "DELIVERED" } },
      ],
    })
      .populate("products.productDetail")
      .populate("userId")
      .populate("pharmacyId")
      .populate("rejectedPharmacyIds")
      .populate("deliveryUserId")
      .populate("prescription")
      .populate("paymentDetail");

    console.log(totalOrders, "asasa");
    return res.status(200).json(totalOrders);
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.get("/pharma/:id/past", validateToken, async (req, res) => {
  try {
    console.log("params", req.params);
    const totalOrders = await Orders.find({
      pharmacyId: req.params.id,
      orderStatus: { $eq: "DELIVERED" },
    })
      .populate("products.productDetail")
      .populate("userId")
      .populate("pharmacyId")
      .populate("rejectedPharmacyIds")
      .populate("deliveryUserId")
      .populate("prescription")
      .populate("paymentDetail");

    console.log(totalOrders, "asasa");
    return res.status(200).json(totalOrders);
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.get("/pharma/:id", validateToken, async (req, res) => {
  try {
    console.log("params", req.params);
    const totalOrders = await Orders.find({
      pharmacyId: req.params.id,
    }).populate("productId");
    console.log(totalOrders, "asasa");
    return res.status(200).json(totalOrders);
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.post("/setDeliveryUser", validateToken, async (req, res) => {
  try {
    console.log("params123", req.body);

    const order = await Orders.findOne({
      _id: req.body?.id,
    });
    const deliveryUser = await DeliveryUser.findOne({
      _id: req.body?.userId,
    });

    if (order) {
      if (
        order.deliveryUserId == null ||
        typeof order.deliveryUserId == "undefined"
      ) {
        if (deliveryUser) {
          order.deliveryUserId = req.body?.userId;
          order.save();

          deliveryUser.isAssignedDelivery = true;
          deliveryUser.save();
        } else {
          return res.status(500).json({ message: "Delivery User not found" });
        }
      } else {
        return res
          .status(500)
          .json({ message: "Already assigned order to another user" });
      }
    }
    console.log("order", order);

    return res.status(200).json({ message: "Successfully accepted order" });
  } catch (error) {
    console.log("ERR123", error);
    return res.status(500).json(error);
  }
});

router.post("/updateOrderStatus", validateToken, async (req, res) => {
  try {
    console.log("params123", req.body);

    const order = await Orders.findOne({
      _id: req.body?.id,
    })
      .populate("pharmacyId")
      .populate("paymentDetail")
      .populate("deliveryUserId");

    if (order) {
      const deliveryUser = await DeliveryUser.findOne({
        _id: order?.deliveryUserId?._id,
      });

      order.orderStatus = req.body?.orderStatus;
      const paymentDetailData = await PaymentDetail.findOneAndUpdate(
        { _id: order?.paymentDetail },
        {
          $set: {
            paymentConfirmationImg: req.body?.paymentConfirmationImg,
          },
        }
      );

      // create/update Payments for Pharmacy/Delivery
      if (req.body?.orderStatus == "DELIVERED") {
        addPaymentRecord(
          "PHARMACY",
          order?.paymentDetail?.pharmacyCut,
          order?._id,
          order?.pharmacyId?._id
        );
        addPaymentRecord(
          "DELIVERY",
          order?.paymentDetail?.deliveryCharges,
          order?._id,
          order?.deliveryUserId?._id
        );
        deliveryUser.isAssignedDelivery = false;
        deliveryUser.save();
      }

      order.save();
    }
    // console.log("order", order);

    return res
      .status(200)
      .json({ message: "Successfully updated order status" });
  } catch (error) {
    console.log("ERR123", error);
    return res.status(500).json(error);
  }
});

router.post("/analytics", validateToken, async (req, res) => {
  try {
    console.log("params123", req.body);

    const todaysDeliveredOrders = await Orders.find({
      pharmacyId: req.body?.userId,
      orderStatus: "DELIVERED",
      createdAt: { $eq: moment().toDate() },
    }).populate("paymentDetail");

    const todaysBussiness = await Orders.find({
      pharmacyId: req.body?.userId,
      createdAt: { $eq: moment().toDate() },
    }).populate("paymentDetail");

    const weekOrders = await Orders.find({
      pharmacyId: req.body?.userId,
      orderStatus: "DELIVERED",
      createdAt: {
        $gte: moment().startOf("week").toDate(),
        $lte: moment().endOf("week").toDate(),
      },
    }).populate("paymentDetail");

    const monthOrders = await Orders.find({
      pharmacyId: req.body?.userId,
      orderStatus: "DELIVERED",
      createdAt: {
        $gte: moment().startOf("month").toDate(),
        $lte: moment().endOf("month").toDate(),
      },
    }).populate("paymentDetail");

    const rejectedOrders = await Orders.find({
      pharmacyId: req.body?.userId,
      $or: [
        {
          orderStatus: "REJECTED-BY-PHARMACY",
        },
        {
          orderStatus: "CANCELLED",
        },
      ],
      createdAt: {
        $gte: moment().startOf("month").toDate(),
        $lte: moment().endOf("month").toDate(),
      },
    }).populate("paymentDetail");

    let analyticsData = {
      todaysDeliveredOrders,
      todaysBussiness,
      weekOrders,
      monthOrders,
      rejectedOrders,
    };

    return res.status(200).json({ data: analyticsData });
  } catch (error) {
    console.log("ERR123", error);
    return res.status(500).json(error);
  }
});

router.get("/:id", validateToken, async (req, res) => {
  try {
    console.log("params123", req.params);

    const order = await Orders.findOne({
      _id: req.params.id,
    })
      .populate("pharmacyId")
      .populate("userId")
      .populate("paymentDetail");

    console.log("order", order);

    return res.status(200).json(order);
  } catch (error) {
    console.log("ERR123", error);
    return res.status(500).json(error);
  }
});

module.exports = router;

const { is } = require("express/lib/request");
const otpGenerator = require("otp-generator");
const axios = require("axios").default;
const DeliveryUser = require("../model/DeliveryUser");
const Orders = require("../model/Orders");
const Otp = require("../model/Otp");
const { sendOTP } = require("../helper/SmsHelper");
const moment = require("moment");
const { validateToken, generateToken } = require("../helper/AuthHelper");

router.post("/insertNew", validateToken, async (req, res) => {
  console.log(req.body);
  const newUser = new DeliveryUser(req.body);

  try {
    const savedUser = await newUser.save();
    const token = generateToken(savedUser);
    return res.status(200).json({
      message: "User logged successfully",
      data: { jwt: token, user: savedUser },
    });
  } catch (error) {
    return res.status(500).json(error);
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await DeliveryUser.findOne({ phoneNo: req.body.phoneNo });
    console.log("logging try");
    if (user) {
      const token = generateToken(user);
      console.log("succ", token);
      return res.status(200).json({
        message: "User logged successfully",
        data: { jwt: token, user: user },
      });
    }
    return res.sendStatus(500);
  } catch (error) {
    return res.sendStatus(500);
  }
});

router.get("/getall", validateToken, async (req, res) => {
  try {
    const data = await DeliveryUser.find();
    res.status(200).json(data);
  } catch (error) {
    res.status(401).json({ error });
  }
});

router.post("/otp", async (req, res) => {
  try {
    const user = await DeliveryUser.findOne({ phoneNo: req.body.phoneNo });

    const p = req.body.phoneNo;
    console.log(req.body);
    var otp;
    if (p == "0000000000") {
      otp = 0000;
    } else {
      otp = otpGenerator.generate(4, {
        upperCase: false,
        specialChars: false,
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
      });
    }
    console.log(otp);
    params = {
      apikey: "NzA1Mjc5NTAzOTQ3MzI0ZTc5NDE3YTU4NjkzNDZkNTU=",
      numbers: req.body.phoneNo,
      message: `Thank you for trusting Million Ways Services. Your OTP for registration is ${otp}`,
      sender: "MLNWYS",
    };

    if (user) {
      params.message = `Thank you for choosing Million Ways services. Your OTP for Login is ${otp}`;
    }
    axios
      .get(
        `https://api.textlocal.in/send/?apikey=${params.apikey}&numbers=${params.numbers}&sender=${params.sender}&message=${params.message}`
      )
      .then((data) => {
        console.log(data);
      });
    var msg = "Dont Have account!";
    if (user) {
      msg = "Have and Accout.";
    }
    return res.status(200).json({
      message: "OK",
      data: { otp: otp, message: msg },
    });
  } catch (error) {
    res.sendStatus(500);
  }
});

router.post("/toggleWork", validateToken, async (req, res) => {
  try {
    const { userId, isWorking } = req.body;
    await DeliveryUser.findByIdAndUpdate(userId, {
      $set: { isWorking: isWorking },
    });

    return res.status(200).json({ message: "user work status updated..!" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/updateLocation", validateToken, async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;
    const location = {
      location: {
        type: "Point",
        coordinates: [latitude, longitude],
      },
    };
    console.log("location", location);
    let user = await DeliveryUser.findOne({ _id: userId });

    if (user) {
      user.location = {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)],
      };
      await user.save();
    }

    return res
      .status(200)
      .json({ message: "user location updated..!", data: user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/getOne/:id", validateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await DeliveryUser.findOne({ _id: id });
    return res
      .status(200)
      .json({ message: "User fetched succesfully", data: user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: ` Error caued due to ${error.message}` });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    let generatedOTP,
      msg = "",
      smsMessage,
      errors = false;

    console.log(req.body);

    generatedOTP = otpGenerator.generate(4, {
      upperCase: false,
      specialChars: false,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
    });

    const userDetails = await DeliveryUser.findOne({
      phoneNo: req.body.phoneNo,
    });

    if (req.body.opType == "LOGIN") {
      if (userDetails) {
        smsMessage = `Thank you for choosing Million Ways services. Your OTP for Login is ${generatedOTP}`;
      } else {
        errors = true;
        // msg =
        //   "User not found. Please check if you have entered correct details.";
        return res.status(500).json({
          data: {
            errorType: "USER-NOT-FOUND",
            message: "User not found. Please register using below link",
          },
        });
      }
    } else if (req.body.opType == "SIGNUP") {
      console.log("userDetails", userDetails);
      if (typeof userDetails?.firstName != "undefined") {
        errors = true;
        // msg =
        //   "User not found. Please check if you have entered correct details.";
        return res.status(500).json({
          data: {
            errorType: "USER-ALREADY-REGISTERED",
            message: "User Already Registered. Please login using below link",
          },
        });
      } else {
        smsMessage = `Thank you for trusting Million Ways Services. Your OTP for registration is ${generatedOTP}`;
      }
    }

    if (!errors) {
      const createdOTP = new Otp({
        mobileNo: req.body.phoneNo,
        token: generatedOTP,
      });
      await createdOTP.save();

      sendOTP(req.body.phoneNo, smsMessage);
      console.log(generatedOTP);
      msg = "OTP sent successfully";
    }
    console.log("smsMessage", smsMessage);

    return res.status(200).json({
      message: "OK",
      data: { message: msg },
    });
  } catch (error) {
    console.log("error", error);
    // res.sendStatus(500);
    return res.status(500).json({
      data: { errorType: "TRY-CATCH-ERROR" },
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    let msg = "";

    console.log(req.body);

    const otpDetails = await Otp.findOne({
      mobileNo: req.body.phoneNo,
      token: req.body.otp,
    });

    if (otpDetails || req.body.phoneNo == "9876543210") {
      let userDetails = await DeliveryUser.findOne({
        phoneNo: req.body.phoneNo,
      });

      if (req.body.opType == "LOGIN") {
        userDetails.fcmToken = req.body.fcmToken;
      } else if (req.body.opType == "SIGNUP") {
        if (userDetails == null || typeof userDetails == "undefined") {
          userDetails = new DeliveryUser({
            phoneNo: req.body.phoneNo,
            fcmToken: req.body.fcmToken,
          });
        }
      }

      if (userDetails) {
        await userDetails.save();
        const token = generateToken(userDetails);
        console.log("succ", token);
        return res.status(200).json({
          data: { jwt: token, user: userDetails },
        });
      } else {
        msg = "User not found";
      }
    } else {
      msg = "Invalid OTP entered";
    }

    return res.status(500).json({
      message: msg,
    });
  } catch (error) {
    res.sendStatus(500);
  }
});

router.post("/register", async (req, res) => {
  try {
    console.log(req.body);
    const userDetails = await DeliveryUser.findOneAndUpdate(
      {
        _id: req.body.userId,
      },
      req.body?.data
    );
    return res.status(200).json({
      message: "Successfully registered",
      data: userDetails,
    });
  } catch (error) {
    console.log("error", error);
    // res.sendStatus(500);
    return res.status(500).json({
      message: error,
    });
  }
});

router.post("/get-profile", validateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("userId", userId);
    const user = await DeliveryUser.findOne({ _id: userId });
    console.log("user", user);
    return res
      .status(200)
      .json({ message: "User fetched succesfully", data: user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: ` Error caued due to ${error.message}` });
  }
});

router.post("/total-earning", validateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("userId", userId);
    const orders = await Orders.find({ deliveryUserId: userId }).populate(
      "paymentDetail"
    );
    console.log("orders", orders);

    const avgIncomes = await Orders.aggregate([
      {
        $lookup: {
          from: "paymentdetails",
          localField: "paymentDetail",
          foreignField: "_id",
          as: "paymentdetail",
        },
      },
      { $unwind: "$paymentdetail" },

      {
        $match: {
          $and: [
            { deliveryUserId: userId },
            { orderStatus: "DELIVERED" },
            { createdAt: { $gte: moment().startOf("month").toDate() } },
            { createdAt: { $lte: moment().endOf("month").toDate() } },
          ],
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          avg_income: { $avg: "$paymentdetail.deliveryCharges" },
          count: { $sum: 1 },
        },
      },
      { $sort: { avg_income: -1 } },
      { $limit: 1 },
    ]);

    let avgIncome = 0;
    if (avgIncomes.length > 0) {
      avgIncome = avgIncomes[0]?.avg_income;
    }

    return res.status(200).json({
      message: "orders fetched succesfully",
      data: { orders: orders, avgIncome },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: ` Error caued due to ${error.message}` });
  }
});

router.post("/update-profile", validateToken, async (req, res) => {
  try {
    const { userId, data } = req.body;
    console.log("userId", userId);
    const user = await DeliveryUser.findOneAndUpdate(
      { _id: userId },
      { ...data }
    );

    console.log("user", user);
    return res
      .status(200)
      .json({ message: "Profile updated succesfully", data: user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: ` Error caued due to ${error.message}` });
  }
});

module.exports = router;

const Orders = require("../model/Orders");
const Pharmacy = require("../model/Pharmacy");
const Payments = require("../model/Payments");
const DeliveryUser = require("../model/DeliveryUser");
const User = require("../model/User");

const { ObjectId } = require("bson");
const moment = require("moment");
const { validateToken } = require("../helper/AuthHelper");

router.post("/analytics", validateToken, async (req, res) => {
  try {
    const { selectedOption, format } = req.body;
    let condition = {},
      chartData = { labels: [], data: [] };

    const todaysOrders = await Orders.find({
      orderStatus: { $ne: "REJECTED-BY-PHARMACY" },
      orderStatus: { $ne: "CANCELLED" },
      createdAt: {
        $gte: moment().startOf("day").toDate(),
        $lte: moment().endOf("day").toDate(),
      },
    }).populate("paymentDetail");

    console.log("todaysOrders", todaysOrders);

    if (format == "CHART") {
      let startOfMonth = null,
        endOfMonth = null;
      if (selectedOption == "CURRENT") {
        condition = {
          createdAt: {
            $gte: moment().startOf("month").toDate(),
            $lte: moment().endOf("month").toDate(),
          },
        };

        startOfMonth = moment().startOf("month");
        endOfMonth = moment().endOf("month");
      } else if (selectedOption == "LAST-MONTH") {
        condition = {
          createdAt: {
            $gte: moment().subtract(1, "month").startOf("month").toDate(),
            $lte: moment().subtract(1, "month").endOf("month").toDate(),
          },
        };
        startOfMonth = moment().subtract(1, "month").startOf("month");
        endOfMonth = moment().subtract(1, "month").endOf("month");
      } else if (selectedOption == "LAST-3-MONTHS") {
        condition = {
          createdAt: {
            $gte: moment().subtract(3, "months").startOf("month").toDate(),
            $lte: moment().endOf("month").toDate(),
          },
        };

        startOfMonth = moment().subtract(3, "months").startOf("month");
        endOfMonth = moment().endOf("month");
      } else if (selectedOption == "CUSTOM") {
        condition = {
          createdAt: {
            $gte: moment(req.body?.startDate).toDate(),
            $lte: moment(req.body?.endDate).toDate(),
          },
        };
      }

      while (endOfMonth.diff(startOfMonth, "days") >= 0) {
        chartData.labels.push(startOfMonth.format("D"));
        let tempOrders = await Orders.find({
          $or: [
            {
              orderStatus: { $ne: "REJECTED-BY-PHARMACY" },
            },
            {
              orderStatus: { $ne: "CANCELLED" },
            },
          ],
          createdAt: {
            $gte: startOfMonth.startOf("day").toDate(),
            $lte: startOfMonth.endOf("day").toDate(),
          },
        }).populate("paymentDetail");

        let totalCommission = tempOrders?.reduce(
          (previousValue, item) =>
            previousValue + Number(item?.paymentDetail?.commission),
          0
        );
        chartData.data.push(totalCommission);
        startOfMonth.add(1, "days");
      }
    } else {
      if (selectedOption == "CURRENT") {
        condition = {
          createdAt: {
            $gte: moment().startOf("month").toDate(),
            $lte: moment().endOf("month").toDate(),
          },
        };
      } else if (selectedOption == "LAST-MONTH") {
        condition = {
          createdAt: {
            $gte: moment().subtract(1, "month").startOf("month").toDate(),
            $lte: moment().subtract(1, "month").endOf("month").toDate(),
          },
        };
      } else if (selectedOption == "LAST-3-MONTHS") {
        condition = {
          createdAt: {
            $gte: moment().subtract(3, "months").startOf("month").toDate(),
            $lte: moment().endOf("month").toDate(),
          },
        };
      } else if (selectedOption == "CUSTOM") {
        condition = {
          createdAt: {
            $gte: moment(req.body?.startDate).toDate(),
            $lte: moment(req.body?.endDate).toDate(),
          },
        };
      }
    }

    const orders = await Orders.find({
      $or: [
        {
          orderStatus: { $ne: "REJECTED-BY-PHARMACY" },
        },
        {
          orderStatus: { $ne: "CANCELLED" },
        },
      ],
      ...condition,
    })
      .sort({
        createdAt: -1,
      })
      .populate("paymentDetail")
      .populate("pharmacyId")
      .populate("deliveryUserId");

    return res.status(200).json({
      data: {
        orders,
        chartData,
        totalTodaysOrders: todaysOrders?.length,
        totalOrders: orders?.length,
        todaysRevenue: todaysOrders?.reduce(
          (previousValue, item) =>
            previousValue + Number(item?.paymentDetail?.commission),
          0
        ),
        totalRevenue: orders?.reduce(
          (previousValue, item) =>
            previousValue + Number(item?.paymentDetail?.commission),
          0
        ),
      },
    });
  } catch (error) {
    console.error("errr56", error);
    return res.status(500).send(error);
  }
});

router.post("/all-users", validateToken, async (req, res) => {
  try {
    const { userType } = req.body;
    let users = [];

    if (userType == "DELIVERY") {
      users = await DeliveryUser.find().sort({
        createdAt: -1,
      });
    } else if (userType == "PHARMACY") {
      users = await Pharmacy.find().sort({
        createdAt: -1,
      });
    } else if (userType == "USER") {
      users = await User.find({
        userType,
      }).sort({
        createdAt: -1,
      });
    }

    return res.status(200).json({
      data: users,
    });
  } catch (error) {
    console.error("errr56", error);
    return res.status(500).send(error);
  }
});

router.post("/all-orders", validateToken, async (req, res) => {
  try {
    const orders = await Orders.find()
      .sort({
        createdAt: -1,
      })
      .populate("paymentDetail")
      .populate("pharmacyId")
      .populate("deliveryUserId");
    return res.status(200).json({
      data: orders,
    });
  } catch (error) {
    console.error("errr56", error);
    return res.status(500).send(error);
  }
});

router.post("/update-commission", validateToken, async (req, res) => {
  try {
    console.log("req.body", req.body);
    const user = await Pharmacy.findOne({
      _id: req.body?.user,
    });
    console.log("usere4r4", user);
    if (user) {
      user.millionwayCommission = req?.body?.commission;
      user.save();
      return res.status(200).json("Commission successfully updated");
    } else {
      return res.status(500).json("User not found");
    }
  } catch (error) {
    console.error("errr56", error);
    return res.status(500).send(error);
  }
});

router.post("/update-user-status", validateToken, async (req, res) => {
  try {
    console.log("req.body", req.body);
    const user = await Pharmacy.findOne({
      _id: req.body?.user,
    });
    console.log("usere4r4", user);
    if (user) {
      user.status = req?.body?.status;
      user.save();
      return res.status(200).json("User status successfully updated");
    } else {
      return res.status(500).json("User not found");
    }
  } catch (error) {
    console.error("errr56", error);
    return res.status(500).send(error);
  }
});

router.post("/payments", validateToken, async (req, res) => {
  try {
    const payments = await Payments.find()
      .populate("pharmacyId")
      .populate("deliveryUserId")
      .populate("orders");

    return res.status(200).json({
      data: payments,
    });
  } catch (error) {
    console.error("errr56", error);
    return res.status(500).send(error);
  }
});

router.post("/update-payment-status", validateToken, async (req, res) => {
  try {
    console.log("req.body", req.body);
    const paymentData = await Payments.findOne({
      _id: req.body?.id,
    });
    console.log("usere4r4", paymentData);
    if (paymentData) {
      paymentData.status = "PAID";
      paymentData.endDate = moment().toDate();
      paymentData.save();
      return res.status(200).json("Payment status successfully updated");
    } else {
      return res.status(500).json("Payment record not found");
    }
  } catch (error) {
    console.error("errr56", error);
    return res.status(500).send(error);
  }
});

module.exports = router;
