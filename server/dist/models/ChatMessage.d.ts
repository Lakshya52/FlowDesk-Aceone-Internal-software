import mongoose, { Document } from 'mongoose';
export interface IChatMessage extends Document {
    content: string;
    sender: mongoose.Types.ObjectId;
    assignment: mongoose.Types.ObjectId;
    attachments: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IChatMessage, {}, {}, {}, mongoose.Document<unknown, {}, IChatMessage, {}, {}> & IChatMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ChatMessage.d.ts.map