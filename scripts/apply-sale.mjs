import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const discount=n=>Math.round(n*40/100);
const money=/R\$\s*([\d.]+,\d{2})/g;
function textPrices(text){return text.replace(money,(_,v)=>'R$'+(discount(Math.round(Number(v.replaceAll('.','').replace(',','.'))*100))/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}));}
function groups(rows){for(const g of rows||[])for(const o of g.options||[]){
 if(Number.isInteger(o.price)){o.regularPrice=o.price;o.price=discount(o.price);}
 if(o.text){const last=[...o.text.matchAll(money)].at(-1);if(!Number.isInteger(o.price)&&last){o.regularPrice=Math.round(Number(last[1].replaceAll('.','').replace(',','.'))*100);o.price=discount(o.regularPrice);}o.text=textPrices(o.text);}
}}
const file=path.join(root,'data/catalog.json'),catalog=JSON.parse(await fs.readFile(file,'utf8'));
let count=0;
for(const p of catalog){if(p.saleVersion==='60-off-v1')continue;if(Number.isInteger(p.price)&&p.price>0){p.regularPrice=p.price;p.original=p.price;p.price=discount(p.price);count++;}groups(p.groups);p.saleVersion='60-off-v1';}
await fs.writeFile(file,JSON.stringify(catalog));
for(const name of await fs.readdir(path.join(root,'data/variants'))){if(!name.endsWith('.json'))continue;const file=path.join(root,'data/variants',name),data=JSON.parse(await fs.readFile(file,'utf8'));if(data.saleVersion==='60-off-v1')continue;groups(data.groups);data.saleVersion='60-off-v1';await fs.writeFile(file,JSON.stringify(data));}
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='assets'&&entry.name!=='data')await walk(file);continue;}if(!entry.name.endsWith('.html'))continue;let html=await fs.readFile(file,'utf8');if(!html.includes('src="/sale-display.js"')){html=html.replace(/<script\b/i,'<script src="/sale-display.js" defer></script><script');await fs.writeFile(file,html);}}}
await walk(root);
// Mechanical integration into existing clients; idempotent on repeated execution.
for(const name of ['commerce.js','checkout.js']){const file=path.join(root,name);let code=await fs.readFile(file,'utf8');if(!code.includes('repriceSaleCart')){const marker=name==='commerce.js'?'let returnFocus=null;':"$('#loading').hidden=true;";code=code.replace(marker,"const {repriceSaleCart}=await import('/sale-pricing.js');cart=await repriceSaleCart(cart,byId);"+marker);await fs.writeFile(file,code);}}
console.log(JSON.stringify({discountedProducts:count,totalProducts:catalog.length}));
