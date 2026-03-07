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
exports.deleteAssignment = exports.updateAssignment = exports.getAssignment = exports.getAssignments = exports.createAssignment = void 0;
const Assignment_1 = __importDefault(require("../models/Assignment"));
const ActivityLog_1 = __importStar(require("../models/ActivityLog"));
const createAssignment = async (req, res) => {
    try {
        const assignment = await Assignment_1.default.create({
            ...req.body,
            createdBy: req.user._id,
        });
        await ActivityLog_1.default.create({
            action: 'Assignment created',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.ASSIGNMENT,
            entityId: assignment._id,
            metadata: { title: assignment.title },
        });
        const populated = await Assignment_1.default.findById(assignment._id)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate({
            path: 'teams',
            populate: [
                { path: 'manager', select: 'name email avatar' },
                { path: 'members', select: 'name email avatar role' },
            ],
        });
        res.status(201).json({ assignment: populated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.createAssignment = createAssignment;
const getAssignments = async (req, res) => {
    try {
        const { status, priority, search } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (priority)
            filter.priority = priority;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { clientName: { $regex: search, $options: 'i' } },
            ];
        }
        // Members only see assignments they're on
        if (req.user.role === 'member') {
            filter.team = req.user._id;
        }
        const assignments = await Assignment_1.default.find(filter)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate({
            path: 'teams',
            populate: [
                { path: 'manager', select: 'name email avatar' },
                { path: 'members', select: 'name email avatar role' },
            ],
        })
            .sort({ createdAt: -1 });
        res.json({ assignments });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAssignments = getAssignments;
const getAssignment = async (req, res) => {
    try {
        const assignment = await Assignment_1.default.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate({
            path: 'teams',
            populate: [
                { path: 'manager', select: 'name email avatar' },
                { path: 'members', select: 'name email avatar role' },
            ],
        });
        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }
        res.json({ assignment });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAssignment = getAssignment;
const updateAssignment = async (req, res) => {
    try {
        const assignment = await Assignment_1.default.findById(req.params.id);
        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }
        // Only admin or creator can update
        if (req.user.role !== 'admin' && assignment.createdBy.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to update this assignment' });
            return;
        }
        Object.assign(assignment, req.body);
        await assignment.save();
        const updated = await Assignment_1.default.findById(assignment._id)
            .populate('createdBy', 'name email')
            .populate('team', 'name email avatar')
            .populate({
            path: 'teams',
            populate: [
                { path: 'manager', select: 'name email avatar' },
                { path: 'members', select: 'name email avatar role' },
            ],
        });
        await ActivityLog_1.default.create({
            action: 'Assignment updated',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.ASSIGNMENT,
            entityId: updated._id,
            metadata: { updates: Object.keys(req.body) },
        });
        res.json({ assignment: updated });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateAssignment = updateAssignment;
const deleteAssignment = async (req, res) => {
    try {
        console.log(`🗑️ Attempting to delete assignment: ${req.params.id} by user: ${req.user?._id}`);
        const assignment = await Assignment_1.default.findById(req.params.id);
        if (!assignment) {
            res.status(404).json({ message: 'Assignment not found' });
            return;
        }
        // Only admin or creator can delete
        if (req.user.role !== 'admin' && assignment.createdBy.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to delete this assignment' });
            return;
        }
        await assignment.deleteOne();
        await ActivityLog_1.default.create({
            action: 'Assignment deleted',
            user: req.user._id,
            entityType: ActivityLog_1.EntityType.ASSIGNMENT,
            entityId: assignment._id,
            metadata: { title: assignment.title },
        });
        res.json({ message: 'Assignment deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteAssignment = deleteAssignment;
//# sourceMappingURL=assignmentController.js.map