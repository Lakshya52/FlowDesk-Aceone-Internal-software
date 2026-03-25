"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const auth_1 = __importDefault(require("./routes/auth"));
const assignments_1 = __importDefault(require("./routes/assignments"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const comments_1 = __importDefault(require("./routes/comments"));
const files_1 = __importDefault(require("./routes/files"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const teams_1 = __importDefault(require("./routes/teams"));
const chat_1 = __importDefault(require("./routes/chat"));
const errorHandler_1 = require("./middlewares/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const clientUrls = [
    process.env.CLIENT_URL,
    'https://flowdesk-frontend-g35x.onrender.com',
    'http://localhost:5173'
].filter(Boolean);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: clientUrls,
        credentials: true,
    },
});
exports.io = io;
const PORT = process.env.PORT || 5000;
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || clientUrls.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(null, true); // Fallback to true if we're unsure, or log it
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Static files (uploads)
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/assignments', assignments_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/comments', comments_1.default);
app.use('/api/files', files_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/chat', chat_1.default);
// Socket.io connection logic
io.on('connection', (socket) => {
    socket.on('join_assignment', (assignmentId) => {
        socket.join(`assignment_${assignmentId}`);
        console.log(`User joined assignment room: assignment_${assignmentId}`);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Error handling
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
// Database connection and server start
const startServer = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/flowdesk';
        await mongoose_1.default.connect(mongoUri);
        console.log('✅ Connected to MongoDB');
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map