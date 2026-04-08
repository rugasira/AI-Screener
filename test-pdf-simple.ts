import { createRequire } from 'module';
const requireFunc = createRequire(import.meta.url);
const pdfParse = requireFunc('pdf-parse');

async function test() {
  try {
    console.log('Testing pdf-parse...');
    const data = await pdfParse(Buffer.from('dummy data'));
    console.log('pdf-parse result:', data.text);
  } catch (err) {
    console.error('pdf-parse error:', err);
  }
}

test();
