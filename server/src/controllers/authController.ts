import { Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth';

const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as jwt.SignOptions);
};

export const register = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'Email already registered' });
            return;
        }

        const user = await User.create({ name, email, password, role });
        const token = generateToken(user._id.toString());

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: user.toJSON(),
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Registration failed' });
    }
};

export const login = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        if (!user.isActive) {
            res.status(403).json({ message: 'Account is deactivated' });
            return;
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user._id.toString());

        res.json({
            message: 'Login successful',
            token,
            user: user.toJSON(),
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Login failed' });
    }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        res.json({ user: req.user });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

import Team from '../models/Team';
import mongoose from 'mongoose';

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userRole = req.user!.role;
        const userId = req.user!._id;

        let query: any = {};

        if (userRole === 'manager') {
            // Managers only see users from their teams
            const managedTeams = await Team.find({ manager: userId });
            const memberIds = managedTeams.flatMap(t => t.members.map(m => m.toString()));
            // Include themselves and unique members
            const uniqueMemberIds = [...new Set([...memberIds, userId.toString()])];
            query._id = { $in: uniqueMemberIds };
        } else if (userRole === 'member') {
            const userTeams = await Team.find({ members: userId });
            const memberIds = userTeams.flatMap(t => t.members.map(m => m.toString()));
            const managerIds = userTeams.map(t => t.manager.toString());
            const uniqueIds = [...new Set([...memberIds, ...managerIds, userId.toString()])];
            query._id = { $in: uniqueIds };
        }

        const users = await User.find(query).select('-password').sort({ name: 1 });
        res.json({ users });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.password;

        const user = await User.findByIdAndUpdate(id, updates, { returnDocument: 'after' }).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json({ user });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({ message: 'User deactivated successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const permanentDeleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (id === req.user!._id.toString()) {
            res.status(400).json({ message: 'You cannot delete your own account permanently' });
            return;
        }

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json({ message: 'User permanently deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

import { uploadToGridFS, deleteFromGridFS } from '../utils/gridfs';

export const uploadAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Delete old avatar if exists in GridFS
        if (user.avatar && user.avatar.startsWith('/uploads/')) {
            const oldFilename = user.avatar.replace('/uploads/', '');
            await deleteFromGridFS(oldFilename);
        }

        // Manual upload to GridFS from buffer
        const { filename } = await uploadToGridFS(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        user.avatar = `/uploads/${filename}`;
        await user.save();

        res.json({ message: 'Avatar updated successfully', user: { ...user.toObject(), password: '' } });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const removeAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Delete from GridFS
        if (user.avatar && user.avatar.startsWith('/uploads/')) {
            const oldFilename = user.avatar.replace('/uploads/', '');
            await deleteFromGridFS(oldFilename);
        }

        user.avatar = undefined;
        await user.save();

        res.json({ message: 'Avatar removed successfully', user: { ...user.toObject(), password: '' } });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({ message: 'Password must be at least 6 characters long' });
            return;
        }

        const user = await User.findById(req.user!._id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        user.password = newPassword;
        await user.save(); // Trigger bcryptjs hash via save hook

        res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to change password' });
    }
};
