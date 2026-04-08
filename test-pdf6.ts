import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function test() {
  console.log(typeof pdfParse);
  try {
    const data = await pdfParse(Buffer.from('dummy'));
    console.log(data);
  } catch (e) {
    console.error(e.message);
  }
}
test();
