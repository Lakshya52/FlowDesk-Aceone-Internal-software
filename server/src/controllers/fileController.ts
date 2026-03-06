import { Response } from 'express';
import Attachment from '../models/Attachment';
import Notification, { NotificationType } from '../models/Notification';
import ActivityLog, { EntityType } from '../models/ActivityLog';
import { AuthRequest } from '../middlewares/auth';
import path from 'path';
import fs from 'fs';

export const uploadFile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No file provided' });
            return;
        }

        const { assignmentId, taskId } = req.body;

        const attachment = await Attachment.create({
            fileName: req.file.filename,
            originalName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            filePath: req.file.path,
            uploadedBy: req.user!._id,
            assignment: assignmentId,
            task: taskId,
        });

        await ActivityLog.create({
            action: 'File uploaded',
            user: req.user!._id,
            entityType: EntityType.ATTACHMENT,
            entityId: attachment._id,
            metadata: { fileName: attachment.originalName, assignmentId, taskId },
        });

        const populated = await Attachment.findById(attachment._id)
            .populate('uploadedBy', 'name email');

        res.status(201).json({ attachment: populated });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getFiles = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { assignmentId, taskId } = req.query;
        const filter: any = {};

        if (assignmentId) filter.assignment = assignmentId;
        if (taskId) filter.task = taskId;

        const attachments = await Attachment.find(filter)
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({ attachments });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const downloadFile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const attachment = await Attachment.findById(req.params.id);
        if (!attachment) {
            res.status(404).json({ message: 'File not found' });
            return;
        }

        const filePath = path.resolve(attachment.filePath);
        if (!fs.existsSync(filePath)) {
            res.status(404).json({ message: 'File no longer exists on disk' });
            return;
        }

        // Set proper Content-Type to preserve original file format
        res.setHeader('Content-Type', attachment.fileType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
        res.download(filePath, attachment.originalName);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteFile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const attachment = await Attachment.findById(req.params.id);
        if (!attachment) {
            res.status(404).json({ message: 'File not found' });
            return;
        }

        // Delete from disk
        const filePath = path.resolve(attachment.filePath);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await Attachment.findByIdAndDelete(req.params.id);

        await ActivityLog.create({
            action: 'File deleted',
            user: req.user!._id,
            entityType: EntityType.ATTACHMENT,
            entityId: attachment._id,
            metadata: { fileName: attachment.originalName },
        });

        res.json({ message: 'File deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
