import test from 'node:test';
import assert from 'node:assert/strict';
import {configuration,quote,create,view} from '../lib/payments.js';
import handler from '../api/pix.js';
for(const key of ['CHECKOUT_SIGNING_SECRET','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','CHECKOUT_SITE_URL','PAYMENTS_ENABLED'])delete process.env[key];
const credentials={IRONPAY_API_TOKEN:'test-secret-not-real',IRONPAY_PRODUCT_HASH:'test-product',IRONPAY_OFFER_HASH:'test-offer'};
Object.assign(process.env,credentials);
const customer={name:'Pessoa Teste',email:'qa@example.test',phone_number:'11999999999',document:'52998224725',street_name:'Rua Teste',number:'1',complement:'',neighborhood:'Centro',city:'São Paulo',state:'SP',zip_code:'01001000'};
const items=[{id:'4576',quantity:1,options:{Tamanho:'M'},price:1}];
test('only the three IronPay credentials enable payments; blank credentials do not',()=>{
 assert.equal(configuration(credentials).ready,true);
 assert.equal(configuration({...credentials,IRONPAY_API_TOKEN:' '}).ready,false);
 assert.equal(configuration(credentials).site,'https://lojadosgrau.vercel.app');
});
test('public readiness reveals no credentials and cross-origin creation is rejected',async()=>{
 const res={setHeader(){},status(value){this.code=value;return this},json(value){this.data=value}};
 await handler({method:'GET'},res);assert.equal(res.data.ready,true);
 for(const secret of Object.values(credentials))assert.ok(!JSON.stringify(res.data).includes(secret));
 await handler({method:'POST',headers:{origin:'https://other.example','content-type':'application/json'},body:{}},res);
 assert.equal(res.code,403);
});
test('signed receipts resume on another instance; tampering and ambiguous retries are blocked',async()=>{
 const realFetch=globalThis.fetch;let posts=0,payload,timeout=false;const provider=new Map();
 globalThis.fetch=async(url,options)=>{
  assert.ok(String(url).startsWith('https://api.ironpayapp.com.br/api/public/v1/transactions'));
  if(options.method==='POST'){
   posts++;payload=JSON.parse(options.body);if(timeout)throw Error('timeout');
   const hash='test-transaction-'+posts;const data={hash,amount:payload.amount,payment_method:'pix',status:'pending',pix:{pix_qr_code:'000201-TEST-ONLY-NOT-FOR-PAYMENT'},token:'provider-private-token'};provider.set(hash,data);
   return{ok:true,json:async()=>data};
  }
  return{ok:true,json:async()=>({data:provider.get(new URL(url).pathname.split('/').at(-1))})};
 };
 try{
  const q=await quote(items,'sedex');assert.equal(q.amount,7386);
  const [a,b]=await Promise.all([create(q.id,q.accessToken,customer),create(q.id,q.accessToken,customer)]);
  assert.equal(posts,1);assert.equal(a.accessToken,b.accessToken);assert.equal(a.state,'pending');
  assert.equal(payload.amount,7386);assert.equal(payload.cart.at(-1).price,990);assert.equal(payload.payment_method,'pix');assert.ok(payload.cart.every(item=>item.cover===null));
  assert.ok(!payload.postback_url);assert.ok(a.qrCode.startsWith('data:image/png;base64,'));
  const decoded=Buffer.from(a.accessToken.split('.')[0],'base64url').toString();
  for(const secret of [...Object.values(credentials),customer.document,customer.email,'provider-private-token']){assert.ok(!decoded.includes(secret));assert.ok(!JSON.stringify(a).includes(secret))}
  const other=await import('../lib/pix-stateless.js?isolated-instance');
  assert.equal((await other.view(a.id,a.accessToken)).state,'pending');
  provider.get('test-transaction-1').status='paid';
  assert.equal((await other.view(a.id,a.accessToken)).state,'paid');
  assert.equal((await other.create(a.id,a.accessToken,customer)).state,'paid');assert.equal(posts,1);
  await assert.rejects(other.view(a.id,a.accessToken+'bad'));
  await assert.rejects(other.view('different-id',a.accessToken));
  provider.get('test-transaction-1').amount=1;await assert.rejects(other.view(a.id,a.accessToken));
  provider.get('test-transaction-1').amount=7386;provider.get('test-transaction-1').payment_method='credit_card';await assert.rejects(other.view(a.id,a.accessToken));
  timeout=true;const q2=await quote(items,'pac');
  assert.equal((await create(q2.id,q2.accessToken,customer)).state,'unknown');
  assert.equal((await create(q2.id,q2.accessToken,customer)).state,'unknown');assert.equal(posts,2);
  assert.equal((await other.view(q2.id,q2.accessToken)).state,'unknown');assert.equal(posts,2);
  const q3=await quote(items,'pac');await assert.rejects(create(q3.id,q3.accessToken,{...customer,document:'11111111111'}));assert.equal(posts,2);
 }finally{globalThis.fetch=realFetch}
});
test('provider rejection gives a safe diagnostic; accepted hashes survive incomplete responses',async()=>{
 const savedFetch=globalThis.fetch,savedWarn=console.warn;let mode='reject',posts=0;const logs=[];
 console.warn=value=>logs.push(value);
 globalThis.fetch=async(url,options)=>{
  if(options.method==='POST'){
   posts++;
   if(mode==='reject')return{ok:false,status:422,json:async()=>({message:'PRIVATE '+customer.document,errors:{'cart.0.cover':['SECRET '+credentials.IRONPAY_API_TOKEN],'customer.document':[customer.document]}})};
   return{ok:true,json:async()=>({hash:'accepted-hash',amount:6396,payment_status:'pending',pix:{pix_qr_code:'000201-test-only'}})};
  }
  if(mode==='lookup-fails')return{ok:false,status:401,json:async()=>({message:'private token'})};
  return{ok:true,json:async()=>({data:{hash:'accepted-hash',amount:6396,payment_method:'pix',status:'approved'}})};
 };
 try{
  const q=await quote(items,'pac'),r=await create(q.id,q.accessToken,customer);
  assert.equal(r.state,'rejected');assert.equal(r.errorCode,'IRONPAY_HTTP_422');const other=await import('../lib/pix-stateless.js?rejection-resume');assert.equal((await other.view(r.id,r.accessToken)).errorCode,'IRONPAY_HTTP_422');assert.match(r.message,/imagem do item/);
  await create(q.id,q.accessToken,customer);assert.equal(posts,1);
  for(const secret of [customer.document,credentials.IRONPAY_API_TOKEN,'PRIVATE','SECRET'])assert.ok(!JSON.stringify({r,logs}).includes(secret));
  mode='approved';const q2=await quote(items,'pac'),paid=await create(q2.id,q2.accessToken,customer);assert.equal(paid.state,'paid');
  mode='lookup-fails';const q3=await quote(items,'pac'),recoverable=await create(q3.id,q3.accessToken,customer);
  assert.equal(recoverable.state,'processing');assert.ok(recoverable.accessToken);assert.equal(recoverable.pixCode,null);
  mode='approved';assert.equal((await view(q3.id,recoverable.accessToken)).state,'paid');assert.equal(posts,3);
 }finally{globalThis.fetch=savedFetch;console.warn=savedWarn}
});
