"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Use memory storage - files are held in buffer, then manually written to GridFS in controllers
const storage = multer_1.default.memoryStorage();
const fileFilter = (_req, file, cb) => {
    // Allow all file types
    cb(null, true);
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 52428800, // 50MB in bytes
    },
});
//# sourceMappingURL=upload.js.map