require("dotenv").config();
const express = require("express");
const expressListRoutes = require("express-list-routes");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const authRoute = require("./routes/auth");
const productRoute = require("./routes/items");
const orderRoute = require("./routes/order");

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

expressListRoutes(app);

// remove

// function generateRandom(min = 0, max = 100) {
//   // find diff
//   let difference = max - min;

//   // generate random number
//   let rand = Math.random();

//   // multiply with difference
//   rand = Math.floor(rand * difference);

//   // add with min value
//   rand = rand + min;

//   return rand;
// }

// let nums = [];
// for (i = 0; i < 900; i = i + 2) {
//   nums.push(generateRandom(i + 8555555555, 9999999999));
// }
// console.dir(nums.sort(), { maxArrayLength: null });
