import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const getDashboardStats: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCalendarEvents: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getReportFilters: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getReports: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=dashboardController.d.ts.map