import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const uploadFile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFiles: (req: AuthRequest, res: Response) => Promise<void>;
export declare const downloadFile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteFile: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=fileController.d.ts.map