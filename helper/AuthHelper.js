var jwt = require("jsonwebtoken");

module.exports.generateToken = (data) => {
  console.log("Toekn data", data);

  let token = jwt.sign(data.toJSON(), process.env.token_secret);
  return token;
};

module.exports.validateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.token_secret);
    const userId = decodedToken?._id;
    console.log("decodedToken", decodedToken);
    if (userId) {
      next();
    } else {
      throw "Invalid User";
    }
  } catch (error) {
    console.log("error", error);

    res.status(401).json({
      error: new Error("Invalid request!"),
    });
  }
};
