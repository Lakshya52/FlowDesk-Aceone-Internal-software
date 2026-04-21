"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGenericEmail = exports.sendOtpEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
let _transporter = null;
const getTransporter = async () => {
    if (_transporter)
        return _transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        _transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    else {
        console.log("------------------------------------------");
        console.log("No SMTP Config found. Generating dynamic Ethereal test account...");
        const testAccount = await nodemailer_1.default.createTestAccount();
        _transporter = nodemailer_1.default.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
    return _transporter;
};
const sendOtpEmail = async (to, otp) => {
    try {
        const transporter = await getTransporter();
        // Log for easier development testing
        // console.log(`\n==========================================`);
        // console.log(`[DEV MODE] Password Reset OTP for ${to}: ${otp}`);
        // console.log(`==========================================\n`);
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"FlowDesk Support Team" <noreply@flowdesk.app>',
            to,
            subject: 'Password Reset Verification Code - FlowDesk',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #6366f1;">Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset the password for your FlowDesk account associated with this email address.</p>
                    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${otp}</span>
                    </div>
                    <p>Please enter this code on the application to proceed with your password reset. This code will expire in 15 minutes.</p>
                    <p>If you did not request a password reset, you can safely ignore this email securely.</p>
                    <br />
                    <p>Best regards,<br/>The FlowDesk Team</p>
                </div>
            `,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent successfully to ${to}`);
        // Log preview URL if not using a real configured SMTP host
        if (!process.env.SMTP_HOST) {
            console.log(`\n==========================================`);
            console.log(`[Email Envelope URL]: ${nodemailer_1.default.getTestMessageUrl(info)}`);
            console.log(`==========================================\n`);
        }
    }
    catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
};
exports.sendOtpEmail = sendOtpEmail;
const sendGenericEmail = async (to, subject, message) => {
    try {
        const transporter = await getTransporter();
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"FlowDesk Team" <noreply@flowdesk.app>',
            bcc: to, // Use BCC for bulk emails to protect privacy
            subject: subject,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
                    <div style="background-color: #6366f1; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">FlowDesk Notification</h1>
                    </div>
                    <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                        <div style="white-space: pre-wrap; font-size: 16px; color: #4b5563;">${message}</div>
                        <br />
                        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                        <p style="font-size: 14px; color: #9ca3af; text-align: center;">
                            Sent via FlowDesk Business Platform
                        </p>
                    </div>
                </div>
            `,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`Bulk email sent successfully to ${to.length} recipients`);
        if (!process.env.SMTP_HOST) {
            console.log(`[Email Envelope URL]: ${nodemailer_1.default.getTestMessageUrl(info)}`);
        }
        return info;
    }
    catch (error) {
        console.error('Error sending generic email:', error);
        throw new Error('Failed to send bulk email');
    }
};
exports.sendGenericEmail = sendGenericEmail;
//# sourceMappingURL=emailService.js.map