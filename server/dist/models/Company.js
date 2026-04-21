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
const mongoose_1 = __importStar(require("mongoose"));
const companySchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    parentCompanyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Company', default: null },
    industry: { type: String, trim: true },
    description: { type: String, trim: true },
    website: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        country: { type: String, trim: true, default: 'India' },
        postalCode: { type: String, trim: true },
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });
// Index for efficient parent-child queries
companySchema.index({ parentCompanyId: 1 });
companySchema.index({ name: 1 });
companySchema.index({ status: 1 });
// Virtual for child companies
companySchema.virtual('childCompanies', {
    ref: 'Company',
    localField: '_id',
    foreignField: 'parentCompanyId',
});
// Virtual for contacts
companySchema.virtual('contacts', {
    ref: 'Contact',
    localField: '_id',
    foreignField: 'companyId',
});
// Include virtuals in toJSON
companySchema.set('toJSON', { virtuals: true });
companySchema.set('toObject', { virtuals: true });
exports.default = mongoose_1.default.model('Company', companySchema);
//# sourceMappingURL=Company.js.map