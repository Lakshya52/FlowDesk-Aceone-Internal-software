import { Brevo } from '@getbrevo/brevo';
export declare const sendOtpEmail: (to: string, otp: string) => Promise<void>;
export declare const sendGenericEmail: (to: string[], subject: string, message: string) => Promise<Brevo.SendTransacEmailResponse>;
//# sourceMappingURL=emailService.d.ts.map