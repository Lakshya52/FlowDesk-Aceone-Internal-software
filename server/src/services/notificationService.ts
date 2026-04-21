import Notification, { NotificationType, INotification } from '../models/Notification';
import { io } from '../index';
import mongoose from 'mongoose';
import webpush from 'web-push';
import User from '../models/User';

// Initialize web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:support.aceone@gmail.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

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
    console.log(`[Socket] Emitting notification to user_${payload.user.toString()}`);
    io.to(`user_${payload.user.toString()}`).emit('new_notification', notification);

    // Send Push Notification
    try {
        const userDoc = await User.findById(payload.user);
        if (userDoc?.pushSubscriptions && userDoc.pushSubscriptions.length > 0) {
            console.log(`[Push] Sending push to ${userDoc.pushSubscriptions.length} devices for user ${userDoc.name}`);
            const pushPayload = JSON.stringify({
                title: payload.title,
                body: payload.message,
                data: { 
                    url: payload.link || '/',
                    type: payload.type
                }
            });

            userDoc.pushSubscriptions.forEach((sub, idx) => {
                webpush.sendNotification(sub as any, pushPayload).then(() => {
                    console.log(`[Push] Success for device ${idx} of ${userDoc.name}`);
                }).catch(err => {
                    console.error(`[Push] Error for device ${idx}:`, err.statusCode, err.body);
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Remove expired subscription
                        User.findByIdAndUpdate(payload.user, {
                            $pull: { pushSubscriptions: { endpoint: sub.endpoint } }
                        }).then(() => console.log(`[Push] Removed expired subscription for ${userDoc.name}`)).catch(console.error);
                    }
                });
            });
        } else {
            console.log(`[Push] No push subscriptions found for user ${userDoc?.name || payload.user}`);
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
    }

    return notification;
};

/**
 * Bulk create notifications and emit them
 */
export const createNotifications = async (payloads: NotificationPayload[]): Promise<INotification[]> => {
    const notifications = await Notification.insertMany(payloads) as unknown as INotification[];

    // Emit to each user and send push
    for (const notif of notifications) {
        io.to(`user_${notif.user.toString()}`).emit('new_notification', notif);
        
        try {
            const userDoc = await User.findById(notif.user);
            if (userDoc?.pushSubscriptions && userDoc.pushSubscriptions.length > 0) {
                const pushPayload = JSON.stringify({
                    title: notif.title,
                    body: notif.message,
                    data: { 
                        url: notif.link || '/',
                        type: notif.type
                    }
                });

                userDoc.pushSubscriptions.forEach(sub => {
                    webpush.sendNotification(sub as any, pushPayload).catch(err => {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            User.findByIdAndUpdate(notif.user, {
                                $pull: { pushSubscriptions: { endpoint: sub.endpoint } }
                            }).catch(console.error);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error sending push notification in bulk:', error);
        }
    }

    return notifications;
};
