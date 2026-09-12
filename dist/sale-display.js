(()=>{
 'use strict';
 // Captured HTML contains pre-sale prices. Run once, before commerce renders
 // the already-discounted catalog. Never observe or discount dynamic prices.
 if(document.documentElement.dataset.saleApplied)return;
 document.documentElement.dataset.saleApplied='60-off-v1';
 const selectors='[class*="price"],[class*="preco"],[class*="parcela"],[class*="titulo-valor"],[class*="comparativo"],.MobQuickBuy__por,.MobQuickBuy__savings,[role="option"],[role="radio"],[aria-label="Preço à vista"]';
 const old='.card__prices-preco-de,.preco-de-default,.topo__info-preco-de,.submenu-vitrine__price-de,del';
 document.querySelectorAll(old+',.discount-tag').forEach(el=>el.remove());
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 const money=/R\$[\s\u00a0]*([\d.]+,\d{2})/g;
 while(walker.nextNode()){const node=walker.currentNode,parent=node.parentElement;if(!parent||!parent.closest(selectors)||parent.closest('script,style,#progress-bar-valor-frete,[role="progressbar"]'))continue;
 node.nodeValue=node.nodeValue.replace(money,(_,v)=>{const cents=Math.round(Number(v.replaceAll('.','').replace(',','.'))*100);return 'R$ '+(Math.round(cents*40/100)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});});}
 document.querySelectorAll('[data-option-text]').forEach(el=>{el.dataset.optionText=el.dataset.optionText.replace(money,(_,v)=>'R$ '+(Math.round(Math.round(Number(v.replaceAll('.','').replace(',','.'))*100)*40/100)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}));});
 document.querySelectorAll('.card__prices,[aria-label="Preço à vista"]').forEach(el=>{const badge=document.createElement('span');badge.textContent='60% OFF';badge.style.cssText='display:inline-block;margin:4px 8px;font-size:14px;font-weight:700;color:#087b32';el.append(badge);});
})();
