const port=Number(process.argv[2]||9228);
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

await command("Page.enable");await command("Runtime.enable");await navigate(baseUrl);
const result=await evaluate(`(async()=>{
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const source=document.createElement("canvas");source.width=640;source.height=320;
  const context=source.getContext("2d"),gradient=context.createLinearGradient(0,0,640,320);
  gradient.addColorStop(0,"#d62c22");gradient.addColorStop(.48,"#b88a42");gradient.addColorStop(1,"#173bca");
  context.fillStyle=gradient;context.fillRect(0,0,640,320);
  context.fillStyle="#183f19";context.fillRect(0,0,640,38);
  context.fillStyle="#e9e3cc";context.fillRect(0,282,640,38);
  for(let x=40;x<640;x+=96){context.fillStyle=x%192?"#6d241d":"#d19a65";context.fillRect(x,72,54,42);}
  const blob=await new Promise((resolve)=>source.toBlob(resolve,"image/png"));
  await Blockout.prepareTextureImage(new File([blob],"weathered_brick_wall.png",{type:"image/png"}));
  assert(!document.querySelector("#textureImportEditor").classList.contains("hidden"),"Texture Alchemist editor did not open");
  const seamless=Blockout.getTextureAlchemyState();
  assert(seamless.active&&seamless.imageDataBytes>1000,"No processed 256px PNG was produced");
  assert(seamless.category==="brick","Local classifier did not identify the brick filename");
  assert(seamless.uses.includes("wall")&&seamless.uses.includes("tile"),"Texture Alchemist did not suggest wall/tile surface uses");
  assert(seamless.edgeMismatch<=1,"Seamless edge blend left a visible boundary: "+seamless.edgeMismatch);
  assert(seamless.variants.length===4&&new Set(seamless.variants.map((item)=>item.code)).size===4,"Texture family codes are not unique");
  assert(seamless.variants.every((item)=>item.code.length<=15),"A GoldSrc code exceeds 15 characters");

  const checkbox=document.querySelector("#textureMakeSeamless");checkbox.checked=false;checkbox.dispatchEvent(new Event("change",{bubbles:true}));
  const raw=Blockout.getTextureAlchemyState();
  assert(raw.edgeMismatch>seamless.edgeMismatch,"Disabling seamless processing did not expose the source edge mismatch");
  checkbox.checked=true;checkbox.dispatchEvent(new Event("change",{bubbles:true}));

  const output=document.querySelector("#textureImportCanvas"),pixels=()=>[...output.getContext("2d").getImageData(0,0,256,256).data].reduce((sum,value,index)=>sum+(index%97===0?value:0),0);
  const before=pixels(),brightness=document.querySelector("#textureBrightness");brightness.value="70";brightness.dispatchEvent(new Event("input",{bubbles:true}));
  const after=pixels();assert(before!==after,"Color correction did not update the output pixels");
  const tile=document.querySelector("#textureTileCanvas").getContext("2d").getImageData(0,0,256,256).data;
  assert(tile.some((value,index)=>index%4!==3&&value>0),"The 3 by 3 tile preview is blank");
  const catalog=new Map(Blockout.getTextureCatalog().map((item)=>[item.texture,item]));
  const choices=(id)=>[...document.querySelector(id).options].map((option)=>option.value);
  assert(choices("#materialSelect").every((texture)=>catalog.get(texture)?.uses.includes("wall")),"Wall material dropdown contains a non-wall texture");
  assert(choices("#floorMaterialSelect").every((texture)=>catalog.get(texture)?.uses.includes("floor")),"Floor material dropdown contains a non-floor texture");
  assert(choices("#ceilingMaterialSelect").every((texture)=>catalog.get(texture)?.uses.includes("ceiling")),"Ceiling material dropdown contains a non-ceiling texture");
  assert(choices("#environmentGroundMaterialSelect").every((texture)=>catalog.get(texture)?.uses.includes("ground")),"Ground material dropdown contains a non-ground texture");

  document.querySelector("#textureImportEditor").classList.add("hidden");
  document.querySelector("#textureTarget").value="floor";
  document.querySelector("#textureUseFilter").value="recommended";
  document.querySelector("#textureUseFilter").dispatchEvent(new Event("change",{bubbles:true}));
  const floorCards=[...document.querySelectorAll("#textureGrid [data-texture]")].map((card)=>card.dataset.texture);
  assert(floorCards.length>0&&floorCards.every((texture)=>catalog.get(texture)?.uses.includes("floor")),"Recommended floor browser contains another surface type");
  document.querySelector("#textureUseFilter").value="wall";
  document.querySelector("#textureUseFilter").dispatchEvent(new Event("change",{bubbles:true}));
  const wallCards=[...document.querySelectorAll("#textureGrid [data-texture]")].map((card)=>card.dataset.texture);
  assert(wallCards.length>0&&wallCards.every((texture)=>catalog.get(texture)?.uses.includes("wall")),"Wall browser filter contains another surface type");
  return {category:seamless.category,uses:seamless.uses,edgeMismatch:seamless.edgeMismatch,rawMismatch:raw.edgeMismatch,outputBytes:seamless.imageDataBytes,codes:seamless.variants.map((item)=>item.code),floorChoices:floorCards.length,wallChoices:wallCards.length};
})()`);

if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join("; ")}`);
console.log(`Texture Alchemist headless regression passed: ${JSON.stringify(result)}`);
socket.close();
