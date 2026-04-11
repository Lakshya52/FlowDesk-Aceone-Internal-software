/**
 * Uploads a file buffer to MongoDB GridFS.
 * Returns the generated filename for storage reference.
 */
export declare function uploadToGridFS(fileBuffer: Buffer, originalName: string, mimetype: string): Promise<{
    filename: string;
}>;
/**
 * Deletes a file from GridFS by its filename.
 */
export declare function deleteFromGridFS(filename: string): Promise<void>;
//# sourceMappingURL=gridfs.d.ts.map