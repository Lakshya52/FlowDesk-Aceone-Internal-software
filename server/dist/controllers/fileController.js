"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.downloadFile = exports.getFiles = exports.uploadFile = void 0;
const Attachment_1 = __importDefault(require("../models/Attachment"));
const ActivityLog_1 = __importStar(require("../models/ActivityLog"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No file provided' });
            return;
        }
        const { assignmentId, taskId } = req.body;
        const attachment = await Attachment_1.default.create({
            fileName: req.file.filename,
            originalName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            filePath: req.file.path,
            uploadedBy: req.user._id,
            assignment: assignmentId,
            task: taskId,
        });
        await ActivityLog_1.default.create({
            action: 'File uploaded',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.ATTACHMENT,
            entityId: attachment._id,
            metadata: { fileName: attachment.originalName, assignmentId, taskId },
        });
        const populated = await Attachment_1.default.findById(attachment._id)
            .populate('uploadedBy', 'name email');
        res.status(201).json({ attachment: populated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.uploadFile = uploadFile;
const getFiles = async (req, res) => {
    try {
        const { assignmentId, taskId } = req.query;
        const filter = {};
        if (assignmentId)
            filter.assignment = assignmentId;
        if (taskId)
            filter.task = taskId;
        const attachments = await Attachment_1.default.find(filter)
            .populate('uploadedBy', 'name email')
            .sort({ createdAt: -1 });
        res.json({ attachments });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getFiles = getFiles;
const downloadFile = async (req, res) => {
    try {
        const attachment = await Attachment_1.default.findById(req.params.id);
        if (!attachment) {
            res.status(404).json({ message: 'File not found' });
            return;
        }
        const filePath = path_1.default.resolve(attachment.filePath);
        if (!fs_1.default.existsSync(filePath)) {
            res.status(404).json({ message: 'File no longer exists on disk' });
            return;
        }
        // Set proper Content-Type to preserve original file format
        res.setHeader('Content-Type', attachment.fileType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
        res.download(filePath, attachment.originalName);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.downloadFile = downloadFile;
const deleteFile = async (req, res) => {
    try {
        const attachment = await Attachment_1.default.findById(req.params.id);
        if (!attachment) {
            res.status(404).json({ message: 'File not found' });
            return;
        }
        // Delete from disk
        const filePath = path_1.default.resolve(attachment.filePath);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        await Attachment_1.default.findByIdAndDelete(req.params.id);
        await ActivityLog_1.default.create({
            action: 'File deleted',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.ATTACHMENT,
            entityId: attachment._id,
            metadata: { fileName: attachment.originalName },
        });
        res.json({ message: 'File deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteFile = deleteFile;
//# sourceMappingURL=fileController.js.map