import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getConversations: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMessages: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createConversation: (req: AuthRequest, res: Response) => Promise<void>;
export declare const sendMessage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const toggleReaction: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteConversation: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteMessage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const forwardMessage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const editMessage: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=conversationController.d.ts.map