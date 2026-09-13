// These sizes are separate catalog products, with their own price and stock.
export const sizeFamilies = [
  {'30 g':'1684','450 g':'4163','750 g':'4479','1 kg':'185'},
  {'30 g':'3454','1 kg':'196'},
  {'100 g':'71','250 g':'72','500 g':'3998'},
  {'60 caps':'3933','120 caps':'107'},
];
export function sizeProductId(id, label) {
  return sizeFamilies.find(family=>Object.values(family).includes(String(id)))?.[label.trim()];
}
export function productPage(product, mobile=false) {
  return product.originalPage
    ? (mobile&&product.mobileOriginalPage?'/pm/':'/p/')+encodeURIComponent(product.id)+'.html'
    : '/produto.html?id='+encodeURIComponent(product.id);
}
export function updatePriceText(root, value) {
  const walker=root.ownerDocument.createTreeWalker(root,4);
  while(walker.nextNode()) {
    const node=walker.currentNode;
    if(/R\$\s*[\d.]+,\d{2}/.test(node.nodeValue)) {
      node.nodeValue=node.nodeValue.replace(/R\$\s*[\d.]+,\d{2}/, (value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
      return;
    }
  }
}
