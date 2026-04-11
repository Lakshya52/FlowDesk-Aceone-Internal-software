import mongoose, { Document } from 'mongoose';
export declare enum UserRole {
    ADMIN = "admin",
    MANAGER = "manager",
    MEMBER = "member"
}
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    employeeId: string;
    avatar?: string;
    isActive: boolean;
    lastLogin?: Date;
    resetPasswordOtp?: string;
    resetPasswordExpires?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map