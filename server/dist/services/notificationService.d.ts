import { NotificationType, INotification } from '../models/Notification';
import mongoose from 'mongoose';
export interface NotificationPayload {
    user: string | mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
}
/**
 * Service to handle notification creation and real-time emission
 */
export declare const createNotification: (payload: NotificationPayload) => Promise<INotification>;
/**
 * Bulk create notifications and emit them via Socket.IO
 */
export declare const createNotifications: (payloads: NotificationPayload[]) => Promise<INotification[]>;
//# sourceMappingURL=notificationService.d.ts.map