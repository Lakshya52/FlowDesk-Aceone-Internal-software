import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Use memory storage - files are held in buffer, then manually written to GridFS in controllers
const storage = multer.memoryStorage();

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Allow all file types
    cb(null, true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 52428800, // 50MB in bytes
    },
});
