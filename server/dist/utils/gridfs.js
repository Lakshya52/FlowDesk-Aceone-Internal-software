"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToGridFS = uploadToGridFS;
exports.deleteFromGridFS = deleteFromGridFS;
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const stream_1 = require("stream");
/**
 * Uploads a file buffer to MongoDB GridFS.
 * Returns the generated filename for storage reference.
 */
async function uploadToGridFS(fileBuffer, originalName, mimetype) {
    if (!mongoose_1.default.connection.db) {
        throw new Error('Database connection not established');
    }
    const bucket = new mongoose_1.default.mongo.GridFSBucket(mongoose_1.default.connection.db, {
        bucketName: 'uploads',
    });
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}${path_1.default.extname(originalName)}`;
    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(filename, {
            contentType: mimetype,
        });
        const readableStream = new stream_1.Readable();
        readableStream.push(fileBuffer);
        readableStream.push(null);
        readableStream
            .pipe(uploadStream)
            .on('finish', () => {
            resolve({ filename });
        })
            .on('error', (err) => {
            reject(err);
        });
    });
}
/**
 * Deletes a file from GridFS by its filename.
 */
async function deleteFromGridFS(filename) {
    if (!mongoose_1.default.connection.db)
        return;
    const bucket = new mongoose_1.default.mongo.GridFSBucket(mongoose_1.default.connection.db, {
        bucketName: 'uploads',
    });
    const files = await bucket.find({ filename }).toArray();
    if (files && files.length > 0) {
        await bucket.delete(files[0]._id);
    }
}
//# sourceMappingURL=gridfs.js.map