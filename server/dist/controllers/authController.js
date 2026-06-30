"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.verifyForgotPasswordOtp = exports.forgotPassword = exports.changePassword = exports.removeAvatar = exports.uploadAvatar = exports.permanentDeleteUser = exports.deleteUser = exports.updateUser = exports.getUsers = exports.getMe = exports.login = exports.verifyRegistrationOtp = exports.resendRegistrationOtp = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
// import Company from '../models/Company';
const Tenant_1 = __importDefault(require("../models/Tenant"));
const RegistrationOtp_1 = __importDefault(require("../models/RegistrationOtp"));
const emailService_1 = require("../services/emailService");
const generateToken = (userId, tenantId) => {
    const payload = { userId };
    if (tenantId)
        payload.tenantId = tenantId;
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET || "fallback_secret", {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
};
const register = async (req, res) => {
    try {
        const { name, email, password, companyName, website, phone, industry } = req.body;
        if (!companyName) {
            res.status(400).json({ message: "Company name is required" });
            return;
        }
        if (!name || !email || !password) {
            res.status(400).json({
                message: "Name, email, and password are required",
            });
            return;
        }
        const slug = companyName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        const existingTenant = await Tenant_1.default.findOne({
            name: { $regex: `^${companyName}$`, $options: "i" },
        });
        if (existingTenant) {
            res.status(400).json({
                message: "A workspace with this company name already exists",
            });
            return;
        }
        const existingReg = await RegistrationOtp_1.default.findOne({ email });
        if (existingReg) {
            await RegistrationOtp_1.default.deleteOne({ email });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
        await RegistrationOtp_1.default.create({
            companyName,
            slug,
            name,
            email,
            password,
            website: website || "",
            phone: phone || "",
            industry: industry || "",
            otp,
            otpExpires,
        });
        (0, emailService_1.sendRegistrationOtpEmail)(email, otp, companyName).catch((error) => {
            console.error(`Failed to send registration OTP to ${email}:`, error);
        });
        res.status(200).json({
            message: "Verification code sent to your email. Please verify to complete registration.",
        });
    }
    catch (error) {
        if (error.code === 11000) {
            res.status(400).json({
                message: "User with this email id already exists",
            });
            return;
        }
        res.status(500).json({
            message: error.message || "Registration failed",
        });
    }
};
exports.register = register;
const resendRegistrationOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ message: "Email is required" });
            return;
        }
        const regData = await RegistrationOtp_1.default.findOne({ email });
        if (!regData) {
            res.status(400).json({
                message: "No registration found for this email. Please start again.",
            });
            return;
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        regData.otp = otp;
        regData.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
        await regData.save();
        (0, emailService_1.sendRegistrationOtpEmail)(email, otp, regData.companyName).catch((error) => {
            console.error(`Failed to resend registration OTP to ${email}:`, error);
        });
        res.status(200).json({
            message: "A new verification code has been sent to your email.",
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to resend OTP",
        });
    }
};
exports.resendRegistrationOtp = resendRegistrationOtp;
const verifyRegistrationOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            res.status(400).json({ message: "Email and OTP are required" });
            return;
        }
        const regData = await RegistrationOtp_1.default.findOne({
            email,
            otp,
            otpExpires: { $gt: new Date() },
        });
        if (!regData) {
            res.status(400).json({ message: "Invalid or expired OTP" });
            return;
        }
        // const existingCompany = await Company.findOne({ slug: regData.slug });
        // if (existingCompany) {
        // 	await RegistrationOtp.deleteOne({ email });
        // 	res.status(400).json({
        // 		message: "Company with this name already exists",
        // 	});
        // 	return;
        // }
        // const existingUser = await User.findOne({ email: regData.email });
        // if (existingUser) {
        // 	await RegistrationOtp.deleteOne({ email });
        // 	res.status(400).json({
        // 		message: "User with this email id already exists",
        // 	});
        // 	return;
        // }
        // const company = await Company.create({
        // 	name: regData.companyName,
        // 	slug: regData.slug,
        // 	website: regData.website,
        // 	phone: regData.phone,
        // 	industry: regData.industry,
        // 	status: "active",
        // 	plan: "free",
        // });
        // const user = await User.create({
        // 	name: regData.name,
        // 	email: regData.email,
        // 	password: regData.password,
        // 	role: "admin",
        // 	companyId: company._id.toString(),
        // });
        // company.ownerId = user._id;
        // await company.save();
        // await RegistrationOtp.deleteOne({ email });
        // const token = generateToken(
        // 	user._id.toString(),
        // 	company._id.toString(),
        // );
        // res.status(201).json({
        // 	message: "Company and admin user registered successfully",
        // 	token,
        // 	user: user.toJSON(),
        // 	company: {
        // 		_id: company._id,
        // 		name: company.name,
        // 		slug: company.slug,
        // 		website: company.website,
        // 		phone: company.phone,
        // 		industry: company.industry,
        // 	},
        // });
        const existingTenant = await Tenant_1.default.findOne({ name: { $regex: `^${regData.companyName}$`, $options: 'i' } });
        if (existingTenant) {
            await RegistrationOtp_1.default.deleteOne({ email });
            res.status(400).json({ message: 'A workspace with this company name already exists' });
            return;
        }
        const existingUser = await User_1.default.findOne({ email: regData.email });
        if (existingUser) {
            await RegistrationOtp_1.default.deleteOne({ email });
            res.status(400).json({ message: 'User with this email already exists' });
            return;
        }
        // Create tenant first (no ownerId yet)
        const tenant = await Tenant_1.default.create({
            name: regData.companyName,
            website: regData.website,
            phone: regData.phone,
            industry: regData.industry,
            plan: 'free',
            isActive: true,
        });
        // Create admin user scoped to tenant
        const user = await User_1.default.create({
            name: regData.name,
            email: regData.email,
            password: regData.password,
            role: 'admin',
            tenantId: tenant._id,
        });
        // Backfill ownerId now that we have the user
        tenant.ownerId = user._id;
        await tenant.save();
        await RegistrationOtp_1.default.deleteOne({ email });
        const token = generateToken(user._id.toString(), tenant._id.toString());
        res.status(201).json({
            message: 'Workspace created successfully',
            token,
            user: user.toJSON(),
            tenant: {
                _id: tenant._id,
                name: tenant.name,
                plan: tenant.plan,
            },
        });
    }
    catch (error) {
        if (error.code === 11000) {
            res.status(400).json({
                message: "User with this email id already exists",
            });
            return;
        }
        res.status(500).json({
            message: error.message || "Verification failed",
        });
    }
};
exports.verifyRegistrationOtp = verifyRegistrationOtp;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }
        if (!user.isActive) {
            res.status(403).json({ message: "Account is deactivated" });
            return;
        }
        user.lastLogin = new Date();
        await user.save();
        const token = generateToken(user._id.toString(), user.tenantId.toString());
        res.json({
            message: "Login successful",
            token,
            user: user.toJSON(),
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || "Login failed" });
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
const Team_1 = __importDefault(require("../models/Team"));
const getUsers = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user._id;
        const tenantId = req.user.tenantId;
        const { all } = req.query;
        let query = { tenantId };
        // If ?all=true is passed, return all users in the company
        if (all === "true") {
            query = { tenantId };
        }
        else if (userRole === "manager") {
            // Managers only see users from their teams
            const managedTeams = await Team_1.default.find({ manager: userId });
            const memberIds = managedTeams.flatMap((t) => t.members.map((m) => m.toString()));
            // Include themselves and unique members
            const uniqueMemberIds = [
                ...new Set([...memberIds, userId.toString()]),
            ];
            query._id = { $in: uniqueMemberIds };
        }
        else if (userRole === "member") {
            const userTeams = await Team_1.default.find({ members: userId });
            const memberIds = userTeams.flatMap((t) => t.members.map((m) => m.toString()));
            const managerIds = userTeams.map((t) => t.manager.toString());
            const uniqueIds = [
                ...new Set([...memberIds, ...managerIds, userId.toString()]),
            ];
            query._id = { $in: uniqueIds };
        }
        const users = await User_1.default.find(query)
            .select("-password")
            .sort({ name: 1 });
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
        const { role, permissions } = req.body;
        const updates = {};
        if (role)
            updates.role = role;
        if (permissions?.allowedTabs) {
            updates.permissions = { allowedTabs: permissions.allowedTabs };
        }
        const user = await User_1.default.findOneAndUpdate({ _id: id, tenantId: req.user.tenantId }, updates, { returnDocument: "after" }).select("-password");
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateUser = updateUser;
// export const updateUser = async (
// 	req: AuthRequest,
// 	res: Response,
// ): Promise<void> => {
// 	try {
// 		const { id } = req.params;
// 		const updates = req.body;
// 		delete updates.password;
// 		const user = await User.findByIdAndUpdate(id, updates, {
// 			returnDocument: "after",
// 		}).select("-password");
// 		if (!user) {
// 			res.status(404).json({ message: "User not found" });
// 			return;
// 		}
// 		res.json({ user });
// 	} catch (error: any) {
// 		res.status(500).json({ message: error.message });
// 	}
// };
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findByIdAndUpdate(id, { isActive: false }, { returnDocument: "after" });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json({ message: "User deactivated successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteUser = deleteUser;
const permanentDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user._id.toString()) {
            res.status(400).json({
                message: "You cannot delete your own account permanently",
            });
            return;
        }
        const user = await User_1.default.findByIdAndDelete(id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json({ message: "User permanently deleted" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.permanentDeleteUser = permanentDeleteUser;
const gridfs_1 = require("../utils/gridfs");
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Delete old avatar if exists in GridFS
        if (user.avatar && user.avatar.startsWith("/uploads/")) {
            const oldFilename = user.avatar.replace("/uploads/", "");
            await (0, gridfs_1.deleteFromGridFS)(oldFilename);
        }
        // Manual upload to GridFS from buffer
        const { filename } = await (0, gridfs_1.uploadToGridFS)(req.file.buffer, req.file.originalname, req.file.mimetype);
        user.avatar = `/uploads/${filename}`;
        await user.save();
        res.json({
            message: "Avatar updated successfully",
            user: { ...user.toObject(), password: "" },
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.uploadAvatar = uploadAvatar;
const removeAvatar = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Delete from GridFS
        if (user.avatar && user.avatar.startsWith("/uploads/")) {
            const oldFilename = user.avatar.replace("/uploads/", "");
            await (0, gridfs_1.deleteFromGridFS)(oldFilename);
        }
        user.avatar = undefined;
        await user.save();
        res.json({
            message: "Avatar removed successfully",
            user: { ...user.toObject(), password: "" },
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.removeAvatar = removeAvatar;
const changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({
                message: "Password must be at least 6 characters long",
            });
            return;
        }
        const user = await User_1.default.findById(req.user._id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        user.password = newPassword;
        await user.save(); // Trigger bcryptjs hash via save hook
        res.json({ message: "Password changed successfully" });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to change password",
        });
    }
};
exports.changePassword = changePassword;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            // For security, don't reveal that the user does not exist.
            res.status(200).json({
                message: "If that email exists in our system, we have sent a password reset OTP to it.",
            });
            return;
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
        user.resetPasswordOtp = otp;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
        // Since we are not updating password, save hook might skip, but it is safe.
        await user.save();
        // Send email asynchronously without blocking the response
        (0, emailService_1.sendOtpEmail)(user.email, otp).catch((error) => {
            console.error(`Failed to send OTP email to ${user.email}:`, error);
        });
        res.status(200).json({
            message: "If that email exists in our system, we have sent a password reset OTP to it.",
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to process password reset request",
        });
    }
};
exports.forgotPassword = forgotPassword;
const verifyForgotPasswordOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            res.status(400).json({ message: "Email and OTP are required" });
            return;
        }
        const user = await User_1.default.findOne({
            email,
            resetPasswordOtp: otp,
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user) {
            res.status(400).json({ message: "Invalid or expired OTP" });
            return;
        }
        // Clear OTP to prevent reuse
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpires = undefined;
        user.lastLogin = new Date(); // Update last login since they are receiving a session token
        await user.save();
        const token = generateToken(user._id.toString(), user.tenantId.toString());
        res.json({
            message: "OTP verified successfully",
            token,
            user: user.toJSON(),
        });
    }
    catch (error) {
        res.status(500).json({
            message: error.message || "Failed to verify OTP",
        });
    }
};
exports.verifyForgotPasswordOtp = verifyForgotPasswordOtp;
const createUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            res.status(403).json({ message: 'Only admins can create users' });
            return;
        }
        const { name, email, password, role, permissions } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ message: 'Name, email and password are required' });
            return;
        }
        const existingUser = await User_1.default.findOne({ email, tenantId: req.user.tenantId });
        if (existingUser) {
            res.status(400).json({ message: 'User with this email already exists' });
            return;
        }
        const user = await User_1.default.create({
            name,
            email,
            password,
            role: role || 'member',
            tenantId: req.user.tenantId,
            permissions: permissions || undefined, // falls back to schema default (all tabs)
        });
        res.status(201).json({ user: user.toJSON() });
    }
    catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'User with this email already exists' });
            return;
        }
        res.status(500).json({ message: error.message });
    }
};
exports.createUser = createUser;
//# sourceMappingURL=authController.js.map