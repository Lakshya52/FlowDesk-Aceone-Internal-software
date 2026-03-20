import mongoose, { Document } from 'mongoose';
export declare enum TaskStatus {
    TODO = "todo",
    IN_PROGRESS = "in_progress",
    REVIEW = "review",
    COMPLETED = "completed"
}
export declare enum Priority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export interface ISubtask {
    title: string;
    completed: boolean;
}
export interface ITask extends Document {
    title: string;
    description: string;
    assignment: mongoose.Types.ObjectId;
    assignedTo: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    dueDate: Date;
    priority: Priority;
    status: TaskStatus;
    subtasks: ISubtask[];
    dependencies: mongoose.Types.ObjectId[];
    timeEstimate?: number;
    timeSpent?: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ITask, {}, {}, {}, mongoose.Document<unknown, {}, ITask, {}, {}> & ITask & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Task.d.ts.map