require("dotenv").config();
const express = require("express");
const expressListRoutes = require("express-list-routes");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cron = require("./helper/cronHelper");

const authRoute = require("./routes/auth");
const productRoute = require("./routes/items");
const orderRoute = require("./routes/order");
const notificationRoute = require("./routes/notification");
const categoryRoute = require("./routes/category");

const PORT = process.env.PORT || 8000;
const app = express();

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
  })
);

// routes
app.use("/user", authRoute);
app.use("/product", productRoute);
app.use("/order", orderRoute);
app.use("/notification", notificationRoute);
app.use("/category", categoryRoute);

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("connect to databse successful");
  })
  .catch((err) => {
    console.log(err);
  });

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

cron.task.start();

expressListRoutes(app);
