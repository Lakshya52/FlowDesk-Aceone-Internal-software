import { Request, Response } from 'express';
import multer from 'multer';
declare const upload: multer.Multer;
export declare const createCompany: (req: Request, res: Response) => Promise<void>;
export declare const getCompanies: (req: Request, res: Response) => Promise<void>;
export declare const getCompany: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateCompany: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteCompany: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCompanyContacts: (req: Request, res: Response) => Promise<void>;
export declare const createContact: (req: Request, res: Response) => Promise<void>;
export declare const updateContact: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteContact: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCompanyProjects: (req: Request, res: Response) => Promise<void>;
export declare const importCompanies: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const exportCompaniesToExcel: (req: Request, res: Response) => Promise<void>;
export declare const exportCompaniesToPDF: (req: Request, res: Response) => Promise<void>;
export { upload };
//# sourceMappingURL=companyController.d.ts.map