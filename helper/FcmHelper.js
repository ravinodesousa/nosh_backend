var admin = require("firebase-admin");
var fcm = require("fcm-notification");
var serviceAccount = require("../config/firebase.json");
const certPath = admin.credential.cert(serviceAccount);
var FCM = new fcm(certPath);

module.exports.sendNotification = (fcm_token, title, body, data) => {
  try {
    let message = {
      android: {
        notification: {
          title: title,
          body: body,
        },
        data,
        priority: "high",
      },
      token: fcm_token,
    };

    FCM.send(message, function (err, resp) {
      if (err) {
        console.error("FCM ERROR", err);
      } else {
        console.log("Successfully sent notification");
      }
    });
  } catch (err) {
    console.error("FCM ERROR", err);
  }
};
