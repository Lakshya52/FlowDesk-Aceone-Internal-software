import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const sendMessage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMessages: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteMessage: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=chatController.d.ts.map