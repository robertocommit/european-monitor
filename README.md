# European Monitor

Public dashboards comparing the ten largest EU economies.

**Live:** https://europe-fuel-price-monitor.vercel.app/

## Dashboards

- **Fuel:** `index.html` — diesel and petrol prices, monthly and four-month trends, percentage changes.
- **Education:** `education.html` — 10-year government education expenditure, GDP share, nominal spending, per-capita spending and inflation-adjusted comparison.
- **Frontend:** `app.js` — interactive graphs, country selectors and tables.
- **Backend:** `api/prices.js` and `api/education.js` — data aggregation and CDN caching.
- **Deployment:** `vercel.json` — serverless function duration and refresh schedules.

## Official data

1. [European Commission Weekly Oil Bulletin](https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en), via fuel-prices.eu.
2. Eurostat `gov_10a_exp`: government expenditure on education (COFOG GF09, sector S13, TE).
3. Eurostat `tec00027`: HICP for the inflation-adjusted view.
4. Eurostat `demo_pjan`: population for per-capita comparisons.

Education spending includes operating costs and salaries — it is **not** limited to capital investment.

## Development and deployment

The site has static HTML/JavaScript and serverless API handlers deployed by Vercel. Configure a Vercel project to use this repository and select the root directory as the project source. No API credentials are stored in the repository.

**Note:** The existing public Vercel project originated as an API-uploaded project. Pushing to this repository does **not** update that existing deployment until Git integration is connected in the Vercel project settings.

The public API sources can be temporarily unavailable; the dashboard reports missing data instead of inventing estimates.
