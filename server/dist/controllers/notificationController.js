"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsubscribePush = exports.subscribePush = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification_1.default.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = await Notification_1.default.countDocuments({ user: req.user._id, isRead: false });
        res.json({ notifications, unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        await Notification_1.default.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true }, { returnDocument: 'after' });
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        await Notification_1.default.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.markAllAsRead = markAllAsRead;
// Push subscriptions removed - notifications now use Electron native via Socket.IO
const subscribePush = async (_req, res) => {
    res.status(410).json({ message: 'Push subscriptions are deprecated. Native notifications handled via Electron.' });
};
exports.subscribePush = subscribePush;
const unsubscribePush = async (_req, res) => {
    res.status(410).json({ message: 'Push subscriptions are deprecated. Native notifications handled via Electron.' });
};
exports.unsubscribePush = unsubscribePush;
//# sourceMappingURL=notificationController.js.map