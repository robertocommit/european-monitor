(()=>{
"use strict";
const $=id=>document.getElementById(id);
const countries=[["DE","Germania","#80baff"],["FR","Francia","#f7ad78"],["IT","Italia","#56d6a7"],["ES","Spagna","#dfcf72"],["NL","Paesi Bassi","#b4a0fd"],["PL","Polonia","#f08da3"],["BE","Belgio","#74dae2"],["IE","Irlanda","#e5b0de"],["SE","Svezia","#bdda77"],["AT","Austria","#c1b09e"]].map(([cc,name,color])=>({cc,name,color}));
const edu=document.body.dataset.type==="education";
const selected=new Set(countries.map(c=>c.cc));
const monthNames=["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
const dates=Array.from({length:24},(_,i)=>{const m=9+i;return (2024+Math.floor(m/12))+"-"+String(m%12+1).padStart(2,"0")});
let data=null,metric=edu?"gdp_pct":"diesel",granularity="four",baseline=edu?"initial":"initial",position=edu?9:5;
const isNumber=v=>typeof v==="number"&&Number.isFinite(v);
const fmt=(v,n=2)=>isNumber(v)?v.toLocaleString("it-IT",{minimumFractionDigits:n,maximumFractionDigits:n}):"—";
const pct=v=>isNumber(v)?(v>0?"+":"")+fmt(v,1)+"%":"—";
const euro=v=>isNumber(v)?v.toLocaleString("it-IT",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}):"—";
const signed=v=>!isNumber(v)||v===0?"":v>0?"rise":"fall";
const nameMonth=d=>monthNames[Number(d.slice(5,7))-1]+" '"+d.slice(2,4);
function status(msg,kind=""){const el=$("status");el.textContent=msg;el.className="notice "+kind;}
function chips(){$("counter").textContent=selected.size+"/10";$("chips").replaceChildren();for(const c of countries){const b=document.createElement("button");b.type="button";b.className="chip "+(selected.has(c.cc)?"":"off");b.innerHTML='<span class="dot" style="background:'+c.color+'"></span>'+c.name;b.onclick=()=>{selected.has(c.cc)?selected.delete(c.cc):selected.add(c.cc);chips();render()};$("chips").appendChild(b)}}
function controls(){
$("indicator").replaceChildren();
const indicators=edu?[["gdp_pct","% PIL"],["eur_bn","Miliardi €"],["eur_per_capita","€/abitante"],["real_bn","Spesa reale"]]:[["diesel","Gasolio"],["petrol","Benzina 95"]];
for(const [key,text]of indicators){const b=document.createElement("button");b.className="btn "+(metric===key?"active":"");b.textContent=text;b.onclick=()=>{metric=key;render()};$("indicator").appendChild(b)}
$("timescale").replaceChildren();
const choices=edu?[["initial","Dal primo anno"],["previous","Anno precedente"]]:[["four","Quadrimestri"],["month","Mesi"],["initial","Dall'inizio"],["previous","Periodo precedente"]];
for(const [key,text]of choices){const active=edu?baseline===key:(key==="four"||key==="month"?granularity===key:baseline===key);const b=document.createElement("button");b.className="btn "+(active?"active":"");b.textContent=text;b.onclick=()=>{if(key==="four"||key==="month"){granularity=key;position=key==="month"?23:5}else baseline=key;render()};$("timescale").appendChild(b)}
}
function eduValue(cc,y){const row=data?.countries?.[cc]?.[y];if(!row)return null;if(metric!=="real_bn")return row[metric]??null;const base=data?.countries?.[cc]?.[data.years[0]];return isNumber(row.eur_bn)&&isNumber(row.hicp)&&isNumber(base?.hicp)&&row.hicp>0?row.eur_bn*base.hicp/row.hicp:null}
function values(){
if(edu){const years=data?.years||Array.from({length:10},(_,i)=>2015+i);return years.map(y=>({label:String(y),values:Object.fromEntries(countries.map(c=>[c.cc,eduValue(c.cc,y)]))}))}
const m=dates.map(d=>{const vals={};for(const c of countries){const a=(data?.countries?.[c.cc]||[]).filter(r=>r.date.slice(0,7)===d).map(r=>r[metric]).filter(isNumber);vals[c.cc]=a.length>=2?a.reduce((x,y)=>x+y,0)/a.length:null}return {label:nameMonth(d),values:vals}});
if(granularity==="month")return m;
const list=[];for(let i=0;i<24;i+=4){const g=m.slice(i,i+4),r={label:g[0].label+" – "+g[3].label,short:g[0].label.slice(0,3)+"–"+g[3].label.slice(0,3)+" '"+dates[i].slice(2,4),values:{}};for(const c of countries){const v=g.map(row=>row.values[c.cc]);r.values[c.cc]=v.every(isNumber)?v.reduce((a,b)=>a+b,0)/4:null}list.push(r)}return list
}
function previous(i){return baseline==="previous"?i-1:0}
function change(rows,i,cc){const j=previous(i),a=rows[i]?.values[cc],b=rows[j]?.values[cc];return j<0||!isNumber(a)||!isNumber(b)||b===0?null:(a/b-1)*100}
function difference(rows,i,cc){const j=previous(i),a=rows[i]?.values[cc],b=rows[j]?.values[cc];return j<0||!isNumber(a)||!isNumber(b)?null:a-b}
function formatValue(v){if(!isNumber(v))return "—";return !edu?fmt(v,3)+" €/L":metric==="gdp_pct"?fmt(v,2)+"%":metric==="eur_per_capita"?euro(v):fmt(v,2)+" mld €"}
function unit(){return !edu?"€/L":metric==="gdp_pct"?"% PIL":metric==="eur_per_capita"?"€/ab.":metric==="real_bn"?"Mld € reali":"Mld €"}
function setKpi(id,val,fn,asChange=false){const e=$(id);e.textContent=fn(val);e.className="big "+(asChange?signed(val):"")}
function draw(svgId,rows,transform){
const svg=$(svgId),ns="http://www.w3.org/2000/svg";svg.replaceChildren();
const W=670,H=340,L=55,R=17,T=20,B=55,width=W-L-R,height=H-T-B;
const series=countries.filter(c=>selected.has(c.cc)).map(c=>({c,arr:rows.map((r,i)=>transform==="growth"?change(rows,i,c.cc):r.values[c.cc])}));
const nums=series.flatMap(s=>s.arr.filter(isNumber)),lo=nums.length?Math.min(...nums):0,hi=nums.length?Math.max(...nums):1;
const pad=Math.max((hi-lo)*.12,transform==="growth"?1:.02),min=Math.min(lo-pad,transform==="growth"?0:lo-pad),max=Math.max(hi+pad,transform==="growth"?0:hi+pad);
const x=i=>L+(rows.length>1?i*width/(rows.length-1):width/2),y=v=>T+height-(v-min)/(max-min)*height;
function element(tag,attrs,txt){const n=document.createElementNS(ns,tag);for(const k in attrs)n.setAttribute(k,String(attrs[k]));if(txt!==undefined)n.textContent=txt;svg.appendChild(n);return n}
for(let i=0;i<=4;i++){const v=min+(max-min)*i/4,yy=y(v);element("line",{x1:L,y1:yy,x2:W-R,y2:yy,stroke:"#344258","stroke-dasharray":i?"3 5":""});element("text",{x:L-8,y:yy+4,"text-anchor":"end",fill:"#9fb2cc","font-size":11},fmt(v,transform==="growth"?0:1)+(transform==="growth"?"%":""))}
rows.forEach((r,i)=>{if(rows.length>12&&i%3!==0)return;element("text",{x:x(i),y:H-27,"text-anchor":"middle",fill:"#99aec8","font-size":rows.length>12?9:11},r.short||r.label)});
if(transform==="growth"&&min<0&&max>0)element("line",{x1:L,y1:y(0),x2:W-R,y2:y(0),stroke:"#8296b0","stroke-dasharray":"4 4"});
for(const {c,arr}of series){let segments=[],part=[];arr.forEach((v,i)=>{if(isNumber(v))part.push([x(i),y(v)]);else if(part.length){segments.push(part);part=[]}});if(part.length)segments.push(part);for(const pts of segments){element("path",{d:pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(2)+" "+p[1].toFixed(2)).join(" "),fill:"none",stroke:c.color,"stroke-width":2.6,"stroke-linejoin":"round","stroke-linecap":"round"});if(rows.length<=10)pts.forEach(p=>element("circle",{cx:p[0],cy:p[1],r:2.5,fill:c.color}))}}
if(!data||!nums.length)element("text",{x:W/2,y:H/2,"text-anchor":"middle",fill:"#bdcfe4","font-size":15},!data?"In attesa dei dati":"Dati non disponibili");
}
function render(){
controls();const rows=values(),idx=Math.min(position,rows.length-1);position=Math.max(0,idx);
$("period").max=rows.length-1;$("period").value=position;$("periodname").textContent=rows[position]?.label||"—";
const it=change(rows,position,"IT"),fr=change(rows,position,edu?"FR":"DE"),chosen=countries.filter(c=>selected.has(c.cc)),changes=chosen.map(c=>change(rows,position,c.cc)).filter(isNumber),average=changes.length?changes.reduce((a,b)=>a+b,0)/changes.length:null;
$("k1label").textContent="Italia · variazione";setKpi("k1",it,pct,true);$("k1sub").textContent=formatValue(rows[position]?.values.IT);
$("k2label").textContent=(edu?"Francia":"Germania")+" · variazione";setKpi("k2",fr,pct,true);$("k2sub").textContent=formatValue(rows[position]?.values[edu?"FR":"DE"]);
$("k3label").textContent="Variazione media";setKpi("k3",average,pct,true);$("k3sub").textContent="Paesi selezionati";
const itVal=rows[position]?.values.IT,frVal=rows[position]?.values.FR,gap=isNumber(itVal)&&isNumber(frVal)?itVal-frVal:null;
$("k4label").textContent=edu?"Differenza Italia – Francia":"Italia · differenza su 500 L";
setKpi("k4",edu?gap:isNumber(difference(rows,position,"IT"))?500*difference(rows,position,"IT"):null,edu?(v=>isNumber(v)?(v>0?"+":"")+formatValue(v):"—"):euro,edu);
$("k4sub").textContent=edu?"Differenza nell'indicatore scelto":"Rispetto al riferimento";
$("fit").textContent=formatValue(itVal);$("ffr").textContent=formatValue(frVal);
$("focusdetails").textContent="Valori per "+rows[position].label+". "+(edu?"La differenza non misura direttamente la qualità scolastica.":"Medie nazionali; possono differire dai costi delle singole flotte.");
$("title1").textContent=edu?"Spesa pubblica per istruzione":"Prezzi carburanti";$("unit1").textContent=unit();
$("desc1").textContent=edu?"Serie Eurostat COFOG GF09":"Prezzi ufficiali inclusivi di imposte";
$("desc2").textContent=baseline==="initial"?"Variazione cumulata dal primo periodo":"Variazione rispetto al periodo precedente";
$("rankperiod").textContent=rows[position].label;
const ranked=chosen.map(c=>({...c,chg:change(rows,position,c.cc)})).filter(x=>isNumber(x.chg)).sort((a,b)=>b.chg-a.chg),scale=Math.max(1,...ranked.map(x=>Math.abs(x.chg)));
$("ranking").replaceChildren();for(let i=0;i<ranked.length;i++){const item=ranked[i],el=document.createElement("div");el.className="rank";const name=document.createElement("span");name.textContent=item.name;const bar=document.createElement("div");bar.className="track";const zero=document.createElement("span");zero.className="vertical";bar.append(zero);const fill=document.createElement("span");fill.className="fill";const w=49*Math.abs(item.chg)/scale;fill.style.width=w+"%";fill.style.left=(item.chg>=0?50:50-w)+"%";fill.style.background=item.chg>=0?"#fd968d":"#65d8ac";bar.append(fill);const value=document.createElement("strong");value.className=signed(item.chg);value.textContent=pct(item.chg);value.style.textAlign="right";el.append(name,bar,value);$("ranking").appendChild(el)}
const thead=$("head"),tbody=$("body");thead.replaceChildren();tbody.replaceChildren();
const head=document.createElement("tr"),start=document.createElement("th");start.textContent="Periodo";head.append(start);
for(const c of chosen)for(const text of [c.cc+" "+unit(),c.cc+" Δ%"]){const th=document.createElement("th");th.textContent=text;head.appendChild(th)}
thead.appendChild(head);
rows.forEach((row,i)=>{const tr=document.createElement("tr"),name=document.createElement("td");name.textContent=row.label;tr.appendChild(name);for(const c of chosen){const v=document.createElement("td");v.textContent=formatValue(row.values[c.cc]);tr.appendChild(v);const d=document.createElement("td"),n=change(rows,i,c.cc);d.textContent=pct(n);d.className=signed(n);tr.appendChild(d)}tbody.append(tr)});
if(!edu){const vol=Number($("volume").value);$("vollabel").textContent=vol.toLocaleString("it-IT")+" L";const chg=difference(rows,position,"IT");setKpi("volumechange",isNumber(chg)?chg*vol:null,euro,true)}
draw("chart1",rows,"values");draw("chart2",rows,"growth");
}
function setupSources(){$("sources").innerHTML=edu?'Fonte ufficiale: <a target="_blank" rel="noopener" href="https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table">Eurostat gov_10a_exp</a>, spesa pubblica per istruzione (S13, TE, COFOG GF09); indice HICP <a target="_blank" rel="noopener" href="https://ec.europa.eu/eurostat/databrowser/view/tec00027/default/table">tec00027</a>, popolazione <a target="_blank" rel="noopener" href="https://ec.europa.eu/eurostat/databrowser/view/demo_pjan/default/table">demo_pjan</a>. Gli importi reali sono corretti con HICP generale, non col deflatore dei servizi scolastici. Aggiornamento settimanale lato server e cache CDN.':'Fonte ufficiale: <a href="https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en" target="_blank" rel="noopener">Commissione europea, Weekly Oil Bulletin</a>, storico ripubblicato da fuel-prices.eu. Prezzi nazionali €/L con imposte; medie quadrimestrali delle medie mensili. Cache server CDN, aggiornamento giornaliero.'}
async function fetchData(){status("Caricamento dati "+(edu?"Eurostat":"carburanti")+" dal server…");
try{const response=await fetch(edu?"/api/education":"/api/prices");if(!response.ok)throw Error("HTTP "+response.status);const json=await response.json();if(!json.countries||edu&&!Array.isArray(json.years)||countries.some(c=>!json.countries[c.cc]))throw Error("Risposta incompleta");data=json;
if(edu){position=json.years.length-1;$("period").max=position}
status("Dati caricati · "+(edu?json.years[0]+"–"+json.years.at(-1):"24 mesi")+" · cache lato server attiva","ok");
}catch(err){status("Dati non disponibili: "+err.message+". La navigazione rimane utilizzabile; nessun dato viene inventato.","warning")}
render()}
$("all").onclick=()=>{for(const c of countries)selected.add(c.cc);chips();render()};
$("none").onclick=()=>{selected.clear();chips();render()};
$("focusbtn").onclick=()=>{selected.clear();selected.add("FR");selected.add("IT");chips();render()};
$("period").oninput=e=>{position=Number(e.target.value);render()};
if($("volume"))$("volume").oninput=render;
chips();setupSources();render();fetchData();
})();