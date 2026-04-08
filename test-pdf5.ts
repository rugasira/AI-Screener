import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function test() {
  console.log(Object.keys(pdfParse));
  console.log(pdfParse.default);
}
test();
