import nodemailer from "nodemailer";
import { mailTransporter } from "./mail";

type NoReplyTypes = "reset-password";

export const noReplyMail = async (
	type: NoReplyTypes,
	to: string,
	payload: string
) => {
	try {
		const mail = await mailTransporter.sendMail({
			from: `<${process.env.SMTP_USER}>`,
			to: to,
			subject: "Password Reset Request",
			html: noReplyMessage(type, payload),
		});

		if (process.env.NODE_ENV != "production") {
			console.log(nodemailer.getTestMessageUrl(mail));
		}
	} catch (err) {
		console.error(err);
	}
};

const noReplyMessage = (type: NoReplyTypes, payload: string) => {
	switch (type) {
		case "reset-password":
			return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background-color: #0d6efd;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        padding: 20px;
                        background-color: #f9f9f9;
                        border: 1px solid #dddddd;
                        border-top: none;
                        border-radius: 0 0 5px 5px;
                    }
                    .button {
                        display: inline-block;
                        background-color: #0d6efd;
                        color: white;
                        text-decoration: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                        font-size: 12px;
                        color: #777777;
                    }
                    .warning {
                        background-color: #fff3cd;
                        border: 1px solid #ffecb5;
                        color: #664d03;
                        padding: 10px;
                        border-radius: 5px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Password Reset Request</h2>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your Document Tracking System account. Click the button below to reset your password:</p>
                    
                    <div style="text-align: center;">
                        <a href="${payload}" class="button">Reset Password</a>
                    </div>
                    
                    <p>If you didn't request a password reset, you can ignore this email - your password will remain unchanged.</p>
                    
                    <div class="warning">
                        <p><strong>Note:</strong> This link will expire in 15 mins for security reasons.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p>© ${new Date().getFullYear()} Document Tracking System</p>
                </div>
            </body>
            </html>
            `;
	}
};
