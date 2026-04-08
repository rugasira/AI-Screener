import pdfParse from 'pdf-parse';
import fs from 'fs';

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
