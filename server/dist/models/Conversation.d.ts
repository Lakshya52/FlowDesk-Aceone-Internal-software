import mongoose, { Document } from 'mongoose';
export declare enum ConversationType {
    DIRECT = "direct",
    GROUP = "group"
}
export interface IConversation extends Document {
    type: ConversationType;
    name?: string;
    avatar?: string;
    participants: mongoose.Types.ObjectId[];
    createdBy?: mongoose.Types.ObjectId;
    admins?: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IConversation, {}, {}, {}, mongoose.Document<unknown, {}, IConversation, {}, {}> & IConversation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Conversation.d.ts.map