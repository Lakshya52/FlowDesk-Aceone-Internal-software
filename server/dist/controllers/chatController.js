"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.getMessages = exports.sendMessage = void 0;
const ChatMessage_1 = __importDefault(require("../models/ChatMessage"));
const Attachment_1 = __importDefault(require("../models/Attachment"));
const index_1 = require("../index");
const notificationService_1 = require("../services/notificationService");
const Notification_1 = require("../models/Notification");
const gridfs_1 = require("../utils/gridfs");
const sendMessage = async (req, res) => {
    try {
        const { content, assignmentId, attachments: bodyAttachments, mentions, parentMessageId } = req.body;
        let attachmentIds = [];
        if (bodyAttachments && Array.isArray(bodyAttachments) && bodyAttachments.length > 0) {
            for (const att of bodyAttachments) {
                if (typeof att === 'string') {
                    attachmentIds.push(att);
                }
                else if (att.buffer && att.originalName) {
                    const { filename } = await (0, gridfs_1.uploadToGridFS)(Buffer.from(att.buffer, 'base64'), att.originalName, att.fileType);
                    const attachment = await Attachment_1.default.create({
                        fileName: filename,
                        originalName: att.originalName,
                        fileType: att.fileType,
                        fileSize: att.fileSize,
                        uploadedBy: req.user._id,
                    });
                    attachmentIds.push(attachment._id.toString());
                }
            }
        }
        const message = await ChatMessage_1.default.create({
            content: content || '',
            sender: req.user._id,
            assignment: assignmentId,
            attachments: attachmentIds,
            mentions: mentions || [],
            parentMessage: parentMessageId,
        });
        const populated = await ChatMessage_1.default.findById(message._id)
            .populate('sender', 'name email avatar')
            .populate('mentions', 'name avatar')
            .populate({
            path: 'attachments',
            populate: { path: 'uploadedBy', select: 'name email' },
        })
            .populate({
            path: 'parentMessage',
            populate: { path: 'sender', select: 'name' }
        });
        // Emit to all users in the assignment room
        index_1.io.to(`assignment_${assignmentId}`).emit('new_message', populated);
        // Notify mentioned users
        if (mentions && Array.isArray(mentions)) {
            const mentionPromises = mentions.map((userId) => {
                // Don't notify yourself
                if (userId === req.user._id.toString())
                    return Promise.resolve();
                return (0, notificationService_1.createNotification)({
                    user: userId,
                    type: Notification_1.NotificationType.MENTION,
                    title: 'New Mention',
                    message: `${req.user.name} mentioned you in a message`,
                    link: `/assignments/${assignmentId}?tab=chat&msgId=${message._id}`,
                });
            });
            await Promise.all(mentionPromises);
        }
        // Notify reply recipient
        if (parentMessageId) {
            const parentMsg = await ChatMessage_1.default.findById(parentMessageId);
            if (parentMsg && parentMsg.sender.toString() !== req.user._id.toString()) {
                await (0, notificationService_1.createNotification)({
                    user: parentMsg.sender.toString(),
                    type: Notification_1.NotificationType.REPLY,
                    title: 'New Reply',
                    message: `${req.user.name} replied to your message`,
                    link: `/assignments/${assignmentId}?tab=chat&msgId=${message._id}`,
                });
            }
        }
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
            .populate('mentions', 'name avatar')
            .populate({
            path: 'attachments',
            populate: { path: 'uploadedBy', select: 'name email' },
        })
            .populate({
            path: 'parentMessage',
            populate: { path: 'sender', select: 'name' }
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