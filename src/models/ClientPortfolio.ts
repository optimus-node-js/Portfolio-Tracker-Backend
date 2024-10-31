import mongoose, { Schema, Document } from 'mongoose';

// Define the document interface for ClientPortfolio
export interface IClientPortfolio extends Document {
    ClientCode: string;
    Portfolio: {
        date: string;
        totalholdingvalue: number;
        totalinvvalue: number;
        totalprofitandloss: number;
        totalpnlpercentage: number;
        totalTodayGain: number;
    }[];
}

// Define the schema for ClientPortfolio, using the exact fields observed in the database
const ClientPortfolioSchema: Schema = new Schema({
    ClientCode: { type: String, required: true, unique: true },
    Portfolio: [
        {
            date: { type: String, required: true }, // e.g., "17-09-2024"
            totalholdingvalue: { type: Number, required: true },
            totalinvvalue: { type: Number, required: true },
            totalprofitandloss: { type: Number, required: true },
            totalpnlpercentage: { type: Number, required: true },
            totalTodayGain: { type: Number, required: true },
        },
    ],
}, { collection: 'Angelone Overall Portfolio Track' }); // Specify the exact collection name

// Export the model and interface
const ClientPortfolio = mongoose.model<IClientPortfolio>('ClientPortfolio', ClientPortfolioSchema);
export default ClientPortfolio;
