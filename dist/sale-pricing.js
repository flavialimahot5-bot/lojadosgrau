export function selectedPrice(product,groups,options={}){
 const prices=new Set();
 for(const group of groups||[]){const option=group.options?.find(o=>o.name===options[group.name]);if(!option)continue;
 const match=[...(option.text||'').matchAll(/R\$\s*([\d.]+,\d{2})/g)].at(-1);
 const value=Number.isInteger(option.price)?option.price:match?Math.round(Number(match[1].replaceAll('.','').replace(',','.'))*100):null;
 if(value)prices.add(value);}
 return prices.size===1?[...prices][0]:product.price;
}
export async function repriceSaleCart(cart,byId){
 const rows=await Promise.all(cart.map(async item=>{const p=byId.get(item.id);if(!p)return item;let groups=p.groups||[];
 try{const r=await fetch('/data/variants/'+encodeURIComponent(item.id)+'.json');if(r.ok)groups=(await r.json()).groups||groups;}catch{}
 return {...item,price:selectedPrice(p,groups,item.options||{}),saleVersion:p.saleVersion};}));
 localStorage.setItem('growth-cart-v1',JSON.stringify(rows));return rows;
}
