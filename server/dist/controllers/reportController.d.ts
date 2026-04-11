import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getEmployeeTrackingReport: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getWorkloadReport: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getActivityReport: (req: AuthRequest, res: Response) => Promise<void>;
export declare const exportReport: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=reportController.d.ts.map