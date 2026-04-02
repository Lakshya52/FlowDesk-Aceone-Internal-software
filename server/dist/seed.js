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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importStar(require("./models/User"));
dotenv_1.default.config();
const seedAdmin = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://AceoneSupport:A!ceone-mongocluster@ac-c2bzbo0-shard-00-00.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-01.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-02.dffbzkm.mongodb.net:27017/?ssl=true&replicaSet=atlas-10c7ui-shard-0&authSource=admin&appName=Cluster0';
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        // Clear existing users
        await User_1.default.deleteMany({});
        console.log('Cleared existing users');
        const password = 'Password@123';
        // Create Admin
        await User_1.default.create({
            name: 'FlowDesk Admin',
            email: 'admin@flowdesk.com',
            password,
            role: User_1.UserRole.ADMIN,
        });
        // Create Manager
        await User_1.default.create({
            name: 'FlowDesk Manager',
            email: 'manager@flowdesk.com',
            password,
            role: User_1.UserRole.MANAGER,
        });
        // Create Employee
        await User_1.default.create({
            name: 'Lakshya Employee',
            email: 'lakshya@flowdesk.com',
            password,
            role: User_1.UserRole.MEMBER,
        });
        console.log('✅ Real users created:');
        console.log(`   Admin: admin@flowdesk.com / ${password}`);
        console.log(`   Manager: manager@flowdesk.com / ${password}`);
        console.log(`   Employee: lakshya@flowdesk.com / ${password}`);
        await mongoose_1.default.disconnect();
    }
    catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
};
seedAdmin();
//# sourceMappingURL=seed.js.map