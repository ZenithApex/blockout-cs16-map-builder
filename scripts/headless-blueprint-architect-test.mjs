import {writeFileSync} from "node:fs";

const port=Number(process.argv[2]||9233);
const baseUrl=process.argv[3]||"http://127.0.0.1:41716/index.html";
const samplePath=process.argv[4]||"";
const sampleWidth=Number(process.argv[5]||0);
const sampleLevels=process.argv[6]||"";
const sampleMapOutput=process.argv[7]||"";
const liveBundleTextures=process.argv[8]==="live";
const delay=(milliseconds)=>new Promise((resolve)=>setTimeout(resolve,milliseconds));

async function targetForPort(){
  for(let attempt=0;attempt<60;attempt+=1){
    try{
      const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then((response)=>response.json());
      const page=targets.find((target)=>target.type==="page");
      if(page?.webSocketDebuggerUrl)return page;
    }catch(_){}
    await delay(100);
  }
  throw new Error(`Chrome DevTools did not answer on port ${port}`);
}

const target=await targetForPort(),socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),pageErrors=[];
let nextId=1;
socket.addEventListener("message",(event)=>{
  const message=JSON.parse(event.data);
  if(message.id&&pending.has(message.id)){
    const {resolve,reject}=pending.get(message.id);pending.delete(message.id);
    if(message.error)reject(new Error(message.error.message));else resolve(message.result);
  }else if(message.method==="Runtime.exceptionThrown")pageErrors.push(message.params.exceptionDetails?.exception?.description||message.params.exceptionDetails?.text||"Uncaught page error");
});
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
function command(method,params={}){
  const id=nextId++;
  return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
}
async function evaluate(expression){
  const result=await command("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true,userGesture:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
  return result.result.value;
}
async function navigate(url){
  await command("Page.navigate",{url});
  for(let attempt=0;attempt<100;attempt+=1){await delay(50);if(await evaluate("document.readyState==='complete'&&!!window.Blockout").catch(()=>false))return;}
  throw new Error(`App did not finish loading: ${url}`);
}

await command("Page.enable");await command("Runtime.enable");await navigate(baseUrl);
const result=await evaluate(`(async()=>{
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  localStorage.setItem("blockout-welcome-seen","yes");
  window.confirm=()=>true;
  document.querySelector("#blueprintTextures").checked=false;
  document.querySelector("#blueprintLevels").checked=false;
  document.querySelector("#blueprintWidthMeters").value="96";
  document.querySelector("#blueprintPlayabilityScale").value="1.25";
  const source=document.createElement("canvas");source.width=960;source.height=600;
  const context=source.getContext("2d");
  context.fillStyle="#e9ece5";context.fillRect(0,0,960,600);
  context.fillStyle="#f3ead0";context.fillRect(48,48,864,504);
  context.strokeStyle="#171b18";context.lineWidth=18;context.strokeRect(48,48,864,504);
  context.fillStyle="#8fc4e8";context.fillRect(58,170,180,250);
  context.fillStyle="#efb15c";context.fillRect(722,170,180,250);
  context.fillStyle="#d7c9ef";context.fillRect(250,72,460,210);
  context.fillStyle="#83bd91";context.fillRect(250,300,460,228);
  context.strokeStyle="#171b18";context.lineWidth=14;
  context.beginPath();context.moveTo(240,55);context.lineTo(240,545);context.moveTo(716,55);context.lineTo(716,545);context.moveTo(240,290);context.lineTo(716,290);context.stroke();
  context.fillStyle="#e9ece5";
  [[233,210,15,70],[709,210,15,70],[430,282,100,16],[233,410,15,70],[709,410,15,70]].forEach(([x,y,w,h])=>context.fillRect(x,y,w,h));
  context.fillStyle="#344338";[[330,130],[570,130],[330,390],[570,390]].forEach(([x,y])=>context.fillRect(x,y,34,34));
  const blob=await new Promise((resolve)=>source.toBlob(resolve,"image/png"));
  await Blockout.prepareBlueprintImage(new File([blob],"competitive_factory_96m.png",{type:"image/png"}));
  await new Promise((resolve)=>setTimeout(resolve,350));
  const analyzed=Blockout.getBlueprintState();
  assert(analyzed?.analysis,"Blueprint analysis did not finish");
  assert(analyzed.analysis.gridWidth===75,"Competitive playability scaling did not produce the expected GoldSrc grid width");
  assert(analyzed.analysis.rooms>=4&&analyzed.analysis.rooms<=128,"Unexpected room decomposition: "+analyzed.analysis.rooms);
  assert(analyzed.analysis.shellMode==="competitive"&&analyzed.analysis.wallCount>0,"Competitive playfield walls were not generated");
  assert(analyzed.analysis.entities===12,"Expected ten spawns and two bomb objectives: "+JSON.stringify(analyzed.analysis));
  assert(analyzed.analysis.minimumSpawnSeparation>=40,"Generated team spawns are too close together");
  assert(!analyzed.analysis.spawnWarning,"A normal competitive plan did not provide safe spawn rooms");
  assert(analyzed.analysis.zones===2,"Expected CT and T buy zones");
  assert(analyzed.analysis.materials.length===4,"The map-specific material kit is incomplete");
  assert(analyzed.analysis.materials.every((item)=>item.code.startsWith("USR_")&&item.code.length<=15&&item.imageBytes>1000),"A generated GoldSrc material is invalid");
  assert(document.querySelectorAll("#blueprintPalette .blueprint-swatch img").length===4,"Material miniatures were not rendered");
  assert(document.querySelector("#blueprintCanvas").width>300,"Blueprint overlay preview was not drawn");
  const created=await Blockout.createMapFromBlueprint(),project=Blockout.getProject();
  assert(created.rooms===1&&created.openings===0,"Competitive import should create one continuous shell without artificial room seams");
  assert(project.blueprint?.sourcePreview?.startsWith("data:image/jpeg"),"The editable project did not retain a blueprint reference preview");
  assert(project.entities.filter((item)=>item.kind==="ct").length===5&&project.entities.filter((item)=>item.kind==="t").length===5,"Generated 5v5 spawns are missing");
  assert(project.entities.some((item)=>item.kind==="bombA")&&project.entities.some((item)=>item.kind==="bombB"),"Generated objectives are missing");
  assert(project.zones.some((item)=>item.kind==="buyCt")&&project.zones.some((item)=>item.kind==="buyT"),"Generated buy zones are missing");
  assert(project.rooms.every((room)=>room.texture&&room.floorTexture&&room.ceilingTexture),"Generated rooms are missing categorized materials");
  assert(project.rooms.length===1&&project.stories.length===1,"Flat competitive import did not stay on one continuous level");
  assert(project.props.some((prop)=>prop.blueprintWall),"Traced plan boundaries were not converted to wall brushes");
  const preflight=Blockout.getPreflight();
  assert(!preflight.issues.some((issue)=>/spawn/i.test(issue.title)&&issue.severity==="error"),"Generated blueprint contains an unsafe spawn");
  const structuralErrors=preflight.issues.filter((issue)=>issue.severity==="error"&&/overlap|outside playable|invalid|degenerate|opening/i.test(issue.title+" "+issue.detail));
  assert(!structuralErrors.length,"Generated blueprint contains structural preflight errors: "+structuralErrors.map((issue)=>issue.title).join(", "));
  return {analysis:analyzed.analysis,created,project:{rooms:project.rooms.length,doors:project.doors.length,props:project.props.length,entities:project.entities.length,zones:project.zones.length,stories:project.stories.length},preflight:{errors:preflight.errors,warnings:preflight.warnings}};
})()`);

let sample=null;
if(samplePath){
  const samplePaths=samplePath.split("|").filter(Boolean);
  const previousFileName=await evaluate("Blockout.getBlueprintState()?.fileName||''");
  if(sampleWidth)await evaluate(`document.querySelector("#blueprintWidthMeters").value=${JSON.stringify(String(sampleWidth))}`);
  if(sampleLevels)await evaluate(`document.querySelector("#blueprintLevels").checked=${sampleLevels==="levels"}`);
  if(samplePaths.length>1)await evaluate(`document.querySelector("#blueprintTextures").checked=true`);
  await command("DOM.enable");
  const document=await command("DOM.getDocument",{depth:2}),input=await command("DOM.querySelector",{nodeId:document.root.nodeId,selector:"#blueprintFileInput"});
  await command("DOM.setFileInputFiles",{nodeId:input.nodeId,files:samplePaths});
  const selectedSampleName=await evaluate("document.querySelector('#blueprintFileInput').files[0]?.name||''");
  if(!selectedSampleName)throw new Error(`Chrome could not attach the real blueprint sample: ${samplePath}`);
  await evaluate("document.querySelector('#blueprintFileInput').dispatchEvent(new Event('change',{bubbles:true}))");
  for(let attempt=0;attempt<80;attempt+=1){await delay(75);sample=await evaluate("Blockout.getBlueprintState()");if(sample?.analysis&&sample.fileName!==previousFileName)break;}
  if(!sample?.analysis||sample.analysis.rooms<3||sample.fileName===previousFileName)throw new Error(`Real blueprint sample did not produce a usable blockout: selected=${selectedSampleName} state=${JSON.stringify(sample)}`);
  if(samplePaths.length>1&&!liveBundleTextures)await evaluate(`(()=>{
    const nativeFetch=window.fetch.bind(window);window.__bundleTextureBatches=0;
    window.fetch=async(input,init)=>{
      const request=input instanceof Request?input:new Request(input,init);
      if(request.url.includes("/api/textures/alchemize")){
        const payload=await request.clone().json();window.__bundleTextureBatches+=1;
        return new Response(JSON.stringify({textures:(payload.textures||[]).map((item)=>({name:item.name,label:item.label,category:item.category,uses:item.uses}))}),{status:200,headers:{"Content-Type":"application/json"}});
      }
      return nativeFetch(input,init);
    };
  })()`);
  sample.created=await evaluate(`(async()=>{
    const created=await Blockout.createMapFromBlueprint(),project=Blockout.getProject(),preflight=Blockout.getPreflight();
    const spawns=project.entities.filter((item)=>item.kind==="ct"||item.kind==="t");
    const structures=Object.fromEntries(["crate","wall","stairs","ramp","ladder","platform"].map((kind)=>[kind,project.props.filter((item)=>item.kind===kind&&!item.blueprintWall).length]));
    return {created,textureBatches:window.__bundleTextureBatches||0,spawns:spawns.length,prefabs:Blockout.getCustomPrefabs().filter((item)=>item.bundleKey).length,bundleReferences:Object.keys(project.blueprint?.bundleReferences||{}),sheetsUsed:project.blueprint?.semantic?.sheetsUsed||[],structures,appliedMaterials:project.blueprint?.textureKit?.filter((item)=>item.applied>0).length||0,spawnErrors:preflight.issues.filter((issue)=>issue.severity==="error"&&/spawn/i.test(issue.title)).map((issue)=>issue.title),errorDetails:preflight.issues.filter((issue)=>issue.severity==="error").map((issue)=>({title:issue.title,detail:issue.detail,ref:issue.ref})),warningTitles:preflight.issues.filter((issue)=>issue.severity==="warning").map((issue)=>issue.title),errors:preflight.errors,warnings:preflight.warnings,mapBytes:Blockout.generateMapText()?.length||0};
  })()`);
  if(sample.created.spawns!==10||sample.created.spawnErrors.length||sample.created.errors||sample.created.mapBytes<5000)throw new Error(`Real blueprint sample generated an invalid map: ${JSON.stringify(sample.created)}`);
  if(samplePaths.length>1&&(sample.analysis.materials.length!==20||sample.created.created.textures!==20||(!liveBundleTextures&&sample.created.textureBatches!==5)||sample.created.prefabs!==12||sample.created.bundleReferences.length<3))throw new Error(`Blueprint bundle sheets were not consumed: ${JSON.stringify({materials:sample.analysis.materials.length,created:sample.created})}`);
  if(samplePaths.length>1&&(!["blueprint","routes","elevation"].every((role)=>sample.created.sheetsUsed.includes(role))||sample.created.structures.crate<1||sample.created.structures.stairs<1||sample.created.structures.ramp<1||sample.created.structures.ladder<1||sample.created.appliedMaterials<10))throw new Error(`Blueprint bundle semantic fusion is incomplete: ${JSON.stringify(sample.created)}`);
  if(sampleMapOutput)writeFileSync(sampleMapOutput,await evaluate("Blockout.generateMapText()"),"utf8");
}
if(pageErrors.length)throw new Error(`Page errors:\n${pageErrors.join("\n")}`);
console.log(JSON.stringify({...result,...(sample?{sample:{fileName:sample.fileName,...sample.analysis,created:sample.created}}:{})},null,2));
socket.close();
