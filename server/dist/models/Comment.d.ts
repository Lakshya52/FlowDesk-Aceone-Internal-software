import mongoose, { Document } from 'mongoose';
export interface IMention {
    user: mongoose.Types.ObjectId;
    indices: [number, number];
}
export interface IComment extends Document {
    content: string;
    author: mongoose.Types.ObjectId;
    assignment?: mongoose.Types.ObjectId;
    task?: mongoose.Types.ObjectId;
    mentions: IMention[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IComment, {}, {}, {}, mongoose.Document<unknown, {}, IComment, {}, {}> & IComment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Comment.d.ts.map