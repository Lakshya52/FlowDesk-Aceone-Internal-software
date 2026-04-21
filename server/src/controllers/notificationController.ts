import { Response } from 'express';
import Notification from '../models/Notification';
import User from '../models/User';
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

export const subscribePush = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { subscription } = req.body;
        console.log(`🔑 Attempting to subscribe user ${req.user?._id} for push notifications`);
        
        const user = await User.findById(req.user!._id);
        
        if (!user) {
            console.log('❌ User not found during push subscription');
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Check if subscription already exists
        const exists = user.pushSubscriptions?.some(sub => sub.endpoint === subscription.endpoint);
        if (!exists) {
            console.log(`✅ Adding new subscription for ${user.name}`);
            user.pushSubscriptions = user.pushSubscriptions || [];
            user.pushSubscriptions.push(subscription);
            await user.save();
        } else {
            console.log(`ℹ️ Subscription already exists for ${user.name}`);
        }

        res.status(201).json({ message: 'Push subscription added successfully' });
    } catch (error: any) {
        console.error('❌ Error during push subscription:', error);
        res.status(500).json({ message: error.message });
    }
};

export const unsubscribePush = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { endpoint } = req.body;
        await User.findByIdAndUpdate(req.user!._id, {
            $pull: { pushSubscriptions: { endpoint } }
        });
        res.json({ message: 'Push subscription removed successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
