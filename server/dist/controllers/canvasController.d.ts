import { Request, Response } from 'express';
export declare const getNotes: (req: Request, res: Response) => Promise<void>;
export declare const createNote: (req: Request, res: Response) => Promise<void>;
export declare const updateNote: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteNote: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=canvasController.d.ts.map