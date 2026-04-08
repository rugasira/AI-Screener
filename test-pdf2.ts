import * as pdfParseModule from 'pdf-parse';
const { PDFParse } = pdfParseModule;

async function test() {
  console.log(typeof PDFParse);
}
test();
