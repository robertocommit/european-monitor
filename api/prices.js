const GEO = ["DE","FR","IT","ES","NL","PL","BE","IE","SE","AT"];
function price(x) {
  const n = Number(x);
  return Number.isFinite(n) && n > 0.5 && n < 5 ? n : null;
}
async function fetchCountry(cc) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const r = await fetch("https://www.fuel-prices.eu/lang/api/country-history.php?cc=" + cc, {
      signal: controller.signal, headers: { Accept: "application/json" }
    });
    if (!r.ok) throw new Error(cc + " HTTP " + r.status);
    const data = await r.json();
    if (!Array.isArray(data.labels) || !Array.isArray(data.e95) || !Array.isArray(data.diesel)) {
      throw new Error("Invalid history: " + cc);
    }
    const observations = data.labels.map((date, i) => ({
      date: String(date).slice(0,10),
      diesel: price(data.diesel[i]),
      petrol: price(data.e95[i])
    })).filter(row => row.date >= "2024-10-01" && row.date <= "2026-09-30");
    if (observations.length < 70) throw new Error("Incomplete history: " + cc);
    return observations;
  } finally { clearTimeout(timeout); }
}
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const results = await Promise.allSettled(GEO.map(fetchCountry));
  if (results.some(r => r.status !== "fulfilled")) {
    console.error("Fuel source failure", results.filter(r => r.status === "rejected").map(r => String(r.reason)));
    res.setHeader("Cache-Control","no-store");
    return res.status(503).json({ error: "Fuel prices temporarily unavailable" });
  }
  const countries = {};
  GEO.forEach((cc,i) => countries[cc] = results[i].value);
  res.setHeader("Cache-Control","public, max-age=3600, s-maxage=82800, stale-while-revalidate=604800");
  return res.status(200).json({
    source: "European Commission Weekly Oil Bulletin via fuel-prices.eu",
    countries, updatedAt: new Date().toISOString()
  });
}
