(async()=>{
'use strict';
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
window.addEventListener('storage',e=>{if(e.key==='growth-cart-v1')location.reload()});
const $=s=>document.querySelector(s),cash=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog,cart;try{const r=await fetch('/data/catalog.json');if(!r.ok)throw Error();catalog=await r.json();try{cart=JSON.parse(localStorage.getItem('growth-cart-v1')||'[]')}catch{cart=[]}}catch{$('#loading').textContent='Não foi possível carregar seu pedido. Atualize a página para tentar novamente.';return}
const byId=new Map(catalog.map(p=>[p.id,p]));cart=(Array.isArray(cart)?cart:[]).filter(i=>byId.has(i.id)&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=99&&Number.isInteger(i.price)&&i.price>0);
$('#loading').hidden=true;if(!cart.length){$('#empty').hidden=false;return}$('#checkout-layout').hidden=false;
const subtotal=cart.reduce((sum,i)=>sum+i.quantity*i.price,0);document.querySelectorAll('[data-subtotal]').forEach(e=>e.textContent=cash(subtotal));$('#item-count').textContent=cart.reduce((sum,i)=>sum+i.quantity,0);
const productUrl=p=>p.mobileOriginalPage&&matchMedia('(max-width:991px)').matches?'/pm/'+p.id+'.html':p.originalPage?'/p/'+p.id+'.html':'/produto.html?id='+p.id;
$('#order-items').innerHTML=cart.map(i=>{const p=byId.get(i.id),options=i.options&&typeof i.options==='object'?Object.values(i.options).join(' · '):'';return '<article class="order-item"><img src="'+esc(i.image||p.images[0])+'" alt="'+esc(p.name)+'"><div><h2>'+esc(p.name)+'</h2>'+(options?'<p>'+esc(options)+'</p>':'')+'<p>Quantidade: '+i.quantity+'</p></div><strong>'+cash(i.quantity*i.price)+'</strong></article>'}).join('');
const couponToggle=$('.coupon-toggle');couponToggle.onclick=()=>{const form=$('#coupon-form');form.hidden=!form.hidden;couponToggle.setAttribute('aria-expanded',String(!form.hidden));if(!form.hidden)$('#coupon').focus()};$('#coupon-form').onsubmit=e=>{e.preventDefault();$('#coupon-message').textContent='A aplicação de cupons está indisponível no momento.'};
const digits=v=>v.replace(/\D/g,'');
function mask(selector,format){const input=$(selector);input.addEventListener('input',()=>{input.setCustomValidity('');input.value=format(digits(input.value))})}
mask('#document',v=>v.slice(0,11).replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})(\d{1,2})$/,'$1-$2'));
mask('#phone',v=>{v=v.slice(0,11);return v.length>2?'('+v.slice(0,2)+') '+(v.length>10?v.slice(2,7)+'-'+v.slice(7):v.length>6?v.slice(2,6)+'-'+v.slice(6):v.slice(2)):v});
mask('#zip',v=>v.slice(0,8).replace(/^(\d{5})(\d)/,'$1-$2'));
// Only the postal code is sent to ViaCEP; personal fields stay on this page.
let zipTimer,zipController,zipVersion=0,zipPending=false,lastZip='',filledAddress={};
const addressFields=['street','district','city','state'];
function clearAutoAddress(){for(const [id,value] of Object.entries(filledAddress)){if($('#'+id).value===value)$('#'+id).value=''}filledAddress={}}
async function lookupZip(){
 const zip=digits($('#zip').value);if(zip.length!==8||zip===lastZip)return;
 clearTimeout(zipTimer);zipController?.abort();const version=++zipVersion;const controller=new AbortController();zipController=controller;zipPending=true;lastZip=zip;
 const baseline=Object.fromEntries(addressFields.map(id=>[id,$('#'+id).value]));$('#zip-status').textContent='Buscando endereço…';$('#zip').setAttribute('aria-busy','true');
 const timeout=setTimeout(()=>controller.abort(),8000);
 try{const response=await fetch('https://viacep.com.br/ws/'+zip+'/json/',{signal:controller.signal,referrerPolicy:'no-referrer'});if(!response.ok)throw Error('network');const data=await response.json();if(version!==zipVersion||digits($('#zip').value)!==zip)return;
 if(data.erro){$('#zip-status').textContent='CEP não encontrado. Confira o CEP ou preencha o endereço manualmente.';lastZip='';return}
 const values={street:data.logradouro,district:data.bairro,city:data.localidade,state:data.uf};
 for(const id of addressFields){const field=$('#'+id),value=values[id];if(typeof value==='string'&&value&&field.value===baseline[id]){field.value=value;filledAddress[id]=field.value}}
 const missing=addressFields.find(id=>!$('#'+id).value);$('#zip-status').textContent=missing?'CEP localizado. Complete os campos de endereço que ficaram em branco.':'Endereço preenchido. Informe o número e confira os dados.';
 if(document.activeElement===$('#zip'))$('#'+(missing||'number')).focus();
 }catch{if(version===zipVersion){lastZip='';$('#zip-status').textContent='Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.'}}
 finally{clearTimeout(timeout);if(version===zipVersion){zipPending=false;$('#zip').removeAttribute('aria-busy')}}
}
$('#zip').addEventListener('input',()=>{clearTimeout(zipTimer);zipController?.abort();zipVersion++;zipPending=false;lastZip='';clearAutoAddress();$('#zip-status').textContent='';$('#zip').removeAttribute('aria-busy');if(digits($('#zip').value).length===8){zipPending=true;zipTimer=setTimeout(lookupZip,350)}});
$('#zip').addEventListener('blur',()=>{if(digits($('#zip').value).length===8)lookupZip()});
for(const state of 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')){$('#state').add(new Option(state,state))}
function validCpf(value){const n=digits(value);if(n.length!==11||/^(\d)\1+$/.test(n))return false;return [9,10].every(size=>{const sum=[...n.slice(0,size)].reduce((s,x,i)=>s+Number(x)*(size+1-i),0);return ((sum*10)%11)%10===Number(n[size])})}
function go(step){for(let n=1;n<=3;n++)$('#step-'+n).hidden=n!==step;document.querySelectorAll('.progress li').forEach((e,i)=>{e.classList.toggle('current',i===step-1);e.classList.toggle('complete',i<step-1);if(i===step-1)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current')});const card=$('#step-'+step),title=card.querySelector('h1');title.tabIndex=-1;card.scrollIntoView({block:'start',behavior:'instant'});title.focus({preventScroll:true})}
$('#identity-form').onsubmit=e=>{e.preventDefault();const name=$('#name'),cpf=$('#document'),phone=$('#phone');name.setCustomValidity(name.value.trim().split(/\s+/).length<2?'Informe seu nome e sobrenome.':'');cpf.setCustomValidity(validCpf(cpf.value)?'':'Informe um CPF válido.');phone.setCustomValidity([10,11].includes(digits(phone.value).length)?'':'Informe um telefone com DDD.');if(!e.target.reportValidity())return;$('#identity-error').textContent='';go(2)};
$('#name').addEventListener('input',e=>e.target.setCustomValidity(''));
$('#address-form').onsubmit=e=>{e.preventDefault();if(zipPending){$('#zip-status').textContent='Aguarde a consulta do CEP antes de continuar.';return}if(!e.target.reportValidity())return;$('#identity-review').textContent=$('#name').value.trim()+'\n'+$('#email').value.trim()+'\n'+$('#phone').value;$('#address-review').textContent=$('#street').value.trim()+', '+$('#number').value.trim()+($('#complement').value?' — '+$('#complement').value.trim():'')+'\n'+$('#district').value.trim()+' · '+$('#city').value.trim()+' / '+$('#state').value+'\nCEP '+$('#zip').value;go(3)};
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>go(Number(b.dataset.back)));
// Personal and address fields stay in memory only. A payment provider must validate
// the catalog, stock, freight, discounts and prices on the server before charging.
const reviews=[];for(const id of [...new Set(cart.map(i=>i.id))].slice(0,4)){const p=byId.get(id);if(!p.originalPage)continue;try{const r=await fetch(p.mobileOriginalPage?'/pm/'+id+'.html':'/p/'+id+'.html');if(!r.ok)continue;const doc=new DOMParser().parseFromString(await r.text(),'text/html');for(const item of [...doc.querySelectorAll('#trustvox .ts-product-reviews-list-item')].slice(0,2)){const title=item.querySelector('.ts-review-title')?.textContent.trim(),body=item.querySelector('.ts-review')?.textContent.trim(),name=item.querySelector('.ts-value-title')?.firstChild?.textContent.trim(),rating=Number(item.querySelector('.ts-rating-number')?.textContent.trim());const text=title||body;if(!text||!name||!Number.isInteger(rating)||rating<1||rating>5)continue;reviews.push({name,text:text.length>200?text.slice(0,197)+'…':text,rating,product:p.name,url:productUrl(p)})}}catch{}}
if(reviews.length){$('#product-reviews').hidden=false;const show=i=>{$('#review-cards').innerHTML='<article class="review-card"><div class="review-stars" aria-label="'+reviews[i].rating+' de 5 estrelas">'+ '★'.repeat(reviews[i].rating)+'☆'.repeat(5-reviews[i].rating)+'</div><h3>'+esc(reviews[i].name)+'</h3><blockquote>'+esc(reviews[i].text)+'</blockquote><a href="'+esc(reviews[i].url)+'">'+esc(reviews[i].product)+'</a></article>';document.querySelectorAll('[data-review-index]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.reviewIndex)===i)))};$('#review-pagination').innerHTML=reviews.length>1?reviews.map((r,i)=>'<button type="button" data-review-index="'+i+'" aria-label="Avaliação '+(i+1)+'" aria-pressed="false"></button>').join(''):'';document.querySelectorAll('[data-review-index]').forEach(b=>b.onclick=()=>show(Number(b.dataset.reviewIndex)));show(0)}
})();
