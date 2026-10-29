const {test}=require('node:test');const assert=require('node:assert/strict');
const {youtubeId,cards,safeUrl}=require('../ui/reference-media');
test('recognizes public YouTube link forms without accepting lookalike hosts',()=>{
 for(const url of ['https://www.youtube.com/watch?v=4800_BmcIv0&t=31','https://youtu.be/4800_BmcIv0','https://m.youtube.com/shorts/4800_BmcIv0','https://www.youtube.com/live/4800_BmcIv0','https://www.youtube-nocookie.com/embed/4800_BmcIv0'])assert.equal(youtubeId(url),'4800_BmcIv0');
 for(const url of ['https://youtube.com.evil.test/watch?v=4800_BmcIv0','https://evil.test/youtube.com/watch?v=4800_BmcIv0','javascript:alert(1)','https://youtube.com/watch?v=bad','https://youtu.be/4800_BmcIv0%22'])assert.equal(youtubeId(url),null);
});
test('reference cards escape imported text and keep unembeddable sources accessible',()=>{
 const html=cards([{title:'<img src=x onerror=alert(1)>',url:'https://www.youtube.com/watch?v=4800_BmcIv0',note:'<script>bad()</script>'},{title:'Workbook',url:'https://docs.google.com/spreadsheets/d/example'},{title:'Unsafe',url:'javascript:alert(1)'}]);
 assert.match(html,/data-play-reference="4800_BmcIv0"/);assert.match(html,/i.ytimg.com\/vi\/4800_BmcIv0\/hqdefault.jpg/);assert.match(html,/Open on YouTube/);assert.match(html,/Open reference/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|onerror=alert\(1\)>|javascript:|Unsafe/);assert.equal(safeUrl('file:///private'), '');
});
