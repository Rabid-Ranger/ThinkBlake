const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/accelerator-ai/index.ts'),'utf8');
const adapter=source.slice(source.indexOf('  const extractPdf=async bytes=>{'),source.indexOf('  const extractOffice='));
test('production PDF adapter reads actual PDF and releases its loading task',{skip:!process.env.UNPDF_MODULE},async()=>{
 const unpdf=process.env.UNPDF_MODULE;if(!unpdf)throw Error('Set UNPDF_MODULE to the installed pinned unpdf@1.9.1 module');
 const code=adapter.replace("'npm:unpdf@1.9.1'",JSON.stringify(unpdf))+'\nexport {extractPdf};';
 const {extractPdf}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const text='BT /F1 12 Tf 72 720 Td (PDF reader regression) Tj ET';
 const pdf='%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Annots [6 0 R] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n5 0 obj << /Length '+text.length+' >> stream\n'+text+'\nendstream endobj\n6 0 obj << /Type /Annot /Subtype /Link /Rect [0 0 612 792] /A << /S /URI /URI (https://example.com/research) >> >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF';
 const pages=await extractPdf(new TextEncoder().encode(pdf));assert.equal(pages.length,1);assert.match(pages[0],/PDF reader regression/);assert.match(pages[0],/https:\/\/example.com\/research/);
 if(process.env.PDF_VERIFY_FILE){const actual=await extractPdf(new Uint8Array(fs.readFileSync(process.env.PDF_VERIFY_FILE)));assert.equal(actual.length,26);assert.match(actual[0],/How to Start Flower Seeds Indoors/);assert.match(actual[0],/https:\/\/www.youtube.com\/watch\?v=4800_BmcIv0/);console.log('Actual research PDF: 26 pages read, first researched title verified.');}
});
