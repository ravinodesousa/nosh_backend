const otpGenerator = require("otp-generator");
const router = require("express").Router();
const CartItem = require("../model/CartItem");
const Institution = require("../model/Institution");
const Otp = require("../model/Otp");
const User = require("../model/User");
const TokenHistory = require("../model/TokenHistory");
const PaymentHistory = require("../model/PaymentHistory");
const Order = require("../model/Order");

router.get("/get-institutions", async (req, res) => {
  try {
    console.log("api called");
    let allInstitutions = await Institution.find({
      is_active: true,
    });

    return res.status(200).json(allInstitutions);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  try {
    console.log(req.body);

    const user = await User.findOne({
      email: req.body.email,
      password: req.body.password,
    }).populate("institution");
    if (user) {
      user.fcmToken = req.body.fcmToken;
      await user.save();
      return res.status(200).json(user);
    } else {
      return res.status(500).json({ message: "User not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/signup", async (req, res) => {
  try {
    console.log(req.body);

    const user = await User.findOne({
      email: req.body.email,
    });

    if (user) {
      let errorMsg = "";
      if (user?.email == req.body.email) {
        errorMsg = "Email already used by another user";
      } else if (user?.mobileNo == req.body.mobileNo) {
        errorMsg = "Mobile No already used by another user";
      }
      return res.status(500).json({ message: errorMsg });
    } else {
      const savedUser = new User({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        institution: req.body.institution,
        userType: req.body.userType,
        mobileNo: req.body.mobileNo,
        canteenName: req.body.canteenName,
        userStatus: "ACCEPTED", //todo: canteen should be set to pending and admin should approve it manually
      });
      await savedUser.save();

      return res.status(200).json(savedUser);
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    console.log(req.body);

    const user = await User.findOne({
      mobileNo: req.body.mobileNo,
    });

    if (user) {
      let generatedOTP = otpGenerator.generate(5, {
        upperCaseAlphabets: false,
        specialChars: false,
        lowerCaseAlphabets: false,
        digits: true,
      });

      const createdOTP = new Otp({
        token: generatedOTP,
        mobileNo: req.body?.mobileNo ?? "",
        type: req.body.type,
      });

      await createdOTP.save();

      if (createdOTP) {
        // todo: send otp to mobileno
        console.log("generatedOTP", generatedOTP);

        return res.status(200).json({
          message: "OTP successfully sent to Mobile number: " + user?.mobileNo,
        });
      } else {
        return res.status(500).json({ message: "Failed to send OTP" });
      }
    } else {
      return res.status(500).json({ message: "User not found" });
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    console.log(req.body);

    const foundOTP = await Otp.findOne({
      token: req.body.otp,
      mobileNo: req.body.mobileNo,
      type: req.body.type,
    }).sort({ _id: -1 });

    if (foundOTP) {
      if (foundOTP?.type == "SIGNUP") {
        const user = await User.findOne({
          mobileNo: req.body.mobileNo,
        });
        if (user) {
          user.userStatus = "ACCEPTED";
          user.isMobileNoConfirmed = true;
          await user.save();

          return res.status(200).json({ message: "Mobile no verified" });
        } else {
          return res.status(500).json({ message: "User not found" });
        }
      } else {
        return res.status(200).json({ message: "OTP successfully verified" });
      }
    } else {
      return res
        .status(500)
        .json({ message: "Invalid OTP. Please try again." });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    console.log(req.body);

    const user = await User.findOne({
      mobileNo: req.body.mobileNo,
    });

    if (user) {
      user.password = req.body.password;
      await user.save();

      return res.status(200).json({ message: "Password successfully updated" });
    } else {
      return res.status(500).json({ message: "User not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

router.post("/users", async (req, res) => {
  try {
    console.log("req123", req.body);
    let query = {
      userType: req.body.userType,
    };

    if (!req.body?.fetchInactiveUsers) {
      query = { ...query, userStatus: "ACCEPTED" };
    }

    if (req.body?.institution) {
      query = { ...query, institution: req.body?.institution };
    }

    let allUsers = await User.find(query).populate("institution");

    console.log("allUsers", allUsers, query);
    return res.status(200).json(allUsers);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/user-details", async (req, res) => {
  try {
    console.log("req123", req.body);
    let query = {
      _id: req.body.userId,
    };

    let user = await User.findOne(query).populate("institution");
    console.log("user", user, query);
    if (user) {
      return res.status(200).json(user);
    } else {
      return res.status(500).json({ message: "User doesn't exist" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/update-status", async (req, res) => {
  try {
    console.log("req123", req.body);
    let query = {
      _id: req.body.id,
    };

    let user = await User.findOne(query);
    console.log("user", user, query);
    if (user) {
      user.userStatus = req.body.status;
      await user.save();

      return res.status(200).json(user);
    } else {
      return res.status(500).json({ message: "User doesn't exist" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

router.post("/add-to-cart", async (req, res) => {
  try {
    console.log("req123", req.body);
    let query = {
      user: req.body.userId,
      product: req.body.id,
    };

    let cartItem = await CartItem.findOne(query);
    if (cartItem) {
      cartItem.quantity = cartItem.quantity + req.body.quantity;
      await cartItem.save();
    } else {
      let newCartItem = new CartItem();
      newCartItem.product = req.body.id;
      newCartItem.user = req.body.userId;
      newCartItem.quantity = req.body.quantity;
      await newCartItem.save();
    }

    return res.status(200).json({ message: "Successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/delete-from-cart", async (req, res) => {
  try {
    console.log("req123", req.body);
    let query = {
      _id: req.body.id,
    };

    let cartItem = await CartItem.findOne(query);
    if (cartItem) {
      await cartItem.delete();
    } else {
      return res.status(500).json({ message: "Cart item not found" });
    }

    return res.status(200).json({ message: "Successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/change-cart-quantity", async (req, res) => {
  try {
    console.log("req123", req.body);
    let query = {
      _id: req.body.id,
    };

    let cartItem = await CartItem.findOne(query);
    if (cartItem) {
      if (req.body.action == "INCREMENT" && cartItem.quantity < 20) {
        cartItem.quantity = cartItem.quantity + 1;
      } else if (req.body.action == "DECREMENT" && cartItem.quantity > 1) {
        cartItem.quantity = cartItem.quantity - 1;
      }
      await cartItem.save();
    } else {
      return res.status(500).json({ message: "Cart item not found" });
    }

    return res.status(200).json({ message: "Successfully" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/cart-items", async (req, res) => {
  try {
    console.log("req123", req.body);
    let query = {
      user: req.body.userId,
    };

    const cartItems = await CartItem.find(query).populate("product");
    console.log("cartItems", cartItems);
    return res.status(200).json(cartItems);
  } catch (error) {
    console.log("err", error);
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/token-history", async (req, res) => {
  try {
    console.log("req1234rfs", req.body);

    let user = await User.findOne({
      _id: req.body?.userId,
    });
    if (user) {
      let token_history = await TokenHistory.find({
        user: req.body?.userId,
      })
        .populate("paymentDetails")
        .sort({ _id: -1 });

      let data = {
        balance: user.tokenBalance,
        token_history,
      };

      console.log(data);

      return res.status(200).json(data);
    } else {
      return res.status(500).json({ message: "User not found" });
    }
  } catch (error) {
    console.log("err", error);
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/add-tokens", async (req, res) => {
  try {
    console.log("req123", req.body);

    let user = await User.findOne({
      _id: req.body?.userId,
    });
    if (user) {
      let payment_history = new PaymentHistory();
      payment_history.transactionID = req.body?.txnId;
      payment_history.date = new Date();
      payment_history.amount = req.body?.amount;
      await payment_history.save();

      let token_history = new TokenHistory();
      token_history.user = req.body?.userId;
      token_history.balance_included = req.body?.amount;
      token_history.paymentDetails = payment_history?.id;
      await token_history.save();

      user.tokenBalance = user.tokenBalance + Number(req.body?.amount);
      await user.save();

      return res.status(200).json(token_history);
    } else {
      return res.status(500).json({ message: "User not found" });
    }
  } catch (error) {
    console.log("err", error);
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/dashboard", async (req, res) => {
  try {
    console.log("req1233", req.body);

    // "Total Orders";
    // "Total Order Amount",
    // "Total Revenue Earned";
    // "Total Users",
    // "Total Canteens",

    let totalOrders = 0;
    let totalOrderAmount = 0;
    let totalRevenueEarned = 0;
    let totalUsers = 0;
    let totalCanteens = 0;

    if (req.body?.userType == "ADMIN") {
      let query = {};
      if (req.body?.startDate && req.body?.endDate) {
        let startDateArr = String(req.body?.startDate).split(" ");
        let endDateArr = String(req.body?.endDate).split(" ");

        query = {
          ...query,
          createdAt: { $gte: startDateArr[0] },
          createdAt: { $lte: endDateArr[0] },
        };
      }

      let allOrders = await Order.find(query);

      totalOrders = allOrders.length;

      totalOrderAmount = allOrders.reduce((amount, order) => {
        return Number(order.totalAmount) + amount;
      }, 0);

      totalRevenueEarned = allOrders.reduce((amount, order) => {
        return (order.amountEarnedByNosh ?? 0) + amount;
      }, 0);

      totalUsers = await User.count({ userType: "USER" });
      totalCanteens = await User.count({ userType: "CANTEEN" });
    } else if (req.body?.userType == "CANTEEN") {
      let query = {
        canteenId: req.body?.userId,
      };

      if (req.body?.startDate && req.body?.endDate) {
        let startDateArr = String(req.body?.startDate).split(" ");
        let endDateArr = String(req.body?.endDate).split(" ");

        query = {
          ...query,
          createdAt: { $gte: startDateArr[0] },
          createdAt: { $lte: endDateArr[0] },
        };
      }

      let allOrders = await Order.find(query);

      totalOrders = allOrders.length;

      totalOrderAmount = allOrders.reduce((amount, order) => {
        return Number(order.totalAmount) + amount;
      }, 0);

      totalRevenueEarned = allOrders.reduce((amount, order) => {
        return (order.amountEarnedByCanteen ?? 0) + amount;
      }, 0);
    }

    console.log(
      totalOrders,
      totalOrderAmount,
      totalRevenueEarned,
      totalUsers,
      totalCanteens
    );
    return res.status(200).json({
      totalOrders,
      totalOrderAmount,
      totalRevenueEarned,
      totalUsers,
      totalCanteens,
    });
  } catch (error) {
    console.log("err", error);
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

module.exports = router;
