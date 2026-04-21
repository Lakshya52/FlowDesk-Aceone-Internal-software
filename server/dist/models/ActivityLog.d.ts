import mongoose, { Document } from 'mongoose';
export declare enum EntityType {
    ASSIGNMENT = "assignment",
    TASK = "task",
    COMMENT = "comment",
    ATTACHMENT = "attachment",
    USER = "user",
    COMPANY = "company",
    CONTACT = "contact",
    TEAM = "team"
}
export interface IActivityLog extends Document {
    action: string;
    user: mongoose.Types.ObjectId;
    entityType: EntityType;
    entityId: mongoose.Types.ObjectId;
    metadata?: Record<string, any>;
    createdAt: Date;
}
declare const _default: mongoose.Model<IActivityLog, {}, {}, {}, mongoose.Document<unknown, {}, IActivityLog, {}, {}> & IActivityLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ActivityLog.d.ts.map