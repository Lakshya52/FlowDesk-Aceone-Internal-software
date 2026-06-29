import mongoose, { Document, Schema } from 'mongoose';

export interface ILeadNote {
    text: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

export interface ILead extends Document {
    campaignId: mongoose.Types.ObjectId;
    tenantId: mongoose.Types.ObjectId;
    name: string;
    designation?: string;
    phone?: string;
    alternatePhone?: string;
    companyName?: string;
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
    companyPan?: string;
    companyGst?: string;
    industry?: string;
    email?: string;
    website?: string;
    priority: 'very high' | 'high' | 'med' | 'low';
    source: string;
    status: 'new' | 'attempted' | 'connected' | 'interested' | 'callback_scheduled' | 'meeting_scheduled' | 'not_interested' | 'not_reachable' | 'do_not_call' | 'closed_won' | 'closed_lost';
    callCount: number;
    lastCallAt?: Date;
    callDuration: number;
    nextFollowupAt?: Date;
    notes: ILeadNote[];
    createdAt: Date;
    updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
    {
        campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
        tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
        name: { type: String, required: true, trim: true },
        designation: { type: String, trim: true },
        phone: { type: String, trim: true },
        alternatePhone: { type: String, trim: true },
        companyName: { type: String, trim: true },
        addressLine: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true },
        companyPan: { type: String, trim: true },
        companyGst: { type: String, trim: true },
        industry: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        website: { type: String, trim: true },
        priority: {
            type: String,
            enum: ['very high', 'high', 'med', 'low'],
            default: 'med',
        },
        source: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: [
                'new',
                'attempted',
                'connected',
                'interested',
                'callback_scheduled',
                'meeting_scheduled',
                'not_interested',
                'not_reachable',
                'do_not_call',
                'closed_won',
                'closed_lost',
            ],
            default: 'new',
        },
        callCount: { type: Number, default: 0 },
        lastCallAt: { type: Date },
        callDuration: { type: Number, default: 0 },
        nextFollowupAt: { type: Date },
        notes: [
            {
                text: { type: String, required: true },
                createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                createdAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

leadSchema.index({ campaignId: 1 });
leadSchema.index({ tenantId: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1 });

export default mongoose.model<ILead>('Lead', leadSchema);
