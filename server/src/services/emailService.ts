import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (to: string, otp: string) => {
    try {
        console.log(`[EMAIL] Sending OTP to: ${to}`);

        const { data, error } = await resend.emails.send({
            from: 'FlowDesk <onboarding@resend.dev>',
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
                    <p>This code expires in 15 minutes.</p>
                    <p>If you did not request this, you can safely ignore this email.</p>
                    <br />
                    <p>Best regards,<br/>The FlowDesk Team</p>
                </div>
            `,
        });

        if (error) {
            console.error(`[EMAIL] ❌ Resend error:`, error);
            throw new Error(error.message);
        }

        console.log(`[EMAIL] ✅ OTP sent successfully. ID: ${data?.id}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send OTP to ${to}:`, error);
        throw error;
    }
};

export const sendGenericEmail = async (to: string[], subject: string, message: string) => {
    try {
        console.log(`[EMAIL] Sending bulk email to ${to.length} recipients`);

        const { data, error } = await resend.emails.send({
            from: 'FlowDesk <onboarding@resend.dev>',
            to,
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
        });

        if (error) {
            console.error(`[EMAIL] ❌ Resend error:`, error);
            throw new Error(error.message);
        }

        console.log(`[EMAIL] ✅ Bulk email sent. ID: ${data?.id}`);
        return data;
    } catch (error) {
        console.error('[EMAIL] ❌ Failed to send bulk email:', error);
        throw new Error('Failed to send bulk email');
    }
};