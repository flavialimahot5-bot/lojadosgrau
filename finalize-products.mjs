import fs from 'node:fs/promises';
const mobile=(await fs.readFile('dist/mobile.html','utf8')).match(/<header\b[^]*?<\/header>/)[0];
const map=JSON.parse(await fs.readFile('reference/product-asset-map.json','utf8'));
let count=0;for(const f of await fs.readdir('dist/p')){let h=await fs.readFile('dist/p/'+f,'utf8');if(!h.includes('store-header-desktop'))h=h.replace(/<header\b[^]*?<\/header>/,x=>'<div class="store-header-desktop">'+x+'</div><div class="store-header-mobile">'+mobile+'</div>');if(!h.includes('mobile-original.css'))h=h.replace('</head>','<link rel="stylesheet" media="(max-width:991px)" href="/mobile-original.css"></head>');for(const [url,local]of map)h=h.replaceAll(url,local);await fs.writeFile('dist/p/'+f,h);count++}console.log({updated:count});
