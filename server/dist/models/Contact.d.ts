import mongoose, { Document } from 'mongoose';
export interface IContact extends Document {
    companyId: mongoose.Types.ObjectId;
    name: string;
    email?: string;
    phone?: string;
    position?: string;
    department?: string;
    isPrimary: boolean;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IContact, {}, {}, {}, mongoose.Document<unknown, {}, IContact, {}, {}> & IContact & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Contact.d.ts.map