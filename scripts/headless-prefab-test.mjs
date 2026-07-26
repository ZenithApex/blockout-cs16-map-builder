const port = Number(process.argv[2] || 9223);
const baseUrl = process.argv[3] || "http://127.0.0.1:41716/index.html";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function targetForPort() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
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
    pageErrors.push(message.params.exceptionDetails?.text || "Uncaught page error");
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
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise:true,
    returnByValue:true,
    userGesture:true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function navigate(url) {
  await command("Page.navigate", { url });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await delay(50);
    try {
      if (await evaluate("document.readyState === 'complete' && !!window.Blockout")) return;
    } catch (_) {}
  }
  throw new Error(`App did not finish loading: ${url}`);
}

await command("Page.enable");
await command("Runtime.enable");
await navigate(baseUrl);

const project = {
  name:"Prefab headless regression",
  rooms:[{
    id:"test-room-source",kind:"room",label:"SOURCE ROOM",x:-3,y:-2,w:6,d:4,height:4,floorLevel:0,
    texture:"BO_REDBRICK",floorTexture:"BO_FLOORTILE",ceilingTexture:"BO_CONC1K1",ceilingMode:"sky",groupId:"source-prefab-group"
  }],
  doors:[{
    id:"test-door-source",axis:"v",boundary:3,along:-.5,width:1,height:2,mode:"opening",texture:"BO_RUSTIRON",
    floorLevel:0,edgeRoomId:"test-room-source",edge:[[3,-2],[3,2]],segment:[[3,-.5],[3,.5]],groupId:"source-prefab-group"
  }],
  windows:[],
  zones:[{id:"test-zone-source",kind:"teleport",x:0,y:0,w:1,d:1,height:2,floorLevel:0,target:"tele_gate",groupId:"source-prefab-group"}],
  props:[{
    id:"test-platform-source",kind:"platform",label:"UPPER PLATFORM",x:-2,y:-1,w:1,d:1,height:.5,floorLevel:1,
    texture:"BO_MARBLE",direction:"e",groupId:"source-prefab-group"
  }],
  entities:[
    {id:"test-destination-source",kind:"teleDest",x:1,y:0,floorLevel:0,target:"tele_gate",angle:0,groupId:"source-prefab-group"},
    {id:"test-button-source",kind:"button",x:-2,y:0,floorLevel:0,target:"tele_gate",groupId:"source-prefab-group"}
  ],
  stories:[{id:"story-ground",name:"Ground floor",elevation:0}],
  environment:{groundEnabled:true,groundSize:32,groundPadding:4,groundElevation:0,groundMaterial:"BO_GRASS1",openSkyDefault:true,skyName:"desert"},
  updatedAt:Date.now()
};

await evaluate(`(() => {
  localStorage.setItem("blockout-welcome-seen","yes");
  localStorage.setItem("blockout-cs16-project-v1",${JSON.stringify(JSON.stringify(project))});
  localStorage.removeItem("blockout-custom-prefabs-v1");
  location.reload();
})()`);
await delay(250);
for (let attempt=0; attempt<80; attempt+=1) {
  if (await evaluate("document.readyState === 'complete' && !!window.Blockout").catch(()=>false)) break;
  await delay(50);
}

async function clickWorld(worldX,worldY) {
  const point=await evaluate(`(() => {
    const canvas=document.querySelector("#editorCanvas");
    const rect=canvas.getBoundingClientRect();
    const view=Blockout.getViewState();
    return {x:rect.left+view.viewOffset.x+${worldX}*view.cellSize,y:rect.top+view.viewOffset.y+${worldY}*view.cellSize};
  })()`);
  await command("Input.dispatchMouseEvent",{type:"mousePressed",x:point.x,y:point.y,button:"left",buttons:1,clickCount:1});
  await command("Input.dispatchMouseEvent",{type:"mouseReleased",x:point.x,y:point.y,button:"left",buttons:0,clickCount:1});
}

await evaluate(`document.querySelector('[data-tool="select"]').click()`);
await clickWorld(0,0);
await evaluate(`(() => {
  const assert = (condition,message) => { if(!condition) throw new Error(message); };
  assert(Blockout.getSelectionState().refs.length===6,"Grouped multi-type selection failed");
  document.querySelector("#saveSelectionPrefab").click();
  assert(document.querySelector("#customPrefabDialog").open,"Studio dialog did not open");
  document.querySelector("#customPrefabName").value="Headless defensive room";
  document.querySelector("#customPrefabCategory").value="rooms";
  document.querySelector("#customPrefabTags").value="test, room, rotated";
  document.querySelector("#customPrefabDescription").value="Automated regression prefab";
  document.querySelector("#customPrefabPivot").value="center";
  document.querySelector("#customPrefabForm").requestSubmit();
  assert(Blockout.getCustomPrefabs().length===1&&Blockout.getCustomPrefabs()[0].items.length===6,"Prefab was not saved with every grouped object");
  assert(JSON.parse(localStorage.getItem("blockout-custom-prefabs-v1")).length===1,"Prefab did not persist");

  document.querySelector("#openPrefabLibrary").click();
  assert(document.querySelectorAll(".custom-prefab-card").length===1,"Personal library card missing");
  assert(document.querySelector(".custom-prefab-card svg"),"Generated miniature missing");
  document.querySelector("#prefabRotateRight").click();
  document.querySelector("#prefabMirror").click();
  document.querySelector('.custom-prefab-card [data-prefab]').click();
  assert(Blockout.getPrefabPlacement().rotation===90&&Blockout.getPrefabPlacement().mirrored,"Placement transform was not selected");
  return true;
})()`);

await clickWorld(5,0);
const result = await evaluate(`(async () => {
  const assert = (condition,message) => { if(!condition) throw new Error(message); };

  const placed=Blockout.getProject();
  assert(placed.rooms.length===2,"Custom room prefab was not placed");
  assert(placed.doors.length===2&&placed.props.length===2&&placed.zones.length===2&&placed.entities.length===4,"Multi-type prefab placement lost objects");
  assert(new Set(placed.rooms.map((room)=>room.id)).size===2,"Placed room reused its source ID");
  const copy=placed.rooms.find((room)=>room.id!=="test-room-source");
  assert(Math.abs(copy.w-4)<.001&&Math.abs(copy.d-6)<.001,"90-degree placement did not swap footprint");
  assert(copy.texture==="BO_REDBRICK"&&copy.floorTexture==="BO_FLOORTILE","Materials were not preserved");
  const copiedDoor=placed.doors.find((item)=>item.id!=="test-door-source");
  const copiedPlatform=placed.props.find((item)=>item.id!=="test-platform-source");
  const copiedZone=placed.zones.find((item)=>item.id!=="test-zone-source");
  const copiedDestination=placed.entities.find((item)=>item.kind==="teleDest"&&item.id!=="test-destination-source");
  const copiedButton=placed.entities.find((item)=>item.kind==="button"&&item.id!=="test-button-source");
  const copiedItems=[copy,copiedDoor,copiedPlatform,copiedZone,copiedDestination,copiedButton];
  assert(copiedItems.every(Boolean),"A copied object could not be identified");
  assert(new Set(copiedItems.map((item)=>item.groupId)).size===1&&copy.groupId!=="source-prefab-group","Group ID was not safely remapped");
  assert(copiedDoor.edgeRoomId===copy.id,"Door room reference was not remapped");
  assert(Math.abs(copiedPlatform.floorLevel-1)<.001,"Relative multi-level height was not preserved");
  assert(copiedDestination.target!=="tele_gate"&&copiedZone.target===copiedDestination.target&&copiedButton.target===copiedDestination.target,"Logic target names were not remapped together");
  const map=Blockout.generateMapText();
  assert(map&&!/undefined|NaN/.test(map),"MAP export contains invalid values");

  const exported=localStorage.getItem("blockout-custom-prefabs-v1");
  window.confirm=()=>true;
  document.querySelector("#openPrefabLibrary").click();
  document.querySelector("[data-delete-custom-prefab]").click();
  assert(Blockout.getCustomPrefabs().length===0,"Prefab delete failed");
  const input=document.querySelector("#importCustomPrefabs");
  const transfer=new DataTransfer();
  transfer.items.add(new File([JSON.stringify({format:"blockout-custom-prefabs",version:1,prefabs:JSON.parse(exported)})],"prefabs.json",{type:"application/json"}));
  Object.defineProperty(input,"files",{configurable:true,value:transfer.files});
  input.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise((resolve)=>setTimeout(resolve,50));
  assert(Blockout.getCustomPrefabs().length===1,"Prefab import failed");
  return {
    customPrefabs:Blockout.getCustomPrefabs().length,
    rooms:placed.rooms.length,
    objects:placed.rooms.length+placed.doors.length+placed.props.length+placed.zones.length+placed.entities.length,
    placedFootprint:[copy.w,copy.d],
    materials:[copy.texture,copy.floorTexture],
    copiedLevel:copiedPlatform.floorLevel,
    remappedTarget:copiedDestination.target,
    mapBytes:map.length
  };
})()`);

if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join("; ")}`);
console.log(`Custom Prefab Studio headless regression passed: ${JSON.stringify(result)}`);
socket.close();
