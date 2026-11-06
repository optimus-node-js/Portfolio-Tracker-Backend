import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import portfolioRoutes from './routes/portfolioRoutes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get(['/', '/health'], (_req, res) => {
    res.json({
        ok: true,
        service: 'portfolio-tracker-api',
        endpoints: ['GET /portfolio/:clientId', 'GET /portfolio/:clientId/stocks', 'GET /portfolio/:clientId/combined'],
        demo: '/portfolio/demo/combined',
    });
});
app.use('/portfolio', portfolioRoutes);
app.use((req, res) => { res.status(404).json({ message: `Not found: ${req.originalUrl}` }); });

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Portfolio Tracker API on http://localhost:${PORT}`));
}

export default app;
