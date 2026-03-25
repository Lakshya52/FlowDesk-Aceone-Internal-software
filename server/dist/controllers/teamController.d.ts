import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const createTeam: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getTeams: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getTeam: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateTeam: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteTeam: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateTeamMembers: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=teamController.d.ts.map