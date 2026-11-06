# Portfolio-Tracker-Backend

> TypeScript + Express REST API that serves Angel One portfolio snapshots (stock-level and overall) from MongoDB, bundled with esbuild and deployed serverless on Vercel.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

**Live:** [portfolio-tracker-backend.vercel.app](https://portfolio-tracker-backend.vercel.app)

Try the public demo: [`/portfolio/demo/combined`](https://portfolio-tracker-backend.vercel.app/portfolio/demo/combined). Real client codes need `MONGO_URI` pointing at data synced by [Portfolio-Tracker](https://github.com/optimus-node-js/Portfolio-Tracker).

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/portfolio/:clientId` | Overall portfolio (value, total gain/loss, dates) |
| `GET` | `/portfolio/:clientId/stocks` | Per-stock holdings and P&L |
| `GET` | `/portfolio/:clientId/combined` | Overall + stocks in one call |

## Structure

```
src/
├── server.ts
├── routes/portfolioRoutes.ts
├── controllers/PortfolioController.ts
├── models/ClientPortfolio.ts, StockPortfolio.ts
└── utils/queryHelpers.ts
build.js        # esbuild bundle
vercel.json
```

## Run locally

```bash
git clone https://github.com/optimus-node-js/Portfolio-Tracker-Backend.git
cd Portfolio-Tracker-Backend
```

```bash
npm install
echo "MONGO_URI=<your-mongodb-uri>" > .env
npm run build && npm start
```

**Stack:** [Portfolio-Tracker](https://github.com/optimus-node-js/Portfolio-Tracker) (ingestion) **Backend** [Portfolio-Tracker-Frontend](https://github.com/optimus-node-js/Portfolio-Tracker-Frontend)

---

## Author

**Rahul Vishwakarma**, Senior Full Stack Developer based in Ahmedabad, India

[![Portfolio](https://img.shields.io/badge/Portfolio-rahul--vishwakarma--portfolio.vercel.app-0A66C2?style=flat-square&logo=vercel&logoColor=white)](https://rahul-vishwakarma-portfolio.vercel.app/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Rahul%20Vishwakarma-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/rahul-vishwakarma-101346192)
[![Email](https://img.shields.io/badge/Email-karmarahul67%40gmail.com-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:karmarahul67@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-optimus--node--js-181717?style=flat-square&logo=github)](https://github.com/optimus-node-js)

