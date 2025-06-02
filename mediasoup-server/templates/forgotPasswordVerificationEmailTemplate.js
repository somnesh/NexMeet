const forgotPasswordVerificationEmailTemplate = (otpData) =>
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #ffffff; color: #111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding: 40px 0;">
        <table role="presentation" align="center" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; margin: 0 auto; border-radius: 16px; border: 1px solid #bababa; overflow: hidden;">
          <!-- Header with accent color -->
          <tr>
            <td style="height: 6px; background: linear-gradient(90deg, #6366f1, #8b5cf6);"></td>
          </tr>
          
          <!-- Logo section -->
          <tr>
            <td style="padding: 40px 50px 20px;">
              <img src="https://res.cloudinary.com/dsxwdyici/image/upload/v1748799943/logo_1_cropped_1_optimized_zbnrys.png" alt="Company Logo" style="max-width: 120px; height: auto;">
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 50px 40px;">
              <h1 style="margin: 0 0 24px; font-size: 28px; line-height: 36px; color: #111827; font-weight: 600; text-align: center;">Reset Your Password</h1>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #4b5563;">Hello,</p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #4b5563;">We received a request to reset the password for your NexMeet account. To proceed, please use the verification code below:</p>
              
              <!-- OTP Code Box -->
              <div style="margin: 32px 0; padding: 24px; background-color: #f3f4f6; border-radius: 12px; text-align: center; border: 1px solid #3d3d3d;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
                <div style="font-family: 'Courier New', monospace; font-size: 32px; letter-spacing: 6px; font-weight: 700; color: #4f46e5;">
                    ${otpData.otp}
                </div>
                <p style="margin: 12px 0 0; font-size: 14px; color: #6b7280;">This code will expire in 10 minutes</p>
              </div>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #4b5563;">To reset your password:</p>
              
              <ol style="margin: 0 0 24px; padding-left: 24px; font-size: 16px; line-height: 24px; color: #4b5563;">
                <li style="margin-bottom: 8px;">Return to the application or website where you initiated the password reset</li>
                <li style="margin-bottom: 8px;">Enter the 6-digit code shown above when prompted</li>
                <li>Follow the steps to set a new password</li>
              </ol>
              
              <p style="margin: 24px 0; font-size: 16px; line-height: 24px; color: #4b5563;">If you didn't request a password reset, please ignore this email. Your account is still secure, and no changes have been made.</p>
              
              <p style="margin: 0 0 8px; font-size: 16px; line-height: 24px; color: #4b5563;">Need help? Contact our support team if you have any questions or concerns.</p>
              
              <div style="margin: 40px 0 0; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 16px; line-height: 24px; color: #4b5563;">Best regards,<br><span style="font-weight: 600;">The NexMeet Team</span></p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 50px; background-color: #f8f8f8; border-top: 1px solid #eeeeee;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">                
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0 0 12px; font-size: 14px; line-height: 20px; color: #6b7280;">
                      &copy; ${new Date().getFullYear()} NexMeet. All rights reserved.
                    </p>
                    <p style="margin: 0 0 12px; font-size: 13px; line-height: 20px; color: #9ca3af;">
                      This is an automated message sent as part of the account verification process.
                      We respect your privacy and will never share your information with third parties.
                    </p>                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

module.exports = forgotPasswordVerificationEmailTemplate;
