import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User, { UserRole } from './models/User';

dotenv.config();

const seedAdmin = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://AceoneSupport:A!ceone-mongocluster@ac-c2bzbo0-shard-00-00.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-01.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-02.dffbzkm.mongodb.net:27017/?ssl=true&replicaSet=atlas-10c7ui-shard-0&authSource=admin&appName=Cluster0';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Clear existing users
        await User.deleteMany({});
        console.log('Cleared existing users');

        const password = 'Password@123';

        // Create Admin
        await User.create({
            name: 'FlowDesk Admin',
            email: 'admin@flowdesk.com',
            password,
            role: UserRole.ADMIN,
        });

        // Create Manager
        await User.create({
            name: 'FlowDesk Manager',
            email: 'manager@flowdesk.com',
            password,
            role: UserRole.MANAGER,
        });

        // Create Employee
        await User.create({
            name: 'Lakshya Employee',
            email: 'lakshya@flowdesk.com',
            password,
            role: UserRole.MEMBER,
        });

        console.log('✅ Real users created:');
        console.log(`   Admin: admin@flowdesk.com / ${password}`);
        console.log(`   Manager: manager@flowdesk.com / ${password}`);
        console.log(`   Employee: lakshya@flowdesk.com / ${password}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
};

seedAdmin();
