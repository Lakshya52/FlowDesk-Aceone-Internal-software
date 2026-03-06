import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Server } from 'socket.io';
import http from 'http';

import authRoutes from './routes/auth';
import assignmentRoutes from './routes/assignments';
import taskRoutes from './routes/tasks';
import commentRoutes from './routes/comments';
import fileRoutes from './routes/files';
import notificationRoutes from './routes/notifications';
import dashboardRoutes from './routes/dashboard';
import teamRoutes from './routes/teams';
import chatRoutes from './routes/chat';
import { errorHandler, notFound } from './middlewares/errorHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);
const clientUrls = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174',
];

const io = new Server(server, {
    cors: {
        origin: clientUrls,
        credentials: true,
    },
});

const PORT = process.env.PORT || 5000;

// Export io for use in controllers
export { io };

// Security middleware
app.use(helmet());
app.use(cors({
    origin: clientUrls,
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/chat', chatRoutes);

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
app.use(notFound);
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/flowdesk';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};

startServer();

export default app;
