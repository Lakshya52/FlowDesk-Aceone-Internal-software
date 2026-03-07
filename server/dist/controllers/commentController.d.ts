import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const createComment: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getComments: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteComment: (req: AuthRequest, res: Response) => Promise<void>;
export declare const searchUsers: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=commentController.d.ts.map