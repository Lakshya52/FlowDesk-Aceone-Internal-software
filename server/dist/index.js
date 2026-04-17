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
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const node_dns_1 = __importDefault(require("node:dns"));
const buddy_1 = __importDefault(require("./routes/buddy"));
// Force DNS to resolve IPv4 first to avoid Atlas connection issues on Windows
node_dns_1.default.setDefaultResultOrder('ipv4first');
const auth_1 = __importDefault(require("./routes/auth"));
const assignments_1 = __importDefault(require("./routes/assignments"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const comments_1 = __importDefault(require("./routes/comments"));
const files_1 = __importDefault(require("./routes/files"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const teams_1 = __importDefault(require("./routes/teams"));
const chat_1 = __importDefault(require("./routes/chat"));
const reports_1 = __importDefault(require("./routes/reports"));
const companies_1 = __importDefault(require("./routes/companies"));
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
// Serve files from GridFS
app.get('/uploads/:filename', async (req, res) => {
    try {
        if (!mongoose_1.default.connection.db) {
            return res.status(500).json({ message: 'Database connection not established' });
        }
        const bucket = new mongoose_1.default.mongo.GridFSBucket(mongoose_1.default.connection.db, {
            bucketName: 'uploads'
        });
        const filename = req.params.filename;
        const files = await bucket.find({ filename }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        const file = files[0];
        if (file.contentType) {
            res.set('Content-Type', file.contentType);
        }
        else {
            // Fallback for files without contentType (though GridFS usually has it)
            const ext = filename.split('.').pop();
            if (ext === 'png')
                res.set('Content-Type', 'image/png');
            else if (ext === 'jpg' || ext === 'jpeg')
                res.set('Content-Type', 'image/jpeg');
            else if (ext === 'pdf')
                res.set('Content-Type', 'application/pdf');
        }
        const downloadStream = bucket.openDownloadStreamByName(filename);
        downloadStream.on('error', () => {
            res.status(404).json({ message: 'Error downloading file' });
        });
        downloadStream.pipe(res);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// API Routes
app.use("/api/buddy", buddy_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/assignments', assignments_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/comments', comments_1.default);
app.use('/api/files', files_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/companies', companies_1.default);
// Socket.io connection logic
io.on('connection', (socket) => {
    socket.on('join_assignment', (assignmentId) => {
        socket.join(`assignment_${assignmentId}`);
        console.log(`User joined assignment room: assignment_${assignmentId}`);
    });
    socket.on('join_user', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User joined personal room: user_${userId}`);
    });
    socket.on('typing', ({ assignmentId, userName }) => {
        socket.to(`assignment_${assignmentId}`).emit('user_typing', { userName, userId: socket.id });
    });
    socket.on('stop_typing', ({ assignmentId }) => {
        socket.to(`assignment_${assignmentId}`).emit('user_stop_typing', { userId: socket.id });
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
        const mongoUri = process.env.MONGODB_URI || 'mongodb://AceoneSupport:A!ceone-mongocluster@ac-c2bzbo0-shard-00-00.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-01.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-02.dffbzkm.mongodb.net:27017/?ssl=true&replicaSet=atlas-10c7ui-shard-0&authSource=admin&appName=Cluster0';
        await mongoose_1.default.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            family: 4, // Force IPv4
        });
        console.log('âœ… Connected to MongoDB');
        server.listen(PORT, () => {
            console.log(`ðŸš€ Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('âŒ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map