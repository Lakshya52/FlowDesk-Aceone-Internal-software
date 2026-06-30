import mongoose, { Document } from 'mongoose';
export interface ICompany extends Document {
    name: string;
    slug: string;
    parentCompanyId?: mongoose.Types.ObjectId | null;
    industry?: string;
    description?: string;
    website?: string;
    email?: string;
    phone?: string;
    phoneCountryCode?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
    };
    status: 'active' | 'inactive';
    plan: 'free' | 'starter' | 'business' | 'enterprise';
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    ownerId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ICompany, {}, {}, {}, mongoose.Document<unknown, {}, ICompany, {}, {}> & ICompany & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Company.d.ts.map