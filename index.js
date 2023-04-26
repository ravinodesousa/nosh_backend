require("dotenv").config();
const express = require("express");
const expressListRoutes = require("express-list-routes");
const cors = require("cors");
const mongoose = require("mongoose");

// const orderRoute = require("./routes/orders");

const PORT = process.env.PORT || 8000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
  })
);

// routes
// app.use("/order", orderRoute);
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
