import { Request, Response, RequestHandler } from 'express';
import ClientPortfolio, { IClientPortfolio } from '../models/ClientPortfolio';
import StockPortfolio, { IStockPortfolio } from '../models/StockPortfolio';

/**
 * Get Overall Portfolio Data by Client
 * - Endpoint: GET /api/portfolio/:clientId
 * - Purpose: Retrieve the entire portfolio data for a specified client.
 * - Filters: Optional `startDate` and `endDate` query parameters for date range.
 * - Response: Returns an array of portfolio entries with fields such as total holding value, total today gain, and overall profit/loss.
 */
export const getPortfolioByClient: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(`[INFO] Fetching overall portfolio data for clientId: ${clientId}`);
    console.log(`[INFO] Query parameters - startDate: ${startDate}, endDate: ${endDate}`);

    try {
        // Retrieve client's portfolio directly from the database
        const portfolio = await ClientPortfolio.findOne({ ClientCode: clientId }).lean<IClientPortfolio>();

        console.log(`[DEBUG] Retrieved portfolio document for clientId: ${clientId}`, portfolio);

        if (!portfolio) {
            console.warn(`[WARN] Portfolio not found for clientId: ${clientId}`);
            res.status(404).json({ message: 'Portfolio not found for this client' });
            return;
        }

        let portfolioData = portfolio.Portfolio;

        // Apply date range filter if both startDate and endDate are provided
        if (startDate && endDate) {
            const start = new Date(startDate as string);
            const end = new Date(endDate as string);

            portfolioData = portfolioData.filter((entry) => {
                const entryDate = new Date(entry.date.split('-').reverse().join('-'));
                return entryDate >= start && entryDate <= end;
            });

            console.log(`[DEBUG] Filtered portfolio data for date range:`, portfolioData);
        }

        // Send the filtered or unfiltered portfolio data as requested
        res.status(200).json({ ClientCode: portfolio.ClientCode, Portfolio: portfolioData });
    } catch (error) {
        console.error(`[ERROR] Error fetching portfolio data for clientId: ${clientId}`, error);
        res.status(500).json({ message: 'Error fetching portfolio data', error });
    }
};





















// Helper function to parse "DD-MM-YYYY" to Date object
const parseDate = (dateStr: string): Date | null => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(part => parseInt(part, 10));
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month - 1, day); // Months are 0-indexed in JS Date
};









/**
 * Get Individual Stock Data by Client
 * - Endpoint: GET /api/portfolio/:clientId/stocks
 * - Purpose: Retrieve daily performance data for each stock in the client's portfolio.
 * - Filters: Optional `startDate`, `endDate`, and `symbol` query parameters.
 * - Response: Returns an array of stock data entries with fields like quantity, overall PnL, and daily gain.
 */








export const getStockDataByClient: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { clientId } = req.params;
    const { startDate, endDate, symbol } = req.query;

    console.log(`[INFO] Fetching individual stock data for clientId: ${clientId}`);
    console.log(`[INFO] Query parameters - startDate: ${startDate}, endDate: ${endDate}, symbol: ${symbol}`);

    try {
        // Retrieve stock data directly from the database
        const stockPortfolio = await StockPortfolio.findOne({ ClientCode: clientId }).lean<IStockPortfolio>();

        console.log(`[DEBUG] Retrieved stock portfolio document for clientId: ${clientId}`, stockPortfolio);

        if (!stockPortfolio) {
            console.warn(`[WARN] Stock portfolio not found for clientId: ${clientId}`);
            res.status(404).json({ message: 'Stock portfolio not found for this client' });
            return;
        }

        let filteredStocks = stockPortfolio.PortfolioStocks;

        // Filter by symbol if provided
        if (symbol && typeof symbol === 'string') {
            filteredStocks = filteredStocks.filter((stock) => stock.stockName === symbol);
            console.log(`[DEBUG] Filtered stocks by symbol: ${symbol}`, filteredStocks);
        }

        // If startDate and endDate are provided, filter entries within that date range
        if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
            const start = parseDate(startDate);
            const end = parseDate(endDate);

            if (!start || !end) {
                console.error(`[ERROR] Invalid date format for startDate or endDate`);
                res.status(400).json({ message: 'Invalid date format. Please use "DD-MM-YYYY".' });
                return;
            }

            // Normalize start and end to the start and end of the day
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            filteredStocks = filteredStocks.map((stock) => {
                const filteredEntries = stock.entries.filter((entry) => {
                    const entryDate = parseDate(entry.date);
                    if (!entryDate) return false;
                    return entryDate >= start && entryDate <= end;
                });
                return {
                    ...stock,
                    entries: filteredEntries,
                };
            }).filter(stock => stock.entries.length > 0); // Ensure we only return stocks with entries within the date range

            console.log(`[DEBUG] Filtered stock entries by date range:`, filteredStocks);
        }

        // Send the filtered data
        res.status(200).json(filteredStocks);
    } catch (error) {
        console.error(`[ERROR] Error fetching stock data for clientId: ${clientId}`, error);
        res.status(500).json({ message: 'Error fetching stock data', error });
    }
};





