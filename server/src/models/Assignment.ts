import mongoose, { Document, Schema } from 'mongoose';

export enum Priority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

export enum AssignmentStatus {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    DELAYED = 'delayed',
}

export interface IAssignment extends Document {
    title: string;
    clientName: string;
    description: string;
    priority: Priority;
    status: AssignmentStatus;
    startDate: Date;
    dueDate: Date;
    createdBy: mongoose.Types.ObjectId;
    team: mongoose.Types.ObjectId[];
    teams: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
    {
        title: { type: String, required: true, trim: true },
        clientName: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        priority: { type: String, enum: Object.values(Priority), default: Priority.MEDIUM },
        status: { type: String, enum: Object.values(AssignmentStatus), default: AssignmentStatus.NOT_STARTED },
        startDate: { type: Date, required: true },
        dueDate: { type: Date, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        team: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    },
    { timestamps: true }
);

assignmentSchema.index({ status: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ createdBy: 1 });

export default mongoose.model<IAssignment>('Assignment', assignmentSchema);
