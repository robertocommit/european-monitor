// Eurostat COFOG GF09: all general-government expenditure on education.
// This includes current expenditure; it is NOT a measure of capital investment alone.
const BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/";
const COUNTRIES = ["DE","FR","IT","ES","NL","PL","BE","IE","SE","AT"];
const PERIOD = { sinceTimePeriod: "2015", untilTimePeriod: "2025" };

function url(dataset, filters) {
  const u = new URL(BASE + dataset);
  Object.entries(filters).forEach(([key,value]) => u.searchParams.set(key,value));
  u.searchParams.set("lang","EN");
  return u.href;
}
async function get(dataset, filters) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(),18000);
  try {
    const response = await fetch(url(dataset,filters), {
      signal:controller.signal, headers:{Accept:"application/json"}
    });
    if(!response.ok) throw new Error(dataset + " HTTP " + response.status);
    const result = await response.json();
    if(!Array.isArray(result.id) || !Array.isArray(result.size) ||
       !result.dimension || !result.value) throw new Error("Invalid Eurostat response");
    return result;
  } finally { clearTimeout(timeout); }
}
function value(dataset, country, year) {
  if(!dataset) return null;
  let flatIndex=0;
  for(let i=0;i<dataset.id.length;i++) {
    const dim = dataset.id[i], indices=dataset.dimension?.[dim]?.category?.index;
    let position=0;
    if(dim==="geo"||dim==="time") {
      const key=dim==="geo"?country:String(year);
      position=Array.isArray(indices)?indices.indexOf(key):indices?.[key];
      if(!Number.isInteger(position)||position<0) return null;
    }
    let stride=1;
    for(let j=i+1;j<dataset.size.length;j++) stride*=dataset.size[j];
    flatIndex+=position*stride;
  }
  const result=dataset.value[flatIndex];
  return typeof result==="number" && Number.isFinite(result)?result:null;
}
export default async function handler(req,res) {
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  try {
    const responses=await Promise.allSettled([
      get("gov_10a_exp",{...PERIOD,freq:"A",unit:"PC_GDP",sector:"S13",cofog99:"GF09",na_item:"TE"}),
      get("gov_10a_exp",{...PERIOD,freq:"A",unit:"MIO_EUR",sector:"S13",cofog99:"GF09",na_item:"TE"}),
      get("tec00027",PERIOD),
      get("demo_pjan",{...PERIOD,freq:"A",unit:"NR",age:"TOTAL",sex:"T"})
    ]);
    if(responses[0].status!=="fulfilled"||responses[1].status!=="fulfilled") {
      console.error("Required Eurostat series missing",responses.map(r=>r.status));
      res.setHeader("Cache-Control","no-store");
      return res.status(503).json({error:"Eurostat education series unavailable"});
    }
    const [gdp,euros]=responses.map(r=>r.status==="fulfilled"?r.value:null);
    const h=responses[2].status==="fulfilled"?responses[2].value:null;
    const population=responses[3].status==="fulfilled"?responses[3].value:null;
    const last=COUNTRIES.every(cc=>value(gdp,cc,2025)!==null&&value(euros,cc,2025)!==null)?2025:2024;
    const years=Array.from({length:10},(_,i)=>last-9+i);
    const countries={};
    for(const cc of COUNTRIES) {
      countries[cc]={};
      for(const year of years) {
        const gdp_pct=value(gdp,cc,year);
        const million=value(euros,cc,year);
        const people=value(population,cc,year);
        const hicp=value(h,cc,year);
        countries[cc][year]={
          gdp_pct,
          eur_bn:million===null?null:million/1000,
          population:people,
          hicp,
          eur_per_capita:million!==null&&people>0?million*1000000/people:null
        };
      }
    }
    if(!COUNTRIES.some(cc=>years.some(y=>countries[cc][y].gdp_pct!==null))) {
      res.setHeader("Cache-Control","no-store");
      return res.status(503).json({error:"No usable Eurostat data"});
    }
    res.setHeader("Cache-Control","public, max-age=3600, s-maxage=604800, stale-while-revalidate=2592000");
    return res.status(200).json({
      source:"Eurostat",sourceDataset:"gov_10a_exp",
      hicpDataset:h?"tec00027":null,populationDataset:population?"demo_pjan":null,
      definition:"General government total expenditure on education COFOG GF09, not capital investment alone",
      realMethod:"All-items HICP adjustment, first-year purchasing power",
      years,countries,updatedAt:new Date().toISOString()
    });
  } catch(e) {
    console.error("Eurostat fetch failure",e);
    res.setHeader("Cache-Control","no-store");
    return res.status(503).json({error:"Eurostat temporarily unavailable"});
  }
}
