"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.permanentDeleteUser = exports.deleteUser = exports.updateUser = exports.getUsers = exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: 'Email already registered' });
            return;
        }
        const user = await User_1.default.create({ name, email, password, role });
        const token = generateToken(user._id.toString());
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: user.toJSON(),
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Registration failed' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email });
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
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Login failed' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        res.json({ user: req.user });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMe = getMe;
const getUsers = async (_req, res) => {
    try {
        const users = await User_1.default.find().select('-password').sort({ name: 1 });
        res.json({ users });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getUsers = getUsers;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.password; // Password update should be separate
        const user = await User_1.default.findByIdAndUpdate(id, updates, { returnDocument: 'after' }).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findByIdAndUpdate(id, { isActive: false }, { returnDocument: 'after' });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({ message: 'User deactivated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteUser = deleteUser;
const permanentDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent admin from deleting themselves
        if (id === req.user._id.toString()) {
            res.status(400).json({ message: 'You cannot delete your own account permanently' });
            return;
        }
        const user = await User_1.default.findByIdAndDelete(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({ message: 'User permanently deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.permanentDeleteUser = permanentDeleteUser;
//# sourceMappingURL=authController.js.map