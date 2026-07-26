const port=Number(process.argv[2]||9231);
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
  }else if(message.method==="Runtime.exceptionThrown"){
    pageErrors.push(message.params.exceptionDetails?.exception?.description||message.params.exceptionDetails?.text||"Uncaught page error");
  }
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
  for(let attempt=0;attempt<80;attempt+=1){
    await delay(50);
    if(await evaluate("document.readyState==='complete'&&!!window.Blockout").catch(()=>false))return;
  }
  throw new Error(`App did not finish loading: ${url}`);
}

await command("Page.enable");await command("Runtime.enable");await navigate(baseUrl);
const result=await evaluate(`(async()=>{
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  localStorage.removeItem("blockout-project-snapshots-v1");
  const menu=document.querySelector("#projectFileMenu");
  menu.open=true;
  const actionIds=["saveProjectNow","saveNamedVersion","manageProjectVersions","downloadProjectJson","projectFileInput","exportMapFromProject","downloadProjectPackage"];
  actionIds.forEach((id)=>assert(document.querySelector("#"+id),"Project menu is missing "+id));
  assert(menu.querySelector(".project-save-summary"),"Project autosave explanation is missing");

  window.Blockout.saveProjectNow();
  const saved=JSON.parse(localStorage.getItem("blockout-cs16-project-v1"));
  assert(saved?.name===window.Blockout.getProject().name,"Manual save did not update browser storage");

  window.Blockout.createProjectVersion("Before import test");
  const versions=window.Blockout.getProjectVersions();
  assert(versions.length===1&&versions[0].name==="Before import test","Named local version was not created");
  assert(JSON.parse(localStorage.getItem("blockout-project-snapshots-v1")).length===1,"Named version was not persisted");

  const originalDocument=window.Blockout.getProjectDocument();
  assert(originalDocument.format==="blockout-project"&&originalDocument.version===2,"Editable project envelope is invalid");
  const imports=structuredClone(originalDocument);
  imports.project.name="Imported transfer test";
  const transfer=new DataTransfer(),file=new File([JSON.stringify(imports)],"transfer.blockout.json",{type:"application/json"});
  transfer.items.add(file);
  const input=document.querySelector("#projectFileInput");
  Object.defineProperty(input,"files",{value:transfer.files,configurable:true});
  input.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise((resolve)=>setTimeout(resolve,40));
  assert(window.Blockout.getProject().name==="Imported transfer test","File input did not import the project");
  assert(JSON.parse(localStorage.getItem("blockout-cs16-project-v1")).name==="Imported transfer test","Imported project was not autosaved");

  let rejected=false;
  try{window.Blockout.importProjectDocument({format:"unknown"});}catch(_){rejected=true;}
  assert(rejected,"Invalid project data was accepted");
  assert(window.Blockout.getProject().name==="Imported transfer test","Invalid import replaced the active project");

  const downloads=[];
  const nativeClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
  document.querySelector("#downloadProjectJson").click();
  document.querySelector("#exportMapFromProject").click();
  document.querySelector("#downloadProjectPackage").click();
  HTMLAnchorElement.prototype.click=nativeClick;
  assert(downloads.some((name)=>name.endsWith(".blockout.json")),"Editable project download is missing");
  assert(downloads.some((name)=>name.endsWith(".map")),"GoldSrc MAP export is missing");
  assert(downloads.some((name)=>name.endsWith("_production.zip")),"Portable package export is missing");

  menu.open=true;
  document.querySelector("#manageProjectVersions").click();
  assert(document.querySelector("#productionDialog").open,"Manage versions did not open Production");
  assert(document.querySelector('[data-production-tab="project"]').classList.contains("active"),"Versions tab was not selected");
  document.querySelector("#productionDialog").close();
  return {actions:actionIds.length,versionName:versions[0].name,imported:window.Blockout.getProject().name,downloads};
})()`);

if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join("; ")}`);
console.log(`Project files headless regression passed: ${JSON.stringify(result)}`);
socket.close();
