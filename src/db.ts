import mongoose from 'mongoose';

let connecting: Promise<typeof mongoose> | null = null;

// Connect once and reuse the connection across serverless invocations.
export async function connectDB() {
    if (mongoose.connection.readyState === 1) return;
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set; only the "demo" client is available');
    if (!connecting) {
        connecting = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }).catch((err) => {
            connecting = null;
            throw err;
        });
    }
    await connecting;
}
