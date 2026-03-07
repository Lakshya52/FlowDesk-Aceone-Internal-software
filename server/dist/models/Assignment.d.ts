import mongoose, { Document } from 'mongoose';
export declare enum Priority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export declare enum AssignmentStatus {
    NOT_STARTED = "not_started",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    DELAYED = "delayed"
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
declare const _default: mongoose.Model<IAssignment, {}, {}, {}, mongoose.Document<unknown, {}, IAssignment, {}, {}> & IAssignment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Assignment.d.ts.map