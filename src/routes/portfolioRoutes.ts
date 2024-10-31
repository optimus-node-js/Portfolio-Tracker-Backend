import express from 'express';
import { getPortfolioByClient, getStockDataByClient } from '../controllers/PortfolioController';

const router = express.Router();

// Route to get the overall portfolio data by client ID
router.get('/:clientId', getPortfolioByClient);

// Route to get individual stock data for a client
router.get('/:clientId/stocks', getStockDataByClient);

export default router;
