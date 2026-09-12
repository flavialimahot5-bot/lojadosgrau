import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';
const BASE='https://api.ironpayapp.com.br/api/public/v1';
const TTL=30*86400;
export class CheckoutError extends Error{constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new CheckoutError(status,message)};
export function configuration(env=process.env){
 const names=['IRONPAY_API_TOKEN','IRONPAY_PRODUCT_HASH','IRONPAY_OFFER_HASH','CHECKOUT_SIGNING_SECRET','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','CHECKOUT_SITE_URL'];
 const configured=names.every(n=>typeof env[n]==='string'&&env[n].length>0)&&env.CHECKOUT_SIGNING_SECRET.length>=32;
 let safe=false;try{safe=new URL(env.CHECKOUT_SITE_URL).protocol==='https:'&&new URL(env.UPSTASH_REDIS_REST_URL).protocol==='https:'}catch{}
 return {ready:configured&&safe&&env.PAYMENTS_ENABLED==='true',shippingMethods:[{id:'pac',name:'Correios PAC',price:0,description:'Entrega econômica'},{id:'sedex',name:'Correios SEDEX',price:990,description:'Estimativa de 1 a 2 dias úteis'}],site:env.CHECKOUT_SITE_URL?.replace(/\/$/,'')};
}
export const sign=(value,env=process.env)=>createHmac('sha256',env.CHECKOUT_SIGNING_SECRET).update(value).digest('hex');
export function equal(a,b){return typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b))}
export async function redis(command){
 const r=await fetch(process.env.UPSTASH_REDIS_REST_URL,{method:'POST',headers:{Authorization:'Bearer '+process.env.UPSTASH_REDIS_REST_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(8000)});
 if(!r.ok)fail(503,'Não foi possível acessar seu pedido. Tente novamente.');const data=await r.json();if(data.error)fail(503,'Não foi possível acessar seu pedido. Tente novamente.');return data.result;
}
let catalogPromise;
async function loadCatalog(){return catalogPromise??=fs.readFile(path.join(process.cwd(),'dist/data/catalog.json'),'utf8').then(JSON.parse)}
export async function priceCart(items,shipping,{catalog,loadGroups}={}){
 if(!Array.isArray(items)||!items.length||items.length>30)fail(400,'Confira os itens do carrinho.');
 const products=catalog||await loadCatalog(),map=new Map(products.map(p=>[p.id,p])),result=[],seen=new Set();
 for(const item of items){const p=map.get(String(item.id));if(!p||p.variantPending||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>99||!Number.isInteger(p.price)||p.price<=0)fail(400,'Um produto não está disponível para pagamento. Revise o carrinho.');
 let groups=p.groups||[];if(loadGroups)groups=await loadGroups(p);else{try{groups=JSON.parse(await fs.readFile(path.join(process.cwd(),'dist/data/variants/'+p.id+'.json'),'utf8')).groups||groups}catch(e){if(e.code!=='ENOENT')throw e}}
 const options=item.options||{};if(typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!groups.some(g=>g.name===k)))fail(400,'Variação inválida. Revise o carrinho.');
 const selected={},prices=new Set();for(const g of groups){const o=g.options?.find(o=>o.name===options[g.name]);if(!o||o.disabled)fail(400,'Selecione uma variação disponível para '+p.name+'.');selected[g.name]=o.name;const match=o.text?.match(/R\$\s*([\d.]+,\d{2})/);const value=Number.isInteger(o.price)?o.price:match?Math.round(Number(match[1].replaceAll('.','').replace(',','.'))*100):null;if(value)prices.add(value)}
 if(prices.size>1)fail(400,'O preço dessa combinação precisa ser revisado.');const price=prices.size?[...prices][0]:p.price;if(!Number.isSafeInteger(price)||price<1)fail(400,'Preço indisponível.');
 const key=p.id+'|'+JSON.stringify(selected);if(seen.has(key))fail(400,'Item duplicado. Ajuste a quantidade no carrinho.');seen.add(key);result.push({id:p.id,title:p.name,quantity:item.quantity,price,options:selected});
 }
 const subtotal=result.reduce((s,p)=>s+p.quantity*p.price,0),amount=subtotal+shipping;if(!Number.isSafeInteger(amount)||amount<100||amount>5000000)fail(400,'Valor do pedido fora do limite permitido.');return{items:result,subtotal,shipping,amount};
}
const digits=v=>String(v||'').replace(/\D/g,'');
export function customerData(raw){
 if(!raw||typeof raw!=='object')fail(400,'Preencha seus dados.');const c={};for(const [key,max] of Object.entries({name:100,email:150,phone_number:15,document:18,street_name:150,number:15,complement:100,neighborhood:100,city:100,state:2,zip_code:9})){if(typeof raw[key]!=='string'||raw[key].length>max||(key!=='complement'&&!raw[key].trim()))fail(400,'Confira seus dados e endereço.');c[key]=raw[key].trim()}
 for(const k of ['document','phone_number','zip_code'])c[k]=digits(c[k]);const n=c.document;const cpf=n.length===11&&!/^(\d)\1+$/.test(n)&&[9,10].every(size=>(([...n.slice(0,size)].reduce((s,x,i)=>s+Number(x)*(size+1-i),0)*10)%11)%10===Number(n[size]));
 if(!cpf||!/^\S+@\S+\.\S+$/.test(c.email)||c.name.split(/\s+/).length<2||!/^\d{10,11}$/.test(c.phone_number)||!/^\d{8}$/.test(c.zip_code)||!'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ').includes(c.state))fail(400,'Confira CPF, telefone, e-mail e endereço.');return c;
}
export async function iron(pathname,body){
 const url=new URL(BASE+pathname);url.searchParams.set('api_token',process.env.IRONPAY_API_TOKEN);
 // Never log this URL, token, request body or the raw provider response.
 const r=await fetch(url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Accept:'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(18000)});
 if(!r.ok)fail(502,'A operadora não confirmou a solicitação. Aguarde a verificação do pedido.');const json=await r.json();return json.data||json;
}
const key=id=>'checkout:order:'+id;
async function read(id){if(!/^[a-f0-9-]{36}$/.test(id||''))fail(404,'Pedido não encontrado.');const raw=await redis(['HGETALL',key(id)]);const r=Array.isArray(raw)?Object.fromEntries(Array.from({length:raw.length/2},(_,i)=>[raw[i*2],raw[i*2+1]])):raw;if(!r?.base)fail(404,'Pedido expirado ou não encontrado.');return{...JSON.parse(r.base),...r}}
async function write(id,fields){await redis(['HSET',key(id),...Object.entries(fields).flatMap(([k,v])=>[k,String(v)])])}
export async function rateLimit(req,bucket,limit){const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-real-ip']||req.socket?.remoteAddress||'unknown').split(',')[0];const k='checkout:limit:'+bucket+':'+sign(ip)+':'+Math.floor(Date.now()/60000);const n=await redis(['INCR',k]);if(n===1)await redis(['EXPIRE',k,120]);if(n>limit)fail(429,'Muitas tentativas. Aguarde um minuto.');}
export async function quote(items,shippingMethod){const method=configuration().shippingMethods.find(m=>m.id===shippingMethod);if(!method)fail(400,'Selecione a forma de entrega.');const priced=await priceCart(items,method.price);const id=randomUUID(),record={id,...priced,shippingMethod:method.id,createdAt:Date.now(),expiresAt:Date.now()+15*60000};await write(id,{base:JSON.stringify(record),state:'quoted'});await redis(['EXPIRE',key(id),TTL]);return{...record,accessToken:sign('access:'+id)}}
function auth(id,token){if(!equal(sign('access:'+id),token))fail(403,'Acesso ao pedido inválido.')}
export async function view(id,token,{refresh=false}={}){auth(id,token);let order=await read(id);if(refresh&&order.hash&&await redis(['SET','checkout:poll:'+id,'1','NX','EX',8])){try{await verifyProvider(order,await iron('/transactions/'+encodeURIComponent(order.hash)));order=await read(id)}catch{/* Polling failure must not invent a payment status. */}}
 let qr=null;if(order.pix&&order.pix.startsWith('000201'))qr=await QRCode.toDataURL(order.pix,{width:320,margin:2,errorCorrectionLevel:'M'});
 return{id:order.id,state:order.state,amount:order.amount,subtotal:order.subtotal,shipping:order.shipping,shippingMethod:order.shippingMethod,items:order.items,pixCode:order.pix||null,qrCode:qr,expiresAt:order.providerExpires||null};
}
export async function create(id,token,raw){auth(id,token);let order=await read(id);if(order.state!=='quoted')return view(id,token,{refresh:true});if(order.expiresAt<Date.now())fail(409,'A revisão do pedido expirou. Atualize o checkout.');const customer=customerData(raw);
 // Persist the creation lock BEFORE contacting IronPay. Never retry an ambiguous POST.
 const locked=await redis(['SET','checkout:create:'+id,'1','NX','EX',TTL]);if(!locked)return view(id,token,{refresh:true});
 await write(id,{state:'processing',documentDigest:sign('document:'+customer.document)});
 const payload={amount:order.amount,offer_hash:process.env.IRONPAY_OFFER_HASH,payment_method:'pix',installments:1,customer,cart:order.items.map(i=>({product_hash:process.env.IRONPAY_PRODUCT_HASH,title:(i.title+' '+Object.values(i.options).join(' / ')).slice(0,250),price:i.price,quantity:i.quantity,operation_type:1,tangible:true})),expire_in_days:1,transaction_origin:'api',postback_url:configuration().site+'/api/ironpay-webhook?order='+id+'&key='+sign('webhook:'+id)};
 if(order.shipping)payload.cart.push({product_hash:process.env.IRONPAY_PRODUCT_HASH,title:'Frete',price:order.shipping,quantity:1,operation_type:1,tangible:false});
 try{const data=await iron('/transactions',payload);if(typeof data.hash!=='string'||!/^[a-zA-Z0-9_-]{1,120}$/.test(data.hash))throw Error('missing hash');await write(id,{hash:data.hash});await verifyProvider(await read(id),data);const pix=data.pix?.pix_qr_code;if(typeof pix==='string'&&pix.startsWith('000201')&&pix.length<8000)await write(id,{pix});if(typeof data.expires_at==='string')await write(id,{providerExpires:data.expires_at});}
 catch{/* Keep processing/verified state. Retrying must not create another charge. */}
 return view(id,token);
}
export async function verifyProvider(order,data){
 if(Number(data.amount)!==order.amount||data.payment_method!=='pix'||(order.hash&&data.hash!==order.hash))fail(502,'Não foi possível confirmar os dados da transação.');
 if(!order.hash){const doc=digits(data.customer?.document);if(!doc||!equal(order.documentDigest,sign('document:'+doc)))fail(403,'Transação não corresponde ao pedido.');await write(order.id,{hash:data.hash})}
 const status=data.payment_status||data.status;const mapped={paid:'paid',pending:'pending',waiting_payment:'pending',canceled:'canceled',cancelled:'canceled',refunded:'refunded',expired:'expired',refused:'canceled'}[status];
 if(mapped){const current=await read(order.id);if(!(['paid','refunded'].includes(current.state)&&mapped==='pending'))await write(order.id,{state:mapped})}
 const pix=data.pix?.pix_qr_code;if(typeof pix==='string'&&pix.startsWith('000201')&&pix.length<8000)await write(order.id,{pix});
}
export async function webhook(id,token,hash){if(!equal(sign('webhook:'+id),token))fail(403,'Notificação inválida.');if(!/^[a-zA-Z0-9_-]{1,120}$/.test(hash||''))fail(400,'Transação inválida.');const order=await read(id);if(!order.documentDigest)fail(409,'Pedido ainda não iniciado.');await verifyProvider(order,await iron('/transactions/'+encodeURIComponent(hash)));}
export function respond(res,status,data){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');res.status(status).json(data)}
export function bodyOf(req){const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(Buffer.byteLength(raw)>20000)fail(413,'Solicitação muito grande.');try{return JSON.parse(raw)}catch{fail(400,'Solicitação inválida.')}}
