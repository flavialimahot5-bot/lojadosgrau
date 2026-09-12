import {randomUUID} from 'node:crypto';
import QRCode from 'qrcode';
import {CheckoutError,IronPayError,configuration,priceCart,customerData,iron,sign,equal} from './payments.js';

// Signed receipts let any Vercel instance consult IronPay without a separate database.
// This memory cache only coalesces requests within one warm instance. It is NOT a
// durable or distributed idempotency guarantee; never retry an ambiguous creation.
const attempts=new Map(),limits=new Map();
const fail=(code,message)=>{throw new CheckoutError(code,message)};
const encode=data=>{const payload=Buffer.from(JSON.stringify(data)).toString('base64url');return payload+'.'+sign('pix-v2:'+payload)};
function decode(id,token){
 if(typeof token!=='string'||token.length>18000)fail(403,'Acesso ao pedido inválido.');
 const [payload,signature,...extra]=token.split('.');
 if(extra.length||!equal(sign('pix-v2:'+payload),signature))fail(403,'Acesso ao pedido inválido.');
 let data;try{data=JSON.parse(Buffer.from(payload,'base64url').toString())}catch{fail(403,'Pedido inválido.')}
 if(data.id!==id||!['quote','receipt','rejection'].includes(data.kind))fail(403,'Acesso ao pedido inválido.');
 if(data.validUntil<Date.now())fail(410,'Este acesso expirou. Consulte seu pedido com a loja.');
 return data;
}
export function rateLimit(req,bucket,limit){
 const now=Date.now();for(const [key,row] of limits)if(row.until<now)limits.delete(key);
 const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-real-ip']||req.socket?.remoteAddress||'unknown').split(',')[0];
 const key=bucket+':'+sign(ip);const row=limits.get(key)||{count:0,until:now+60000};
 row.count++;if(limits.size<10000||limits.has(key))limits.set(key,row);
 if(row.count>limit)fail(429,'Muitas tentativas. Aguarde um minuto.');
}
export async function quote(items,shippingMethod){
 const method=configuration().shippingMethods.find(m=>m.id===shippingMethod);
 if(!method)fail(400,'Selecione a forma de entrega.');
 const priced=await priceCart(items,method.price),now=Date.now();
 const data={kind:'quote',id:randomUUID(),amount:priced.amount,subtotal:priced.subtotal,shipping:priced.shipping,shippingMethod,createdAt:now,validUntil:now+15*60000,items:priced.items.map(({id,quantity,options})=>({id,quantity,options}))};
 return{...priced,id:data.id,state:'quoted',shippingMethod,accessToken:encode(data)};
}
function verify(receipt,data){
 if(data.hash!==receipt.hash||Number(data.amount)!==receipt.amount||data.payment_method!=='pix')fail(502,'Não foi possível confirmar os dados da transação.');
 const state={paid:'paid',approved:'paid',pending:'pending',waiting_payment:'pending',canceled:'canceled',cancelled:'canceled',refunded:'refunded',expired:'expired',refused:'canceled'}[data.payment_status||data.status]||'processing';
 const pix=data.pix?.pix_qr_code;
 return{...receipt,state,pixCode:typeof pix==='string'&&pix.startsWith('000201')&&pix.length<=4096?pix:receipt.pixCode||null,expiresAt:typeof data.expires_at==='string'?data.expires_at:receipt.expiresAt||null};
}
async function present(receipt){
 let qrCode=null;if(receipt.pixCode){try{qrCode=await QRCode.toDataURL(receipt.pixCode,{width:320,margin:2,errorCorrectionLevel:'M'})}catch{/* Keep Copia e Cola available even if image rendering fails. */}}
 return{id:receipt.id,accessToken:encode(receipt),state:receipt.state,amount:receipt.amount,subtotal:receipt.subtotal,shipping:receipt.shipping,shippingMethod:receipt.shippingMethod,pixCode:receipt.pixCode,qrCode,expiresAt:receipt.expiresAt,...(receipt.kind==='rejection'?{message:receipt.message,errorCode:receipt.errorCode}:{})};
}
const unknown=(order,diagnostic)=>({id:order.id,state:'unknown',amount:order.amount,subtotal:order.subtotal,shipping:order.shipping,shippingMethod:order.shippingMethod,...(diagnostic?{message:diagnostic+' Confira o pedido com a loja antes de gerar outro Pix.'}:{})});
export async function view(id,token){
 const receipt=decode(id,token);
 if(receipt.kind==='rejection')return present(receipt);
 if(receipt.kind==='quote')return attempts.has(id)?await attempts.get(id).result:unknown(receipt);
 return present(verify(receipt,await iron('/transactions/'+encodeURIComponent(receipt.hash))));
}
export async function create(id,token,raw){
 const q=decode(id,token);if(q.kind!=='quote')return view(id,token);
 if(attempts.has(id))return attempts.get(id).result;
 const customer=customerData(raw),priced=await priceCart(q.items,q.shipping);
 if(priced.amount!==q.amount)fail(409,'O valor foi atualizado. Volte ao carrinho para revisar.');
 // Recheck after asynchronous pricing before starting the one upstream POST.
 if(attempts.has(id))return attempts.get(id).result;
 for(const [key,row] of attempts)if(row.until<Date.now())attempts.delete(key);
 if(attempts.size>=2000)fail(503,'Pagamento ocupado. Aguarde um momento.');
 const result=(async()=>{
  const product=process.env.IRONPAY_PRODUCT_HASH.trim();
  const payload={amount:q.amount,offer_hash:process.env.IRONPAY_OFFER_HASH.trim(),payment_method:'pix',installments:1,customer,cart:priced.items.map(i=>({product_hash:product,cover:null,title:(i.title+' '+Object.values(i.options).join(' / ')).slice(0,250),price:i.price,quantity:i.quantity,operation_type:1,tangible:true})),expire_in_days:1,transaction_origin:'api'};
  if(q.shipping)payload.cart.push({product_hash:product,cover:null,title:'Frete',price:q.shipping,quantity:1,operation_type:1,tangible:false});
  let recovery=null;
  try{
   let data=await iron('/transactions',payload);
   if(typeof data.hash!=='string'||!/^[a-zA-Z0-9_-]{1,120}$/.test(data.hash))return unknown(q,'A resposta da IronPay veio sem identificador de transação. Código: IRONPAY_RESPONSE_INCOMPLETE.');
   const receipt={kind:'receipt',id,hash:data.hash,amount:q.amount,subtotal:q.subtotal,shipping:q.shipping,shippingMethod:q.shippingMethod,validUntil:Date.now()+30*86400000};
   recovery={...receipt,state:'processing',pixCode:null,expiresAt:null};
   // Some creation responses omit payment_method; consult the authenticated resource
   // before accepting the transaction instead of discarding a successfully created Pix.
   if(data.payment_method===undefined){const created=data;data=await iron('/transactions/'+encodeURIComponent(data.hash));if(!data.pix)data={...data,pix:created.pix};}
   return await present(verify(receipt,data));
  }catch(e){if(recovery)return present(recovery);if(e instanceof IronPayError&&e.rejected)return present({...unknown(q),kind:'rejection',state:'rejected',pixCode:null,expiresAt:null,validUntil:Date.now()+30*86400000,message:e.message,errorCode:e.code});return unknown(q,e instanceof IronPayError?e.message:'Não foi possível concluir a comunicação com a IronPay. Código: IRONPAY_RESPONSE_UNCONFIRMED.')}
 })();
 attempts.set(id,{result,until:q.validUntil});
 return result;
}
