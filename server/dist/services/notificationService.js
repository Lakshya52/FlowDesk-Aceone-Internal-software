"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotifications = exports.createNotification = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const index_1 = require("../index");
/**
 * Service to handle notification creation and real-time emission
 */
const createNotification = async (payload) => {
    const notification = await Notification_1.default.create({
        user: payload.user,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        isRead: false,
    });
    // Emit real-time notification to the user's specific room
    index_1.io.to(`user_${payload.user.toString()}`).emit('new_notification', notification);
    return notification;
};
exports.createNotification = createNotification;
/**
 * Bulk create notifications and emit them
 */
const createNotifications = async (payloads) => {
    const notifications = await Notification_1.default.insertMany(payloads);
    // Emit to each user
    notifications.forEach((notif) => {
        index_1.io.to(`user_${notif.user.toString()}`).emit('new_notification', notif);
    });
    return notifications;
};
exports.createNotifications = createNotifications;
//# sourceMappingURL=notificationService.js.map