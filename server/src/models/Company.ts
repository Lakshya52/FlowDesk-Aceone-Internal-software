import mongoose, { Document, Schema } from 'mongoose';

export interface ICompany extends Document {
    name: string;
    parentCompanyId?: mongoose.Types.ObjectId | null;
    industry?: string;
    description?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        postalCode?: string;
    };
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
    {
        name: { type: String, required: true, trim: true },
        parentCompanyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
        industry: { type: String, trim: true },
        description: { type: String, trim: true },
        website: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        address: {
            street: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            country: { type: String, trim: true, default: 'India' },
            postalCode: { type: String, trim: true },
        },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    },
    { timestamps: true }
);

// Index for efficient parent-child queries
companySchema.index({ parentCompanyId: 1 });
companySchema.index({ name: 1 });
companySchema.index({ status: 1 });

// Virtual for child companies
companySchema.virtual('childCompanies', {
    ref: 'Company',
    localField: '_id',
    foreignField: 'parentCompanyId',
});

// Virtual for contacts
companySchema.virtual('contacts', {
    ref: 'Contact',
    localField: '_id',
    foreignField: 'companyId',
});

// Include virtuals in toJSON
companySchema.set('toJSON', { virtuals: true });
companySchema.set('toObject', { virtuals: true });

export default mongoose.model<ICompany>('Company', companySchema);
