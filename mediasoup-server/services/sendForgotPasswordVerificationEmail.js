const sendEmail = require("../utils/sendEmail");
const forgotPasswordVerificationEmailTemplate = require("../templates/forgotPasswordVerificationEmailTemplate");

const sendForgotPasswordVerificationEmail = async (otpData, email) => {
  const message = forgotPasswordVerificationEmailTemplate(otpData);
  return sendEmail({
    to: email,
    subject: "NexMeet - Reset Password OTP Verification",
    html: message,
  });
};

module.exports = sendForgotPasswordVerificationEmail;
