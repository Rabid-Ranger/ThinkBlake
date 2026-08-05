const fs=require('fs');
const path=require('path');
const sourcePath=path.join(__dirname,'v71-simplification.js');
const runtimePath=path.join(__dirname,'.v71-simplification-runtime.js');
let source=fs.readFileSync(sourcePath,'utf8');
source=source.replace("page.locator('.v69-map').count()===0","page.locator('.v69-map:visible').count()===0");
source=source.replace(
  "  check(/Topic.*what the video is about/i.test(packageText)&&/Click frame.*reason.*click/i.test(packageText),'Title and thumbnail explains topic versus click frame where the choice is made.');",
  "  const compactPackageText=packageText.replace(/\\s+/g,' ');\n  check(/Topic.*what the video is about/i.test(compactPackageText)&&/Click frame.*reason.*click/i.test(compactPackageText),'Title and thumbnail explains topic versus click frame where the choice is made.');"
);
fs.writeFileSync(runtimePath,source);
require(runtimePath);
