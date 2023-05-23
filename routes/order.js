const router = require("express").Router();

router.post("/login", async (req, res) => {
  try {
    console.log(req.body);

    const user = await User.findOne({
      email: req.body.email,
      password: req.body.password,
    });
    if (user) {
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

module.exports = router;
