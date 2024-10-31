import express from 'express';
import { getPortfolioByClient, getStockDataByClient, getCombinedPortfolioData  } from '../controllers/PortfolioController';

const router = express.Router();

// Route to get the overall portfolio data by client ID
router.get('/:clientId', getPortfolioByClient);

// Route to get individual stock data for a client
router.get('/:clientId/stocks', getStockDataByClient);

// Route for the combined portfolio data and stock data for a client ID
router.get('/:clientId/combined', getCombinedPortfolioData);

export default router;
