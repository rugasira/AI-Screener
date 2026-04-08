import pdfParse from 'pdf-parse';
console.log('default:', typeof pdfParse);
import * as pdf from 'pdf-parse';
console.log('star:', typeof pdf);
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfReq = require('pdf-parse');
console.log('require:', typeof pdfReq);
