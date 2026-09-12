(()=>{
 'use strict';
 // Captured HTML contains pre-sale prices. Run once, before commerce renders
 // the already-discounted catalog. Never observe or discount dynamic prices.
 if(document.documentElement.dataset.saleApplied)return;
 document.documentElement.dataset.saleApplied='60-off-v1';
 const selectors='[class*="price"],[class*="preco"],[class*="parcela"],[class*="titulo-valor"],[class*="comparativo"],.MobQuickBuy__por,.MobQuickBuy__savings,[role="option"],[role="radio"],[aria-label="Preço à vista"]';
 const old='.card__prices-preco-de,.preco-de-default,.topo__info-preco-de,.submenu-vitrine__price-de,del';
 document.querySelectorAll(old+',.discount-tag').forEach(el=>{if(el.matches('.card__prices-preco-de')||el.closest('.card__prices-preco-de')){el.style.visibility='hidden';el.setAttribute('aria-hidden','true');}else el.remove();});
 const style=document.createElement('style');style.textContent=`
 .card__prices{display:grid!important;grid-template-rows:18px 56px 36px!important;align-content:start!important;margin-top:auto!important;min-height:110px!important}
 .card__prices>.card__prices-preco-de{display:none!important}
 .card__prices>.card__prices__lowest-price--phrase{grid-row:1;line-height:18px!important;margin:0!important}
 .card__prices>.card__prices-best-price{grid-row:2;align-self:start;align-items:flex-start!important;margin:0!important}
 .card__prices-best-price-value{display:flex!important;align-items:baseline!important;flex-wrap:wrap;column-gap:8px!important;row-gap:0!important;line-height:28px!important}
 .card__prices .price{white-space:nowrap!important;flex-shrink:0;line-height:28px!important}
 .card__prices .discount-percent{white-space:nowrap;line-height:28px!important}
 .card__prices>.card__prices-condition{grid-row:3;align-self:start;line-height:18px!important;margin:0!important;min-height:36px}
 `;document.head.append(style);
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 const money=/R\$[\s\u00a0]*([\d.]+,\d{2})/g;
 while(walker.nextNode()){const node=walker.currentNode,parent=node.parentElement;if(!parent||!parent.closest(selectors)||parent.closest('script,style,#progress-bar-valor-frete,[role="progressbar"]'))continue;
 node.nodeValue=node.nodeValue.replace(money,(_,v)=>{const cents=Math.round(Number(v.replaceAll('.','').replace(',','.'))*100);return 'R$'+(Math.round(cents*40/100)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});});}
 document.querySelectorAll('[data-option-text]').forEach(el=>{el.dataset.optionText=el.dataset.optionText.replace(money,(_,v)=>'R$ '+(Math.round(Math.round(Number(v.replaceAll('.','').replace(',','.'))*100)*40/100)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}));});
 document.querySelectorAll('.card__prices .discount-percent').forEach(el=>{el.textContent='60% OFF';});
})();
