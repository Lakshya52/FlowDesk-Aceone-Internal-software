import mongoose, { Document } from 'mongoose';
export interface IMessageReaction {
    user: mongoose.Types.ObjectId;
    emoji: string;
}
export interface IMessageReadBy {
    user: mongoose.Types.ObjectId;
    readAt: Date;
}
export interface IMessage extends Document {
    conversation: mongoose.Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    content: string;
    attachments: mongoose.Types.ObjectId[];
    parentMessage?: mongoose.Types.ObjectId;
    mentions: mongoose.Types.ObjectId[];
    reactions: IMessageReaction[];
    readBy: IMessageReadBy[];
    isDeleted?: boolean;
    isEdited?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IMessage, {}, {}, {}, mongoose.Document<unknown, {}, IMessage, {}, {}> & IMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Message.d.ts.map