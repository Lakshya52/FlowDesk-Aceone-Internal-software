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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentStatus = exports.Priority = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
    Priority["URGENT"] = "urgent";
})(Priority || (exports.Priority = Priority = {}));
var AssignmentStatus;
(function (AssignmentStatus) {
    AssignmentStatus["NOT_STARTED"] = "not_started";
    AssignmentStatus["IN_PROGRESS"] = "in_progress";
    AssignmentStatus["COMPLETED"] = "completed";
    AssignmentStatus["DELAYED"] = "delayed";
})(AssignmentStatus || (exports.AssignmentStatus = AssignmentStatus = {}));
const assignmentSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    companyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Company', default: null },
    description: { type: String, default: '' },
    priority: { type: String, enum: Object.values(Priority), default: Priority.MEDIUM },
    status: { type: String, enum: Object.values(AssignmentStatus), default: AssignmentStatus.NOT_STARTED },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, default: null },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    team: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    teams: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Team' }],
    isRecurring: { type: Boolean, default: false },
    recurringPattern: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], default: undefined },
    recurringStartDate: { type: Date, default: undefined },
    parentAssignmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Assignment', default: null },
    canvasData: { type: mongoose_1.Schema.Types.Mixed, default: null },
}, { timestamps: true });
assignmentSchema.index({ status: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ createdBy: 1 });
exports.default = mongoose_1.default.model('Assignment', assignmentSchema);
//# sourceMappingURL=Assignment.js.map