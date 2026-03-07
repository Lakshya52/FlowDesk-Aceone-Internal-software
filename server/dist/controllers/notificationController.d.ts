import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getNotifications: (req: AuthRequest, res: Response) => Promise<void>;
export declare const markAsRead: (req: AuthRequest, res: Response) => Promise<void>;
export declare const markAllAsRead: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=notificationController.d.ts.map