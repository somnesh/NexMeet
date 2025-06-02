const sendEmail = require("../utils/sendEmail");
const signUpOTPVerificationEmailTemplate = require("../templates/signUpOTPVerificationEmailTemplate");

const sendSignUpOTPVerificationEmail = async (otpData, name, email) => {
  const message = signUpOTPVerificationEmailTemplate(otpData, name);
  return sendEmail({
    to: email,
    subject: "NexMeet - Sign Up OTP Verification",
    html: message,
  });
};

module.exports = sendSignUpOTPVerificationEmail;
