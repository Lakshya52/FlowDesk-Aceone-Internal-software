import Notification, { NotificationType, INotification } from '../models/Notification';
import { io } from '../index';
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
export const createNotification = async (payload: NotificationPayload): Promise<INotification> => {
    const notification = await Notification.create({
        user: payload.user,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        isRead: false,
    });

    // Emit real-time notification to the user's specific room
    io.to(`user_${payload.user.toString()}`).emit('new_notification', notification);

    return notification;
};

/**
 * Bulk create notifications and emit them
 */
export const createNotifications = async (payloads: NotificationPayload[]): Promise<INotification[]> => {
    const notifications = await Notification.insertMany(payloads) as unknown as INotification[];

    // Emit to each user
    notifications.forEach((notif) => {
        io.to(`user_${notif.user.toString()}`).emit('new_notification', notif);
    });

    return notifications;
};
