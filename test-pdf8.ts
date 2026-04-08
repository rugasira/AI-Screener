import { createRequire } from 'module';
let requireFunc;
if (typeof require !== 'undefined') {
  requireFunc = require;
} else {
  requireFunc = createRequire(import.meta.url);
}
const pdfParse = requireFunc('pdf-parse');

async function test() {
  console.log(typeof pdfParse);
}
test();
