import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {sizeProductId,productPage} from '../dist/product-variants.js';
import {selectedPrice} from '../dist/sale-pricing.js';
import {priceCart} from '../lib/payments.js';

const catalog=JSON.parse(await fs.readFile('dist/data/catalog.json','utf8'));
test('every captured size-navigation button resolves to an existing product and matching selected size',async()=>{
 let count=0;
 for(const folder of ['p','pm'])for(const file of await fs.readdir('dist/'+folder)){
  const html=await fs.readFile('dist/'+folder+'/'+file,'utf8');
  for(const match of html.matchAll(/<button\b[^>]*class="page-changer__page-button[^>]*>([\s\S]*?)<\/button>/g)){
   const label=match[1].trim(),id=sizeProductId(file.replace('.html',''),label);
   assert.ok(id,folder+'/'+file+': '+label);
   const product=catalog.find(p=>p.id===id);assert.ok(product?.price>0);
   for(const mobile of [true,false]){
    const target=await fs.readFile('dist'+productPage(product,mobile),'utf8');
    const selected=[...target.matchAll(/<button\b[^>]*aria-pressed="true"[^>]*class="page-changer__page-button[^>]*>([\s\S]*?)<\/button>/g)];
    assert.ok(selected.some(m=>m[1].trim()===label),id+': '+label);
   }
   count++;
  }
 }
 assert.ok(count>=34);
});

test('all priced variants agree with server quotes, including switching back to the base size',async()=>{
 let count=0;
 for(const product of catalog){
  let groups=product.groups||[];
  try{groups=JSON.parse(await fs.readFile('dist/data/variants/'+product.id+'.json','utf8')).groups||groups;}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!groups.some(g=>g.options.some(o=>o.price)))continue;
  const options=Object.fromEntries(groups.map(g=>[g.name,(g.options.find(o=>o.selected&&!o.disabled)||g.options.find(o=>!o.disabled))?.name]));
  for(const group of groups)for(const option of group.options.filter(o=>!o.disabled)){
   options[group.name]=option.name;
   const quote=await priceCart([{id:product.id,quantity:1,options:{...options}}],0);
   assert.equal(selectedPrice(product,groups,options),quote.items[0].price,product.id+' '+option.name);
   count++;
  }
 }
 assert.ok(count>20);
 const whey=catalog.find(p=>p.id==='4074');
 for(const [size,price] of [['750 g',4916],['900 g',5596],['450 g',2916]]){
  for(const flavor of ['Chocolate','Morango'])assert.equal(selectedPrice(whey,whey.groups,{Peso:size,Sabor:flavor}),price);
 }
});
