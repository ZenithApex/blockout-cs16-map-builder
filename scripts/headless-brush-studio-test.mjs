const port=Number(process.argv[2]||9225);
const baseUrl=process.argv[3]||"http://127.0.0.1:41716/index.html";
const delay=(milliseconds)=>new Promise((resolve)=>setTimeout(resolve,milliseconds));

async function targetForPort(){
  for(let attempt=0;attempt<50;attempt+=1){
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
  for(let attempt=0;attempt<80;attempt+=1){await delay(50);if(await evaluate("document.readyState==='complete'&&!!window.Blockout").catch(()=>false))return;}
  throw new Error(`App did not finish loading: ${url}`);
}
async function clickWorld(worldX,worldY){
  const point=await evaluate(`(()=>{const canvas=document.querySelector("#editorCanvas"),rect=canvas.getBoundingClientRect(),view=Blockout.getViewState();return{x:rect.left+view.viewOffset.x+${worldX}*view.cellSize,y:rect.top+view.viewOffset.y+${worldY}*view.cellSize};})()`);
  await command("Input.dispatchMouseEvent",{type:"mousePressed",x:point.x,y:point.y,button:"left",buttons:1,clickCount:1});
  await command("Input.dispatchMouseEvent",{type:"mouseReleased",x:point.x,y:point.y,button:"left",buttons:0,clickCount:1});
}

await command("Page.enable");await command("Runtime.enable");await navigate(baseUrl);
const project={
  name:"Brush Studio regression",
  rooms:[{id:"room-main",kind:"room",label:"MAIN ROOM",x:0,y:0,w:20,d:12,height:5,floorLevel:0,wallThickness:.25,texture:"BO_CONC1K1",floorTexture:"BO_FLOORTILE",ceilingTexture:"BO_CONC1K2",ceilingMode:"sky"}],
  doors:[],windows:[],zones:[],
  props:[{id:"wall-main",kind:"wall",label:"TEST WALL",x:4,y:4,w:4,d:2,height:2,floorLevel:0,texture:"BO_CONCRETE",direction:"e"}],
  entities:[{id:"ct",kind:"ct",x:1,y:8,floorLevel:0,angle:0},{id:"t",kind:"t",x:17,y:8,floorLevel:0,angle:180},{id:"site",kind:"bombA",x:10,y:8,floorLevel:0}],
  layers:[{id:"layer-default",name:"Default",color:"#d7f45a",visible:true,locked:false}],
  stories:[{id:"ground",name:"Ground floor",elevation:0}],
  environment:{groundEnabled:true,groundSize:40,groundPadding:4,groundElevation:0,groundMaterial:"BO_GRASS1",openSkyDefault:true,skyName:"desert"},
  updatedAt:Date.now()
};
await evaluate(`(()=>{localStorage.setItem("blockout-welcome-seen","yes");localStorage.setItem("blockout-cs16-project-v1",${JSON.stringify(JSON.stringify(project))});location.reload();})()`);
await delay(250);
for(let attempt=0;attempt<80;attempt+=1){if(await evaluate("document.readyState==='complete'&&!!window.Blockout").catch(()=>false))break;await delay(50);}
await evaluate(`document.querySelector('[data-tool="select"]').click()`);
await clickWorld(5,5);

const brushResult=await evaluate(`(()=>{
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const change=(selector,value)=>{const input=document.querySelector(selector);input.value=String(value);input.dispatchEvent(new Event("change",{bubbles:true}));};
  assert(Blockout.getSelectionState().primary?.id==="wall-main","Test wall was not selected");
  document.querySelector("#openBrushStudioSelection").click();
  assert(document.querySelector("#brushStudioDialog").open,"Brush Studio did not open");
  change("#brushPreset","hexagon");document.querySelector("#applyBrushPreset").click();
  let prop=Blockout.getProject().props.find((item)=>item.id==="wall-main");
  assert(prop.kind==="wallPolygon"&&prop.points.length===6,"Hexagon preset failed");
  change("#brushPreset","rectangle");document.querySelector("#applyBrushPreset").click();
  change("#brushBevelAmount",32);document.querySelector("#bevelBrush").click();
  prop=Blockout.getProject().props.find((item)=>item.id==="wall-main");
  assert(prop.points.length===8,"Bevel did not create eight safe corners: "+prop.points.length+" / "+document.querySelector("#toast").textContent);
  change("#brushPreset","rectangle");document.querySelector("#applyBrushPreset").click();
  prop=Blockout.getProject().props.find((item)=>item.id==="wall-main");
  assert(prop.kind==="wall"&&!prop.points,"Rectangle conversion failed");
  document.querySelector("#brushStudioDialog").close();

  change("#surfaceTargetSelect","top");change("#materialSelect","BO_REDBRICK");
  prop=Blockout.getProject().props.find((item)=>item.id==="wall-main");
  assert(prop.faceTextures.top==="BO_REDBRICK","Per-face material was not stored");
  document.querySelector("#openBrushStudioSelection").click();
  change("#brushSplitAxis","x");change("#brushSplitRatio",50);document.querySelector("#splitBrush").click();
  assert(Blockout.getProject().props.length===2&&Blockout.getSelectionState().refs.length===2,"Brush split failed");
  document.querySelector("#mirrorBrushX").click();
  change("#brushArrayCopies",2);change("#brushArrayX",512);change("#brushArrayY",0);document.querySelector("#createBrushArray").click();
  assert(Blockout.getProject().props.length===6,"Editable array did not create the expected copies");
  document.querySelector("#brushStudioDialog").close();
  return {props:Blockout.getProject().props.length,topMaterial:prop.faceTextures.top};
})()`);

await clickWorld(1,1);
const roomResult=await evaluate(`(()=>{
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const change=(selector,value)=>{const input=document.querySelector(selector);input.value=String(value);input.dispatchEvent(new Event("change",{bubbles:true}));};
  assert(Blockout.getSelectionState().primary?.id==="room-main","Room was not selected");
  document.querySelector("#openBrushStudioSelection").click();
  change("#brushWallThickness",32);document.querySelector("#applyWallThickness").click();
  change("#brushExtrudeSide","east");change("#brushExtrudeAmount",64);document.querySelector("#extrudeBrush").click();
  const room=Blockout.getProject().rooms[0],map=Blockout.generateMapText();
  assert(Math.abs(room.wallThickness-.5)<.001,"Room wall thickness failed");
  assert(Math.abs(room.w-21)<.001,"Directional extrusion failed");
  assert(map.includes("BO_REDBRICK")&&!/undefined|NaN/.test(map),"Face material or MAP export failed");
  const preflight=Blockout.getPreflight();
  assert(!preflight.issues.some((issue)=>/Invalid (room|structure) polygon/.test(issue.title)),"Brush operations produced invalid polygons");
  return {roomWidth:room.w,wallThicknessUnits:room.wallThickness*64,mapBytes:map.length,preflightErrors:preflight.errors};
})()`);

if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join("; ")}`);
console.log(`Brush Studio headless regression passed: ${JSON.stringify({...brushResult,...roomResult})}`);
socket.close();
