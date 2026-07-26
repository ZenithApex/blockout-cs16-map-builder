import { writeFile } from "node:fs/promises";

const port=Number(process.argv[2]||9230);
const baseUrl=process.argv[3]||"http://127.0.0.1:41716/index.html";
const screenshotPath=process.argv[4]||"";
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
await evaluate(`(()=>{["blockout-tool-workspace","blockout-tool-mode","blockout-recent-tools","blockout-right-panel"].forEach((key)=>localStorage.removeItem(key));location.reload();})()`);
for(let attempt=0;attempt<80;attempt+=1){await delay(50);if(await evaluate("document.readyState==='complete'&&!!window.Blockout").catch(()=>false))break;}

const result=await evaluate(`(()=>{
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const visible=(selector)=>{const item=document.querySelector(selector);return !!item&&item.getClientRects().length>0;};
  const workspace=(name)=>document.querySelector('[data-tool-workspace="'+name+'"]').click();
  assert(document.querySelector('[data-tool-workspace="start"]').classList.contains("active"),"Start workspace is not the default");
  assert(document.querySelector("#toolModeButton").textContent==="Beginner","Beginner mode is not the default");
  assert(visible('[data-tool="room"]')&&visible('[data-tool="ct"]'),"Start does not combine essential build and gameplay tools");
  assert(!visible('[data-tool="teleport"]')&&!visible('[data-tool="cylinder"]'),"Advanced tools leaked into Start");

  workspace("build");
  assert(visible('[data-tool="wall"]')&&!visible('[data-tool="ct"]'),"Build workspace filtering failed");
  assert(!visible('[data-tool="cylinder"]'),"Advanced geometry is visible in beginner mode");
  document.querySelector("#toolModeButton").click();
  assert(visible('[data-tool="cylinder"]')&&visible('[data-tool="polyWall"]'),"All-tools mode did not reveal advanced geometry");

  workspace("gameplay");
  assert(visible('[data-tool="bombA"]')&&!visible('[data-tool="wall"]'),"Gameplay workspace filtering failed");
  workspace("logic");
  assert(visible('[data-tool="teleport"]')&&visible('[data-tool="train"]')&&!visible('[data-tool="bombA"]'),"Logic workspace filtering failed");
  workspace("assets");
  assert(visible("#openPrefabLibrary")&&visible("#openMaterialLibrarySidebar")&&visible("#openLayoutsSidebar"),"Asset libraries are not grouped together");

  const search=document.querySelector("#toolSearch");search.value="teleport";search.dispatchEvent(new Event("input",{bubbles:true}));
  assert(visible('[data-tool="teleport"]')&&visible('[data-tool="teleDest"]'),"Global tool search did not override the current workspace");
  assert(document.querySelector("#toolboxSummary").textContent.includes("matching"),"Search result count is missing");
  search.value="";search.dispatchEvent(new Event("input",{bubbles:true}));

  document.querySelector('[data-tool="room"]').click();document.querySelector('[data-tool="wall"]').click();
  assert(document.querySelectorAll("[data-recent-tool]").length===2,"Recent tools were not recorded");

  document.querySelector('[data-right-panel="guide"]').click();
  assert(visible('[data-right-pane="guide"]')&&!visible('[data-right-pane="selection"]'),"Map Guide tab did not isolate its pane");
  document.querySelector('[data-right-panel="selection"]').click();
  assert(visible('[data-right-pane="selection"]')&&!visible('[data-right-pane="guide"]'),"Selection tab did not isolate its pane");

  const more=document.querySelector("#topMoreMenu");more.open=true;
  assert(visible("#newButton")&&visible("#productionButton")&&visible("#brushStudioButton"),"Top More menu is missing project or review actions");
  return {
    workspace:document.querySelector("#toolWorkspaces .active").dataset.toolWorkspace,
    mode:document.querySelector("#toolModeButton").textContent,
    recent:[...document.querySelectorAll("[data-recent-tool]")].map((item)=>item.dataset.recentTool),
    topActions:document.querySelectorAll("#topMoreMenu .menu-action").length,
    rightPanel:document.querySelector("#rightPanelTabs .active").dataset.rightPanel
  };
})()`);

await command("Input.dispatchKeyEvent",{type:"keyDown",key:"k",code:"KeyK",modifiers:2});
await command("Input.dispatchKeyEvent",{type:"keyUp",key:"k",code:"KeyK",modifiers:2});
const focused=await evaluate(`document.activeElement?.id`);
if(focused!=="toolSearch")throw new Error("Ctrl+K did not focus global tool search");
if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join("; ")}`);
if(screenshotPath){
  await evaluate(`(()=>{document.querySelector("#toolSearch").blur();document.querySelector("#toolSearch").value="";document.querySelector("#toolSearch").dispatchEvent(new Event("input",{bubbles:true}));document.querySelector('[data-tool-workspace="start"]').click();document.querySelector("#topMoreMenu").open=false;})()`);
  const capture=await command("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
  await writeFile(screenshotPath,Buffer.from(capture.data,"base64"));
}
console.log(`UI organization headless regression passed: ${JSON.stringify(result)}`);
socket.close();
