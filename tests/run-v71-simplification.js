const fs=require('fs');
const path=require('path');
const sourcePath=path.join(__dirname,'v71-simplification.js');
const runtimePath=path.join(__dirname,'.v71-simplification-runtime.js');
let source=fs.readFileSync(sourcePath,'utf8');
source=source.replace("page.locator('.v69-map').count()===0","page.locator('.v69-map:visible').count()===0");
fs.writeFileSync(runtimePath,source);
require(runtimePath);
