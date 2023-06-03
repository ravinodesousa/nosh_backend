const Order = require("../model/Order");
const PaymentHistory = require("../model/PaymentHistory");
const User = require("../model/User");

const router = require("express").Router();

router.post("/place-order", async (req, res) => {
  try {
    console.log(req.body);

    let totalOrderCount = await Order.count();

    const order = new Order();
    order.orderId = "ORDER-" + (totalOrderCount + 1);
    order.userId = req.body.userId;
    order.canteenId = req.body.canteenId;
    order.orderStatus = "PENDING";
    order.paymentMode = req.body.paymentMode;
    order.timeSlot = req.body.timeslot;
    order.totalAmount = req.body.totalAmount;

    req.body.cartItems?.forEach((item) => {
      order.products.push({
        product: item?.productId,
        quantity: item?.quantity,
      });
    });

    if (req.body.paymentMode == "ONLINE") {
      const paymentDetails = new PaymentHistory();
      paymentDetails.transactionID = req.body?.txnId;
      paymentDetails.date = new Date();
      paymentDetails.amount = req.body?.totalAmount;
      await paymentDetails.save();

      order.paymentDetails = paymentDetails.id;
    } else if (req.body.paymentMode == "TOKEN") {
      const user = await User.findOne({ _id: req.body.userId });
      if (user) {
        if (user.tokenBalance > Number(req.body?.totalAmount)) {
          user.tokenBalance = user.tokenBalance - Number(req.body?.totalAmount);
          await user.save();
        } else {
          return res.status(500).json({
            message:
              "You don't have enough tokens to place order. Use different mode of payment.",
          });
        }
      } else {
        return res
          .status(500)
          .json({ message: "User not found. Please try again" });
      }
    }

    await order.save();

    // todo: clear cart items
    return res.status(200).json({ message: "Order successfully placed" });
    // }
  } catch (error) {
    console.log("err", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

router.post("/my-orders", async (req, res) => {
  try {
    console.log(req.body);
    let query = {};
    if (req.body?.userType == "CANTEEN") {
      query = { ...query, canteenId: req.body?.userId };
    } else if (req.body?.userType == "USER") {
      query = { ...query, userId: req.body?.userId };
    }

    const orders = await Order.find(query)
      .populate("products.product")
      .populate("userId")
      .populate("canteenId");
    console.log("orders", JSON.stringify(orders));

    return res.status(200).json(orders);
    // }
  } catch (error) {
    console.log("err", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

router.post("/update-order-status", async (req, res) => {
  try {
    console.log("req123", req.body);
    // console.log("req.file.path", req.file);

    let order = await Order.findOne({ _id: req.body?.id });
    order.orderStatus = req.body?.status;

    await order.save();

    return res.status(200).json(order);
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

module.exports = router;
