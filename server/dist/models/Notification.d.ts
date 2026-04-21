import mongoose, { Document } from 'mongoose';
export declare enum NotificationType {
    TASK_ASSIGNED = "task_assigned",
    DEADLINE_APPROACHING = "deadline_approaching",
    STATUS_CHANGED = "status_changed",
    FILE_UPLOADED = "file_uploaded",
    MENTION = "mention",
    COMMENT_ADDED = "comment_added",
    REPLY = "reply",
    DIRECT_MESSAGE = "direct_message",
    PROJECT_CREATED = "project_created"
}
export interface INotification extends Document {
    user: mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    link?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Notification.d.ts.map