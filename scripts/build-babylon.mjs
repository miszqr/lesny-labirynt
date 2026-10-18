import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Works in the Sites checkout (dist/) and the GitHub Pages checkout (root).
const {existsSync}=await import('node:fs');
const publicRoot=existsSync(path.join(root,'dist/index.html'))?path.join(root,'dist'):root;
const destination=path.join(publicRoot,'tiles3d/vendor');
await mkdir(destination,{recursive:true});
await build({absWorkingDir:root,entryPoints:['scripts/babylon-exports.mjs'],outfile:path.join(destination,'babylon.mjs'),bundle:true,minify:true,format:'esm',platform:'browser',target:'es2022',legalComments:'eof',logLevel:'info'});
await copyFile(path.join(root,'node_modules/@babylonjs/core/license.md'),path.join(destination,'BABYLON-LICENSE.txt'));
