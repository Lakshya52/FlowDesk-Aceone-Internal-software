import { Response } from 'express';
import ChatMessage from '../models/ChatMessage';
import Attachment from '../models/Attachment';
import ActivityLog, { EntityType } from '../models/ActivityLog';
import { AuthRequest } from '../middlewares/auth';
import { io } from '../index';

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { content, assignmentId } = req.body;
        let attachmentIds: string[] = [];

        // If file was uploaded with the message
        if (req.file) {
            const attachment = await Attachment.create({
                fileName: req.file.filename,
                originalName: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                filePath: req.file.path,
                uploadedBy: req.user!._id,
                assignment: assignmentId,
            });
            attachmentIds.push(attachment._id.toString());
        }

        const message = await ChatMessage.create({
            content: content || '',
            sender: req.user!._id,
            assignment: assignmentId,
            attachments: attachmentIds,
        });

        const populated = await ChatMessage.findById(message._id)
            .populate('sender', 'name email avatar')
            .populate({
                path: 'attachments',
                populate: { path: 'uploadedBy', select: 'name email' },
            });

        // Emit to all users in the assignment room
        io.to(`assignment_${assignmentId}`).emit('new_message', populated);

        res.status(201).json({ message: populated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { assignmentId, page = '1', limit = '50' } = req.query;
        if (!assignmentId) {
            res.status(400).json({ message: 'assignmentId is required' });
            return;
        }

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        const total = await ChatMessage.countDocuments({ assignment: assignmentId });

        const messages = await ChatMessage.find({ assignment: assignmentId })
            .populate('sender', 'name email avatar')
            .populate({
                path: 'attachments',
                populate: { path: 'uploadedBy', select: 'name email' },
            })
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limitNum);

        res.json({ messages, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const message = await ChatMessage.findById(req.params.id);
        if (!message) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }

        // Only sender or admin can delete
        if (message.sender.toString() !== req.user!._id.toString() && req.user!.role !== 'admin') {
            res.status(403).json({ message: 'Not authorized to delete this message' });
            return;
        }

        await ChatMessage.findByIdAndDelete(req.params.id);
        res.json({ message: 'Message deleted' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
