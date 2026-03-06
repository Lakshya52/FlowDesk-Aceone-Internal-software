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

export const getUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const users = await User.find().select('-password').sort({ name: 1 });
        res.json({ users });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.password; // Password update should be separate

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

        // Prevent admin from deleting themselves
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
