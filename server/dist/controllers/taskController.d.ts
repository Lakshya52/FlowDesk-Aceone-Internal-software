import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const createTask: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getTasks: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getTask: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateTask: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteTask: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=taskController.d.ts.map