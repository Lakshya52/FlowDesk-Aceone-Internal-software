import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export declare const register: (req: AuthRequest, res: Response) => Promise<void>;
export declare const login: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMe: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getUsers: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const permanentDeleteUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const uploadAvatar: (req: AuthRequest, res: Response) => Promise<void>;
export declare const removeAvatar: (req: AuthRequest, res: Response) => Promise<void>;
export declare const changePassword: (req: AuthRequest, res: Response) => Promise<void>;
export declare const forgotPassword: (req: AuthRequest, res: Response) => Promise<void>;
export declare const verifyForgotPasswordOtp: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=authController.d.ts.map