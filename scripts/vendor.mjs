import {mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
await mkdir('dist/vendor',{recursive:true});
for(const file of ['three.module.min.js','three.core.min.js']) await copyFile(`node_modules/three/build/${file}`,`dist/vendor/${file}`);
await copyFile('node_modules/three/LICENSE','dist/vendor/THREE-LICENSE.txt');
