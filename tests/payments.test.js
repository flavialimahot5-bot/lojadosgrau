import test from 'node:test';
import assert from 'node:assert/strict';
import {configuration,priceCart,customerData,quote,create,view,webhook,sign} from '../lib/payments.js';
const env={IRONPAY_API_TOKEN:'test-only-secret',IRONPAY_PRODUCT_HASH:'test-product',IRONPAY_OFFER_HASH:'test-offer',CHECKOUT_SIGNING_SECRET:'test-only-signing-secret-32-characters-minimum',UPSTASH_REDIS_REST_URL:'https://redis.example.test',UPSTASH_REDIS_REST_TOKEN:'redis-test-only',CHECKOUT_SITE_URL:'https://shop.example.test',PAYMENTS_ENABLED:'true'};
Object.assign(process.env,env);
const customer={name:'Pessoa Teste',email:'qa@example.test',phone_number:'11999999999',document:'52998224725',street_name:'Rua de teste',number:'1',complement:'',neighborhood:'Centro',city:'São Paulo',state:'SP',zip_code:'01001000'};
const catalog=[{id:'one',name:'Produto',price:15990,groups:[{name:'Tamanho',options:[{name:'M'},{name:'P',disabled:true}]}]}];
test('configuration fails closed with missing secrets',()=>{assert.equal(configuration({}).ready,false);assert.equal(configuration({...env,PAYMENTS_ENABLED:'false'}).ready,false);assert.equal(configuration(env).ready,true)});
test('server pricing ignores browser amounts and validates variations',async()=>{const deps={catalog,loadGroups:async p=>p.groups};const cart=await priceCart([{id:'one',quantity:2,price:1,options:{Tamanho:'M'}}],990,deps);assert.equal(cart.amount,32970);await assert.rejects(priceCart([{id:'one',quantity:1,options:{Tamanho:'P'}}],0,deps));await assert.rejects(priceCart([{id:'one',quantity:-1,options:{Tamanho:'M'}}],0,deps));await assert.rejects(priceCart([{id:'one',quantity:1,options:{}}],0,deps))});
test('invalid CPF and missing shipping address rejected',()=>{assert.equal(customerData(customer).document,'52998224725');assert.throws(()=>customerData({...customer,document:'11111111111'}));assert.throws(()=>customerData({...customer,street_name:''}))});
test('Pix lifecycle: idempotency, secret redaction and verified webhooks',async()=>{
 const originalFetch=globalThis.fetch,store=new Map(),provider=new Map();let posts=0,lastPayload,ambiguous=false;
 globalThis.fetch=async(url,options)=>{if(String(url)===env.UPSTASH_REDIS_REST_URL){const [op,key,...args]=JSON.parse(options.body);let value=store.get(key),result;
 if(op==='HSET'){value=value||{};for(let i=0;i<args.length;i+=2)value[args[i]]=args[i+1];store.set(key,value);result=1}
 else if(op==='HGETALL')result=value?Object.entries(value).flat():[];
 else if(op==='SET'){if(args.includes('NX')&&store.has(key))result=null;else{store.set(key,args[0]);result='OK'}}
 else if(op==='EXPIRE')result=1;else throw Error(op);return{ok:true,json:async()=>({result})};}
 assert.ok(String(url).startsWith('https://api.ironpayapp.com.br/api/public/v1/transactions'));assert.ok(String(url).includes('api_token='));
 if(options.method==='POST'){posts++;lastPayload=JSON.parse(options.body);if(ambiguous)throw Error('timeout after provider may have accepted');const hash='transaction'+posts;const data={hash,amount:lastPayload.amount,payment_method:'pix',payment_status:'pending',customer:{document:customer.document},pix:{pix_qr_code:'000201010212test-only-pix-payload'},token:'NEVER-RETURN-PROVIDER-TOKEN'};provider.set(hash,data);return{ok:true,json:async()=>data}}
 const hash=new URL(url).pathname.split('/').at(-1);return{ok:true,json:async()=>({data:provider.get(hash)})};};
 try{const q=await quote([{id:'4576',quantity:1,price:1,options:{Tamanho:'M'}}],'sedex');assert.equal(q.amount,16980);const replies=await Promise.all([create(q.id,q.accessToken,customer),create(q.id,q.accessToken,customer)]);assert.equal(posts,1);assert.equal(lastPayload.payment_method,'pix');assert.equal(lastPayload.amount,16980);assert.equal(lastPayload.cart.at(-1).price,990);assert.equal(lastPayload.cart[0].tangible,true);assert.ok(!JSON.stringify(replies).includes('NEVER-RETURN'));assert.ok(!JSON.stringify(replies).includes(env.IRONPAY_API_TOKEN));const current=await view(q.id,q.accessToken);assert.ok(current.qrCode.startsWith('data:image/png;base64,'));assert.equal(current.state,'pending');await assert.rejects(view(q.id,'wrong'));
 await assert.rejects(webhook(q.id,'wrong','transaction1'));await webhook(q.id,sign('webhook:'+q.id),'transaction1');assert.equal((await view(q.id,q.accessToken)).state,'pending');provider.get('transaction1').payment_status='paid';await webhook(q.id,sign('webhook:'+q.id),'transaction1');assert.equal((await view(q.id,q.accessToken)).state,'paid');
 provider.get('transaction1').amount=1;await assert.rejects(webhook(q.id,sign('webhook:'+q.id),'transaction1'));
 ambiguous=true;const q2=await quote([{id:'4576',quantity:1,options:{Tamanho:'M'}}],'pac');await create(q2.id,q2.accessToken,customer);await create(q2.id,q2.accessToken,customer);assert.equal(posts,2);assert.equal((await view(q2.id,q2.accessToken)).state,'processing');assert.ok(!JSON.stringify([...store.values()]).includes(customer.email));
 }finally{globalThis.fetch=originalFetch}
});
