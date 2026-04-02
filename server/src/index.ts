import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import dns from 'node:dns';

// Force DNS to resolve IPv4 first to avoid Atlas connection issues on Windows
dns.setDefaultResultOrder('ipv4first');

import authRoutes from './routes/auth';
import assignmentRoutes from './routes/assignments';
import taskRoutes from './routes/tasks';
import commentRoutes from './routes/comments';
import fileRoutes from './routes/files';
import notificationRoutes from './routes/notifications';
import dashboardRoutes from './routes/dashboard';
import teamRoutes from './routes/teams';
import chatRoutes from './routes/chat';
import reportRoutes from './routes/reports';
import { errorHandler, notFound } from './middlewares/errorHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);
const clientUrls = [
    process.env.CLIENT_URL,
    'https://flowdesk-frontend-g35x.onrender.com',
    'http://localhost:5173'
].filter(Boolean) as string[];

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
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || clientUrls.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Fallback to true if we're unsure, or log it
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve files from GridFS
app.get('/uploads/:filename', async (req, res) => {
    try {
        if (!mongoose.connection.db) {
            return res.status(500).json({ message: 'Database connection not established' });
        }
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
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
        } else {
            // Fallback for files without contentType (though GridFS usually has it)
            const ext = filename.split('.').pop();
            if (ext === 'png') res.set('Content-Type', 'image/png');
            else if (ext === 'jpg' || ext === 'jpeg') res.set('Content-Type', 'image/jpeg');
            else if (ext === 'pdf') res.set('Content-Type', 'application/pdf');
        }

        const downloadStream = bucket.openDownloadStreamByName(filename);
        
        downloadStream.on('error', () => {
            res.status(404).json({ message: 'Error downloading file' });
        });

        downloadStream.pipe(res);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});


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
app.use('/api/reports', reportRoutes);

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
app.use(notFound);
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://AceoneSupport:A!ceone-mongocluster@ac-c2bzbo0-shard-00-00.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-01.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-02.dffbzkm.mongodb.net:27017/?ssl=true&replicaSet=atlas-10c7ui-shard-0&authSource=admin&appName=Cluster0';
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            family: 4, // Force IPv4
        });
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
