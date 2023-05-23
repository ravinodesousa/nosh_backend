const multer = require("multer");
const path = require("path");
console.log("path.basename", path);
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    console.log("filename1234", file);
    let filename = file.originalname.split(".");
    console.log("filename123", filename);
    cb(
      null,
      filename[0] + "_" + new Date().getTime().toString() + "_" + filename[1]
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype == "image/jpeg" ||
    file.mimetype == "image/jpg" ||
    file.mimetype == "image/png"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  // limits: {
  //   fileSize: 1024 * 1024 * 6,
  // },
  fileFilter: fileFilter,
});

module.exports = upload;
