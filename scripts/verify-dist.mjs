import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const files = new Set();
let totalBytes = 0;
async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else { files.add(path.relative(root, p).replaceAll('\\', '/')); totalBytes += (await fs.stat(p)).size; }
  }
}
await walk(root);
const errors = [];
const requireFile = (file, owner) => { if (!files.has(file)) errors.push(`${owner}: arquivo ausente ${file}`); };
for (const file of ['index.html','mobile.html','catalogo.html','produto.html','favoritos.html','carrinho.html','commerce.js','checkout.html','checkout.js','checkout.css','pix-checkout.js','original-product.js','data/card-template.json']) requireFile(file, 'Aplicação');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'data/catalog.json'), 'utf8'));
const collections = JSON.parse(await fs.readFile(path.join(root, 'data/collections.json'), 'utf8'));
const ids = new Set();
for (const p of catalog) {
  if (ids.has(p.id)) errors.push(`Produto duplicado: ${p.id}`);
  ids.add(p.id);
  if (p.originalPage) requireFile(`p/${p.id}.html`, p.name);
  if (p.mobileOriginalPage) requireFile(`pm/${p.id}.html`, p.name);
}
for (const [name, collection] of Object.entries(collections)) {
  for (const id of collection.ids || []) if (!ids.has(id)) errors.push(`Coleção ${name}: produto inexistente ${id}`);
}
const missingAssets = new Map();
for (const file of files) {
  if (!/\.(html|css)$/.test(file)) continue;
  const source = await fs.readFile(path.join(root, file), 'utf8');
  if (file.endsWith('.html')) {
    const head = source.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
    const tags = [...source.matchAll(/data-store-clarity="yhipku10gk"/g)];
    if (tags.length !== 1 || !head.includes('data-store-clarity="yhipku10gk"')) {
      errors.push(`${file}: Clarity deve aparecer exatamente uma vez no head`);
    }
  }
  const refs = file.endsWith('.html') ? source.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi) : source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi);
  for (const [, ref] of refs) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(ref)) continue;
    let url;
    try { url = new URL(ref.replaceAll('&amp;', '&'), `https://local.invalid/${file}`); } catch { continue; }
    let local;
    try { local = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html'; } catch { continue; }
    // Slugs are handled by the storefront router. Physical assets and HTML pages must exist.
    if (/\.[a-z\d]{2,6}$/i.test(local) && !files.has(local)) missingAssets.set(local, file);
  }
}
for (const [asset, owner] of missingAssets) errors.push(`${owner}: referência ausente ${asset}`);
for (const file of files) {
  if (!file.startsWith('data/variants/') || !file.endsWith('.json')) continue;
  const variant = JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
  if (!ids.has(variant.id)) errors.push(`${file}: produto inexistente`);
  if (!variant.groups?.some(g=>g.options?.length)) errors.push(`${file}: nenhuma opção`);
}
console.log(JSON.stringify({products:catalog.length,collections:Object.keys(collections).length,files:files.size,sizeMB:Math.round(totalBytes/1024/1024),errors:errors.length}, null, 2));
if (errors.length) { console.error(errors.slice(0,60).join('\n')); process.exitCode = 1; }
