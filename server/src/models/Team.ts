import mongoose, { Document, Schema } from 'mongoose';

export interface ITeam extends Document {
    name: string;
    description: string;
    manager: mongoose.Types.ObjectId;
    members: mongoose.Types.ObjectId[];
    joinRequests: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        manager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        joinRequests: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

teamSchema.index({ manager: 1 });
teamSchema.index({ members: 1 });

export default mongoose.model<ITeam>('Team', teamSchema);
