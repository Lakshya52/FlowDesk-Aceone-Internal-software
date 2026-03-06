import { Response } from 'express';
import Notification from '../models/Notification';
import { AuthRequest } from '../middlewares/auth';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const notifications = await Notification.find({ user: req.user!._id })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({ user: req.user!._id, isRead: false });

        res.json({ notifications, unreadCount });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user!._id },
            { isRead: true },
            { returnDocument: 'after' }
        );
        res.json({ message: 'Notification marked as read' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await Notification.updateMany({ user: req.user!._id, isRead: false }, { isRead: true });
        res.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
