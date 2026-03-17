import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/flowdesk';

// Create storage engine
const storage = new GridFsStorage({
    url: mongoUri,
    options: { useUnifiedTopology: true },
    file: (_req, file) => {
        return new Promise((resolve, _reject) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const filename = `${uniqueSuffix}${path.extname(file.originalname)}`;
            const fileInfo = {
                filename: filename,
                bucketName: 'uploads', // collection name will be uploads.files and uploads.chunks
                contentType: file.mimetype
            };
            resolve(fileInfo);
        });
    }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-rar-compressed',
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
};

export const upload = multer({
    storage: storage as any,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
    },
});

