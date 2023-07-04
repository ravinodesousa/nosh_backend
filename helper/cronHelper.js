var cron = require("node-cron");
const moment = require("moment");
const Order = require("../model/Order");
const { rejectCancelOrder } = require("../routes/order");

// check all orders and reject them after 15min
module.exports.task = cron.schedule(
  //   "* * * * *",
  "* 8-18 * * *",
  async () => {
    console.log("running a task every minute");
    const orders = await Order.find({
      orderStatus: "PENDING",
      createdAt: {
        $lte: moment().subtract(15, "minutes").toDate(),
      },
    })
      .populate("userId")
      .populate("canteenId")
      .sort({ createdAt: -1 });

    for (const order of orders) {
      console.log("order", order);
      rejectCancelOrder(order, "REJECTED");
    }

    console.log("orders", orders);
  },
  {
    scheduled: false,
  }
);
