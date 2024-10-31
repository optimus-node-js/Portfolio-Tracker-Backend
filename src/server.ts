import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import portfolioRoutes from './routes/portfolioRoutes';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/portfolio', portfolioRoutes);

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || '';
mongoose
    .connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    } as mongoose.ConnectOptions)
    .then(() => console.log('MongoDB connected'))
    .catch((error) => console.error('MongoDB connection error:', error));

// Determine the environment (defaults to 'development' if NODE_ENV is not set)
const isProduction = process.env.NODE_ENV === 'production';

// Export for serverless deployment if in production; otherwise, start server locally
if (isProduction) {
    module.exports = app;
} else {
    // Start the server locally if not in production
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
