import { Request, Response, RequestHandler } from 'express';
import ClientPortfolio, { IClientPortfolio } from '../models/ClientPortfolio';
import StockPortfolio, { IStockPortfolio } from '../models/StockPortfolio';
import { ParsedQs } from 'qs';
import { parseStringParam } from '../utils/queryHelpers';


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
    const {
        startDate,
        endDate,
        minTotalGain,
        maxTotalGain,
        minPortfolioValue,
        maxPortfolioValue,
        minTodayGain,
        maxTodayGain
    } = req.query;

    console.log(`[INFO] Fetching overall portfolio data for clientId: ${clientId}`);
    console.log(`[INFO] Query parameters - startDate: ${startDate}, endDate: ${endDate}, minTotalGain: ${minTotalGain}, maxTotalGain: ${maxTotalGain}, minPortfolioValue: ${minPortfolioValue}, maxPortfolioValue: ${maxPortfolioValue}, minTodayGain: ${minTodayGain}, maxTodayGain: ${maxTodayGain}`);

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

        /**
         * 1. Filter by Date Range
         *    - Users can provide startDate, endDate, or both.
         *    - Dates should be in "DD-MM-YYYY" format.
         *    - Examples:
         *      - ?startDate=01-01-2024
         *      - ?endDate=31-12-2024
         *      - ?startDate=01-01-2024&endDate=31-12-2024
         */
        if (startDate || endDate) {
            let start: Date | null = null;
            let end: Date | null = null;

            if (startDate && typeof startDate === 'string') {
                start = parseDate(startDate);
                if (!start) {
                    console.error(`[ERROR] Invalid date format for startDate`);
                    res.status(400).json({ message: 'Invalid startDate format. Please use "DD-MM-YYYY".' });
                    return;
                }
                start.setHours(0, 0, 0, 0); // Normalize to start of the day
            }

            if (endDate && typeof endDate === 'string') {
                end = parseDate(endDate);
                if (!end) {
                    console.error(`[ERROR] Invalid date format for endDate`);
                    res.status(400).json({ message: 'Invalid endDate format. Please use "DD-MM-YYYY".' });
                    return;
                }
                end.setHours(23, 59, 59, 999); // Normalize to end of the day
            }

            portfolioData = portfolioData.filter((entry) => {
                const entryDate = parseDate(entry.date);
                if (!entryDate) {
                    console.warn(`[WARN] Skipping entry with invalid date format: ${entry.date}`);
                    return false;
                }
                if (start && end) {
                    return entryDate >= start && entryDate <= end;
                } else if (start) {
                    return entryDate >= start;
                } else if (end) {
                    return entryDate <= end;
                }
                return true; // No date filter applied
            });

            console.log(`[DEBUG] Filtered portfolio data for date range:`, portfolioData);
        }

        /**
         * 2. Filter by Total Gain/Loss Threshold
         *    - Users can provide minTotalGain, maxTotalGain, or both.
         *    - Example:
         *      - ?minTotalGain=-1000
         *      - ?maxTotalGain=5000
         *      - ?minTotalGain=-1000&maxTotalGain=5000
         */
        if (minTotalGain || maxTotalGain) {
            let minGain: number | undefined;
            let maxGain: number | undefined;

            if (minTotalGain) {
                minGain = parseFloat(minTotalGain as string);
                if (isNaN(minGain)) {
                    console.error(`[ERROR] Invalid value for minTotalGain`);
                    res.status(400).json({ message: 'Invalid value for minTotalGain. It should be a number.' });
                    return;
                }
            }

            if (maxTotalGain) {
                maxGain = parseFloat(maxTotalGain as string);
                if (isNaN(maxGain)) {
                    console.error(`[ERROR] Invalid value for maxTotalGain`);
                    res.status(400).json({ message: 'Invalid value for maxTotalGain. It should be a number.' });
                    return;
                }
            }

            portfolioData = portfolioData.filter((entry) => {
                const totalGain = entry.totalprofitandloss; // Corrected property name
                if (minGain !== undefined && totalGain < minGain) return false;
                if (maxGain !== undefined && totalGain > maxGain) return false;
                return true;
            });

            console.log(`[DEBUG] Applied Total Gain/Loss Threshold Filter - min: ${minGain !== undefined ? minGain : 'None'}, max: ${maxGain !== undefined ? maxGain : 'None'}`, portfolioData);
        }

        /**
         * 3. Filter by Portfolio Value Threshold
         *    - Users can provide minPortfolioValue, maxPortfolioValue, or both.
         *    - Example:
         *      - ?minPortfolioValue=10000
         *      - ?maxPortfolioValue=50000
         *      - ?minPortfolioValue=10000&maxPortfolioValue=50000
         */
        if (minPortfolioValue || maxPortfolioValue) {
            let minValue: number | undefined;
            let maxValue: number | undefined;

            if (minPortfolioValue) {
                minValue = parseFloat(minPortfolioValue as string);
                if (isNaN(minValue)) {
                    console.error(`[ERROR] Invalid value for minPortfolioValue`);
                    res.status(400).json({ message: 'Invalid value for minPortfolioValue. It should be a number.' });
                    return;
                }
            }

            if (maxPortfolioValue) {
                maxValue = parseFloat(maxPortfolioValue as string);
                if (isNaN(maxValue)) {
                    console.error(`[ERROR] Invalid value for maxPortfolioValue`);
                    res.status(400).json({ message: 'Invalid value for maxPortfolioValue. It should be a number.' });
                    return;
                }
            }

            portfolioData = portfolioData.filter((entry) => {
                const portfolioValue = entry.totalinvvalue; // Corrected property name
                if (minValue !== undefined && portfolioValue < minValue) return false;
                if (maxValue !== undefined && portfolioValue > maxValue) return false;
                return true;
            });

            console.log(`[DEBUG] Applied Portfolio Value Threshold Filter - min: ${minValue !== undefined ? minValue : 'None'}, max: ${maxValue !== undefined ? maxValue : 'None'}`, portfolioData);
        }

        /**
         * 4. Filter by Today's Total Gain
         *    - Users can provide minTodayGain, maxTodayGain, or both.
         *    - Example:
         *      - ?minTodayGain=100
         *      - ?maxTodayGain=500
         *      - ?minTodayGain=100&maxTodayGain=500
         */
        if (minTodayGain || maxTodayGain) {
            let minToday: number | undefined;
            let maxToday: number | undefined;

            if (minTodayGain) {
                minToday = parseFloat(minTodayGain as string);
                if (isNaN(minToday)) {
                    console.error(`[ERROR] Invalid value for minTodayGain`);
                    res.status(400).json({ message: 'Invalid value for minTodayGain. It should be a number.' });
                    return;
                }
            }

            if (maxTodayGain) {
                maxToday = parseFloat(maxTodayGain as string);
                if (isNaN(maxToday)) {
                    console.error(`[ERROR] Invalid value for maxTodayGain`);
                    res.status(400).json({ message: 'Invalid value for maxTodayGain. It should be a number.' });
                    return;
                }
            }

            portfolioData = portfolioData.filter((entry) => {
                const todayGain = entry.totalTodayGain;
                if (minToday !== undefined && todayGain < minToday) return false;
                if (maxToday !== undefined && todayGain > maxToday) return false;
                return true;
            });

            console.log(`[DEBUG] Applied Today's Total Gain Filter - min: ${minToday !== undefined ? minToday : 'None'}, max: ${maxToday !== undefined ? maxToday : 'None'}`, portfolioData);
        }

        /**
         * Summary of Applied Filters:
         * - Date Range: [startDate] to [endDate]
         * - Total Gain/Loss: [minTotalGain] to [maxTotalGain]
         * - Portfolio Value: [minPortfolioValue] to [maxPortfolioValue]
         * - Today's Total Gain: [minTodayGain] to [maxTodayGain]
         */
        console.log(`[INFO] Applied Filters - Date Range: ${startDate ? startDate : 'None'} to ${endDate ? endDate : 'None'}, Total Gain/Loss: ${minTotalGain ? minTotalGain : 'None'} to ${maxTotalGain ? maxTotalGain : 'None'}, Portfolio Value: ${minPortfolioValue ? minPortfolioValue : 'None'} to ${maxPortfolioValue ? maxPortfolioValue : 'None'}, Today's Total Gain: ${minTodayGain ? minTodayGain : 'None'} to ${maxTodayGain ? maxTodayGain : 'None'}`);

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
    const {
        startDate,
        endDate,
        symbol,
        exchange,
        minPnlPercentage,
        maxPnlPercentage,
        minOverallPnL,
        maxOverallPnL,
        minQuantity,
        maxQuantity
    } = req.query;

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
         *    - Users can provide one or multiple symbols separated by commas.
         *    - Example: ?symbol=AARTIDRUGS-EQ,BANKBARODA-EQ
         */
        if (symbol) {
            const symbols: string[] = parseStringParam(symbol);
            filteredStocks = filteredStocks.filter((stock) => symbols.includes(stock.stockName));
            console.log(`[DEBUG] Filtered stocks by symbols: ${symbols.join(', ')}`, filteredStocks);
        }

        /**
         * 2. Filter by Exchange
         *    - Users can provide one or multiple exchanges separated by commas.
         *    - Example: ?exchange=NSE,BSE
         */
        if (exchange) {
            const exchanges: string[] = parseStringParam(exchange);
            filteredStocks = filteredStocks.map((stock) => {
                const filteredEntries = stock.entries.filter((entry) => exchanges.includes(entry.exchange));
                return {
                    ...stock,
                    entries: filteredEntries,
                };
            }).filter(stock => stock.entries.length > 0); // Retain stocks with entries after filtering
            console.log(`[DEBUG] Filtered stocks by exchanges: ${exchanges.join(', ')}`, filteredStocks);
        }

        /**
         * 3. Filter by Date Range
         *    - Users can provide startDate, endDate, or both.
         *    - Dates should be in "DD-MM-YYYY" format.
         *    - Examples:
         *      - ?startDate=01-01-2024
         *      - ?endDate=31-12-2024
         *      - ?startDate=01-01-2024&endDate=31-12-2024
         */
        if (startDate || endDate) {
            let start: Date | null = null;
            let end: Date | null = null;

            if (startDate && typeof startDate === 'string') {
                start = parseDate(startDate);
                if (!start) {
                    console.error(`[ERROR] Invalid date format for startDate`);
                    res.status(400).json({ message: 'Invalid startDate format. Please use "DD-MM-YYYY".' });
                    return;
                }
                start.setHours(0, 0, 0, 0); // Normalize to start of the day
            }

            if (endDate && typeof endDate === 'string') {
                end = parseDate(endDate);
                if (!end) {
                    console.error(`[ERROR] Invalid date format for endDate`);
                    res.status(400).json({ message: 'Invalid endDate format. Please use "DD-MM-YYYY".' });
                    return;
                }
                end.setHours(23, 59, 59, 999); // Normalize to end of the day
            }

            filteredStocks = filteredStocks.map((stock) => {
                const filteredEntries = stock.entries.filter((entry) => {
                    const entryDate = parseDate(entry.date);
                    if (!entryDate) {
                        console.warn(`[WARN] Skipping entry with invalid date format: ${entry.date}`);
                        return false;
                    }
                    if (start && end) {
                        return entryDate >= start && entryDate <= end;
                    } else if (start) {
                        return entryDate >= start;
                    } else if (end) {
                        return entryDate <= end;
                    }
                    return true; // No date filter applied
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
         *    - Users can provide minPnlPercentage, maxPnlPercentage, or both.
         *    - Example:
         *      - ?minPnlPercentage=-10
         *      - ?maxPnlPercentage=20
         *      - ?minPnlPercentage=-10&maxPnlPercentage=20
         */
        if (minPnlPercentage || maxPnlPercentage) {
            let minPnl: number | undefined;
            let maxPnl: number | undefined;

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

            console.log(`[DEBUG] Applied PnL Percentage Filter - min: ${minPnl !== undefined ? minPnl : 'None'}, max: ${maxPnl !== undefined ? maxPnl : 'None'}`, filteredStocks);
        }

        /**
         * 5. Filter by Overall Profit and Loss Amount
         *    - Users can provide minOverallPnL, maxOverallPnL, or both.
         *    - Example:
         *      - ?minOverallPnL=-500
         *      - ?maxOverallPnL=500
         *      - ?minOverallPnL=-500&maxOverallPnL=500
         */
        if (minOverallPnL || maxOverallPnL) {
            let minPnL: number | undefined;
            let maxPnL: number | undefined;

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

            console.log(`[DEBUG] Applied Overall PnL Filter - min: ${minPnL !== undefined ? minPnL : 'None'}, max: ${maxPnL !== undefined ? maxPnL : 'None'}`, filteredStocks);
        }

        /**
         * 6. Filter by Quantity
         *    - Users can provide minQuantity, maxQuantity, or both.
         *    - Example:
         *      - ?minQuantity=10
         *      - ?maxQuantity=100
         *      - ?minQuantity=10&maxQuantity=100
         */
        if (minQuantity || maxQuantity) {
            let minQty: number | undefined;
            let maxQty: number | undefined;

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

            console.log(`[DEBUG] Applied Quantity Filter - min: ${minQty !== undefined ? minQty : 'None'}, max: ${maxQty !== undefined ? maxQty : 'None'}`, filteredStocks);
        }

        /**
         * Summary of Applied Filters:
         * - Symbol(s): [symbols]
         * - Exchange(s): [exchanges]
         * - Date Range: [startDate] to [endDate]
         * - PnL Percentage: [minPnlPercentage] to [maxPnlPercentage]
         * - Overall PnL: [minOverallPnL] to [maxOverallPnL]
         * - Quantity: [minQuantity] to [maxQuantity]
         */
        console.log(`[INFO] Applied Filters - Symbol(s): ${symbol ? (Array.isArray(symbol) ? (symbol as string[]).join(', ') : (symbol as string).split(',').map(s => s.trim()).join(', ')) : 'None'}, Exchange(s): ${exchange ? (Array.isArray(exchange) ? (exchange as string[]).join(', ') : (exchange as string).split(',').map(e => e.trim()).join(', ')) : 'None'}, Date Range: ${startDate ? startDate : 'None'} to ${endDate ? endDate : 'None'}, PnL Percentage: ${minPnlPercentage ? minPnlPercentage : 'None'} to ${maxPnlPercentage ? maxPnlPercentage : 'None'}, Overall PnL: ${minOverallPnL ? minOverallPnL : 'None'} to ${maxOverallPnL ? maxOverallPnL : 'None'}, Quantity: ${minQuantity ? minQuantity : 'None'} to ${maxQuantity ? maxQuantity : 'None'}`);

        // Send the filtered data
        res.status(200).json(filteredStocks);
    } catch (error) {
        console.error(`[ERROR] Error fetching stock data for clientId: ${clientId}`, error);
        res.status(500).json({ message: 'Error fetching stock data', error });
    }
};







/**
 * Get Combined Portfolio and Stock Data by Client
 * - Endpoint: GET /portfolio/combined/:clientId
 * - Purpose: Retrieve both overall portfolio data and individual stock data for a specified client.
 * - Response: Returns an object containing both portfolio and stock data.
 */
export const getCombinedPortfolioData: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { clientId } = req.params;

    console.log(`[INFO] Fetching combined portfolio and stock data for clientId: ${clientId}`);

    try {
        // Fetch overall portfolio data
        const portfolioPromise = ClientPortfolio.findOne({ ClientCode: clientId }).lean<IClientPortfolio>();
        
        // Fetch individual stock data
        const stockPortfolioPromise = StockPortfolio.findOne({ ClientCode: clientId }).lean<IStockPortfolio>();

        // Execute both queries in parallel
        const [portfolio, stockPortfolio] = await Promise.all([portfolioPromise, stockPortfolioPromise]);

        console.log(`[DEBUG] Retrieved portfolio document:`, portfolio);
        console.log(`[DEBUG] Retrieved stock portfolio document:`, stockPortfolio);

        // Check if both portfolio and stock data exist
        if (!portfolio && !stockPortfolio) {
            console.warn(`[WARN] Neither portfolio nor stock portfolio found for clientId: ${clientId}`);
            res.status(404).json({ message: 'No portfolio or stock data found for this client' });
            return;
        }

        // Prepare the combined response
        const combinedData: { portfolio?: IClientPortfolio; stockPortfolio?: IStockPortfolio } = {};

        if (portfolio) {
            combinedData.portfolio = portfolio;
        } else {
            console.warn(`[WARN] Portfolio data not found for clientId: ${clientId}`);
        }

        if (stockPortfolio) {
            combinedData.stockPortfolio = stockPortfolio;
        } else {
            console.warn(`[WARN] Stock portfolio data not found for clientId: ${clientId}`);
        }

        // Send the combined data
        res.status(200).json(combinedData);
    } catch (error) {
        console.error(`[ERROR] Error fetching combined data for clientId: ${clientId}`, error);
        res.status(500).json({ message: 'Error fetching combined portfolio and stock data', error });
    }
};