const port = Number(process.argv[2] || 9224);
const baseUrl = process.argv[3] || "http://127.0.0.1:41716/index.html";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function targetForPort() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page;
    } catch (_) {}
    await delay(100);
  }
  throw new Error(`Chrome DevTools did not answer on port ${port}`);
}

const target = await targetForPort();
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const pageErrors = [];
let nextId = 1;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  } else if (message.method === "Runtime.exceptionThrown") {
    pageErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || "Uncaught page error");
  }
});
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once:true });
  socket.addEventListener("error", reject, { once:true });
});

function command(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise:true, returnByValue:true, userGesture:true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function navigate(url) {
  await command("Page.navigate", { url });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await delay(50);
    if (await evaluate("document.readyState === 'complete' && !!window.Blockout").catch(()=>false)) return;
  }
  throw new Error(`App did not finish loading: ${url}`);
}

async function clickWorld(worldX,worldY) {
  const point=await evaluate(`(() => {
    const canvas=document.querySelector("#editorCanvas"),rect=canvas.getBoundingClientRect(),view=Blockout.getViewState();
    return {x:rect.left+view.viewOffset.x+${worldX}*view.cellSize,y:rect.top+view.viewOffset.y+${worldY}*view.cellSize};
  })()`);
  await command("Input.dispatchMouseEvent",{type:"mousePressed",x:point.x,y:point.y,button:"left",buttons:1,clickCount:1});
  await command("Input.dispatchMouseEvent",{type:"mouseReleased",x:point.x,y:point.y,button:"left",buttons:0,clickCount:1});
}

await command("Page.enable");
await command("Runtime.enable");
await navigate(baseUrl);

const room = (id,x,y,w,d) => ({
  id,kind:"room",label:id.toUpperCase(),x,y,w,d,height:4,floorLevel:0,groupId:"precision-group",
  texture:"BO_CONC1K1",floorTexture:"BO_FLOORTILE",ceilingTexture:"BO_CONC1K2",ceilingMode:"sky"
});
const project = {
  name:"Precision and layers regression",
  rooms:[room("alpha",0,0,2,2),room("beta",4,2,3,2),room("gamma",9,4,2,3)],
  doors:[],windows:[],zones:[],props:[],entities:[],
  layers:[{id:"layer-default",name:"Default",color:"#d7f45a",visible:true,locked:false}],
  stories:[{id:"story-ground",name:"Ground floor",elevation:0}],
  environment:{groundEnabled:true,groundSize:32,groundPadding:4,groundElevation:0,groundMaterial:"BO_GRASS1",openSkyDefault:true,skyName:"desert"},
  updatedAt:Date.now()
};

await evaluate(`(() => {
  localStorage.setItem("blockout-welcome-seen","yes");
  localStorage.setItem("blockout-cs16-project-v1",${JSON.stringify(JSON.stringify(project))});
  location.reload();
})()`);
await delay(250);
for (let attempt=0; attempt<80; attempt+=1) {
  if (await evaluate("document.readyState === 'complete' && !!window.Blockout").catch(()=>false)) break;
  await delay(50);
}

await evaluate(`document.querySelector('[data-tool="select"]').click()`);
await clickWorld(1,1);

const result = await evaluate(`(() => {
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const change=(selector,value)=>{const input=document.querySelector(selector);input.value=String(value);input.dispatchEvent(new Event("change",{bubbles:true}));};
  assert(Blockout.getSelectionState().refs.length===3,"Grouped selection did not select three rooms");

  change("#precisionX",128);
  let rooms=Blockout.getProject().rooms;
  assert(Math.min(...rooms.map((item)=>item.x))===2,"Exact X did not move the selection in GoldSrc units");
  change("#precisionWidth",768);
  rooms=Blockout.getProject().rooms;
  const minX=Math.min(...rooms.map((item)=>item.x)),maxX=Math.max(...rooms.map((item)=>item.x+item.w));
  assert(Math.abs(maxX-minX-12)<.001,"Exact selection width did not scale to 768 units");

  document.querySelector('[data-align="top"]').click();
  rooms=Blockout.getProject().rooms;
  assert(new Set(rooms.map((item)=>item.y.toFixed(3))).size===1,"Top alignment failed");
  document.querySelector('[data-distribute="x"]').click();
  rooms=Blockout.getProject().rooms;
  const centers=rooms.map((item)=>item.x+item.w/2).sort((a,b)=>a-b);
  assert(Math.abs((centers[1]-centers[0])-(centers[2]-centers[1]))<.001,"Horizontal distribution failed");
  document.querySelector('[data-equal-size="both"]').click();
  rooms=Blockout.getProject().rooms;
  assert(new Set(rooms.map((item)=>item.w.toFixed(3))).size===1&&new Set(rooms.map((item)=>item.d.toFixed(3))).size===1,"Equal size failed");

  document.querySelector("#productionButton").click();
  document.querySelector("#addLayer").click();
  const layer=Blockout.getLayers().find((item)=>item.id!=="layer-default");
  assert(layer,"New layer was not created");
  document.querySelector("#selectionLayer").value=layer.id;
  document.querySelector("#selectionLayer").dispatchEvent(new Event("change",{bubbles:true}));
  assert(Blockout.getProject().rooms.every((item)=>item.layerId===layer.id),"Selection was not assigned to the new layer");

  document.querySelector('[data-layer-visible="'+layer.id+'"]').click();
  assert(Blockout.getLayers().find((item)=>item.id===layer.id).visible===false,"Layer visibility did not turn off");
  assert(Blockout.getSelectionState().refs.length===0,"Hiding a layer did not clear its selection");
  document.querySelector('[data-layer-visible="'+layer.id+'"]').click();
  document.querySelector('[data-layer-lock="'+layer.id+'"]').click();
  assert(Blockout.getLayers().find((item)=>item.id===layer.id).locked===true,"Layer lock did not turn on");
  document.querySelector("#productionDialog").close();
  return {layerId:layer.id,roomCount:rooms.length,selectionWidthUnits:Math.round((maxX-minX)*64),centers};
})()`);

await clickWorld(3,1);
const lockedResult=await evaluate(`(() => {
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const before=Math.min(...Blockout.getProject().rooms.map((item)=>item.x));
  const input=document.querySelector("#precisionX");input.value="2048";input.dispatchEvent(new Event("change",{bubbles:true}));
  const after=Math.min(...Blockout.getProject().rooms.map((item)=>item.x));
  assert(after===before,"A locked layer was moved by precision transform");
  assert(Blockout.getSelectionState().entries.every((entry)=>entry.locked&&entry.layerId!=="layer-default"),"Effective layer lock was not exposed");
  const map=Blockout.generateMapText();
  assert(map&&!/undefined|NaN/.test(map),"MAP export contains invalid values after transforms");
  return {locked:true,mapBytes:map.length,layers:Blockout.getLayers().length};
})()`);

if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join("; ")}`);
console.log(`Precision and layers headless regression passed: ${JSON.stringify({...result,...lockedResult})}`);
socket.close();
