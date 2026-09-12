import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {priceCart} from '../lib/payments.js';
import {selectedPrice,repriceSaleCart} from '../dist/sale-pricing.js';
test('all catalog products and priced variants are 60% off their saved baseline',async()=>{
 const catalog=JSON.parse(await fs.readFile('dist/data/catalog.json','utf8'));
 assert.equal(catalog.length,1181);
 const checkGroups=groups=>{for(const g of groups||[])for(const o of g.options||[])if(o.regularPrice){assert.equal(o.price,Math.round(o.regularPrice*.4));}};
 for(const p of catalog){assert.equal(p.price,Math.round(p.regularPrice*.4));assert.equal(p.original,p.regularPrice);checkGroups(p.groups);}
 for(const name of await fs.readdir('dist/data/variants')){if(name.endsWith('.json'))checkGroups(JSON.parse(await fs.readFile('dist/data/variants/'+name,'utf8')).groups);}
 const p=catalog.find(p=>p.id==='4074'),options={Sabor:'Chocolate',Peso:'750 g'};
 assert.equal(selectedPrice(p,p.groups,options),4916);
 const quote=await priceCart([{id:p.id,quantity:2,options}],990);
 assert.equal(quote.subtotal,9832);assert.equal(quote.amount,10822);
 const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage;
 globalThis.fetch=async()=>({ok:false});globalThis.localStorage={setItem(){}};
 try{const rows=await repriceSaleCart([{id:p.id,quantity:2,options,price:12290}],new Map([[p.id,p]]));assert.equal(rows[0].price,4916);assert.equal((await repriceSaleCart(rows,new Map([[p.id,p]])))[0].price,4916);}finally{globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage;}
});
