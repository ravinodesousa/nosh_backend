const Notification = require("../model/Notification");
const { sendNotification } = require("../helper/FcmHelper");
const Order = require("../model/Order");
const Payment = require("../model/Payment");
const PaymentHistory = require("../model/PaymentHistory");
const Product = require("../model/Product");
const User = require("../model/User");
const CartItem = require("../model/CartItem");
const moment = require("moment");
const router = require("express").Router();
const fcmHelper = require("../helper/FcmHelper");

/* 
  params - 
    1] userId - user placing order
    2] canteenId - id of canteen to which items belong to
    3] paymentMode - COD, TOKEN, ONLINE
    4] timeslot - selected timeslot 
    5] totalAmount - total order amount
    6] cartItems - array of item objects which contains productId and quantity

  result - Returns a success or error message with an orderId if order is placed succssfully
*/
router.post("/place-order", async (req, res) => {
  try {
    // console.log(req.body);

    let totalOrderCount = await Order.count();
    const user = await User.findOne({ _id: req.body.userId });

    const order = new Order();
    order.orderId = "ORDER-" + (totalOrderCount + 1);
    order.userId = req.body.userId;
    order.canteenId = req.body.canteenId;
    order.orderStatus = "PENDING";
    order.paymentMode = req.body.paymentMode;
    order.timeSlot = req.body.timeslot;
    order.totalAmount = req.body.totalAmount;
    order.commissionPercentage = process.env.NOSH_COMMISSION;
    order.amountEarnedByNosh =
      (Number(req.body?.totalAmount) * process.env.NOSH_COMMISSION) / 100;
    order.amountEarnedByCanteen =
      Number(req.body?.totalAmount) -
      (Number(req.body?.totalAmount) * process.env.NOSH_COMMISSION) / 100;

    for (const item of req.body.cartItems) {
      order.products.push({
        product: item?.productId,
        quantity: item?.quantity,
      });

      let product = await Product.findOne({ _id: item?.productId });
      console.log("product", product);
      console.log("item", item);
      if (product) {
        product.total_orders = (product.total_orders ?? 0) + item.quantity;
        await product.save();
      }
    }

    if (req.body.paymentMode == "ONLINE") {
      const paymentDetails = new PaymentHistory();
      paymentDetails.transactionID = req.body?.txnId;
      paymentDetails.date = new Date();
      paymentDetails.amount = req.body?.totalAmount;
      await paymentDetails.save();

      order.paymentDetails = paymentDetails.id;
      order.paymentStatus = true;
    } else if (req.body.paymentMode == "TOKEN") {
      if (user) {
        if (user.tokenBalance > Number(req.body?.totalAmount)) {
          user.tokenBalance = user.tokenBalance - Number(req.body?.totalAmount);
          order.paymentStatus = true;
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

    let paymentRecord = await Payment.findOne({
      canteenId: req.body.canteenId,
      endDate: null,
      type: req.body.paymentMode == "COD" ? "ADMIN" : "CANTEEN",
    });

    if (paymentRecord) {
      if (req.body.paymentMode == "COD") {
        paymentRecord.totalAmount =
          Number(paymentRecord.totalAmount) +
          (Number(req.body?.totalAmount) * process.env.NOSH_COMMISSION) / 100;
      } else {
        paymentRecord.totalAmount =
          Number(paymentRecord.totalAmount) +
          (Number(req.body?.totalAmount) -
            (Number(req.body?.totalAmount) * process.env.NOSH_COMMISSION) /
              100);
      }

      paymentRecord.orders?.push(order?.id);

      await paymentRecord.save();
    } else {
      let newPaymentRecord = new Payment();
      newPaymentRecord.startDate = new Date();
      newPaymentRecord.orders?.push(order?.id);
      newPaymentRecord.canteenId = req.body.canteenId;
      newPaymentRecord.type =
        req.body.paymentMode == "COD" ? "ADMIN" : "CANTEEN";
      if (req.body.paymentMode == "COD") {
        newPaymentRecord.totalAmount =
          (Number(req.body?.totalAmount) * process.env.NOSH_COMMISSION) / 100;
      } else {
        newPaymentRecord.totalAmount =
          Number(req.body?.totalAmount) -
          (Number(req.body?.totalAmount) * process.env.NOSH_COMMISSION) / 100;
      }

      await newPaymentRecord.save();
    }

    // clear cart items
    for (const item of req.body.cartItems) {
      await CartItem.deleteOne({ _id: item?.id });
    }

    let canteenUser = await User.findOne({ _id: req.body?.canteenId });
    // console.log("canteenUser", canteenUser);
    if (canteenUser && canteenUser?.fcmToken) {
      const title = "New Order Placed";
      const message = `A new order: ${order?.orderId} is successfully placed. Please review it.`;

      sendNotification(canteenUser?.fcmToken, title, message, {
        data: JSON.stringify({ id: order?._id, type: "ORDER-PLACED" }),
      });

      await Notification.create({
        date: new Date(),
        message: message,
        type: "ORDER-PLACED",
        title: title,
        user: canteenUser?._id,
      });
    }
    return res
      .status(200)
      .json({ message: "Order successfully placed", id: order?._id });
    // }
  } catch (error) {
    console.log("err", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] userType - CANTEEN, USER, ADMIN
    2] userId
    3] orderStatus

  result - Returns an array or order objects
*/
router.post("/my-orders", async (req, res) => {
  try {
    // console.log(req.body);
    let query = {};
    if (req.body?.userType == "CANTEEN") {
      query = { ...query, canteenId: req.body?.userId };
    } else if (req.body?.userType == "USER") {
      query = { ...query, userId: req.body?.userId };
    }

    if (req.body?.orderStatus && req.body?.orderStatus != "ALL") {
      query = { ...query, orderStatus: req.body?.orderStatus };
    }

    const orders = await Order.find(query)
      .populate("products.product")
      .populate("userId")
      .populate("canteenId")
      .sort({ createdAt: -1 });
    // console.log("orders", JSON.stringify(orders));

    return res.status(200).json(orders);
    // }
  } catch (error) {
    // console.log("err", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] id - orderId
    2] status - new status of order

  result - Returns an order object if successful or error message if failed
*/
router.post("/update-order-status", async (req, res) => {
  try {
    // console.log("req123", req.body);

    let order = await Order.findOne({ _id: req.body?.id })
      .populate("userId")
      .populate("canteenId");

    if (req.body?.status == "CANCELED" || req.body?.status == "REJECTED") {
      if (order?.orderStatus == "PENDING") {
        rejectCancelOrderHandler(order, req.body?.status);
      } else {
        return res
          .status(500)
          .json({ message: "Failed to change order status." });
      }
    } else {
      if (order?.orderStatus != "PENDING" && req.body?.status == "ACCEPTED") {
        return res
          .status(500)
          .json({ message: "Failed to change order status." });
      }

      order.orderStatus = req.body?.status;

      await order.save();

      let user = await User.findOne({ _id: order?.userId });
      let title = "";
      let description = "";

      if (req.body?.status == "ACCEPTED") {
        title = "Order Accepted";
        description = `Order: ${order?.orderId} is successfully accepted by canteen.`;
      } else if (req.body?.status == "READY") {
        title = "Order Ready";
        description = `Order: ${order?.orderId} is ready. Please collect it from the canteen.`;
      } else if (req.body?.status == "DELIVERED") {
        title = "Order Delivered";
        description = `Order: ${order?.orderId} successfully delivered. Hope you liked our service.`;
      }

      console.log("user", user);
      console.log("user?.fcmToken", user?.fcmToken);
      if (user && user?.fcmToken) {
        await Notification.create({
          date: new Date(),
          message: description,
          type:
            req.body?.status == "ACCEPTED"
              ? "ORDER-ACCEPTED"
              : req.body?.status == "READY"
              ? "ORDER-READY"
              : "ORDER-DELIVERED",
          title: title,
          user: user?._id,
        });

        sendNotification(user?.fcmToken, title, description, {
          data: JSON.stringify({
            id: order?._id,
            type:
              req.body?.status == "ACCEPTED"
                ? "ORDER-ACCEPTED"
                : req.body?.status == "READY"
                ? "ORDER-READY"
                : "ORDER-DELIVERED",
          }),
        });
      }
    }
    return res.status(200).json(order);
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] orderId

  result - Returns an order object if successful or error message if not found
*/
router.post("/order-details", async (req, res) => {
  try {
    // console.log("req123", req.body);

    let order = await Order.findOne({ _id: req.body?.orderId })
      .populate("products.product")
      .populate("userId")
      .populate("canteenId");

    if (order) {
      return res.status(200).json(order);
    } else {
      return res.status(500).json({ message: "Order not found" });
    }
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] date - date range

  result - Returns an object with total commission and commission earned by NOSH w.r.t each canteen
*/
router.post("/commission", async (req, res) => {
  try {
    // console.log("req123", req.body);
    console.log("req.file.path", req.file);

    let query = {};

    if (req.body?.date != "null") {
      let dateArr = String(req.body?.date).split(" ");
      let startofmonth = moment(dateArr[0]).startOf("month").toDate();
      let endtofmonth = moment(dateArr[0]).endOf("month").toDate();

      // console.log(startofmonth);
      // console.log(endtofmonth);
      query = {
        ...query,
        createdAt: { $gte: startofmonth },
        createdAt: { $lte: endtofmonth },
      };
    }

    let canteens = await User.find({ userType: "CANTEEN" });
    let data = [];
    let totalCommission = 0;

    // console.log(canteens);

    for (const canteen of canteens) {
      let temp = {};
      temp["name"] = canteen.canteenName;

      let allOrders = await Order.find({ canteenId: canteen.id });

      temp["totalRevenueEarned"] = allOrders.reduce((amount, order) => {
        return (order.amountEarnedByNosh ?? 0) + amount;
      }, 0);

      totalCommission += temp["totalRevenueEarned"];

      // console.log(allOrders);
      data.push(temp);
    }

    // console.log("data", data);

    return res.status(200).json({ data, totalCommission });
  } catch (error) {
    // console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] date - date range
    2] userType - ADMIN, CANTEEN

  result - Returns an array of payment object and admin details
*/
router.post("/payments", async (req, res) => {
  try {
    // console.log("req123", req.body);
    console.log("req.body", req.body);

    let query = {};

    if (req.body?.date != "null") {
      let dateArr = String(req.body?.date).split(" ");
      let startofmonth = moment(dateArr[0]).startOf("month").toDate();
      let endtofmonth = moment(dateArr[0]).endOf("month").toDate();

      // console.log(startofmonth);
      // console.log(endtofmonth);
      query = {
        ...query,
        startDate: { $gte: startofmonth },
        endDate: { $lte: endtofmonth },
      };
    }

    if (req.body?.userType && req.body?.userType == "CANTEEN") {
      query = {
        ...query,
        type: "ADMIN",
      };
    }

    let admin = await User.findOne({ userType: "ADMIN" });

    let payments = await Payment.find(query)
      .populate("canteenId")
      .sort({ status: -1 });

    console.log("payments", payments);

    return res.status(200).json({ payments, admin: admin });
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] id - paymentId

  result - Returns a success or error message
*/
router.post("/update-payment-status", async (req, res) => {
  try {
    // console.log("req123", req.body);
    let query = {
      _id: req.body.id,
    };

    let paymentRecord = await Payment.findOne(query);
    // console.log("paymentRecord", paymentRecord, query);
    if (paymentRecord) {
      paymentRecord.status = "PAID";
      paymentRecord.endDate = new Date();

      await paymentRecord.save();

      return res.status(200).json(paymentRecord);
    } else {
      return res.status(500).json({ message: "Record doesn't exist" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

/* 
  params - 
    1] orderId - order id
    2] ratings - array of objects with rating and productId

  result - Returns a success or error message
*/
router.post("/rate-order", async (req, res) => {
  try {
    console.log(req.body);

    let order = await Order.findOne({ _id: req.body?.orderId });

    if (order) {
      for (const item of req.body?.ratings) {
        let product = await Product.findOne({
          _id: item?.id,
        });

        if (product) {
          let total_ratings =
            (product.total_ratings ?? 0) + (item?.rating ?? 0);
          let total_users_rated = (product.total_users_rated ?? 0) + 1;

          product.total_ratings = total_ratings;
          product.total_users_rated = total_users_rated;

          // console.log("total_ratings", total_ratings);
          // console.log("total_users_rated", total_users_rated);
          // console.log(
          //   "total_ratings / total_users_rated",
          //   total_ratings / total_users_rated
          // );
          product.rating = (total_ratings / total_users_rated).toFixed(1);

          await product.save();
        }
      }

      order.isRated = true;
      await order.save();

      return res.status(200).json({ message: "successful" });
    } else {
    }

    return res.status(500).json({ message: "Order not found" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

const rejectCancelOrderHandler = async (order, status) => {
  console.log("rejectCancelOrderHandler called");
  order.orderStatus = status;
  await order?.save();

  let paymentRecord = await Payment.findOne({
    canteenId: order?.canteenId,
    endDate: null,
    type: order?.paymentMode == "COD" ? "ADMIN" : "CANTEEN",
  });

  if (paymentRecord) {
    if (order?.paymentMode == "COD") {
      // payment to admin
      paymentRecord.totalAmount =
        Number(paymentRecord.totalAmount) - order?.amountEarnedByNosh;
    } else {
      paymentRecord.totalAmount =
        Number(paymentRecord.totalAmount) - order?.amountEarnedByCanteen;
    }

    paymentRecord.orders = paymentRecord.orders?.filter(
      (item) => item?.id != order?.id
    );

    await paymentRecord.save();
  } else {
    let newPaymentRecord = new Payment();
    if (order?.paymentMode == "COD") {
      // return payment to canteen
      newPaymentRecord.totalAmount = order?.amountEarnedByCanteen;
    } else {
      newPaymentRecord.totalAmount = order?.amountEarnedByNosh;
    }

    newPaymentRecord.orders?.push(order?.id);

    await newPaymentRecord.save();
  }

  const user = await User.findOne({ _id: order?.userId });
  if (user) {
    user.tokenBalance = Number(user.tokenBalance) + Number(order?.totalAmount);
    await user.save();
  }

  let message = null,
    title = null;

  if (status == "CANCELED") {
    title = "Order Canceled";
    message = `Order: ${order?.orderId} is canceled by user`;
  } else if (status == "REJECTED") {
    title = "Order Rejected";
    message = `Order: ${order?.orderId} is rejected by canteen. ${order?.totalAmount} tokens added to your balance.`;
  }

  if (message != null) {
    sendNotification(
      status == "CANCELED"
        ? order?.canteenId?.fcmToken
        : order?.userId?.fcmToken,
      title,
      message,
      {
        data: JSON.stringify({
          id: order?._id,
          type: status == "CANCELED" ? "ORDER-CANCELED" : "ORDER-REJECTED",
        }),
      }
    );

    await Notification.create({
      date: new Date(),
      message: message,
      type: status == "CANCELED" ? "ORDER-CANCELED" : "ORDER-REJECTED",
      title: title,
      user: status == "CANCELED" ? order?.canteenId?._id : order?.userId?._id,
    });
  }
  return true;
};

module.exports = router;
module.exports.rejectCancelOrder = rejectCancelOrderHandler;
