const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {ctaStarters,productionStatus,validImage,previewData}=require('../ui/creator-workbench');
test('CTA starting points use supplied facts and leave missing destinations visibly unspecified',()=>{
 const mid=ctaStarters({},true);assert.equal(mid.length,3);assert.match(mid[0][1],/\[name the real next step\]/);assert.match(mid[0][1],/next useful point/);
 const end=ctaStarters({endDestination:'The garden checklist',endBenefit:'a practical planting plan'},false);assert.match(end[1][1],/The garden checklist/);assert.match(end[1][1],/a practical planting plan/);assert.doesNotMatch(end[1][1],/subscribe|limited time|guaranteed/i);
});
test('thumbnail uploads accept raster previews and reject unsupported or oversized files',()=>{
 assert.equal(validImage({type:'image/png',size:100}),true);assert.equal(validImage({type:'image/svg+xml',size:100}),false);assert.equal(validImage({type:'image/jpeg',size:11*1024*1024}),false);assert.equal(validImage({type:'image/jpeg',size:0}),false);
});
test('adaptive previews retain aspect ratio and fit the actual shared-document string limit',()=>{
 const sizes=[];const src=previewData({width:1920,height:1080},()=>{const canvas={getContext:()=>({drawImage(){}}),toDataURL(){sizes.push([canvas.width,canvas.height]);return 'data:image/jpeg;base64,'+'A'.repeat(canvas.width>360?22000:12000);}};return canvas;});
 assert.equal(src.length<18000,true);assert.deepEqual(sizes,[[640,360],[480,270],[360,203]]);
 const server=fs.readFileSync(require('node:path').join(__dirname,'../supabase/functions/creator-portal/index.ts'),'utf8');const code=server.slice(server.indexOf('function text('),server.indexOf('function sanitizePlanner(')).replace(/: unknown/g,'').replace(/: any/g,'');
 const safe=vm.runInNewContext(code+';safeValue');const saved=safe({package:{thumbnailOptions:[{src},{src},{src}]},cta:{midUrl:'https://example.com/guide',midDraft:'Actual wording',endDraft:'Next video'}});
 assert.equal(saved.package.thumbnailOptions[2].src,src);assert.equal(saved.cta.midUrl,'https://example.com/guide');
 assert.throws(()=>previewData({width:1,height:1},()=>({getContext:()=>({drawImage(){}}),toDataURL:()=>'A'.repeat(19000)})),/too detailed/);
});

test('all CTA categories use direct bridges without conditional hooks or invented offers',()=>{
 for(const type of ['Lead magnet / resource','Business / service','Next video'])for(const mid of [true,false]){const prefix=mid?'mid':'end',items=ctaStarters({[prefix+'Type']:type,[prefix+'Destination']:'Actual destination',[prefix+'Benefit']:'the documented practical help',[prefix+'Bridge']:'The planting date changes the next decision'},mid);assert.equal(items.length,3);for(const [,script]of items){assert.doesNotMatch(script,/\bif\b|guaranteed|limited time/i);assert.match(script,/Actual destination/);assert.match(script,/the documented practical help/);}}
});
test('production defaults are distinguished from explicit selections',()=>{
 const suggested=productionStatus({handoff:{format:'Long-form',layout:'Talking Head + B-roll'}});assert.equal(suggested.formatSelected,false);assert.equal(suggested.layoutSelected,false);assert.equal(suggested.approach,'');
 const picked=productionStatus({archetype:'Interview',handoff:{format:'Podcast',layout:'Interview / Dual Cam',formatManual:true,layoutManual:true}});assert.equal(picked.format,'Podcast');assert.equal(picked.formatSelected,true);assert.equal(picked.layoutSelected,true);
});
