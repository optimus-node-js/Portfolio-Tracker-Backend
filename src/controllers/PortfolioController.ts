import { Request, Response, RequestHandler } from 'express';
import ClientPortfolio, { IClientPortfolio } from '../models/ClientPortfolio';
import StockPortfolio, { IStockPortfolio } from '../models/StockPortfolio';





// Helper function to parse "DD-MM-YYYY" to Date object
const parseDate = (dateStr: string): Date | null => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(part => parseInt(part, 10));
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month - 1, day); // Months are 0-indexed in JS Date
};







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
            if (typeof startDate !== 'string' || typeof endDate !== 'string') {
                console.error(`[ERROR] startDate and endDate should be strings`);
                res.status(400).json({ message: 'startDate and endDate should be strings in "DD-MM-YYYY" format.' });
                return;
            }

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

            portfolioData = portfolioData.filter((entry) => {
                const entryDate = parseDate(entry.date);
                if (!entryDate) {
                    console.warn(`[WARN] Skipping entry with invalid date format: ${entry.date}`);
                    return false;
                }
                return entryDate >= start && entryDate <= end;
            });

            console.log(`[DEBUG] Filtered portfolio data for date range:`, portfolioData);
        }

        // Additional filters can be applied here in the future

        // Send the filtered or unfiltered portfolio data as requested
        res.status(200).json({ ClientCode: portfolio.ClientCode, Portfolio: portfolioData });
    } catch (error) {
        console.error(`[ERROR] Error fetching portfolio data for clientId: ${clientId}`, error);
        res.status(500).json({ message: 'Error fetching portfolio data', error });
    }
};






























/**
 * Get Individual Stock Data by Client
 * - Endpoint: GET /api/portfolio/:clientId/stocks
 * - Purpose: Retrieve daily performance data for each stock in the client's portfolio.
 * - Filters: Optional `startDate`, `endDate`, and `symbol` query parameters.
 * - Response: Returns an array of stock data entries with fields like quantity, overall PnL, and daily gain.
 */








// Controller to fetch and filter stock data by client
export const getStockDataByClient: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { clientId } = req.params;
    const { startDate, endDate, symbol, exchange, minPnlPercentage, maxPnlPercentage, minOverallPnL, maxOverallPnL, minQuantity, maxQuantity } = req.query;

    console.log(`[INFO] Fetching individual stock data for clientId: ${clientId}`);
    console.log(`[INFO] Query parameters - startDate: ${startDate}, endDate: ${endDate}, symbol: ${symbol}, exchange: ${exchange}, minPnlPercentage: ${minPnlPercentage}, maxPnlPercentage: ${maxPnlPercentage}, minOverallPnL: ${minOverallPnL}, maxOverallPnL: ${maxOverallPnL}, minQuantity: ${minQuantity}, maxQuantity: ${maxQuantity}`);

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

        /**
         * 1. Filter by Symbol
         *    - If 'symbol' query parameter is provided, filter stocks by the specified symbol.
         *    - Example: ?symbol=AARTIDRUGS-EQ
         */
        if (symbol && typeof symbol === 'string') {
            filteredStocks = filteredStocks.filter((stock) => stock.stockName === symbol);
            console.log(`[DEBUG] Filtered stocks by symbol: ${symbol}`, filteredStocks);
        }

        /**
         * 2. Filter by Exchange
         *    - If 'exchange' query parameter is provided, filter entries by the specified exchange.
         *    - Example: ?exchange=NSE
         */
        if (exchange && typeof exchange === 'string') {
            filteredStocks = filteredStocks.map((stock) => {
                const filteredEntries = stock.entries.filter((entry) => entry.exchange === exchange);
                return {
                    ...stock,
                    entries: filteredEntries,
                };
            }).filter(stock => stock.entries.length > 0); // Retain stocks with entries after filtering
            console.log(`[DEBUG] Filtered stocks by exchange: ${exchange}`, filteredStocks);
        }

        /**
         * 3. Filter by Date Range
         *    - If both 'startDate' and 'endDate' are provided, filter entries within the specified date range.
         *    - Dates should be in "DD-MM-YYYY" format.
         *    - Example: ?startDate=01-01-2024&endDate=31-12-2024
         */
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
                    if (!entryDate) {
                        console.warn(`[WARN] Skipping entry with invalid date format: ${entry.date}`);
                        return false;
                    }
                    return entryDate >= start && entryDate <= end;
                });
                return {
                    ...stock,
                    entries: filteredEntries,
                };
            }).filter(stock => stock.entries.length > 0); // Retain stocks with entries after filtering

            console.log(`[DEBUG] Filtered stock entries by date range:`, filteredStocks);
        }

        /**
         * 4. Filter by Gain/Loss Percentage
         *    - 'minPnlPercentage' and/or 'maxPnlPercentage' can be provided to filter entries based on pnlpercentage.
         *    - Example: ?minPnlPercentage=-20&maxPnlPercentage=10
         */
        let pnlPercentageFilterApplied = false;
        let minPnl: number | undefined;
        let maxPnl: number | undefined;

        if (minPnlPercentage || maxPnlPercentage) {
            if (minPnlPercentage) {
                minPnl = parseFloat(minPnlPercentage as string);
                if (isNaN(minPnl)) {
                    console.error(`[ERROR] Invalid value for minPnlPercentage`);
                    res.status(400).json({ message: 'Invalid value for minPnlPercentage. It should be a number.' });
                    return;
                }
            }

            if (maxPnlPercentage) {
                maxPnl = parseFloat(maxPnlPercentage as string);
                if (isNaN(maxPnl)) {
                    console.error(`[ERROR] Invalid value for maxPnlPercentage`);
                    res.status(400).json({ message: 'Invalid value for maxPnlPercentage. It should be a number.' });
                    return;
                }
            }

            filteredStocks = filteredStocks.map((stock) => {
                const filteredEntries = stock.entries.filter((entry) => {
                    const pnl = entry.pnlpercentage;
                    if (minPnl !== undefined && pnl < minPnl) return false;
                    if (maxPnl !== undefined && pnl > maxPnl) return false;
                    return true;
                });
                return {
                    ...stock,
                    entries: filteredEntries,
                };
            }).filter(stock => stock.entries.length > 0); // Retain stocks with entries after filtering

            pnlPercentageFilterApplied = true;
            console.log(`[DEBUG] Applied PnL Percentage Filter - min: ${minPnl}, max: ${maxPnl}`, filteredStocks);
        }

        /**
         * 5. Filter by Overall Profit and Loss Amount
         *    - 'minOverallPnL' and/or 'maxOverallPnL' can be provided to filter entries based on overallPnL.
         *    - Example: ?minOverallPnL=-500&maxOverallPnL=500
         */
        let overallPnLFilterApplied = false;
        let minPnL: number | undefined;
        let maxPnL: number | undefined;

        if (minOverallPnL || maxOverallPnL) {
            if (minOverallPnL) {
                minPnL = parseFloat(minOverallPnL as string);
                if (isNaN(minPnL)) {
                    console.error(`[ERROR] Invalid value for minOverallPnL`);
                    res.status(400).json({ message: 'Invalid value for minOverallPnL. It should be a number.' });
                    return;
                }
            }

            if (maxOverallPnL) {
                maxPnL = parseFloat(maxOverallPnL as string);
                if (isNaN(maxPnL)) {
                    console.error(`[ERROR] Invalid value for maxOverallPnL`);
                    res.status(400).json({ message: 'Invalid value for maxOverallPnL. It should be a number.' });
                    return;
                }
            }

            filteredStocks = filteredStocks.map((stock) => {
                const filteredEntries = stock.entries.filter((entry) => {
                    const pnl = entry.overallPnL;
                    if (minPnL !== undefined && pnl < minPnL) return false;
                    if (maxPnL !== undefined && pnl > maxPnL) return false;
                    return true;
                });
                return {
                    ...stock,
                    entries: filteredEntries,
                };
            }).filter(stock => stock.entries.length > 0); // Retain stocks with entries after filtering

            overallPnLFilterApplied = true;
            console.log(`[DEBUG] Applied Overall PnL Filter - min: ${minPnL}, max: ${maxPnL}`, filteredStocks);
        }

        /**
         * 6. Filter by Quantity
         *    - 'minQuantity' and/or 'maxQuantity' can be provided to filter entries based on quantity.
         *    - Example: ?minQuantity=10&maxQuantity=100
         */
        let quantityFilterApplied = false;
        let minQty: number | undefined;
        let maxQty: number | undefined;

        if (minQuantity || maxQuantity) {
            if (minQuantity) {
                minQty = parseInt(minQuantity as string, 10);
                if (isNaN(minQty)) {
                    console.error(`[ERROR] Invalid value for minQuantity`);
                    res.status(400).json({ message: 'Invalid value for minQuantity. It should be a number.' });
                    return;
                }
            }

            if (maxQuantity) {
                maxQty = parseInt(maxQuantity as string, 10);
                if (isNaN(maxQty)) {
                    console.error(`[ERROR] Invalid value for maxQuantity`);
                    res.status(400).json({ message: 'Invalid value for maxQuantity. It should be a number.' });
                    return;
                }
            }

            filteredStocks = filteredStocks.map((stock) => {
                const filteredEntries = stock.entries.filter((entry) => {
                    const qty = entry.quantity;
                    if (minQty !== undefined && qty < minQty) return false;
                    if (maxQty !== undefined && qty > maxQty) return false;
                    return true;
                });
                return {
                    ...stock,
                    entries: filteredEntries,
                };
            }).filter(stock => stock.entries.length > 0); // Retain stocks with entries after filtering

            quantityFilterApplied = true;
            console.log(`[DEBUG] Applied Quantity Filter - min: ${minQty}, max: ${maxQty}`, filteredStocks);
        }

        /**
         * Summary of Applied Filters:
         * - Symbol: ${symbol}
         * - Exchange: ${exchange}
         * - Date Range: ${startDate} to ${endDate}
         * - PnL Percentage: ${minPnl} to ${maxPnl}
         * - Overall PnL: ${minPnL} to ${maxPnL}
         * - Quantity: ${minQty} to ${maxQty}
         */
        console.log(`[INFO] Applied Filters - Symbol: ${symbol || 'None'}, Exchange: ${exchange || 'None'}, Date Range: ${startDate && endDate ? `${startDate} to ${endDate}` : 'None'}, PnL Percentage: ${pnlPercentageFilterApplied ? `min=${minPnl}, max=${maxPnl}` : 'None'}, Overall PnL: ${overallPnLFilterApplied ? `min=${minPnL}, max=${maxPnL}` : 'None'}, Quantity: ${quantityFilterApplied ? `min=${minQty}, max=${maxQty}` : 'None'}`);

        // Send the filtered data
        res.status(200).json(filteredStocks);
    } catch (error) {
        console.error(`[ERROR] Error fetching stock data for clientId: ${clientId}`, error);
        res.status(500).json({ message: 'Error fetching stock data', error });
    }
};





