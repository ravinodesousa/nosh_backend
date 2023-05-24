const router = require("express").Router();
const Institution = require("../model/Institution");
const Otp = require("../model/Otp");
const User = require("../model/User");

router.get("/get-institutions", async (req, res) => {
  try {
    console.log("api called");
    let allInstitutions = await Institution.find({
      is_active: true,
    });

    return res.status(200).json(allInstitutions);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

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

router.post("/signup", async (req, res) => {
  try {
    console.log(req.body);

    const user = await User.findOne({
      email: req.body.email,
    });

    if (user) {
      let errorMsg = "";
      if (user?.email == req.body.email) {
        errorMsg = "Email already used by another user";
      } else if (user?.mobileNo == req.body.mobileNo) {
        errorMsg = "Mobile No already used by another user";
      }
      return res.status(500).json({ message: errorMsg });
    } else {
      const savedUser = new User({
        username: req.body.name,
        email: req.body.email,
        password: req.body.password,
        institution: req.body.institution,
        userType: req.body.userType,
        mobileNo: req.body.mobileNo,
        canteenName: req.body.canteenName,
      });
      await savedUser.save();

      return res.status(200).json(savedUser);
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    console.log(req.body);

    const user = await User.findOne({
      email: req.body.email,
    });

    if (user) {
      const createdOTP = new Otp({
        otp: req.body.otp,
        email: req.body.email,
        type: req.body.type,
      });

      await createdOTP.save();

      if (createdOTP) {
        // todo: send otp to mobileno

        return res.status(200).json({
          message: "OTP successfully sent to Mobile number: " + user?.mobileNo,
        });
      } else {
        return res.status(500).json({ message: "Failed to send OTP" });
      }
    } else {
      return res.status(500).json({ message: "User not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    console.log(req.body);

    const user = await User.findOne({
      email: req.body.email,
    });

    if (user) {
      const foundOTP = await Otp.findOne({
        otp: req.body.otp,
      }).sort({ _id: -1 });

      if (foundOTP) {
        // todo: check expiry
        if (foundOTP?.type == "SIGNUP") {
          user.userStatus = "ACCEPTED";
          user.isMobileNoConfirmed = true;
          await user.save();
        }

        return res.status(200).json({ message: "Mobile no verified" });
      } else {
        return res.status(500).json({ message: "OTP not found" });
      }
    } else {
      return res.status(500).json({ message: "User not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    console.log(req.body);

    const user = await User.findOne({
      email: req.body.email,
    });

    if (user) {
      user.password = req.body.password;
      await user.save();

      return res.status(200).json({ message: "Password successfully updated" });
    } else {
      return res.status(500).json({ message: "User not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

router.post("/users", async (req, res) => {
  try {
    console.log("req123", req.body);
    let query = {
      userType: req.body.userType,
      userStatus: "ACCEPTED",
    };

    if (req.body?.institution) {
      query = { ...query, institution: req.body?.institution };
    }

    let allUsers = await User.find(query);
    console.log("allUsers", allUsers, query);
    return res.status(200).json(allUsers);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Auth request failed. Please try again." });
  }
});

module.exports = router;
