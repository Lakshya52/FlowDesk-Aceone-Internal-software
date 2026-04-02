import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Assignment from './server/src/models/Assignment';
import User from './server/src/models/User';

dotenv.config({ path: './server/.env' });

const check = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://AceoneSupport:A!ceone-mongocluster@ac-c2bzbo0-shard-00-00.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-01.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-02.dffbzkm.mongodb.net:27017/?ssl=true&replicaSet=atlas-10c7ui-shard-0&authSource=admin&appName=Cluster0';
        await mongoose.connect(mongoUri);
        console.log('Connected');

        const assignmentId = '69a6c0adc6e748b9dd8f633c'; // From browser state
        const assignment = await Assignment.findById(assignmentId);
        console.log('Assignment:', assignment ? assignment.title : 'Not found');

        const admin = await User.findOne({ email: 'admin@flowdesk.com' });
        console.log('Admin:', admin ? admin.role : 'Not found');

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
};

check();
