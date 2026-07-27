import {readFileSync} from "node:fs";

const mapPath=process.argv[2];
const mapName=process.argv[3]||"blockout_regression";
const endpoint=process.argv[4]||"http://127.0.0.1:41716/api/build";
if(!mapPath)throw new Error("Pass a generated .map path.");

const mapText=readFileSync(mapPath,"utf8");
const response=await fetch(endpoint,{
  method:"POST",
  headers:{"content-type":"application/json"},
  body:JSON.stringify({mapName,mapText,launch:false,profile:"draft"})
});
const result=await response.json();
if(!response.ok||!result.ok)throw new Error(result.error||`Build failed with HTTP ${response.status}`);
console.log(JSON.stringify({
  ok:result.ok,
  launched:result.launched,
  mapName:result.mapName,
  bspPath:result.bspPath,
  usedFallbackName:result.usedFallbackName,
  profile:result.profile,
  stages:result.stages
},null,2));
