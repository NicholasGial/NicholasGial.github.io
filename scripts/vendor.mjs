import {mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
await mkdir('dist/vendor/postprocessing',{recursive:true});
await mkdir('dist/vendor/shaders',{recursive:true});
for(const file of ['three.module.min.js','three.core.min.js']) await copyFile(`node_modules/three/build/${file}`,`dist/vendor/${file}`);
// Bloom pipeline. These import the bare specifier 'three', resolved by the import map in index.html.
for(const file of ['postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/UnrealBloomPass.js','postprocessing/OutputPass.js','postprocessing/ShaderPass.js','postprocessing/MaskPass.js','postprocessing/Pass.js','shaders/CopyShader.js','shaders/LuminosityHighPassShader.js','shaders/OutputShader.js']) await copyFile(`node_modules/three/examples/jsm/${file}`,`dist/vendor/${file}`);
await copyFile('node_modules/three/LICENSE','dist/vendor/THREE-LICENSE.txt');
