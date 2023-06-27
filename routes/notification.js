const Notification = require("../model/Notification");

const router = require("express").Router();

/* 
  params - 
    1] userId - user id
    
  result - Returns array of notification objects
*/
router.post("/", async (req, res) => {
  try {
    console.log(req.body);
    const notificationList = await Notification.find({
      user: req.body.userId,
    }).sort({ _id: -1 });

    return res.status(200).json(notificationList);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "request failed. Please try again." });
  }
});

module.exports = router;
