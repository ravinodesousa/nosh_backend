const axios = require("axios");

module.exports.sendSMS = (receiverNo, message) => {
  return axios.post(
    "https://www.fast2sms.com/dev/bulkV2",
    JSON.stringify({
      route: "v3",
      sender_id: "FTWSMS",
      message: message,
      language: "english",
      flash: 0,
      numbers: receiverNo,
    }),
    {
      headers: {
        authorization:
          "ep13ka6IDuWysmCF29lYTvgR7jrfAOq4KBUM8HtQGhV0iJPcN5MXSkvIDnu97YmLNBdrZqtGlOyzJKxo",
        "Content-Type": "application/json",
      },
    }
  );
  // return true;
};
