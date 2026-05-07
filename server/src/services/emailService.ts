import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
    const oauth2Client = new OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const accessToken = await new Promise<string>((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
            if (err || !token) {
                console.error('[EMAIL] Failed to get access token:', err);
                reject(err || new Error('Failed to get access token'));
            } else {
                resolve(token);
            }
        });
    });

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.GMAIL_USER,
            clientId: process.env.GMAIL_CLIENT_ID,
            clientSecret: process.env.GMAIL_CLIENT_SECRET,
            refreshToken: process.env.GMAIL_REFRESH_TOKEN,
            accessToken,
        },
    } as any);

    return transporter;
};

export const sendOtpEmail = async (to: string, otp: string) => {
    try {
        console.log(`[EMAIL] Starting to send OTP email to: ${to}`);
        const transporter = await createTransporter();
        console.log(`[EMAIL] Transporter initialized`);

        const mailOptions = {
            from: `"FlowDesk Support Team" <${process.env.GMAIL_USER}>`,
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
                    <p>If you did not request a password reset, you can safely ignore this email.</p>
                    <br />
                    <p>Best regards,<br/>The FlowDesk Team</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ OTP email sent successfully to ${to}`);
        console.log(`[EMAIL] Response: ${info.response}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send OTP to ${to}:`, error);
        throw error;
    }
};

export const sendGenericEmail = async (to: string[], subject: string, message: string) => {
    try {
        const transporter = await createTransporter();

        const mailOptions = {
            from: `"FlowDesk Team" <${process.env.GMAIL_USER}>`,
            bcc: to,
            subject,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
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
        console.log(`[EMAIL] Bulk email sent to ${to.length} recipients`);
        return info;
    } catch (error) {
        console.error('[EMAIL] Failed to send bulk email:', error);
        throw new Error('Failed to send bulk email');
    }
};