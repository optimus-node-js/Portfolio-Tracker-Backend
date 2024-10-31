import mongoose, { Schema, Document } from 'mongoose';

// Define the document interface for StockPortfolio
export interface IStockPortfolio extends Document {
    ClientCode: string;
    PortfolioStocks: {
        stockName: string;
        entries: {
            date: string;
            exchange: string;
            quantity: number;
            realisedquantity: number;
            authorisedquantity: number;
            product: string;
            averageprice: number;
            symboltoken: string;
            overallPnL: number;
            pnlpercentage: number;
            todayGain: number;
        }[];
    }[];
}

// Define the schema for StockPortfolio
const StockPortfolioSchema: Schema = new Schema({
    ClientCode: { type: String, required: true, unique: true },
    PortfolioStocks: [
        {
            stockName: { type: String, required: true },
            entries: [
                {
                    date: { type: String, required: true },
                    exchange: { type: String, required: true },
                    quantity: { type: Number, required: true },
                    realisedquantity: { type: Number, required: true },
                    authorisedquantity: { type: Number, required: true },
                    product: { type: String, required: true },
                    averageprice: { type: Number, required: true },
                    symboltoken: { type: String, required: true },
                    overallPnL: { type: Number, required: true },
                    pnlpercentage: { type: Number, required: true },
                    todayGain: { type: Number, required: true },
                },
            ],
        },
    ],
}, { collection: 'Angelone Stocks Portfolio Track' }); // Specify collection name

// Export the model and interface
const StockPortfolio = mongoose.model<IStockPortfolio>('StockPortfolio', StockPortfolioSchema);
export default StockPortfolio;
