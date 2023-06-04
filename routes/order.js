const Order = require("../model/Order");
const Payment = require("../model/Payment");
const PaymentHistory = require("../model/PaymentHistory");
const User = require("../model/User");
const moment = require("moment");

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
    order.commissionPercentage = process.env.NOSH_COMMISSION;
    order.amountEarnedByNosh =
      (Number(req.body?.totalAmount) * process.env.NOSH_COMMISSION) / 100;
    order.amountEarnedByCanteen =
      Number(req.body?.totalAmount) -
      (Number(req.body?.totalAmount) * process.env.NOSH_COMMISSION) / 100;

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
      order.paymentStatus = true;
    } else if (req.body.paymentMode == "TOKEN") {
      const user = await User.findOne({ _id: req.body.userId });
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

    // todo: add record in Payment model
    let paymentRecord = await Payment.findOne({
      canteenId: req.body.canteenId,
      endDate: null,
    });

    if (paymentRecord) {
      paymentRecord.totalAmount =
        Number(paymentRecord.totalAmount) +
        (Number(req.body?.totalAmount) -
          (Number(req.body?.totalAmount) * process.env.NOSH_COMMISSION) / 100);
      paymentRecord.orders?.push(order?.id);
      await paymentRecord.save();
    } else {
      let newPaymentRecord = new Payment();
      newPaymentRecord.startDate = new Date();
      newPaymentRecord.totalAmount =
        Number(req.body?.totalAmount) -
        (Number(req.body?.totalAmount) * process.env.NOSH_COMMISSION) / 100;
      newPaymentRecord.orders?.push(order?.id);
      newPaymentRecord.canteenId = req.body.canteenId;
      await newPaymentRecord.save();
    }

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

router.post("/commission", async (req, res) => {
  try {
    console.log("req123", req.body);
    // console.log("req.file.path", req.file);

    let query = {};

    if (req.body?.date != "null") {
      let dateArr = String(req.body?.date).split(" ");
      let startofmonth = moment(dateArr[0]).startOf("month").toDate();
      let endtofmonth = moment(dateArr[0]).endOf("month").toDate();

      console.log(startofmonth);
      console.log(endtofmonth);
      query = {
        ...query,
        createdAt: { $gte: startofmonth },
        createdAt: { $lte: endtofmonth },
      };
    }

    let canteens = await User.find({ userType: "CANTEEN" });
    let data = [];
    let totalCommission = 0;

    console.log(canteens);

    for (const canteen of canteens) {
      let temp = {};
      temp["name"] = canteen.canteenName;

      let allOrders = await Order.find({ canteenId: canteen.id });

      temp["totalRevenueEarned"] = allOrders.reduce((amount, order) => {
        return (order.amountEarnedByNosh ?? 0) + amount;
      }, 0);

      totalCommission += temp["totalRevenueEarned"];

      console.log(allOrders);
      data.push(temp);
    }

    console.log("data", data);

    return res.status(200).json({ data, totalCommission });
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

router.post("/payments", async (req, res) => {
  try {
    console.log("req123", req.body);
    // console.log("req.file.path", req.file);

    let query = {};

    if (req.body?.date != "null") {
      let dateArr = String(req.body?.date).split(" ");
      let startofmonth = moment(dateArr[0]).startOf("month").toDate();
      let endtofmonth = moment(dateArr[0]).endOf("month").toDate();

      console.log(startofmonth);
      console.log(endtofmonth);
      query = {
        ...query,
        startDate: { $gte: startofmonth },
        endDate: { $lte: endtofmonth },
      };
    }

    let payments = await Payment.find(query).populate("canteenId");

    console.log("payments", payments);

    return res.status(200).json(payments);
  } catch (error) {
    console.log("Error", error);
    return res
      .status(500)
      .json({ message: "Request failed. Please try again." });
  }
});

router.post("/update-payment-status", async (req, res) => {
  try {
    console.log("req123", req.body);
    let query = {
      _id: req.body.id,
    };

    let paymentRecord = await Payment.findOne(query);
    console.log("paymentRecord", paymentRecord, query);
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

module.exports = router;
