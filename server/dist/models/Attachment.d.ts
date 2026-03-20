import mongoose, { Document } from 'mongoose';
export interface IAttachment extends Document {
    fileName: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    filePath: string;
    uploadedBy: mongoose.Types.ObjectId;
    assignment?: mongoose.Types.ObjectId;
    task?: mongoose.Types.ObjectId;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IAttachment, {}, {}, {}, mongoose.Document<unknown, {}, IAttachment, {}, {}> & IAttachment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Attachment.d.ts.map