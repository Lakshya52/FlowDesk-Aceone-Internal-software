import mongoose, { Document } from 'mongoose';
export interface ICanvasNote extends Document {
    userId: mongoose.Types.ObjectId;
    content: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ICanvasNote, {}, {}, {}, mongoose.Document<unknown, {}, ICanvasNote, {}, {}> & ICanvasNote & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=CanvasNote.d.ts.map