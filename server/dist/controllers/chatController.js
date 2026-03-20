"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.getMessages = exports.sendMessage = void 0;
const ChatMessage_1 = __importDefault(require("../models/ChatMessage"));
const Attachment_1 = __importDefault(require("../models/Attachment"));
const index_1 = require("../index");
const sendMessage = async (req, res) => {
    try {
        const { content, assignmentId } = req.body;
        let attachmentIds = [];
        // If file was uploaded with the message
        if (req.file) {
            const attachment = await Attachment_1.default.create({
                fileName: req.file.filename,
                originalName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                filePath: req.file.path,
                uploadedBy: req.user._id,
                assignment: assignmentId,
            });
            attachmentIds.push(attachment._id.toString());
        }
        const message = await ChatMessage_1.default.create({
            content: content || '',
            sender: req.user._id,
            assignment: assignmentId,
            attachments: attachmentIds,
        });
        const populated = await ChatMessage_1.default.findById(message._id)
            .populate('sender', 'name email avatar')
            .populate({
            path: 'attachments',
            populate: { path: 'uploadedBy', select: 'name email' },
        });
        // Emit to all users in the assignment room
        index_1.io.to(`assignment_${assignmentId}`).emit('new_message', populated);
        res.status(201).json({ message: populated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.sendMessage = sendMessage;
const getMessages = async (req, res) => {
    try {
        const { assignmentId, page = '1', limit = '50' } = req.query;
        if (!assignmentId) {
            res.status(400).json({ message: 'assignmentId is required' });
            return;
        }
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const total = await ChatMessage_1.default.countDocuments({ assignment: assignmentId });
        const messages = await ChatMessage_1.default.find({ assignment: assignmentId })
            .populate('sender', 'name email avatar')
            .populate({
            path: 'attachments',
            populate: { path: 'uploadedBy', select: 'name email' },
        })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limitNum);
        res.json({ messages, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getMessages = getMessages;
const deleteMessage = async (req, res) => {
    try {
        const message = await ChatMessage_1.default.findById(req.params.id);
        if (!message) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }
        // Only sender or admin can delete
        if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(403).json({ message: 'Not authorized to delete this message' });
            return;
        }
        await ChatMessage_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Message deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteMessage = deleteMessage;
//# sourceMappingURL=chatController.js.map