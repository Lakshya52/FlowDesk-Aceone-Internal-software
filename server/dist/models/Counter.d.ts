import mongoose, { Document } from 'mongoose';
export interface ICounter extends Document {
    modelName: string;
    seq: number;
}
declare const _default: mongoose.Model<ICounter, {}, {}, {}, mongoose.Document<unknown, {}, ICounter, {}, {}> & ICounter & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Counter.d.ts.map