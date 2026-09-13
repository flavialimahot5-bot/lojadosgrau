import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const snippet = `<script type="text/javascript" data-store-clarity="yhipku10gk">
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "yhipku10gk");
</script>`;
let pages = 0, updated = 0;
async function install(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await install(file); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const source = await fs.readFile(file, 'utf8');
    if (!/<head\b[^>]*>/i.test(source)) throw new Error(`Missing head: ${file}`);
    // Replace our own tag so repeated builds never duplicate the tracker.
    const clean = source.replace(/<script\b[^>]*data-store-clarity="yhipku10gk"[^>]*>[\s\S]*?<\/script>\s*/gi, '');
    const result = clean.replace(/<head\b[^>]*>/i, head => head + snippet);
    if (result !== source) { await fs.writeFile(file, result); updated++; }
    pages++;
  }
}
await install(root);
console.log(`Clarity yhipku10gk: ${pages} HTML pages covered; ${updated} updated.`);
