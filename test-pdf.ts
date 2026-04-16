import { createRequire } from 'module';
const requireFunc = createRequire(import.meta.url);
const pdfParse = requireFunc('pdf-parse');
console.log(typeof pdfParse);
