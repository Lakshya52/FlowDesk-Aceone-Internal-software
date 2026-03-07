import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export enum UserRole {
    ADMIN = 'admin',
    MANAGER = 'manager',
    MEMBER = 'member',
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
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 6 },
        role: { type: String, enum: Object.values(UserRole), default: UserRole.MEMBER },
        employeeId: { type: String, unique: true, sparse: true },
        avatar: { type: String },
        isActive: { type: Boolean, default: true },
        lastLogin: { type: Date },
    },
    { timestamps: true }
);

import Counter from './Counter';

userSchema.pre('save', async function (next) {
    if (this.isNew && !this.employeeId) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { modelName: 'User' },
                { $inc: { seq: 1 } },
                { upsert: true, new: true }
            );
            this.employeeId = `ACEONE${counter.seq.toString().padStart(3, '0')}`;
        } catch (error: any) {
            return next(error);
        }
    }

    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', {
    transform: (_doc: any, ret: any) => {
        delete ret.password;
        return ret;
    },
});

export default mongoose.model<IUser>('User', userSchema);
