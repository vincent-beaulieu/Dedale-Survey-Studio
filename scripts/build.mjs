import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
const demo=readFileSync('public/demo.html','utf8');
writeFileSync('public/studio.css',[...demo.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n'));
const url=process.env.PUBLIC_SUPABASE_URL, key=process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url || !key?.startsWith('sb_publishable_')) throw new Error('Configure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY');
if(new URL(url).protocol!=='https:') throw new Error('Supabase URL must use HTTPS');
await build({entryPoints:['src/workspace.js'],bundle:true,format:'esm',target:'es2022',minify:true,outfile:'public/workspace.js',define:{SUPABASE_URL:JSON.stringify(url),SUPABASE_KEY:JSON.stringify(key)}});
