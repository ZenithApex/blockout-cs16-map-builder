(() => {
  "use strict";

  const GRID = 64;
  const STORAGE_KEY = "blockout-cs16-project-v1";
  const CUSTOM_PREFAB_STORAGE_KEY = "blockout-custom-prefabs-v1";
  const DEFAULT_LAYER_ID = "layer-default";
  const LAYER_COLORS = ["#d7f45a","#72c8c0","#f0a45a","#8bb8ff","#d58cff","#ef7084","#f1d071","#9aa3ad"];
  const IS_LOCAL_HOST = ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname);
  const HOSTED_MODE = location.protocol !== "file:" && !IS_LOCAL_HOST;
  const COMPANION_API = location.protocol === "file:" || HOSTED_MODE ? "http://127.0.0.1:41716" : "";
  const PAIRING_STORAGE_KEY = "blockout-companion-pairing-v1";
  const PROCEDURAL_STOCK_PREVIEWS = new Set([
    "C1A0_LABW3", "CSTRIKE_WR4RGH", "CSTRIKE_ME4METL",
    "CSTRIKE_CH3TILE", "CSTRIKE_FP2DARK", "BCRATE02", "C1A1_CRATE1"
  ]);
  const officialTextureSources = new Map();
  let officialTextureWads = [];
  let installedTextureMaps = [];
  const texturePreviewUrl = (texture, cacheBust = "") => {
    const official = officialTextureSources.get(texture);
    if (official?.wadId) {
      const parameters = new URLSearchParams({wad:official.wadId,texture});
      if (cacheBust) parameters.set("v", cacheBust);
      if (HOSTED_MODE && companionPairingCode) parameters.set("pair", companionPairingCode);
      return `${COMPANION_API}/api/official-textures/preview?${parameters}`;
    }
    if (official?.mapId) {
      const parameters = new URLSearchParams({map:official.mapId,texture});
      if (cacheBust) parameters.set("v", cacheBust);
      if (HOSTED_MODE && companionPairingCode) parameters.set("pair", companionPairingCode);
      return `${COMPANION_API}/api/map-textures/preview?${parameters}`;
    }
    const base = texture.startsWith("USR_") && COMPANION_API
      ? `${COMPANION_API}/textures/previews`
      : location.protocol === "file:" ? "textures/previews" : "/textures/previews";
    const parameters = new URLSearchParams();
    if (cacheBust) parameters.set("v", cacheBust);
    if (HOSTED_MODE && texture.startsWith("USR_") && companionPairingCode) parameters.set("pair", companionPairingCode);
    const extension = PROCEDURAL_STOCK_PREVIEWS.has(texture) ? "svg" : "png";
    return `${base}/${texture}.${extension}${parameters.size ? `?${parameters}` : ""}`;
  };
  const TOOL_INFO = {
    room: { title: "Draw a room", tip: "Click and drag on the grid to draw a room." },
    polygon: { title: "Draw a polygon room", tip: "Click each corner. Click the first corner again or press Enter to finish. Esc cancels." },
    triangle: { title: "Draw a triangle room", tip: "Drag a box to create a GoldSrc-safe triangular room." },
    octagon: { title: "Draw an octagon room", tip: "Drag a box to create an eight-sided room or cylinder-like space." },
    corridor: { title: "Draw a corridor", tip: "Drag a narrow space until it touches another room." },
    door: { title: "Place a door opening", tip: "Click close to a room edge to cut a 64-unit doorway." },
    window: { title: "Place a window", tip: "Click a shared wall to add glass. Select it to change the sill, size, or behavior." },
    select: { title: "Select and adjust", tip: "Click an item to select it. Shift-click adds items; Alt-drag draws a selection box." },
    ruler: { title: "Measure the map", tip: "Drag between two points to measure distance, angle, and GoldSrc units." },
    pan: { title: "Move around the plan", tip: "Drag anywhere to pan the top-down plan. You can also hold Space while using another tool." },
    ct: { title: "Place CT spawns", tip: "Click on a room floor or the map-wide ground to place a Counter-Terrorist spawn." },
    t: { title: "Place T spawns", tip: "Click on a room floor or the map-wide ground to place a Terrorist spawn." },
    bombA: { title: "Place bombsite A", tip: "Click on any buildable floor or ground area to mark bombsite A." },
    bombB: { title: "Place bombsite B", tip: "Click on any buildable floor or ground area to mark bombsite B." },
    wall: { title: "Draw a solid wall", tip: "Drag on a room floor or the map-wide ground to create a wall, divider, or cover block." },
    polyWall: { title: "Draw a polygon wall", tip: "Click a convex footprint on any buildable floor or ground area, then close it." },
    column: { title: "Place a column", tip: "Click any buildable floor or ground cell to place a compile-safe octagonal column." },
    diagonal: { title: "Draw diagonal cover", tip: "Drag corner-to-corner on any buildable surface to create true 45-degree cover." },
    cylinder: { title: "Draw a cylinder", tip: "Drag a box for a compile-safe 12-sided cylindrical brush." },
    wedge: { title: "Draw a solid wedge", tip: "Drag in the uphill direction to create a solid sloped wedge." },
    arch: { title: "Draw an archway", tip: "Drag an opening; Blockout creates grouped supports and a lintel." },
    slopeRoof: { title: "Draw a sloped roof", tip: "Drag in the uphill direction to create a raised sloped roof brush." },
    eyedropper: { title: "Sample a material", tip: "Click a room or structure to copy its current material." },
    paint: { title: "Paint sampled material", tip: "Click rooms or structures to apply the sampled material." },
    platform: { title: "Draw an elevated platform", tip: "Drag on any buildable floor or ground area to create a raised platform." },
    polyPlatform: { title: "Draw a polygon platform", tip: "Click platform corners on any buildable surface, then close the polygon." },
    floor: { title: "Draw a floor slab", tip: "Drag on any buildable surface to add a walkable slab with its own elevation." },
    floorHole: { title: "Cut a floor opening", tip: "Drag inside a rectangular room to cut a stairwell, ladder shaft, or drop opening." },
    polyFloor: { title: "Draw a polygon floor", tip: "Click floor corners on any buildable surface, then close the polygon." },
    ladder: { title: "Place a ladder", tip: "Click any buildable floor or ground cell, then choose its facing and height." },
    crate: { title: "Place a crate", tip: "Click any buildable floor or ground cell to add a solid 64-unit crate." },
    stairs: { title: "Draw stairs", tip: "Drag on any buildable surface. The drag direction points uphill." },
    ramp: { title: "Draw a ramp", tip: "Drag on any buildable surface. The drag direction points uphill." },
    light: { title: "Place a light", tip: "Click any buildable floor or ground cell, then adjust height, brightness, and color." },
    spotlight: { title: "Place a spotlight", tip: "Click a floor, then set its facing, cone, pitch, color, and brightness." },
    buyCt: { title: "Draw a CT buy zone", tip: "Drag a rectangle inside a CT spawn area." },
    buyT: { title: "Draw a T buy zone", tip: "Drag a rectangle inside a T spawn area." },
    hostage: { title: "Place a hostage", tip: "Click a safe floor to place a rescueable hostage." },
    rescue: { title: "Draw a rescue zone", tip: "Drag the area where rescued hostages complete the objective." },
    button: { title: "Place a button", tip: "Click a wall-side floor cell, then name the target it activates." },
    triggerHurt: { title: "Draw a damage trigger", tip: "Drag a dangerous volume, then set its damage in Selection." },
    teleport: { title: "Draw a teleporter", tip: "Drag a trigger and choose a matching destination target." },
    teleDest: { title: "Place a teleport destination", tip: "Click a safe landing floor and give it a target name." },
    decal: { title: "Place a decal", tip: "Click near a surface, then enter the GoldSrc decal texture." },
    ambient: { title: "Place ambient sound", tip: "Click a floor position, then choose the WAV path and volume." },
    water: { title: "Draw water", tip: "Drag a physical water volume and adjust its depth in Selection." },
    breakable: { title: "Draw breakable cover", tip: "Drag a breakable brush such as glass, boards, or fragile cover." },
    elevator: { title: "Draw an elevator", tip: "Drag a moving platform, then set its travel height, speed, wait, and target name." },
    rotatingDoor: { title: "Draw a rotating door", tip: "Drag a hinged door brush, then set its speed, wait, and target name." },
    train: { title: "Draw a moving platform", tip: "Drag the platform, then connect its first path_corner target." },
    pathCorner: { title: "Place a path corner", tip: "Click a floor to place a named route point for func_train platforms." },
    targetDummy: { title: "Place a target dummy", tip: "Click a sightline to add a visible playtest target marker." },
    wideDoor: { title: "Place a wide doorway", tip: "Click a shared wall to create a beginner-friendly 128-unit opening." },
    vent: { title: "Draw a vent passage", tip: "Drag a compact 64-unit-high passage for a crouch-only GoldSrc route." },
    stairPrefab: { title: "Draw a stair flight", tip: "Drag a flight; Blockout picks safe step count, rise, and uphill direction." },
    prefab: { title: "Place a prefab", tip: "Click any clear room floor or ground area to place the chosen multi-part prefab." }
  };

  const MATERIAL_COLORS = {
    C1A0_LABW3: "#606d57", CSTRIKE_WR4RGH: "#77786f", CSTRIKE_ME4METL: "#53666b",
    CSTRIKE_CH3TILE: "#908b78", CSTRIKE_FP2DARK: "#343a36", BCRATE02: "#8a6844", C1A1_CRATE1: "#a1835d",
    SUN_FELT: "#e9aa18", SUN_KNIT: "#a51519", SUN_RIBBON: "#1a9f9a", SUN_FACE: "#d79619",
    SUN_WALL: "#d9bd78", SUN_METAL: "#176b6d", SUN_TILE: "#c47720", SUN_FLOOR: "#39181e",
    SUN_CRATE: "#b87918", SUN_SUPPLY: "#087f80",
    BO_CONCRETE: "#777672", BO_PAVEMENT: "#595956", BO_RGHBRICK: "#76564b", BO_SMTHBRICK: "#8d5042",
    BO_STUCBRICK: "#826e5d", BO_BRICKTILE: "#9a6552", BO_COBBLE: "#6b6861", BO_CONCBRICK: "#85837b",
    BO_GRAVEL: "#706d66", BO_SAND: "#a99169", BO_STUCCO: "#b7aa92", BO_BRICK01: "#9a5d49",
    BO_BRICK02: "#8f7963", BO_BRICK03: "#71574d", BO_BRICK04: "#4c413e", BO_WOODREAL: "#7f5b3d",
    BO_RUST: "#70432f", BO_WOOD01: "#9a744f", BO_WOOD02: "#5b4030",
    BO_REDBRICK:"#7f382e", BO_ALLIGATOR:"#434b2d", BO_CEDAR:"#8c5a38", BO_CONCART:"#77736e",
    BO_LEAF:"#49613a", BO_LEATHER:"#4d3025", BO_OBSIDIAN:"#242126", BO_ONYX:"#34343b",
    BO_PINE:"#a77a48", BO_RUSTIRON:"#713f2d", BO_SNAKESKIN:"#797255", BO_STUCCO2:"#b6aa96",
    BO_FOAM:"#d2d0c8", BO_TOPAZ:"#a87527", BO_TURQUOISE:"#368982", BO_MARBLE:"#c7c7c1",
    BO_YELLOWGEM:"#a69747", BO_CONC1K1:"#858481", BO_PEBBLE1K:"#716e67", BO_CONC1K2:"#666563",
    BO_ROCK:"#55514c", BO_FLOORTILE:"#8b857c", BO_GRASS1:"#777044", BO_GRASS2:"#4d6b36"
  };
  const MATERIAL_INFO = {
    C1A0_LABW3: "Industrial wall", CSTRIKE_WR4RGH: "Rough concrete", CSTRIKE_ME4METL: "Metal panels",
    CSTRIKE_CH3TILE: "Stone tile", CSTRIKE_FP2DARK: "Dark floor", BCRATE02: "Wood crate", C1A1_CRATE1: "Light crate",
    SUN_FELT: "Sunburst golden felt", SUN_KNIT: "Sunburst red cable knit",
    SUN_RIBBON: "Sunburst rainbow ribbons", SUN_FACE: "Sun Hub emblem",
    SUN_WALL: "Sun-embossed cream wall", SUN_METAL: "Teal and gold metal",
    SUN_TILE: "Warm Sunburst tile", SUN_FLOOR: "Dark woven floor",
    SUN_CRATE: "Red and gold Sun crate", SUN_SUPPLY: "Teal ribbon supply crate",
    BO_CONCRETE: "Clean concrete", BO_PAVEMENT: "Real pavement", BO_RGHBRICK: "Rough brick",
    BO_SMTHBRICK: "Smooth red brick", BO_STUCBRICK: "Stuccoed brick", BO_BRICKTILE: "Brick tile",
    BO_COBBLE: "Cobblestones", BO_CONCBRICK: "Concrete bricks", BO_GRAVEL: "Gravel", BO_SAND: "Sand",
    BO_STUCCO: "Light stucco", BO_BRICK01: "Warm brick", BO_BRICK02: "Painted brick",
    BO_BRICK03: "Weathered brick", BO_BRICK04: "Dark brick", BO_WOODREAL: "Natural wood",
    BO_RUST: "Rusty steel", BO_WOOD01: "Light wood", BO_WOOD02: "Dark wood",
    BO_REDBRICK:"Deep red brick", BO_ALLIGATOR:"Alligator pattern", BO_CEDAR:"Cedar wood", BO_CONCART:"Art concrete",
    BO_LEAF:"Leaf pattern", BO_LEATHER:"Dark leather", BO_OBSIDIAN:"Obsidian stone", BO_ONYX:"Onyx stone",
    BO_PINE:"Pine wood", BO_RUSTIRON:"Rusty iron", BO_SNAKESKIN:"Snake pattern", BO_STUCCO2:"Fine stucco",
    BO_FOAM:"White foam", BO_TOPAZ:"Topaz surface", BO_TURQUOISE:"Turquoise stone", BO_MARBLE:"White marble",
    BO_YELLOWGEM:"Yellow turquoise", BO_CONC1K1:"Smooth photo concrete", BO_PEBBLE1K:"Pebbled concrete", BO_CONC1K2:"Rough photo concrete",
    BO_ROCK:"Cave rock", BO_FLOORTILE:"Modern floor tile", BO_GRASS1:"Dry grass ground", BO_GRASS2:"Green grass ground"
  };
  const CC0_TEXTURE_CATEGORIES = {
    BO_CONCRETE:"concrete", BO_CONCBRICK:"concrete", BO_PAVEMENT:"ground", BO_COBBLE:"ground", BO_GRAVEL:"ground", BO_SAND:"ground",
    BO_RGHBRICK:"brick", BO_SMTHBRICK:"brick", BO_STUCBRICK:"brick", BO_BRICKTILE:"brick", BO_BRICK01:"brick", BO_BRICK02:"brick", BO_BRICK03:"brick", BO_BRICK04:"brick",
    BO_STUCCO:"plaster", BO_WOODREAL:"wood", BO_WOOD01:"wood", BO_WOOD02:"wood", BO_RUST:"metal",
    BO_REDBRICK:"brick", BO_ALLIGATOR:"organic", BO_CEDAR:"wood", BO_CONCART:"concrete", BO_LEAF:"nature", BO_LEATHER:"fabric",
    BO_OBSIDIAN:"stone", BO_ONYX:"stone", BO_PINE:"wood", BO_RUSTIRON:"metal", BO_SNAKESKIN:"organic", BO_STUCCO2:"plaster",
    BO_FOAM:"plaster", BO_TOPAZ:"stone", BO_TURQUOISE:"stone", BO_MARBLE:"stone", BO_YELLOWGEM:"stone",
    BO_CONC1K1:"concrete", BO_PEBBLE1K:"ground", BO_CONC1K2:"concrete", BO_ROCK:"stone", BO_FLOORTILE:"floor", BO_GRASS1:"nature", BO_GRASS2:"nature"
  };
  const MATERIAL_SURFACE_USES = {};
  const TEXTURE_USE_INFO = {
    wall:{label:"Walls",short:"Wall"},
    floor:{label:"Floors",short:"Floor"},
    tile:{label:"Tiles",short:"Tile"},
    ground:{label:"Outdoor ground",short:"Ground"},
    ceiling:{label:"Ceilings",short:"Ceiling"},
    props:{label:"Props & trim",short:"Props"}
  };
  const DEFAULT_ENVIRONMENT = { groundEnabled:true, groundSize:32, groundPadding:4, groundElevation:0, groundMaterial:"BO_GRASS1", openSkyDefault:true, skyName:"desert" };
  const SKY_THEMES = {
    desert:{label:"Desert daylight",colors:["#263d54","#8da4ad","#d1bd82"],light:"255 244 214 400",angles:"0 215 0"},
    morning:{label:"Clear morning",colors:["#315c85","#8dc4d7","#f2d7a0"],light:"255 244 220 420",angles:"0 205 0"},
    dusk:{label:"Warm dusk",colors:["#302b53","#a05b62","#efad68"],light:"255 184 140 300",angles:"-12 235 0"},
    night:{label:"Night",colors:["#050814","#121e3d","#34446a"],light:"125 150 210 130",angles:"-25 220 0"},
    forest:{label:"Forest valley",colors:["#263f47","#6e9682","#9eaa78"],light:"218 232 198 330",angles:"-15 190 0"},
    city:{label:"City",colors:["#48515c","#87929c","#bdad91"],light:"225 226 218 320",angles:"-10 210 0"},
    de_storm:{label:"Storm clouds",colors:["#171d25","#46505b","#778087"],light:"174 191 205 230",angles:"-20 240 0"},
    snow:{label:"Snow",colors:["#6e8395","#b9cad3","#edf1ec"],light:"235 245 255 390",angles:"-8 205 0"},
    tornsky:{label:"Dramatic clouds",colors:["#1f2632","#586171","#b88462"],light:"205 191 184 260",angles:"-16 225 0"},
    space:{label:"Space",colors:["#02030a","#080d22","#221b3d"],light:"120 140 205 100",angles:"-30 200 0"}
  };
  const PREFAB_LIBRARY = [
    { id:"wideDoor", name:"Wide doorway", category:"openings", size:"2-wide opening", tool:"wideDoor", icon:"▱", description:"A comfortable 128-unit opening between two rooms." },
    { id:"vent", name:"Crouch vent", category:"routes", size:"drag route", tool:"vent", icon:"▤", description:"A sealed 64-unit-high alternate route." },
    { id:"stairFlight", name:"Safe stair flight", category:"vertical", size:"drag flight", tool:"stairPrefab", icon:"▟", description:"Automatically chooses GoldSrc-safe step rise and count." },
    { id:"halfCover", name:"Half-height cover", category:"cover", size:"2 × 1", icon:"▬", description:"A 48-unit tactical cover wall." },
    { id:"doubleCrate", name:"Double crate", category:"cover", size:"2 × 1", icon:"▣", description:"Two physical wooden crates for lane control." },
    { id:"crateCorner", name:"Crate corner", category:"cover", size:"2 × 2", icon:"◩", description:"Three crates forming a compact protected corner." },
    { id:"pillarPair", name:"Pillar pair", category:"architecture", size:"4 × 1", icon:"● ●", description:"Two octagonal columns framing a lane." },
    { id:"coverLane", name:"Competitive cover lane", category:"cover", size:"5 × 3", icon:"╱ ▬ ╲", description:"Angled cover that creates two deliberate peek lines." },
    { id:"bombCover", name:"Bombsite cover set", category:"gameplay", size:"4 × 4", icon:"A +", description:"Four separated cover pieces around a plantable center." },
    { id:"catwalk", name:"Raised catwalk", category:"vertical", size:"5 × 2", icon:"▰", description:"Platform plus a safe stair approach." },
    { id:"rampLanding", name:"Ramp and landing", category:"vertical", size:"5 × 2", icon:"◢━", description:"A one-level ramp connected to a raised landing." },
    { id:"ladderTower", name:"Ladder platform", category:"vertical", size:"3 × 2", icon:"H▰", description:"A climbable ladder leading to a two-unit platform." },
    { id:"windowNest", name:"Defensive nest", category:"cover", size:"4 × 3", icon:"⊔", description:"A U-shaped bunker with a firing gap." },
    { id:"columnArc", name:"Column trio", category:"architecture", size:"5 × 2", icon:"● ● ●", description:"Three columns that break a wide sightline naturally." },
    { id:"archFrame", name:"Heavy doorway frame", category:"openings", size:"4 x 1", icon:"[  ]", description:"Two supports and a raised lintel for a strong entrance silhouette." },
    { id:"cratePyramid", name:"Crate pyramid", category:"cover", size:"2 x 2", icon:"[]^", description:"Three ground crates with one elevated crate for vertical cover." },
    { id:"tCover", name:"T-shaped cover", category:"cover", size:"4 x 3", icon:"-T-", description:"A tactical divider supporting three different peek positions." },
    { id:"zigzag", name:"Zigzag lane", category:"routes", size:"7 x 4", icon:"/\\/", description:"Alternating diagonal cover breaks a long rectangular corridor." },
    { id:"bridge", name:"Bridge with rails", category:"vertical", size:"6 x 3", icon:"|===|", description:"A raised crossing with low protective rails on both sides." },
    { id:"sniperNest", name:"Raised sniper nest", category:"gameplay", size:"5 x 4", icon:"[_^_]", description:"Stairs, platform, and waist-high protection for a deliberate long angle." },
    { id:"marketStall", name:"Market stall row", category:"architecture", size:"6 x 3", icon:"|_|_|", description:"Three waist-high counters with varied materials and gaps." },
    { id:"bollardRow", name:"Bollard row", category:"architecture", size:"7 x 1", icon:"o o o o", description:"Four small octagonal blockers that preserve visibility." },
    { id:"highLowCover", name:"High-low cover mix", category:"cover", size:"5 x 2", icon:"_[]_", description:"Alternating crouch and full cover for varied engagements." },
    { id:"stairTower", name:"Two-level stair tower", category:"vertical", size:"8 x 4", icon:"_/^^", description:"Two staged stair flights and landings for vertical blockouts." }
  ];
  const LAYOUT_LIBRARY = [
    { id:"threeLane", name:"Three-lane competitive", category:"competitive", size:"24 x 24", icon:"≡", materials:["BO_STUCCO2","BO_REDBRICK","BO_RUSTIRON"], description:"Mirrored spawns with three distinct routes through a contested center." },
    { id:"twoSite", name:"Two-site skeleton", category:"competitive", size:"28 x 24", icon:"A—+—B", materials:["BO_STUCCO","BO_SAND","BO_GRASS2"], description:"A clean demolition foundation with mid, two objectives, and rotations." },
    { id:"warehouse", name:"Warehouse arena", category:"arena", size:"22 x 14", icon:"▦", materials:["BO_REDBRICK","BO_CONC1K2","BO_CEDAR"], description:"One large industrial shell with crates, columns, and crossfire cover." },
    { id:"courtyard", name:"Open courtyard", category:"outdoor", size:"18 x 18", icon:"◇", materials:["BO_FLOORTILE","BO_MARBLE","BO_ROCK"], description:"Faceted open-sky court with natural stone and diagonal sightline breaks." },
    { id:"vertical", name:"Vertical blockout", category:"experimental", size:"16 x 16", icon:"Z+2", materials:["BO_OBSIDIAN","BO_FLOORTILE","BO_MARBLE"], description:"Platforms, stairs, ladder access, and two meaningful combat heights." },
    { id:"training", name:"Aim training lanes", category:"training", size:"26 x 12", icon:"→|→|", materials:["BO_CONCART","BO_PEBBLE1K","BO_CEDAR"], description:"Long and short practice angles with varied cover silhouettes." }
  ];
  const SUNBURST_TEXTURE_UPGRADE = {
    C1A0_LABW3:"SUN_WALL", CSTRIKE_WR4RGH:"SUN_WALL", CSTRIKE_ME4METL:"SUN_METAL",
    CSTRIKE_CH3TILE:"SUN_TILE", CSTRIKE_FP2DARK:"SUN_FLOOR",
    BCRATE02:"SUN_CRATE", C1A1_CRATE1:"SUN_SUPPLY"
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const editor = $("#editorCanvas");
  const preview = $("#previewCanvas");
  const ectx = editor.getContext("2d");
  const pctx = preview.getContext("2d");
  const elevationCanvas = $("#elevationCanvas");
  const elevationCtx = elevationCanvas.getContext("2d");
  const materialImages = {};
  const previewPatterns = new Map();
  $("#textureSummary").after($("#textureImporter"));

  function registerMaterial(texture,label=MATERIAL_INFO[texture]||texture,category=null,cacheBust="",uses=null) {
    MATERIAL_INFO[texture]=label;
    if(category)CC0_TEXTURE_CATEGORIES[texture]=category;
    if(Array.isArray(uses)&&uses.length)MATERIAL_SURFACE_USES[texture]=[...new Set(uses.filter((use)=>TEXTURE_USE_INFO[use]))];
    ensureMaterialImage(texture,cacheBust);
  }

  function ensureMaterialImage(texture,cacheBust="") {
    if(!texture||materialImages[texture]&&!cacheBust)return materialImages[texture]||null;
    const image = new Image();
    if (HOSTED_MODE && (texture.startsWith("USR_")||officialTextureSources.has(texture))) image.crossOrigin = "anonymous";
    image.onload = () => {
      try{const canvas=document.createElement("canvas"),context=canvas.getContext("2d",{willReadFrequently:true});canvas.width=canvas.height=1;context.drawImage(image,0,0,1,1);const [red,green,blue]=context.getImageData(0,0,1,1).data;MATERIAL_COLORS[texture]=`rgb(${red},${green},${blue})`;}catch(_){}
      previewPatterns.clear(); drawPreview();
    };
    image.src = texturePreviewUrl(texture,cacheBust);
    materialImages[texture] = image;
    return image;
  }

  function registerOfficialMaterial(item) {
    const texture=String(item?.name||"").toUpperCase();
    if(!texture||!item?.wadId)return;
    MATERIAL_INFO[texture]=item.label||texture;
    CC0_TEXTURE_CATEGORIES[texture]=item.category||"architecture";
    if(Array.isArray(item.uses)&&item.uses.length)MATERIAL_SURFACE_USES[texture]=[...new Set(item.uses.filter((use)=>TEXTURE_USE_INFO[use]))];
    officialTextureSources.set(texture,{kind:"wad",wadId:item.wadId,wad:item.wad||item.wadId.split("/").pop(),mapIds:[],width:item.width,height:item.height});
  }

  function registerMapMaterial(item) {
    const texture=String(item?.name||"").toUpperCase();
    if(!texture||!item?.mapId)return;
    MATERIAL_INFO[texture]=MATERIAL_INFO[texture]||item.label||texture;
    CC0_TEXTURE_CATEGORIES[texture]=CC0_TEXTURE_CATEGORIES[texture]||item.category||"architecture";
    if(!MATERIAL_SURFACE_USES[texture]?.length&&Array.isArray(item.uses)&&item.uses.length)MATERIAL_SURFACE_USES[texture]=[...new Set(item.uses.filter((use)=>TEXTURE_USE_INFO[use]))];
    const existing=officialTextureSources.get(texture);
    if(existing){
      existing.mapIds=[...new Set([...(existing.mapIds||[]),...(item.mapIds||[item.mapId])])];
      return;
    }
    officialTextureSources.set(texture,{kind:"map",mapId:item.mapId,map:item.map||`${item.mapId}.bsp`,mapIds:item.mapIds||[item.mapId],width:item.width,height:item.height});
  }
  Object.keys(MATERIAL_COLORS).forEach((texture) => registerMaterial(texture));

  function populateMaterialSelect(id,usage,current="") {
    const select=$(`#${id}`);
    if(!select)return;
    const suitable=Object.keys(MATERIAL_INFO).filter((texture)=>!officialTextureSources.has(texture)&&textureSurfaceUses(texture).includes(usage))
      .sort((a,b)=>MATERIAL_INFO[a].localeCompare(MATERIAL_INFO[b]));
    if(current&&MATERIAL_INFO[current]&&!suitable.includes(current))suitable.unshift(current);
    select.innerHTML="";
    suitable.forEach((texture)=>{
      const option=document.createElement("option");
      option.value=texture;option.textContent=MATERIAL_INFO[texture];
      if(texture===current&&!textureSurfaceUses(texture).includes(usage))option.textContent+=` · current (outside ${TEXTURE_USE_INFO[usage]?.label.toLowerCase()||usage})`;
      select.append(option);
    });
    if(current&&suitable.includes(current))select.value=current;
  }

  function installMaterialOptions() {
    populateMaterialSelect("materialSelect","wall",$("#materialSelect")?.value||"C1A0_LABW3");
    populateMaterialSelect("floorMaterialSelect","floor",$("#floorMaterialSelect")?.value||"CSTRIKE_FP2DARK");
    populateMaterialSelect("ceilingMaterialSelect","ceiling",$("#ceilingMaterialSelect")?.value||"C1A0_LABW3");
    populateMaterialSelect("doorMaterialSelect","props",$("#doorMaterialSelect")?.value||"CSTRIKE_ME4METL");
    populateMaterialSelect("environmentGroundMaterialSelect","ground",$("#environmentGroundMaterialSelect")?.value||DEFAULT_ENVIRONMENT.groundMaterial);
  }
  installMaterialOptions();

  function previewPattern(texture, scale = .35, uv = null) {
    const image = materialImages[texture]||ensureMaterialImage(texture);
    if (!image?.complete || !image.naturalWidth) return null;
    const transform = normalizedUv(uv);
    const key = `${texture}:${scale}:${transform.shiftX}:${transform.shiftY}:${transform.rotation}:${transform.scaleX}:${transform.scaleY}`;
    if (!previewPatterns.has(key)) {
      const pattern = pctx.createPattern(image, "repeat");
      if (pattern?.setTransform) pattern.setTransform(new DOMMatrix().translate(transform.shiftX,transform.shiftY).rotate(transform.rotation).scale(scale/transform.scaleX,scale/transform.scaleY));
      previewPatterns.set(key, pattern);
    }
    return previewPatterns.get(key);
  }

  let state = loadProject() || freshProject();
  environmentFor(state);
  let starterLoaded = false;
  if (!state.rooms.length && !localStorage.getItem("blockout-starter-installed-v1")) {
    state = starterProject();
    starterLoaded = true;
    localStorage.setItem("blockout-starter-installed-v1", "yes");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  environmentFor(state);
  let history = [];
  let future = [];
  let activeTool = "room";
  let selected = null;
  let selection = [];
  let marquee = null;
  let measurement = null;
  let snapUnits = 64;
  let objectSnapEnabled = true;
  let adaptiveGridEnabled = localStorage.getItem("blockout-adaptive-grid") !== "off";
  let smartConnectionsEnabled = localStorage.getItem("blockout-smart-connections") !== "off";
  let sampledMaterial = null;
  let surfaceTarget = "object";
  let textureLock = localStorage.getItem("blockout-texture-lock") !== "off";
  let previewPickRegions = [];
  let transformDrag = null;
  let planHitCycle = null;
  let previewTransformHandle = null;
  let elevationAxis = "x";
  let elevationHitRegions = [];
  let lastPreflight = null;
  let objectClipboard = null;
  let lightColorBefore = null;
  let drawing = null;
  let moving = null;
  let polygonDraft = [];
  let editingVertices = false;
  let selectedVertexIndex = -1;
  let movingVertex = null;
  let selectedEdgeIndex = -1;
  let movingEdge = null;
  let panning = null;
  let toolBeforeSpace = null;
  let hoverCell = null;
  let hoverWorld = null;
  let cellSize = 28;
  let viewOffset = { x: 0, y: 0 };
  let previewAngle = -0.72;
  let previewZoom = 1;
  let previewPan = { x: 0, y: 0 };
  let previewPanMode = false;
  let previewDrag = null;
  let previewMode = "orbit";
  let player = { x: 0, y: 0, z: 0, angle: 0 };
  const pressedKeys = new Set();
  const openWalkDoors = new Set();
  const brokenWalkWindows = new Set();
  let lastFrame = performance.now();
  let toastTimer;
  let saveTimer;
  let companionStatus = null;
  let companionPairingCode = HOSTED_MODE ? String(localStorage.getItem(PAIRING_STORAGE_KEY) || "").replace(/[^A-F0-9]/gi, "").toUpperCase() : "";
  let buildDiagnosticMarker = null;
  let buildProgressTimer = null;
  let buildRunning = false;
  let planLevel = null;
  let ghostLevels = true;
  let previewLevelOnly = false;
  let analysisOverlay = null;
  let textureFavorites = new Set();
  let activePrefabId = "halfCover";
  let customPrefabs = [];
  let customPrefabDraft = null;
  let editingCustomPrefabId = null;
  let customPrefabRotation = 0;
  let customPrefabMirrored = false;
  let productionTab = "outliner";
  let lightingOverlay = false;
  let routeRecording = false;
  let recordedRoute = [];
  let routeStartedAt = 0;
  let lastRouteSampleAt = 0;
  let projectSnapshots = [];
  let pendingTextureImport = null;
  let pendingBlueprint = null;
  let blueprintAnalyzeTimer = null;
  let toolWorkspace = ["start","build","gameplay","logic","assets"].includes(localStorage.getItem("blockout-tool-workspace")) ? localStorage.getItem("blockout-tool-workspace") : "start";
  let beginnerToolMode = localStorage.getItem("blockout-tool-mode") !== "advanced";
  let recentToolIds = [];
  let rightPanel = ["selection","guide"].includes(localStorage.getItem("blockout-right-panel")) ? localStorage.getItem("blockout-right-panel") : "selection";
  try { textureFavorites = new Set(JSON.parse(localStorage.getItem("blockout-texture-favorites") || "[]")); } catch (_) {}
  try { projectSnapshots = JSON.parse(localStorage.getItem("blockout-project-snapshots-v1") || "[]"); } catch (_) { projectSnapshots = []; }
  try { recentToolIds = JSON.parse(localStorage.getItem("blockout-recent-tools") || "[]").filter((id)=>TOOL_INFO[id]).slice(0,4); } catch (_) { recentToolIds = []; }
  try {
    const storedPrefabs = JSON.parse(localStorage.getItem(CUSTOM_PREFAB_STORAGE_KEY) || "[]");
    customPrefabs = Array.isArray(storedPrefabs) ? storedPrefabs.filter(isValidCustomPrefab) : [];
  } catch (_) { customPrefabs = []; }
  const MIN_COMPANION_VERSION = "1.11.0";

  function environmentFor(project = state) {
    project.environment = { ...DEFAULT_ENVIRONMENT, ...(project.environment || {}) };
    project.environment.groundSize = Math.max(16, Math.min(128, Number(project.environment.groundSize) || 32));
    project.environment.groundPadding = Math.max(2, Math.min(32, Number(project.environment.groundPadding) || 4));
    project.environment.groundElevation = Math.max(-8, Math.min(16, Number(project.environment.groundElevation) || 0));
    if (!/^[^\s"]{1,15}$/.test(String(project.environment.groundMaterial||""))) project.environment.groundMaterial = DEFAULT_ENVIRONMENT.groundMaterial;
    if (!SKY_THEMES[project.environment.skyName]) project.environment.skyName = DEFAULT_ENVIRONMENT.skyName;
    ensureLayers(project);
    return project.environment;
  }

  function ensureLayers(project = state) {
    project.layers = Array.isArray(project.layers) ? project.layers.filter((layer) => layer && layer.id) : [];
    let defaultLayer = project.layers.find((layer) => layer.id === DEFAULT_LAYER_ID);
    if (!defaultLayer) {
      defaultLayer = { id:DEFAULT_LAYER_ID, name:"Default", color:LAYER_COLORS[0], visible:true, locked:false };
      project.layers.unshift(defaultLayer);
    }
    project.layers.forEach((layer,index) => {
      layer.name = String(layer.name || `Layer ${index + 1}`).slice(0,32);
      layer.color = /^#[0-9a-f]{6}$/i.test(layer.color || "") ? layer.color : LAYER_COLORS[index % LAYER_COLORS.length];
      layer.visible = layer.visible !== false;
      layer.locked = !!layer.locked;
    });
    return project.layers;
  }

  function layerForItem(item, project = state) {
    const layers = ensureLayers(project);
    return layers.find((layer) => layer.id === item?.layerId) || layers.find((layer) => layer.id === DEFAULT_LAYER_ID) || layers[0];
  }

  function isItemHidden(item) {
    return !!item?.hidden || layerForItem(item)?.visible === false;
  }

  function isItemLocked(item) {
    return !!item?.locked || !!layerForItem(item)?.locked;
  }

  function freshProject() {
    return { name: "My first map", rooms: [], doors: [], windows: [], zones: [], props: [], entities: [], layers:[{id:DEFAULT_LAYER_ID,name:"Default",color:LAYER_COLORS[0],visible:true,locked:false}], stories:[{id:crypto.randomUUID(),name:"Ground floor",elevation:0}], environment:{...DEFAULT_ENVIRONMENT}, updatedAt: Date.now() };
  }

  function layoutRoom(label, x, y, w, d, options = {}) {
    return {
      id:crypto.randomUUID(), kind:"room", label, x, y, w, d, height:options.height || 5, floorLevel:options.floorLevel || 0,
      texture:options.texture || "BO_CONC1K1", floorTexture:options.floorTexture || "BO_PAVEMENT",
      ceilingTexture:options.ceilingTexture || "BO_CONC1K2", ceilingMode:options.ceilingMode || "sky", ...(options.points ? {points:options.points} : {})
    };
  }

  function layoutDoor(axis, boundary, along, width = 1) {
    return { id:crypto.randomUUID(), axis, boundary, along, width, mode:"opening", texture:"BO_RUSTIRON", speed:100 };
  }

  function layoutEntity(kind, x, y, angle = 0) {
    return { id:crypto.randomUUID(), kind, x, y, ...(["ct","t"].includes(kind) ? {angle} : {}) };
  }

  function buildLayoutProject(layoutId) {
    const project = { name:`${LAYOUT_LIBRARY.find((item) => item.id === layoutId)?.name || "Starter"} map`, rooms:[], doors:[], windows:[], zones:[], props:[], entities:[], environment:{...DEFAULT_ENVIRONMENT}, updatedAt:Date.now() };
    const prop = (kind,x,y,w,d,height,texture,extra={}) => prefabProp(kind,x,y,w,d,height,0,texture,extra);
    if (layoutId === "threeLane") {
      project.rooms.push(layoutRoom("CT SPAWN",0,6,6,12,{texture:"BO_STUCCO2"}),layoutRoom("CENTRAL CONTROL",9,6,6,12,{texture:"BO_REDBRICK"}),layoutRoom("T SPAWN",18,6,6,12,{texture:"BO_CONC1K2"}));
      [[6,6],[6,10],[6,15],[15,6],[15,10],[15,15]].forEach(([x,y],index) => project.rooms.push(layoutRoom(`ROUTE ${index+1}`,x,y,3,index%3===2?3:3,{height:4,texture:"BO_RUSTIRON"})));
      [[6,7],[9,7],[6,11],[9,11],[6,16],[9,16],[15,7],[18,7],[15,11],[18,11],[15,16],[18,16]].forEach(([boundary,along]) => project.doors.push(layoutDoor("v",boundary,along)));
      project.entities.push(layoutEntity("ct",2,11,0),layoutEntity("ct",3,12,0),layoutEntity("t",21,11,180),layoutEntity("t",20,12,180),layoutEntity("bombA",11,8),layoutEntity("bombB",11,16));
      project.props.push(prop("diagonal",10,11,2,2,1.25,"BO_RUSTIRON",{slope:"up",thickness:.42}),prop("diagonal",13,13,2,2,1.25,"BO_RUSTIRON",{slope:"down",thickness:.42}));
    } else if (layoutId === "twoSite") {
      project.rooms.push(layoutRoom("CT SPAWN",0,9,6,6,{texture:"BO_STUCCO"}),layoutRoom("MID",11,9,6,6,{texture:"BO_CONC1K1"}),layoutRoom("T SPAWN",22,9,6,6,{texture:"BO_REDBRICK"}),layoutRoom("SITE A",11,0,6,6,{ceilingMode:"sky",floorTexture:"BO_SAND"}),layoutRoom("SITE B",11,18,6,6,{ceilingMode:"sky",floorTexture:"BO_GRASS2"}));
      project.rooms.push(layoutRoom("CT TO MID",6,10,5,2,{height:4}),layoutRoom("MID TO T",17,10,5,2,{height:4}),layoutRoom("A CONNECTOR",13,6,2,3,{height:4}),layoutRoom("B CONNECTOR",13,15,2,3,{height:4}));
      [["v",6,10],["v",11,10],["v",17,10],["v",22,10],["h",6,13],["h",9,13],["h",15,13],["h",18,13]].forEach((door) => project.doors.push(layoutDoor(...door)));
      project.entities.push(layoutEntity("ct",2,11,0),layoutEntity("ct",3,12,0),layoutEntity("t",25,11,180),layoutEntity("t",24,12,180),layoutEntity("bombA",13,2),layoutEntity("bombB",13,20));
      project.props.push(prop("crate",12,2,1,1,1,"BO_CEDAR"),prop("wall",15,3,1,2,.75,"BO_CONCRETE"),prop("crate",15,20,1,1,1,"BO_WOOD02"),prop("wall",12,19,1,2,.75,"BO_CONCRETE"));
    } else if (layoutId === "warehouse") {
      project.rooms.push(layoutRoom("WAREHOUSE",0,0,22,14,{height:7,texture:"BO_REDBRICK",floorTexture:"BO_CONC1K2"}));
      [[4,3],[5,3],[16,3],[17,3],[4,10],[17,10]].forEach(([x,y],index) => project.props.push(prop("crate",x,y,1,1,1,index%2?"BO_CEDAR":"BO_WOOD02")));
      project.props.push(prefabColumn(8,3,0,"BO_CONCRETE"),prefabColumn(13,3,0,"BO_CONCRETE"),prefabColumn(8,10,0,"BO_CONCRETE"),prefabColumn(13,10,0,"BO_CONCRETE"),prop("wall",10,6,2,1,.75,"BO_RUSTIRON"));
      project.entities.push(layoutEntity("ct",2,6,0),layoutEntity("ct",2,7,0),layoutEntity("t",19,6,180),layoutEntity("t",19,7,180),layoutEntity("bombA",10,2));
    } else if (layoutId === "courtyard") {
      const points=octagonPoints(0,0,18,18,3); project.rooms.push(layoutRoom("OPEN COURTYARD",0,0,18,18,{points,ceilingMode:"sky",texture:"BO_STUCCO2",floorTexture:"BO_FLOORTILE"}));
      project.props.push(prefabColumn(5,5,0,"BO_MARBLE"),prefabColumn(12,5,0,"BO_MARBLE"),prefabColumn(5,12,0,"BO_MARBLE"),prefabColumn(12,12,0,"BO_MARBLE"));
      project.props.push(prop("diagonal",7,7,2,2,1.25,"BO_ROCK",{slope:"up",thickness:.42}),prop("diagonal",9,9,2,2,1.25,"BO_ROCK",{slope:"up",thickness:.42}));
      project.entities.push(layoutEntity("ct",3,8,0),layoutEntity("t",14,8,180),layoutEntity("bombA",8,3),layoutEntity("bombB",8,14));
    } else if (layoutId === "vertical") {
      project.rooms.push(layoutRoom("VERTICAL LAB",0,0,16,16,{height:8,texture:"BO_CONC1K2",floorTexture:"BO_OBSIDIAN"}));
      project.props.push(prop("stairs",1,6,3,2,1,"BO_CONCRETE",{direction:"e",steps:4}),prop("platform",4,4,4,6,1,"BO_FLOORTILE"),prop("stairs",8,6,3,2,1,"BO_CONCRETE",{direction:"e",steps:4,floorLevel:1}),prop("platform",11,4,4,6,2,"BO_MARBLE"),prop("ladder",14,10,1,1,2,"BO_RUSTIRON",{direction:"s"}));
      project.entities.push(layoutEntity("ct",1,2,90),layoutEntity("t",13,13,270),layoutEntity("bombA",6,6));
    } else {
      project.rooms.push(layoutRoom("TRAINING HALL",0,0,26,12,{height:5,texture:"BO_CONCART",floorTexture:"BO_PEBBLE1K"}));
      [[5,2,1],[5,8,.75],[10,4,1.5],[15,2,.75],[15,8,1.5],[20,5,1]].forEach(([x,y,height],index) => project.props.push(prop(index%2?"wall":"crate",x,y,1,index===2?3:2,height,index%2?"BO_CONCRETE":"BO_CEDAR")));
      project.props.push(prop("diagonal",8,8,2,2,1.25,"BO_RUSTIRON",{slope:"down",thickness:.42}),prop("diagonal",17,2,2,2,1.25,"BO_RUSTIRON",{slope:"up",thickness:.42}));
      project.entities.push(layoutEntity("ct",1,3,0),layoutEntity("ct",1,8,0),layoutEntity("t",24,3,180),layoutEntity("t",24,8,180),layoutEntity("bombA",12,5));
    }
    return project;
  }

  function loadLayoutProject(layoutId) {
    if (state.rooms.length && !confirm("Replace the current map with this starter layout? You can Undo afterward.")) return;
    const before = snapshot();
    state = buildLayoutProject(layoutId);
    selected = null; planLevel = null; previewLevelOnly = false; analysisOverlay = null;
    commit(before);
    requestAnimationFrame(fitView);
    showToast(`${state.name} loaded - every room and brush remains editable`);
  }

  function blueprintColorInfo(color) {
    const [red,green,blue]=color.map((value)=>Math.max(0,Math.min(255,Number(value)||0))),max=Math.max(red,green,blue),min=Math.min(red,green,blue),delta=max-min;
    let hue=0;
    if(delta){
      if(max===red)hue=60*(((green-blue)/delta)%6);
      else if(max===green)hue=60*((blue-red)/delta+2);
      else hue=60*((red-green)/delta+4);
    }
    if(hue<0)hue+=360;
    return {color:[Math.round(red),Math.round(green),Math.round(blue)],hue,saturation:max?delta/max:0,brightness:max/255,luma:(red*.2126+green*.7152+blue*.0722)/255};
  }

  function blueprintMix(color,amount,target=amount<0?0:255) {
    const ratio=Math.min(1,Math.abs(amount));
    return color.map((value)=>Math.round(value*(1-ratio)+target*ratio));
  }

  function blueprintColorCss(color,alpha=1) {
    return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
  }

  function blueprintPaletteFromPixels(context,width,height,interior) {
    const samples=[];
    for(let y=0;y<height;y+=4)for(let x=0;x<width;x+=4){
      const index=y*width+x;if(interior&&!interior[index])continue;
      const pixel=context.getImageData(x,y,1,1).data,info=blueprintColorInfo([pixel[0],pixel[1],pixel[2]]);
      if(info.luma<.12||info.luma>.96)continue;
      samples.push(info.color);
    }
    if(!samples.length)return [[126,137,118],[192,180,136],[80,104,111],[199,121,72]];
    const seeds=[0,.27,.57,.83].map((position)=>samples[Math.min(samples.length-1,Math.floor(position*(samples.length-1)))]);
    let centers=seeds.map((color)=>[...color]);
    for(let pass=0;pass<7;pass+=1){
      const sums=centers.map(()=>[0,0,0,0]);
      samples.forEach((color)=>{
        let best=0,bestDistance=Infinity;
        centers.forEach((center,index)=>{const distance=(color[0]-center[0])**2+(color[1]-center[1])**2+(color[2]-center[2])**2;if(distance<bestDistance){best=index;bestDistance=distance;}});
        sums[best][0]+=color[0];sums[best][1]+=color[1];sums[best][2]+=color[2];sums[best][3]+=1;
      });
      centers=centers.map((center,index)=>sums[index][3]?sums[index].slice(0,3).map((sum)=>Math.round(sum/sums[index][3])):center);
    }
    const unique=[];
    centers.sort((a,b)=>blueprintColorInfo(a).luma-blueprintColorInfo(b).luma).forEach((color)=>{
      if(!unique.some((other)=>Math.hypot(color[0]-other[0],color[1]-other[1],color[2]-other[2])<28))unique.push(color);
    });
    const fallbacks=[[92,101,91],[177,166,132],[72,108,119],[203,125,68]];
    while(unique.length<4)unique.push(fallbacks[unique.length]);
    return unique.slice(0,4);
  }

  function blueprintTextureData(color,role,seed=1) {
    const canvas=document.createElement("canvas"),context=canvas.getContext("2d",{willReadFrequently:true});canvas.width=canvas.height=256;
    const dark=blueprintMix(color,-.28),light=blueprintMix(color,.24),random=(()=>{let value=seed>>>0;return()=>{value=(value*1664525+1013904223)>>>0;return value/4294967296;};})();
    context.fillStyle=blueprintColorCss(color);context.fillRect(0,0,256,256);
    if(role==="wall"){
      context.strokeStyle=blueprintColorCss(dark,.72);context.lineWidth=4;
      for(let y=0;y<=256;y+=64){context.beginPath();context.moveTo(0,y);context.lineTo(256,y);context.stroke();}
      for(let row=0;row<4;row+=1)for(let x=(row%2)*32;x<=256;x+=64){context.beginPath();context.moveTo(x,row*64);context.lineTo(x,(row+1)*64);context.stroke();}
      context.strokeStyle=blueprintColorCss(light,.22);context.lineWidth=1;for(let y=3;y<256;y+=64){context.beginPath();context.moveTo(0,y);context.lineTo(256,y);context.stroke();}
    }else if(role==="floor"){
      context.strokeStyle=blueprintColorCss(dark,.42);context.lineWidth=3;
      for(let point=0;point<=256;point+=64){context.beginPath();context.moveTo(point,0);context.lineTo(point,256);context.moveTo(0,point);context.lineTo(256,point);context.stroke();}
      context.strokeStyle=blueprintColorCss(light,.2);context.lineWidth=1;for(let point=4;point<256;point+=64){context.beginPath();context.moveTo(point,0);context.lineTo(point,256);context.moveTo(0,point);context.lineTo(256,point);context.stroke();}
    }else if(role==="trim"){
      const gradient=context.createLinearGradient(0,0,256,256);gradient.addColorStop(0,blueprintColorCss(dark));gradient.addColorStop(.48,blueprintColorCss(color));gradient.addColorStop(.52,blueprintColorCss(light));gradient.addColorStop(1,blueprintColorCss(dark));context.fillStyle=gradient;context.fillRect(0,0,256,256);
      context.strokeStyle=blueprintColorCss(dark,.75);context.lineWidth=3;for(let point=0;point<=256;point+=64){context.strokeRect(point+2,2,60,252);}
      context.fillStyle=blueprintColorCss(light,.65);for(let x=14;x<256;x+=64)for(let y=16;y<256;y+=64){context.beginPath();context.arc(x,y,3,0,Math.PI*2);context.fill();}
    }else{
      const gradient=context.createRadialGradient(128,128,15,128,128,180);gradient.addColorStop(0,blueprintColorCss(light));gradient.addColorStop(1,blueprintColorCss(dark));context.fillStyle=gradient;context.fillRect(0,0,256,256);
      context.strokeStyle=blueprintColorCss(light,.22);context.lineWidth=9;for(let offset=-256;offset<256;offset+=48){context.beginPath();context.moveTo(offset,0);context.lineTo(offset+256,256);context.stroke();}
    }
    const image=context.getImageData(0,0,256,256),data=image.data;
    for(let index=0;index<data.length;index+=4){
      const noise=(random()-.5)*14;data[index]=Math.max(0,Math.min(255,data[index]+noise));data[index+1]=Math.max(0,Math.min(255,data[index+1]+noise));data[index+2]=Math.max(0,Math.min(255,data[index+2]+noise));data[index+3]=255;
    }
    context.putImageData(quantizeGoldSrcImage(image),0,0);
    return canvas.toDataURL("image/png");
  }

  function blueprintMaterialKit(palette,fileName) {
    const base=String(fileName||"BLUEPRINT").replace(/\.[^.]+$/,"").replace(/[^a-z0-9]+/gi," ").trim().split(/\s+/).slice(0,2).join(" ")||"Blueprint";
    const roles=[
      {role:"wall",label:`${base} wall`,category:"architecture",uses:["wall","ceiling"],color:blueprintMix(palette[0],-.08)},
      {role:"floor",label:`${base} floor`,category:"floor",uses:["floor","tile","ground"],color:palette[1]},
      {role:"trim",label:`${base} metal trim`,category:"metal",uses:["wall","ceiling","props"],color:palette[2]},
      {role:"accent",label:`${base} accent`,category:"architecture",uses:["wall","floor","props"],color:palette[3]}
    ];
    return roles.map((item,index)=>({...item,code:importedTextureCode(`BP ${item.role} ${base}`),imageData:blueprintTextureData(item.color,item.role,(index+1)*7919)}));
  }

  function largestBlueprintRectangle(mask,width,height) {
    const heights=new Int16Array(width);let best=null;
    for(let y=0;y<height;y+=1){
      for(let x=0;x<width;x+=1)heights[x]=mask[y*width+x]?heights[x]+1:0;
      const stack=[];
      for(let x=0;x<=width;x+=1){
        const current=x<width?heights[x]:0;let start=x;
        while(stack.length&&stack.at(-1).height>current){
          const entry=stack.pop(),area=entry.height*(x-entry.start);
          if(!best||area>best.area)best={x:entry.start,y:y-entry.height+1,w:x-entry.start,d:entry.height,area};
          start=entry.start;
        }
        if(!stack.length||stack.at(-1).height<current)stack.push({start,height:current});
      }
    }
    return best;
  }

  function decomposeBlueprintMask(source,width,height,maxRooms=96) {
    const mask=new Uint8Array(source),rectangles=[];let remaining=mask.reduce((sum,value)=>sum+value,0);
    while(remaining&&rectangles.length<maxRooms){
      const rectangle=largestBlueprintRectangle(mask,width,height);if(!rectangle||rectangle.area<2)break;
      rectangles.push(rectangle);
      for(let y=rectangle.y;y<rectangle.y+rectangle.d;y+=1)for(let x=rectangle.x;x<rectangle.x+rectangle.w;x+=1){const index=y*width+x;if(mask[index]){mask[index]=0;remaining-=1;}}
    }
    if(rectangles.length<maxRooms){
      for(let y=0;y<height&&rectangles.length<maxRooms;y+=1)for(let x=0;x<width&&rectangles.length<maxRooms;x+=1){const index=y*width+x;if(mask[index]){rectangles.push({x,y,w:1,d:1,area:1});mask[index]=0;}}
    }
    return rectangles;
  }

  function blueprintRoomAverage(context,sourceWidth,sourceHeight,gridWidth,gridHeight,rectangle) {
    const x1=Math.floor(rectangle.x/gridWidth*sourceWidth),x2=Math.max(x1+1,Math.ceil((rectangle.x+rectangle.w)/gridWidth*sourceWidth));
    const y1=Math.floor(rectangle.y/gridHeight*sourceHeight),y2=Math.max(y1+1,Math.ceil((rectangle.y+rectangle.d)/gridHeight*sourceHeight));
    const center=context.getImageData(Math.min(sourceWidth-1,Math.floor((x1+x2)/2)),Math.min(sourceHeight-1,Math.floor((y1+y2)/2)),1,1).data,centerColor=[center[0],center[1],center[2]],centerInfo=blueprintColorInfo(centerColor);
    if(centerInfo.saturation>.2&&centerInfo.luma>.18&&centerInfo.luma<.95)return centerColor;
    const data=context.getImageData(x1,y1,Math.min(sourceWidth,x2)-x1,Math.min(sourceHeight,y2)-y1).data;let red=0,green=0,blue=0,count=0;
    for(let index=0;index<data.length;index+=16){const info=blueprintColorInfo([data[index],data[index+1],data[index+2]]);if(info.luma<.16||info.luma>.97)continue;red+=data[index];green+=data[index+1];blue+=data[index+2];count+=1;}
    return count?[Math.round(red/count),Math.round(green/count),Math.round(blue/count)]:[150,154,143];
  }

  function blueprintLevelFromColor(color) {
    const info=blueprintColorInfo(color);
    if(info.saturation<.24||info.brightness<.28||info.brightness>.94)return 0;
    if(info.hue>=18&&info.hue<=72)return 1;
    if(info.hue>=175&&info.hue<=255&&info.brightness<.78)return -1;
    return 0;
  }

  function blueprintOpenings(rooms) {
    const openings=[],epsilon=.02;
    for(let left=0;left<rooms.length;left+=1)for(let right=left+1;right<rooms.length;right+=1){
      const a=rooms[left],b=rooms[right];if(Math.abs((a.floorLevel||0)-(b.floorLevel||0))>.01)continue;
      const verticalBoundary=Math.abs(a.x+a.w-b.x)<epsilon?a.x+a.w:Math.abs(b.x+b.w-a.x)<epsilon?b.x+b.w:null;
      if(verticalBoundary!=null){
        const start=Math.max(a.y,b.y),end=Math.min(a.y+a.d,b.y+b.d),overlap=end-start;
        if(overlap>=.5){const width=Math.max(.5,Math.min(2,overlap*.72));openings.push(layoutDoor("v",verticalBoundary,start+(overlap-width)/2,width));}
      }
      const horizontalBoundary=Math.abs(a.y+a.d-b.y)<epsilon?a.y+a.d:Math.abs(b.y+b.d-a.y)<epsilon?b.y+b.d:null;
      if(horizontalBoundary!=null){
        const start=Math.max(a.x,b.x),end=Math.min(a.x+a.w,b.x+b.w),overlap=end-start;
        if(overlap>=.5){const width=Math.max(.5,Math.min(2,overlap*.72));openings.push(layoutDoor("h",horizontalBoundary,start+(overlap-width)/2,width));}
      }
      if(openings.length>=180)return openings;
    }
    return openings;
  }

  function blueprintConnectNearbyRooms(rooms) {
    const connectors=[],occupied=(x,y)=>rooms.some((room)=>x>room.x+.01&&x<room.x+room.w-.01&&y>room.y+.01&&y<room.y+room.d-.01);
    for(let left=0;left<rooms.length&&connectors.length<28;left+=1)for(let right=left+1;right<rooms.length&&connectors.length<28;right+=1){
      const a=rooms[left],b=rooms[right];if(Math.abs((a.floorLevel||0)-(b.floorLevel||0))>.01)continue;
      const gapEast=b.x-(a.x+a.w),gapWest=a.x-(b.x+b.w),overlapY=Math.min(a.y+a.d,b.y+b.d)-Math.max(a.y,b.y);
      if(overlapY>=1&&((gapEast>.01&&gapEast<=2.1)||(gapWest>.01&&gapWest<=2.1))){
        const west=gapEast>0?a:b,east=gapEast>0?b:a,start=Math.max(a.y,b.y),depth=Math.min(2,overlapY),y=start+(overlapY-depth)/2,x=west.x+west.w,width=east.x-x;
        if(!occupied(x+width/2,y+depth/2))connectors.push({x,y,w:width,d:depth,floorLevel:a.floorLevel||0});
      }
      const gapSouth=b.y-(a.y+a.d),gapNorth=a.y-(b.y+b.d),overlapX=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
      if(overlapX>=1&&((gapSouth>.01&&gapSouth<=2.1)||(gapNorth>.01&&gapNorth<=2.1))){
        const north=gapSouth>0?a:b,south=gapSouth>0?b:a,start=Math.max(a.x,b.x),width=Math.min(2,overlapX),x=start+(overlapX-width)/2,y=north.y+north.d,depth=south.y-y;
        if(!occupied(x+width/2,y+depth/2))connectors.push({x,y,w:width,d:depth,floorLevel:a.floorLevel||0});
      }
    }
    return connectors.filter((connector,index)=>!connectors.slice(0,index).some((other)=>Math.abs(other.x-connector.x)<.05&&Math.abs(other.y-connector.y)<.05&&Math.abs(other.w-connector.w)<.05&&Math.abs(other.d-connector.d)<.05));
  }

  function blueprintSpawnPoints(room,count=5) {
    const points=[];
    for(let y=Math.ceil(room.y+.35);y<room.y+room.d-.25&&points.length<count;y+=1)for(let x=Math.ceil(room.x+.35);x<room.x+room.w-.25&&points.length<count;x+=1)points.push({x,y});
    if(!points.length)points.push({x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.d/2)});
    while(points.length<count){const source=points[points.length%Math.max(1,points.length)];points.push({x:source.x+(points.length%2)*.18,y:source.y+Math.floor(points.length/2)*.12});}
    return points.slice(0,count);
  }

  function blueprintCompetitiveSetup(rooms) {
    if(rooms.length<2)return {entities:[],zones:[],spawnRooms:[],objectiveRooms:[]};
    const bounds=polygonBounds(rooms.flatMap((room)=>[[room.x,room.y],[room.x+room.w,room.y+room.d]])),center=(room)=>({x:room.x+room.w/2,y:room.y+room.d/2}),area=(room)=>room.w*room.d;
    const edgeCandidates=rooms.filter((room)=>area(room)>=4&&((center(room).x-bounds.x)/Math.max(1,bounds.w)<.25||(center(room).x-bounds.x)/Math.max(1,bounds.w)>.75||(center(room).y-bounds.y)/Math.max(1,bounds.d)<.25||(center(room).y-bounds.y)/Math.max(1,bounds.d)>.75)).sort((a,b)=>area(b)-area(a)).slice(0,24);
    const candidates=edgeCandidates.length>=2?edgeCandidates:rooms.slice().sort((a,b)=>area(b)-area(a)).slice(0,18);let pair=[candidates[0],candidates[1]],distance=-1;
    for(let left=0;left<candidates.length;left+=1)for(let right=left+1;right<candidates.length;right+=1){const a=center(candidates[left]),b=center(candidates[right]),value=Math.hypot(a.x-b.x,a.y-b.y);if(value>distance){distance=value;pair=[candidates[left],candidates[right]];}}
    const first=center(pair[0]),second=center(pair[1]),tRoom=(first.x+first.y)<=second.x+second.y?pair[0]:pair[1],ctRoom=tRoom===pair[0]?pair[1]:pair[0],toward=(from,to)=>{const dx=center(to).x-center(from).x,dy=center(to).y-center(from).y;return Math.abs(dx)>=Math.abs(dy)?(dx>=0?0:180):(dy>=0?90:270);};
    const entities=[
      ...blueprintSpawnPoints(tRoom).map((point)=>({...layoutEntity("t",point.x,point.y,toward(tRoom,ctRoom)),floorLevel:tRoom.floorLevel||0})),
      ...blueprintSpawnPoints(ctRoom).map((point)=>({...layoutEntity("ct",point.x,point.y,toward(ctRoom,tRoom)),floorLevel:ctRoom.floorLevel||0}))
    ];
    const other=rooms.filter((room)=>room!==tRoom&&room!==ctRoom&&area(room)>=3),score=(room)=>Math.min(Math.hypot(center(room).x-first.x,center(room).y-first.y),Math.hypot(center(room).x-second.x,center(room).y-second.y))+Math.sqrt(area(room));
    const objectiveA=other.slice().sort((a,b)=>score(b)-score(a))[0]||rooms[Math.floor(rooms.length/2)],aCenter=center(objectiveA);
    const objectiveB=other.filter((room)=>room!==objectiveA).sort((a,b)=>Math.hypot(center(b).x-aCenter.x,center(b).y-aCenter.y)-Math.hypot(center(a).x-aCenter.x,center(a).y-aCenter.y))[0]||objectiveA;
    entities.push({...layoutEntity("bombA",Math.floor(aCenter.x),Math.floor(aCenter.y)),floorLevel:objectiveA.floorLevel||0},{...layoutEntity("bombB",Math.floor(center(objectiveB).x),Math.floor(center(objectiveB).y)),floorLevel:objectiveB.floorLevel||0});
    const zoneFor=(room,kind)=>({id:crypto.randomUUID(),kind,x:room.x+.25,y:room.y+.25,w:Math.max(.5,room.w-.5),d:Math.max(.5,room.d-.5),height:2,floorLevel:room.floorLevel||0});
    return {entities,zones:[zoneFor(tRoom,"buyT"),zoneFor(ctRoom,"buyCt")],spawnRooms:[tRoom,ctRoom],objectiveRooms:[objectiveA,objectiveB]};
  }

  function analyzeBlueprintImage() {
    if(!pendingBlueprint?.image)return null;
    const image=pendingBlueprint.image,source=document.createElement("canvas"),context=source.getContext("2d",{willReadFrequently:true}),scale=Math.min(1,720/(image.naturalWidth||image.width),520/(image.naturalHeight||image.height));
    source.width=Math.max(80,Math.round((image.naturalWidth||image.width)*scale));source.height=Math.max(60,Math.round((image.naturalHeight||image.height)*scale));context.drawImage(image,0,0,source.width,source.height);
    const width=source.width,height=source.height,pixels=context.getImageData(0,0,width,height).data,threshold=Number($("#blueprintWallSensitivity").value)||105,detail=Number($("#blueprintDetail").value)||56;
    let walls=new Uint8Array(width*height);
    for(let index=0;index<walls.length;index+=1){const offset=index*4,luma=pixels[offset]*.2126+pixels[offset+1]*.7152+pixels[offset+2]*.0722;walls[index]=pixels[offset+3]>90&&luma<threshold?1:0;}
    const dilation=detail<=40?2:1;
    for(let pass=0;pass<dilation;pass+=1){const next=new Uint8Array(walls);for(let y=1;y<height-1;y+=1)for(let x=1;x<width-1;x+=1){const index=y*width+x;if(walls[index])continue;if(walls[index-1]||walls[index+1]||walls[index-width]||walls[index+width])next[index]=1;}walls=next;}
    const exterior=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=0;
    const enqueue=(index)=>{if(index>=0&&index<exterior.length&&!walls[index]&&!exterior[index]){exterior[index]=1;queue[tail++]=index;}};
    for(let x=0;x<width;x+=1){enqueue(x);enqueue((height-1)*width+x);}for(let y=0;y<height;y+=1){enqueue(y*width);enqueue(y*width+width-1);}
    while(head<tail){const index=queue[head++],x=index%width;if(x>0)enqueue(index-1);if(x<width-1)enqueue(index+1);if(index>=width)enqueue(index-width);if(index<width*(height-1))enqueue(index+width);}
    let interior=new Uint8Array(width*height),interiorCount=0;
    for(let index=0;index<interior.length;index+=1)if(!walls[index]&&!exterior[index]){interior[index]=1;interiorCount+=1;}
    const ratio=interiorCount/interior.length;
    if(ratio<.025||ratio>.88){
      const rowDensity=new Uint16Array(height),columnDensity=new Uint16Array(width);for(let y=0;y<height;y+=1)for(let x=0;x<width;x+=1)if(walls[y*width+x]){rowDensity[y]+=1;columnDensity[x]+=1;}
      const denseRows=[...rowDensity].map((count,index)=>({count,index})).filter((entry)=>entry.count>width*.08),denseColumns=[...columnDensity].map((count,index)=>({count,index})).filter((entry)=>entry.count>height*.08);
      const minY=denseRows[0]?.index??1,maxY=denseRows.at(-1)?.index??height-2,minX=denseColumns[0]?.index??1,maxX=denseColumns.at(-1)?.index??width-2;
      interior=new Uint8Array(width*height);interiorCount=0;for(let y=minY+1;y<maxY;y+=1)for(let x=minX+1;x<maxX;x+=1){const index=y*width+x;if(!walls[index]){interior[index]=1;interiorCount+=1;}}
    }
    const widthMeters=Math.max(20,Math.min(250,Number($("#blueprintWidthMeters").value)||80)),gridWidth=Math.max(20,Math.min(96,Math.round(widthMeters/1.6))),gridHeight=Math.max(14,Math.min(96,Math.round(gridWidth*height/width))),mask=new Uint8Array(gridWidth*gridHeight);
    for(let gy=0;gy<gridHeight;gy+=1)for(let gx=0;gx<gridWidth;gx+=1){
      const x1=Math.floor(gx/gridWidth*width),x2=Math.max(x1+1,Math.ceil((gx+1)/gridWidth*width)),y1=Math.floor(gy/gridHeight*height),y2=Math.max(y1+1,Math.ceil((gy+1)/gridHeight*height));let inside=0,total=0;
      for(let y=y1;y<y2;y+=2)for(let x=x1;x<x2;x+=2){inside+=interior[y*width+x];total+=1;}
      mask[gy*gridWidth+gx]=inside/Math.max(1,total)>.34?1:0;
    }
    const cleanupPasses=detail<=40?2:detail>=72?0:1;
    for(let pass=0;pass<cleanupPasses;pass+=1){const next=new Uint8Array(mask);for(let y=1;y<gridHeight-1;y+=1)for(let x=1;x<gridWidth-1;x+=1){let neighbors=0;for(let oy=-1;oy<=1;oy+=1)for(let ox=-1;ox<=1;ox+=1)if(ox||oy)neighbors+=mask[(y+oy)*gridWidth+x+ox];const index=y*gridWidth+x;if(!mask[index]&&neighbors>=6)next[index]=1;if(mask[index]&&neighbors<=1)next[index]=0;}mask.set(next);}
    const rectangles=decomposeBlueprintMask(mask,gridWidth,gridHeight,detail<=40?64:detail>=72?112:88),inferLevels=$("#blueprintLevels").checked;
    const rooms=rectangles.map((rectangle,index)=>{
      const color=blueprintRoomAverage(context,width,height,gridWidth,gridHeight,rectangle),floorLevel=inferLevels?blueprintLevelFromColor(color):0;
      return {...rectangle,id:crypto.randomUUID(),kind:"room",label:`TRACED SPACE ${index+1}`,height:floorLevel?5:4,floorLevel,color,sourceArea:rectangle.area,blueprintConnector:false};
    });
    const connectors=blueprintConnectNearbyRooms(rooms).map((connector,index)=>({...connector,id:crypto.randomUUID(),kind:"room",label:`AUTO CONNECTOR ${index+1}`,height:4,color:[114,200,192],sourceArea:connector.w*connector.d,blueprintConnector:true}));
    rooms.push(...connectors);
    const openings=blueprintOpenings(rooms),gameplay=$("#blueprintGameplay").checked?blueprintCompetitiveSetup(rooms.filter((room)=>!room.blueprintConnector)):{entities:[],zones:[],spawnRooms:[],objectiveRooms:[]},props=[];
    if($("#blueprintCover").checked){
      const excluded=new Set([...(gameplay.spawnRooms||[]),...(gameplay.objectiveRooms||[])].map((room)=>room.id));
      rooms.filter((room)=>!room.blueprintConnector&&!excluded.has(room.id)&&room.w*room.d>=24).sort((a,b)=>b.w*b.d-a.w*a.d).slice(0,14).forEach((room,index)=>{
        props.push(prefabProp(index%3?"crate":"wall",Math.floor(room.x+room.w/2),Math.floor(room.y+room.d/2),index%3?1:Math.min(2,Math.max(1,room.w/3)),1,index%3?1:.75,room.floorLevel||0,"BO_RUSTIRON",{label:"AUTO COVER"}));
      });
    }
    const palette=blueprintPaletteFromPixels(context,width,height,interior),materials=blueprintMaterialKit(palette,pendingBlueprint.fileName),coverage=mask.reduce((sum,value)=>sum+value,0)/Math.max(1,mask.length),levelCount=new Set(rooms.map((room)=>room.floorLevel||0)).size;
    let confidence=86;if(coverage<.08||coverage>.82)confidence-=24;if(rectangles.length>78)confidence-=14;if(rectangles.length<3)confidence-=25;if(connectors.length>20)confidence-=10;confidence=Math.max(28,Math.min(94,confidence));
    pendingBlueprint.analysis={source,sourceWidth:width,sourceHeight:height,gridWidth,gridHeight,widthMeters,rooms,openings,props,entities:gameplay.entities,zones:gameplay.zones,palette,materials,confidence,coverage,levelCount,connectorCount:connectors.length};
    renderBlueprintAnalysis();
    return pendingBlueprint.analysis;
  }

  function renderBlueprintAnalysis() {
    const analysis=pendingBlueprint?.analysis;if(!analysis)return;
    const canvas=$("#blueprintCanvas"),context=canvas.getContext("2d"),maxWidth=760,maxHeight=500,scale=Math.min(maxWidth/analysis.sourceWidth,maxHeight/analysis.sourceHeight);canvas.width=Math.round(analysis.sourceWidth*scale);canvas.height=Math.round(analysis.sourceHeight*scale);
    context.drawImage(analysis.source,0,0,canvas.width,canvas.height);context.fillStyle="rgba(4,8,5,.18)";context.fillRect(0,0,canvas.width,canvas.height);
    const sx=canvas.width/analysis.gridWidth,sy=canvas.height/analysis.gridHeight;
    analysis.rooms.forEach((room)=>{context.fillStyle=room.blueprintConnector?"rgba(114,200,192,.3)":room.floorLevel>0?"rgba(240,164,90,.25)":room.floorLevel<0?"rgba(114,184,255,.24)":"rgba(215,244,90,.18)";context.strokeStyle=room.blueprintConnector?"#72c8c0":"#d7f45a";context.lineWidth=Math.max(1,scale);context.fillRect(room.x*sx,room.y*sy,room.w*sx,room.d*sy);context.strokeRect(room.x*sx+.5,room.y*sy+.5,Math.max(1,room.w*sx-1),Math.max(1,room.d*sy-1));});
    analysis.entities.forEach((entity)=>{const color=entity.kind==="ct"?"#62a9ff":entity.kind==="t"?"#f0a45a":"#d7f45a";context.fillStyle=color;context.beginPath();context.arc((entity.x+.5)*sx,(entity.y+.5)*sy,Math.max(3,Math.min(sx,sy)*.28),0,Math.PI*2);context.fill();});
    $("#blueprintImageSize").textContent=`${pendingBlueprint.image.naturalWidth}×${pendingBlueprint.image.naturalHeight} px · ${analysis.gridWidth}×${analysis.gridHeight} editable grid`;
    const confidence=$("#blueprintConfidence");confidence.textContent=`${analysis.confidence}% CONFIDENCE`;confidence.classList.toggle("low",analysis.confidence<65);
    const values=[analysis.rooms.length,analysis.openings.length,analysis.levelCount,`${analysis.confidence}%`];$("#blueprintMetrics").querySelectorAll("strong").forEach((element,index)=>{element.textContent=values[index];});
    $("#blueprintPalette").innerHTML=analysis.materials.map((material)=>`<div class="blueprint-swatch" title="${html(material.label)}"><img src="${material.imageData}" alt="${html(material.label)} texture preview"><span>${html(material.role)}</span></div>`).join("");
    const textureNote=$("#blueprintTextures").checked?(companionStatus?.connected?"The matching texture kit will be installed into your local Blockout WAD.":"The map will use matching built-in materials unless the Windows companion is paired before creation."):"Existing categorized Blockout materials will be used.";
    $("#blueprintStatus").className=`blueprint-status${analysis.confidence<65?" warning":""}`;$("#blueprintStatus").textContent=`Detected ${analysis.rooms.length-analysis.connectorCount} spaces, ${analysis.connectorCount} short connections, ${analysis.openings.length} openings, and ${analysis.levelCount} level${analysis.levelCount===1?"":"s"}. ${textureNote} Review and edit the result after creation.`;
    $("#reanalyzeBlueprint").classList.remove("hidden");$("#createBlueprintMap").classList.remove("hidden");$("#replaceBlueprintImage").classList.remove("hidden");
  }

  function scheduleBlueprintAnalysis(delay=180) {
    clearTimeout(blueprintAnalyzeTimer);$("#blueprintWallOutput").textContent=$("#blueprintWallSensitivity").value;
    if(!pendingBlueprint?.image)return;
    $("#blueprintConfidence").textContent="ANALYZING";blueprintAnalyzeTimer=setTimeout(()=>{try{analyzeBlueprintImage();}catch(error){$("#blueprintStatus").className="blueprint-status error";$("#blueprintStatus").textContent=`Analysis stopped: ${error.message}`;}},delay);
  }

  function resetBlueprintImport() {
    clearTimeout(blueprintAnalyzeTimer);
    if(pendingBlueprint?.objectUrl)URL.revokeObjectURL(pendingBlueprint.objectUrl);
    pendingBlueprint=null;$("#blueprintFileInput").value="";$("#blueprintDropZone").classList.remove("hidden","drag-over");$("#blueprintWorkspace").classList.add("hidden");$("#replaceBlueprintImage").classList.add("hidden");$("#reanalyzeBlueprint").classList.add("hidden");$("#createBlueprintMap").classList.add("hidden");$("#blueprintCommitNote").textContent="The current map will stay untouched until you choose Create editable map.";
  }

  async function prepareBlueprintImport(file) {
    if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type)){showToast("Choose a PNG, JPG, or WebP map plan");return false;}
    if(file.size>20_000_000){showToast("Choose a blueprint smaller than 20 MB");return false;}
    const image=new Image(),objectUrl=URL.createObjectURL(file);
    try{image.src=objectUrl;await image.decode();}catch(_){URL.revokeObjectURL(objectUrl);showToast("That blueprint image could not be decoded");return false;}
    if(pendingBlueprint?.objectUrl)URL.revokeObjectURL(pendingBlueprint.objectUrl);
    pendingBlueprint={fileName:file.name,image,objectUrl,analysis:null};
    const widthText=String(file.name).match(/(?:^|[^0-9])(\d{2,3})\s*m(?:[^a-z]|$)/i);if(widthText)$("#blueprintWidthMeters").value=Math.max(20,Math.min(250,Number(widthText[1])));
    $("#blueprintFileName").textContent=file.name;$("#blueprintDropZone").classList.add("hidden");$("#blueprintWorkspace").classList.remove("hidden");$("#replaceBlueprintImage").classList.remove("hidden");$("#blueprintStatus").className="blueprint-status";$("#blueprintStatus").textContent="Tracing enclosed areas and reading the plan palette locally…";scheduleBlueprintAnalysis(20);return true;
  }

  async function installBlueprintMaterialKit(analysis) {
    const fallback={wall:"BO_CONCRETE",floor:"BO_FLOORTILE",trim:"BO_RUSTIRON",accent:"BO_STUCCO2",installed:false};
    if(!$("#blueprintTextures").checked)return fallback;
    try{
      const payload={family:analysis.materials[0].code,textures:analysis.materials.map((material)=>({name:material.code,label:material.label,category:material.category,uses:material.uses,imageData:material.imageData,variant:material.role}))};
      const result=await companionRequest("/api/textures/alchemize",{method:"POST",body:JSON.stringify(payload)}),items=result.textures||[];
      items.forEach((item)=>registerMaterial(item.name,item.label,item.category,Date.now(),item.uses));installMaterialOptions();
      const byRole={};analysis.materials.forEach((material,index)=>{byRole[material.role]=items[index]?.name||material.code;});return {...fallback,...byRole,installed:true};
    }catch(error){
      return {...fallback,error:error.message};
    }
  }

  async function createMapFromBlueprint() {
    const analysis=pendingBlueprint?.analysis;if(!analysis)return;
    if(state.rooms.length&&!confirm("Replace the current map with this generated blueprint blockout? The current map remains available through Undo and autosave."))return;
    const button=$("#createBlueprintMap");button.disabled=true;button.textContent="Building editable map…";$("#blueprintCommitNote").textContent="Preparing map geometry and material kit…";
    const materials=await installBlueprintMaterialKit(analysis),before=snapshot(),openSky=$("#blueprintOpenSky").checked,cleanName=String(pendingBlueprint.fileName||"Blueprint map").replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").trim().slice(0,40)||"Blueprint map";
    const project=freshProject();project.name=cleanName;project.rooms=analysis.rooms.map((source,index)=>{
      const info=blueprintColorInfo(source.color),accent=info.saturation>.34&&index%3===0;
      return {...source,id:crypto.randomUUID(),texture:accent?materials.accent:materials.wall,floorTexture:accent?materials.accent:materials.floor,ceilingTexture:materials.trim,ceilingMode:openSky?"sky":"ceiling",wallThickness:.25};
    });
    project.doors=analysis.openings.map((opening)=>({...structuredClone(opening),id:crypto.randomUUID(),texture:materials.trim}));
    project.props=analysis.props.map((prop,index)=>({...structuredClone(prop),id:crypto.randomUUID(),texture:index%3?materials.accent:materials.trim}));
    project.entities=analysis.entities.map((entity)=>({...structuredClone(entity),id:crypto.randomUUID()}));project.zones=analysis.zones.map((zone)=>({...structuredClone(zone),id:crypto.randomUUID()}));
    project.stories=[...new Set(project.rooms.map((room)=>room.floorLevel||0))].sort((a,b)=>a-b).map((elevation,index)=>({id:crypto.randomUUID(),name:elevation===0?"Ground floor":elevation>0?`Upper level +${Math.round(elevation*GRID)}`:`Lower level ${Math.round(elevation*GRID)}`,elevation}));
    project.environment={...DEFAULT_ENVIRONMENT,groundEnabled:false,openSkyDefault:openSky,groundSize:Math.max(32,Math.min(128,analysis.gridWidth+8))};
    const sourcePreview=document.createElement("canvas"),previewContext=sourcePreview.getContext("2d");sourcePreview.width=Math.min(480,analysis.sourceWidth);sourcePreview.height=Math.round(sourcePreview.width*analysis.sourceHeight/analysis.sourceWidth);previewContext.drawImage(analysis.source,0,0,sourcePreview.width,sourcePreview.height);
    project.blueprint={version:1,fileName:pendingBlueprint.fileName,widthMeters:analysis.widthMeters,gridWidth:analysis.gridWidth,gridHeight:analysis.gridHeight,confidence:analysis.confidence,generatedAt:new Date().toISOString(),textureKit:analysis.materials.map((material)=>({role:material.role,name:materials[material.role],label:material.label})),sourcePreview:sourcePreview.toDataURL("image/jpeg",.68)};
    state=project;selected=null;selection=[];planLevel=null;previewLevelOnly=false;analysisOverlay=null;commit(before);saveProjectNow({announce:false});$("#blueprintDialog").close();requestAnimationFrame(fitView);
    button.disabled=false;button.textContent="Create editable map";$("#blueprintCommitNote").textContent="The current map will stay untouched until you choose Create editable map.";
    showToast(materials.installed?`Blueprint map created with ${analysis.materials.length} custom textures`:`Blueprint map created with categorized built-in materials${materials.error?" — pair the companion to install its texture kit":""}`);
    return {rooms:project.rooms.length,openings:project.doors.length,textures:materials.installed?analysis.materials.length:0};
  }

  function structureRun(prop) {
    return prop.direction === "e" || prop.direction === "w" ? prop.w : prop.d;
  }

  function recommendedStairSteps(prop) {
    return Math.max(2, Math.min(32, Math.ceil((prop.height || 2) * GRID / 16)));
  }

  function starterProject() {
    const id = (prefix) => `${prefix}-${crypto.randomUUID()}`;
    const rooms = [
      { id: id("ct-room"), kind: "room", x: 0, y: 0, w: 6, d: 8, height: 4, texture: "CSTRIKE_WR4RGH" },
      { id: id("mid-room"), kind: "room", x: 8, y: -1, w: 8, d: 10, height: 5, texture: "C1A0_LABW3" },
      { id: id("t-room"), kind: "room", x: 18, y: 0, w: 6, d: 8, height: 4, texture: "CSTRIKE_WR4RGH" },
      { id: id("left-upper"), kind: "corridor", x: 6, y: 1, w: 2, d: 2, height: 3, texture: "CSTRIKE_ME4METL" },
      { id: id("left-lower"), kind: "corridor", x: 6, y: 5, w: 2, d: 2, height: 3, texture: "CSTRIKE_ME4METL" },
      { id: id("right-upper"), kind: "corridor", x: 16, y: 1, w: 2, d: 2, height: 3, texture: "CSTRIKE_ME4METL" },
      { id: id("right-lower"), kind: "corridor", x: 16, y: 5, w: 2, d: 2, height: 3, texture: "CSTRIKE_ME4METL" }
    ].map((room) => ({ floorTexture: "CSTRIKE_FP2DARK", ceilingTexture: "C1A0_LABW3", ceilingMode: "ceiling", ...room }));
    const doors = [
      [6,1], [8,1], [16,1], [18,1], [6,5], [8,5], [16,5], [18,5]
    ].map(([boundary, along]) => ({ id: id("door"), axis: "v", boundary, along }));
    const props = [
      { id: id("crate"), kind: "crate", x: 3, y: 3, w: 1, d: 1, height: 1, direction: "e", texture: "BCRATE02" },
      { id: id("crate"), kind: "crate", x: 20, y: 4, w: 1, d: 1, height: 1, direction: "e", texture: "C1A1_CRATE1" },
      { id: id("crate"), kind: "crate", x: 10, y: 3, w: 1, d: 1, height: 1, direction: "e", texture: "BCRATE02" },
      { id: id("crate"), kind: "crate", x: 13, y: 4, w: 1, d: 1, height: 1, direction: "e", texture: "C1A1_CRATE1" },
      { id: id("stairs"), kind: "stairs", x: 9, y: 7, w: 3, d: 2, height: 2, steps: 8, direction: "e", texture: "CSTRIKE_ME4METL" },
      { id: id("ramp"), kind: "ramp", x: 13, y: 7, w: 2, d: 2, height: 2, direction: "w", texture: "CSTRIKE_CH3TILE" }
    ];
    const entities = [
      { id: id("ct"), kind: "ct", x: 1, y: 2 },
      { id: id("ct"), kind: "ct", x: 1, y: 4 },
      { id: id("ct"), kind: "ct", x: 2, y: 2 },
      { id: id("ct"), kind: "ct", x: 2, y: 4 },
      { id: id("t"), kind: "t", x: 21, y: 2 },
      { id: id("t"), kind: "t", x: 21, y: 5 },
      { id: id("t"), kind: "t", x: 22, y: 2 },
      { id: id("t"), kind: "t", x: 22, y: 5 },
      { id: id("bomb-a"), kind: "bombA", x: 11, y: 1 },
      { id: id("bomb-b"), kind: "bombB", x: 12, y: 6 }
    ];
    return { name: "Training Grounds", rooms, doors, windows: [], zones: [], props, entities, environment:{...DEFAULT_ENVIRONMENT}, updatedAt: Date.now() };
  }

  function sunburstProject() {
    let sequence = 0;
    const id = (prefix) => `sunburst-${prefix}-${++sequence}`;
    const room = (label, x, y, w, d, options = {}) => ({
      id: id("room"), kind: options.kind || "room", label, x, y, w, d,
      height: options.height || 4, texture: options.texture || "CSTRIKE_WR4RGH",
      floorTexture: options.floorTexture || "CSTRIKE_FP2DARK",
      ceilingTexture: options.ceilingTexture || "C1A0_LABW3",
      ceilingMode: options.ceilingMode || "ceiling"
    });
    const rooms = [
      room("NORTH ARMORY",12,0,4,4,{texture:"CSTRIKE_ME4METL"}),
      room("T SPAWN",16,0,8,4,{height:5,texture:"SUN_KNIT"}),
      room("NORTH LOUNGE",24,0,4,4,{texture:"CSTRIKE_ME4METL"}),
      room("NORTH GATE",14,4,12,3,{kind:"corridor",texture:"C1A0_LABW3"}),
      room("NW OVERLOOK",10,7,6,5,{height:6,texture:"CSTRIKE_ME4METL"}),
      room("RIBBON HALL",16,7,8,5,{height:5,texture:"SUN_RIBBON",floorTexture:"SUN_RIBBON"}),
      room("NE OVERLOOK",24,7,6,5,{height:6,texture:"CSTRIKE_ME4METL"}),
      room("OBJECTIVE A",0,12,6,8,{height:5,texture:"SUN_KNIT",floorTexture:"SUN_FELT",ceilingMode:"sky"}),
      room("MARKET COURT",6,12,8,8,{height:5,texture:"C1A0_LABW3",floorTexture:"CSTRIKE_CH3TILE",ceilingMode:"sky"}),
      room("WEST LINK",14,12,2,8,{kind:"corridor",texture:"CSTRIKE_ME4METL"}),
      room("CENTRAL SUN HUB",16,12,8,8,{height:6,texture:"SUN_FELT",floorTexture:"SUN_FELT",ceilingMode:"sky"}),
      room("EAST LINK",24,12,2,8,{kind:"corridor",texture:"CSTRIKE_ME4METL"}),
      room("GARDEN COURT",26,12,8,8,{height:5,texture:"C1A0_LABW3",floorTexture:"CSTRIKE_CH3TILE",ceilingMode:"sky"}),
      room("OBJECTIVE B",34,12,6,8,{height:5,texture:"SUN_RIBBON",floorTexture:"SUN_FELT",ceilingMode:"sky"}),
      room("A BACK ALLEY",2,20,6,5,{height:3,texture:"C1A0_LABW3"}),
      room("WEST TUNNEL",8,20,6,5,{height:3,texture:"CSTRIKE_ME4METL"}),
      room("WEST BRIDGE",14,20,2,5,{kind:"corridor",height:4,texture:"SUN_RIBBON",floorTexture:"SUN_RIBBON"}),
      room("RED HALL",16,20,8,5,{height:4,texture:"SUN_KNIT",floorTexture:"SUN_KNIT"}),
      room("EAST BRIDGE",24,20,2,5,{kind:"corridor",height:4,texture:"SUN_RIBBON",floorTexture:"SUN_RIBBON"}),
      room("EAST TUNNEL",26,20,6,5,{height:3,texture:"CSTRIKE_ME4METL"}),
      room("B BACK ALLEY",32,20,6,5,{height:3,texture:"C1A0_LABW3"}),
      room("A SERVICE",10,25,4,3,{kind:"corridor",height:3,texture:"CSTRIKE_ME4METL"}),
      room("LOWER CHANNEL W",6,25,4,3,{height:3,texture:"SUN_TILE",floorTexture:"SUN_TILE"}),
      room("SOUTH GATE",14,25,12,3,{kind:"corridor",texture:"C1A0_LABW3"}),
      room("B SERVICE",26,25,4,3,{kind:"corridor",height:3,texture:"CSTRIKE_ME4METL"}),
      room("LOWER CHANNEL E",30,25,4,3,{height:3,texture:"SUN_TILE",floorTexture:"SUN_TILE"}),
      room("SOUTH ARMORY",12,28,4,4,{texture:"CSTRIKE_ME4METL"}),
      room("CT SPAWN",16,28,8,4,{height:5,texture:"SUN_RIBBON"}),
      room("SOUTH LOUNGE",24,28,4,4,{texture:"CSTRIKE_ME4METL"})
    ];
    const door = (axis, boundary, along, mode = "opening") => ({
      id: id("door"), axis, boundary, along, width: 1, mode, texture: "CSTRIKE_ME4METL", speed: 125
    });
    const doors = [
      door("v",16,1),door("v",24,1),door("h",4,14),door("h",4,19,"sliding"),door("h",4,25),
      door("h",7,15),door("h",7,18),door("h",7,22),door("h",7,24),
      door("h",12,12),door("h",12,15),door("h",12,18),door("h",12,21),door("h",12,25),door("h",12,28),
      door("v",6,15),door("v",6,18),door("v",14,15),door("v",14,18),
      door("v",16,14),door("v",16,18),door("v",24,14),door("v",24,18),
      door("v",26,15),door("v",26,18),door("v",34,15),door("v",34,18),
      door("h",20,3),door("h",20,10),door("h",20,13),door("h",20,18),door("h",20,22),door("h",20,27),door("h",20,30),door("h",20,36),
      door("h",25,11),door("v",14,26),door("h",25,18),door("h",25,22),door("v",26,26),door("h",25,28),
      door("v",14,22),door("v",16,22),door("v",24,22),door("v",26,22),
      door("h",25,6),door("v",10,26),door("v",30,26),door("h",25,32),
      door("h",28,13),door("h",28,18),door("h",28,22),door("h",28,27),door("v",16,30),door("v",24,30)
    ];
    const window = (axis, boundary, along, mode = "glass") => ({
      id: id("window"), axis, boundary, along, width: 1, mode, sill:.75, height:1.5, health:25, texture:"GLASS_BRIGHT"
    });
    const windows = [
      window("v",16,2),window("v",24,2),window("h",12,10),window("h",12,29),
      window("v",6,13,"breakable"),window("v",34,13,"breakable"),window("v",16,16),window("v",24,16)
    ];
    const prop = (kind, x, y, w, d, height, direction = "e", texture) => ({
      id: id(kind), kind, x, y, w, d, height, direction,
      texture: texture || (kind === "crate" ? "BCRATE02" : kind === "platform" ? "CSTRIKE_CH3TILE" : "CSTRIKE_ME4METL")
    });
    const props = [
      prop("platform",17,8,6,3,1,"e","SUN_RIBBON"),
      prop("stairs",19,11,2,1,1,"n","CSTRIKE_ME4METL"),
      prop("platform",18,14,4,4,.5,"e","SUN_FACE"),
      prop("ramp",19,12,2,2,.5,"s","SUN_RIBBON"),prop("ramp",19,18,2,2,.5,"n","SUN_RIBBON"),
      prop("ramp",14,15,2,2,.5,"e","SUN_RIBBON"),prop("ramp",24,15,2,2,.5,"w","SUN_RIBBON"),
      prop("platform",11,8,3,3,2,"e","CSTRIKE_ME4METL"),prop("ladder",10,9,1,1,2,"e","CSTRIKE_ME4METL"),
      prop("platform",26,8,3,3,2,"e","CSTRIKE_ME4METL"),prop("ladder",29,9,1,1,2,"w","CSTRIKE_ME4METL"),
      prop("platform",1,14,4,4,1,"e","SUN_FELT"),prop("ramp",4,15,2,2,1,"w","SUN_KNIT"),
      prop("platform",35,14,4,4,1,"e","SUN_FELT"),prop("ramp",34,15,2,2,1,"e","SUN_RIBBON"),
      prop("wall",8,15,1,2,1.25,"s","CSTRIKE_WR4RGH"),prop("wall",12,17,1,2,1.25,"s","CSTRIKE_WR4RGH"),
      prop("wall",27,17,1,2,1.25,"s","CSTRIKE_WR4RGH"),prop("wall",31,15,1,2,1.25,"s","CSTRIKE_WR4RGH"),
      prop("crate",9,13,1,1,1,"e","BCRATE02"),prop("crate",12,14,1,1,1,"e","C1A1_CRATE1"),
      prop("crate",27,14,1,1,1,"e","C1A1_CRATE1"),prop("crate",30,13,1,1,1,"e","BCRATE02"),
      prop("crate",3,18,1,1,1,"e","BCRATE02"),prop("crate",36,18,1,1,1,"e","BCRATE02"),
      prop("platform",14,21,2,3,1,"e","SUN_RIBBON"),prop("ramp",13,22,1,2,1,"e","SUN_RIBBON"),prop("ramp",16,22,1,2,1,"w","SUN_RIBBON"),
      prop("platform",24,21,2,3,1,"e","SUN_RIBBON"),prop("ramp",23,22,1,2,1,"e","SUN_RIBBON"),prop("ramp",26,22,1,2,1,"w","SUN_RIBBON")
    ];
    props.filter((item) => item.kind === "stairs").forEach((item) => { item.steps = recommendedStairSteps(item); });
    const zones = [
      { id:id("buy"),kind:"buyT",x:17,y:1,w:6,d:2 },
      { id:id("buy"),kind:"buyCt",x:17,y:29,w:6,d:2 }
    ];
    const entities = [
      ...[[19,1],[17,1],[21,1],[22,2]].map(([x,y]) => ({id:id("t"),kind:"t",x,y,angle:90})),
      ...[[18,30],[19,30],[21,30],[22,29]].map(([x,y]) => ({id:id("ct"),kind:"ct",x,y,angle:270})),
      {id:id("bomb"),kind:"bombA",x:2,y:16},{id:id("bomb"),kind:"bombB",x:37,y:16},
      {id:id("light"),kind:"light",x:20,y:15,z:5,brightness:550,color:"#ffd36a"},
      {id:id("light"),kind:"light",x:10,y:16,z:4,brightness:350,color:"#ffb36a"},
      {id:id("light"),kind:"light",x:29,y:16,z:4,brightness:350,color:"#74c9ff"},
      {id:id("light"),kind:"light",x:20,y:9,z:4,brightness:400,color:"#ffe28a"},
      {id:id("light"),kind:"light",x:20,y:22,z:3,brightness:300,color:"#ff8c6a"}
    ];
    // Competitive pass v2: double the footprint and route widths while preserving
    // playable GoldSrc heights. Crates and ladders remain human-scale.
    rooms.forEach((item) => { item.x *= 2; item.y *= 2; item.w *= 2; item.d *= 2; });
    const planRoom = (label) => rooms.find((item) => item.label === label);
    ["NW OVERLOOK", "NE OVERLOOK", "WEST TUNNEL", "EAST TUNNEL", "OBJECTIVE A", "OBJECTIVE B",
      "LOWER CHANNEL W", "LOWER CHANNEL E", "T SPAWN", "CT SPAWN"].forEach((label) => {
      const item = planRoom(label);
      if (item) item.planPoints = octagonPoints(item.x, item.y, item.w, item.d, Math.min(item.w, item.d) * .2);
    });
    const hubRoom = planRoom("CENTRAL SUN HUB");
    if (hubRoom) hubRoom.planPoints = octagonPoints(hubRoom.x, hubRoom.y, hubRoom.w, hubRoom.d, 4);
    const ribbonRoom = planRoom("RIBBON HALL");
    if (ribbonRoom) ribbonRoom.planPoints = [[32,14],[48,14],[48,21],[45,24],[35,24],[32,21]];
    const marketRoom = planRoom("MARKET COURT");
    if (marketRoom) marketRoom.planPoints = [[12,24],[28,24],[28,38],[26,40],[12,40],[12,36],[10,34],[10,28]];
    const gardenRoom = planRoom("GARDEN COURT");
    if (gardenRoom) gardenRoom.planPoints = [[52,24],[68,24],[70,28],[70,34],[68,36],[68,40],[54,40],[52,38]];
    const westBridgeRoom = planRoom("WEST BRIDGE");
    if (westBridgeRoom) westBridgeRoom.planPoints = [[28,39],[32,41],[32,50],[28,48]];
    const eastBridgeRoom = planRoom("EAST BRIDGE");
    if (eastBridgeRoom) eastBridgeRoom.planPoints = [[48,41],[52,39],[52,48],[48,50]];
    rooms.forEach((item) => {
      if (item.planPoints) item.points = item.planPoints.map((point) => [...point]);
    });
    const setElevation = (labels, elevation) => labels.forEach((label) => {
      const item = planRoom(label);
      if (item) { item.elevation = elevation; item.floorLevel = elevation * .75; }
    });
    setElevation(["LOWER CHANNEL W", "LOWER CHANNEL E"], -2);
    setElevation(["A BACK ALLEY", "WEST TUNNEL", "RED HALL", "EAST TUNNEL", "B BACK ALLEY", "A SERVICE", "B SERVICE"], -1);
    setElevation(["RIBBON HALL", "WEST BRIDGE", "EAST BRIDGE"], 1);
    setElevation(["NW OVERLOOK", "NE OVERLOOK"], 2);
    rooms.forEach((item) => { if (item.elevation == null) { item.elevation = 0; item.floorLevel = 0; } });
    [...doors, ...windows].forEach((item) => {
      item.boundary *= 2; item.along *= 2; item.width = 2;
    });
    zones.forEach((item) => { item.x *= 2; item.y *= 2; item.w *= 2; item.d *= 2; });
    props.forEach((item) => {
      item.x *= 2; item.y *= 2;
      if (item.kind !== "crate" && item.kind !== "ladder") { item.w *= 2; item.d *= 2; }
      if (item.kind === "stairs") item.steps = recommendedStairSteps(item);
    });
    const sunPlatform = props.find((item) => item.kind === "platform" && item.texture === "SUN_FACE");
    if (sunPlatform) {
      sunPlatform.kind = "platformPolygon";
      sunPlatform.points = octagonPoints(sunPlatform.x, sunPlatform.y, sunPlatform.w, sunPlatform.d, 2);
      sunPlatform.height = 1.5;
      sunPlatform.label = "UPPER SUN +2";
    }
    entities.forEach((item) => { item.x = item.x * 2 + 1; item.y = item.y * 2 + 1; });

    const diagonal = (x, y, w, d, height, slope, texture = "CSTRIKE_ME4METL") => ({
      id: id("diagonal"), kind: "diagonal", x, y, w, d, height, slope, thickness: .55,
      architectural: height >= 2.5, texture
    });
    props.push(
      // Full-height corner cuts turn the hub into a faceted octagonal combat space.
      diagonal(32,24,4,4,6,"up","SUN_WALL"), diagonal(44,24,4,4,6,"down","SUN_WALL"),
      diagonal(32,36,4,4,6,"down","SUN_WALL"), diagonal(44,36,4,4,6,"up","SUN_WALL"),
      // Low asymmetric cover creates anchor positions and counter-peek choices.
      diagonal(15,27,4,4,1.25,"down"), diagonal(22,33,4,4,1.75,"up"),
      diagonal(55,33,4,4,1.25,"down"), diagonal(62,26,4,4,1.75,"up"),
      diagonal(1,25,3,3,1.25,"down","SUN_KNIT"), diagonal(8,36,3,3,1.6,"up","SUN_RIBBON"),
      diagonal(69,36,3,3,1.25,"up","SUN_RIBBON"), diagonal(76,25,3,3,1.6,"down","SUN_KNIT"),
      diagonal(21,15,3,3,1.3,"down"), diagonal(56,15,3,3,1.3,"up"),
      diagonal(19,43,4,4,1.4,"up"), diagonal(57,43,4,4,1.4,"down"),
      // Towers, tunnels, sites, and lower rotation rooms follow the faceted blueprint silhouette.
      diagonal(20,14,3,3,6,"up","SUN_METAL"), diagonal(29,14,3,3,6,"down","SUN_METAL"),
      diagonal(20,21,3,3,6,"down","SUN_METAL"), diagonal(29,21,3,3,6,"up","SUN_METAL"),
      diagonal(48,14,3,3,6,"up","SUN_METAL"), diagonal(57,14,3,3,6,"down","SUN_METAL"),
      diagonal(48,21,3,3,6,"down","SUN_METAL"), diagonal(57,21,3,3,6,"up","SUN_METAL"),
      diagonal(16,40,3,3,3,"up","SUN_METAL"), diagonal(25,47,3,3,3,"up","SUN_METAL"),
      diagonal(52,47,3,3,3,"down","SUN_METAL"), diagonal(61,40,3,3,3,"down","SUN_METAL"),
      diagonal(0,24,3,3,5,"up","SUN_WALL"), diagonal(9,37,3,3,5,"up","SUN_WALL"),
      diagonal(68,37,3,3,5,"down","SUN_WALL"), diagonal(77,24,3,3,5,"down","SUN_WALL"),
      diagonal(12,50,3,3,3,"up","SUN_TILE"), diagonal(17,53,3,3,3,"up","SUN_TILE"),
      diagonal(60,53,3,3,3,"down","SUN_TILE"), diagonal(65,50,3,3,3,"down","SUN_TILE")
    );
    for (let index = props.length - 1; index >= 0; index--) {
      if (props[index].kind === "diagonal" && props[index].architectural) props.splice(index, 1);
    }

    const polygonPlatform = (label, points, height, texture, floorLevel = 0) => {
      const xs = points.map((point) => point[0]), ys = points.map((point) => point[1]);
      return {
        id:id("platform-poly"), kind:"platformPolygon", label, points, height, texture, floorLevel,
        x:Math.min(...xs), y:Math.min(...ys), w:Math.max(...xs)-Math.min(...xs), d:Math.max(...ys)-Math.min(...ys),
        architectural:true
      };
    };
    // The blueprint's defining concentric upper ring: eight convex GoldSrc
    // brushes form a walkable annulus without relying on unsupported curves.
    const ringCenter = [40,32], ringSides = 8, innerRadius = 4.4, outerRadius = 8.2;
    for (let index = 0; index < ringSides; index++) {
      const a = -Math.PI / 8 + index * Math.PI * 2 / ringSides;
      const b = -Math.PI / 8 + (index + 1) * Math.PI * 2 / ringSides;
      const point = (radius, angle) => [ringCenter[0] + Math.cos(angle) * radius, ringCenter[1] + Math.sin(angle) * radius];
      props.push(polygonPlatform("", [point(innerRadius,a),point(outerRadius,a),point(outerRadius,b),point(innerRadius,b)], 1.5, index % 2 ? "SUN_RIBBON" : "SUN_FACE"));
    }
    // Four diagonal approaches make the center play as a radial arena rather
    // than a square junction. They stop short of the ring to preserve cover.
    [
      [[29,25],[32,22],[37,27],[34,30]], [[43,27],[48,22],[51,25],[46,30]],
      [[29,39],[34,34],[37,37],[32,42]], [[43,37],[46,34],[51,39],[48,42]]
    ].forEach((points) => props.push(polygonPlatform("", points, .75, "SUN_RIBBON")));
    // Faceted ribbon sweeps approximate the plan's twin curves with legal,
    // convex GoldSrc brushes and create readable elevated firing lanes.
    const westRibbon = [
      [[32,18],[35,21],[31,23],[28,21]],
      [[28,21],[31,23],[27,25],[24,23]],
      [[24,23],[27,25],[24,28],[21,26]]
    ];
    westRibbon.forEach((points, index) => {
      props.push(polygonPlatform("", points, .35, index % 2 ? "SUN_KNIT" : "SUN_RIBBON", .75));
      props.push(polygonPlatform("", points.map(([x,y]) => [80-x,y]), .35, index % 2 ? "SUN_KNIT" : "SUN_RIBBON", .75));
    });
    const transition = (x,y,w,d,height,direction,floorLevel) => {
      const item = prop("ramp",x,y,w,d,height,direction,"SUN_RIBBON");
      item.floorLevel = floorLevel;
      props.push(item);
    };
    transition(38,11,4,4,.75,"s",0);       // north gate -> ribbon hall +1
    transition(18,21,4,5,1.5,"n",0);       // market -> northwest overlook +2
    transition(58,21,4,5,1.5,"n",0);       // garden -> northeast overlook +2
    transition(26,44,3,4,1.5,"e",-.75);    // west tunnel -> bridge +1
    transition(31,44,3,4,1.5,"w",-.75);
    transition(46,44,3,4,1.5,"e",-.75);    // east bridge transitions
    transition(51,44,3,4,1.5,"w",-.75);
    transition(12,50,4,4,.75,"s",-1.5);    // lower channels -> service -1
    transition(64,50,4,4,.75,"s",-1.5);
    props.filter((item) => item.kind === "ramp" && item.height === .5 && item.x >= 28 && item.x <= 48 && item.y >= 24 && item.y <= 36)
      .forEach((item) => { item.height = 1.5; item.floorLevel = 0; });
    // Structures inherit the physical tier of the room beneath them unless a
    // transition or architectural piece supplied an explicit base level.
    props.forEach((item) => {
      if (item.floorLevel != null) return;
      const host = rooms.find((candidate) => pointInRoom(item.x + item.w / 2, item.y + item.d / 2, candidate));
      item.floorLevel = host?.floorLevel || 0;
    });

    const retexture = (texture) => SUNBURST_TEXTURE_UPGRADE[texture] || texture;
    rooms.forEach((item) => {
      item.texture = retexture(item.texture);
      item.floorTexture = retexture(item.floorTexture);
      item.ceilingTexture = retexture(item.ceilingTexture);
    });
    doors.forEach((item) => { item.texture = retexture(item.texture); });
    props.forEach((item) => { item.texture = retexture(item.texture); });
    return { name:"de_sunburst_v5", rooms, doors, windows, zones, props, entities, environment:{...DEFAULT_ENVIRONMENT,groundElevation:-2,groundMaterial:"SUN_FLOOR",skyName:"morning"}, updatedAt:Date.now() };
  }

  function loadProject() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (!value) return null;
      const project = JSON.parse(value);
      environmentFor(project);
      project.stories = Array.isArray(project.stories) && project.stories.length ? project.stories : [{id:crypto.randomUUID(),name:"Ground floor",elevation:0}];
      project.rooms = (project.rooms || []).map((room) => ({
        kind: "room", texture: "C1A0_LABW3", floorTexture: "CSTRIKE_FP2DARK",
        ceilingTexture: "C1A0_LABW3", ceilingMode: "ceiling", wallThickness:.25, ...room
      }));
      project.doors = (project.doors || []).map((door) => ({ width: 1, height: 2, mode: "opening", texture: "CSTRIKE_ME4METL", speed: 100, ...door }));
      project.windows = (project.windows || []).map((window) => ({
        width: 1, mode: "breakable", sill: .75, height: 1.5, health: 20, texture: "GLASS_BRIGHT", ...window
      }));
      project.zones = (project.zones || []).map((zone) => ({ kind: "buyCt", w: 2, d: 2, damage:25, target:"tele_dest_1", ...zone }));
      project.props = (project.props || []).map((prop) => {
        const loaded = {
          height: prop.kind === "crate" ? 1 : ["wall", "wallPolygon", "diagonal"].includes(prop.kind) ? 3 : ["platform", "platformPolygon"].includes(prop.kind) ? 1 : prop.kind === "ladder" ? 3 : 2,
          texture: prop.kind === "crate" ? "BCRATE02" : ["wall", "wallPolygon"].includes(prop.kind) ? "CSTRIKE_WR4RGH" : ["platform", "platformPolygon"].includes(prop.kind) ? "CSTRIKE_CH3TILE" : ["floor", "floorPolygon"].includes(prop.kind) ? "CSTRIKE_FP2DARK" : "CSTRIKE_ME4METL",
          direction: "e", slope: "down", thickness: .42,
          ...prop
        };
        if (["floor", "floorPolygon"].includes(loaded.kind)) {
          loaded.elevation = Number.isFinite(Number(loaded.elevation)) ? Number(loaded.elevation) : (Number(loaded.floorLevel) || 0) + .25;
          loaded.thickness = Math.max(.125, Number(loaded.thickness) || .25);
        }
        if (loaded.kind === "stairs" && !loaded.steps) loaded.steps = recommendedStairSteps(loaded);
        return loaded;
      });
      project.entities = (project.entities || []).map((entity) => ["light","spotlight"].includes(entity.kind)
        ? { z: 2.5, brightness: 300, radius:512, style:"0", target:"", color: "#fff0d0", angle:0, pitch:-45, cone:45, ...entity }
        : ["ct", "t"].includes(entity.kind) ? { angle: 0, ...entity }
          : entity.kind === "ambient" ? { sound:"ambience/wind1.wav", volume:7, ...entity }
            : entity.kind === "decal" ? { decal:"{lambda01", ...entity }
              : entity.kind === "teleDest" ? { target:"tele_dest_1", angle:0, ...entity }
                : entity.kind === "button" ? { target:"target_1", ...entity }
                  : entity.kind === "pathCorner" ? { targetName:"path_1", target:"", wait:0, ...entity }
                    : entity.kind === "targetDummy" ? { angle:0, ...entity } : entity);
      if (["de_sunburst_blockout", "de_sunburst_v2", "de_sunburst_v3", "de_sunburst_v4", "de_sunburst_v5"].includes(project.name)) {
        const retexture = (texture) => SUNBURST_TEXTURE_UPGRADE[texture] || texture;
        project.rooms.forEach((item) => {
          item.texture = retexture(item.texture);
          item.floorTexture = retexture(item.floorTexture);
          item.ceilingTexture = retexture(item.ceilingTexture);
        });
        project.doors.forEach((item) => { item.texture = retexture(item.texture); });
        project.props.forEach((item) => { item.texture = retexture(item.texture); });
      }
      return project;
    } catch (_) {
      return null;
    }
  }

  function snapshot() {
    return JSON.stringify(state);
  }

  function commit(before) {
    const after = snapshot();
    if (before && before !== after) {
      history.push(before);
      if (history.length > 80) history.shift();
      future = [];
    }
    state.updatedAt = Date.now();
    scheduleSave();
    refresh();
  }

  function scheduleSave() {
    $("#saveState").textContent = "Saving…";
    if ($("#projectMenuSaveState")) $("#projectMenuSaveState").textContent = "Saving your latest edits…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveProjectNow({ announce:false });
    }, 180);
  }

  function saveProjectNow({ announce=true } = {}) {
    clearTimeout(saveTimer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("#saveState").textContent = "Saved locally";
    if ($("#projectMenuSaveState")) $("#projectMenuSaveState").textContent = `Saved ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;
    if (announce) showToast("Project saved in this browser");
    return true;
  }

  function undo() {
    if (!history.length) return;
    future.push(snapshot());
    state = JSON.parse(history.pop());
    selected = null;
    scheduleSave();
    refresh();
  }

  function redo() {
    if (!future.length) return;
    history.push(snapshot());
    state = JSON.parse(future.pop());
    selected = null;
    scheduleSave();
    refresh();
  }

  function resizeCanvas(canvas, ctx) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return rect;
  }

  function canvasPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function screenToCell(point) {
    return {
      x: Math.floor((point.x - viewOffset.x) / cellSize),
      y: Math.floor((point.y - viewOffset.y) / cellSize)
    };
  }

  function cellToScreen(x, y) {
    return { x: viewOffset.x + x * cellSize, y: viewOffset.y + y * cellSize };
  }

  function normalizeRect(a, b) {
    return {
      x: Math.min(a.x, b.x), y: Math.min(a.y, b.y),
      w: Math.abs(a.x - b.x) + 1, d: Math.abs(a.y - b.y) + 1
    };
  }

  function pointInRoom(x, y, room) {
    if (room.points?.length >= 3) return pointInPolygon(x, y, room.points);
    return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.d;
  }

  function roomFloor(room) {
    return Number(room?.floorLevel) || 0;
  }

  function pointInFloorOpening(x,y,level,roomId=null) {
    return state.props?.some((prop)=>prop.kind==="floorHole"&&(!roomId||prop.hostRoomId===roomId)&&Math.abs((Number(prop.floorLevel)||0)-Number(level||0))<.13&&x>=prop.x&&x<=prop.x+prop.w&&y>=prop.y&&y<=prop.y+prop.d);
  }

  function floorLevelAt(x, y, preferredLevel = planLevel) {
    const rooms = state.rooms.filter((candidate) => pointInRoom(x, y, candidate)&&!pointInFloorOpening(x,y,roomFloor(candidate),candidate.id));
    const room = preferredLevel == null ? rooms[0] : rooms.sort((a,b)=>Math.abs(roomFloor(a)-preferredLevel)-Math.abs(roomFloor(b)-preferredLevel))[0];
    if (room) return roomFloor(room);
    return pointInEnvironmentGround(x,y) ? environmentFor().groundElevation : 0;
  }

  function openingLevel(item) {
    const host=adjacentRoomsForOpening(item)[0];
    return roomFloor(host);
  }

  function itemLevel(type, item) {
    if (!item) return 0;
    if (type === "room") return roomFloor(item);
    if (type === "door" || type === "window") return Number(item.floorLevel ?? openingLevel(item)) || 0;
    if (type === "prop") return ["floor", "floorPolygon"].includes(item.kind)
      ? Number(item.elevation) || 0
      : Number(item.floorLevel ?? floorLevelAt(item.x + item.w / 2, item.y + item.d / 2)) || 0;
    return Number(item.floorLevel ?? floorLevelAt(item.x + (item.w || 1) / 2, item.y + (item.d || 1) / 2)) || 0;
  }

  function onPlanLevel(type, item) {
    return planLevel == null || Math.abs(itemLevel(type, item) - planLevel) < .13;
  }

  function updateLevelControls() {
    const values = [...new Set([
      ...state.rooms.map(roomFloor),
      ...state.props.filter((prop) => ["floor", "floorPolygon"].includes(prop.kind)).map((prop) => Number(prop.elevation) || 0)
    ].map((value) => Math.round(value * 4) / 4))].sort((a,b) => a-b);
    const select = $("#levelSelect");
    const current = planLevel == null ? "all" : String(planLevel);
    select.innerHTML = `<option value="all">All levels</option>${values.map((value) => `<option value="${value}">Z ${value >= 0 ? "+" : ""}${Math.round(value * GRID)}</option>`).join("")}`;
    if ([...select.options].some((option) => option.value === current)) select.value = current;
    else { planLevel = null; select.value = "all"; }
    $("#ghostLevels").checked = ghostLevels;
    $("#previewLevelButton").textContent = previewLevelOnly && planLevel != null ? `Z ${Math.round(planLevel * GRID)}` : "All Z";
    $("#previewLevelButton").classList.toggle("active", previewLevelOnly && planLevel != null);
  }

  function roomPlanPoints(room) {
    return room.points || room.planPoints || [
      [room.x, room.y], [room.x + room.w, room.y],
      [room.x + room.w, room.y + room.d], [room.x, room.y + room.d]
    ];
  }

  function environmentBounds(rooms = state.rooms) {
    const environment = environmentFor();
    const half = environment.groundSize / 2;
    const padding = environment.groundPadding;
    const roomMinX = rooms.length ? Math.min(...rooms.map((room) => room.x)) - padding : -half;
    const roomMinY = rooms.length ? Math.min(...rooms.map((room) => room.y)) - padding : -half;
    const roomMaxX = rooms.length ? Math.max(...rooms.map((room) => room.x + room.w)) + padding : half;
    const roomMaxY = rooms.length ? Math.max(...rooms.map((room) => room.y + room.d)) + padding : half;
    return {
      minX:Math.min(-half,roomMinX), minY:Math.min(-half,roomMinY),
      maxX:Math.max(half,roomMaxX), maxY:Math.max(half,roomMaxY),
      base:environment.groundElevation
    };
  }

  function pointInEnvironmentGround(x,y) {
    const environment = environmentFor();
    if (!environment.groundEnabled) return false;
    const bounds = environmentBounds();
    return x >= bounds.minX && x < bounds.maxX && y >= bounds.minY && y < bounds.maxY;
  }

  function currentSkyTheme() {
    return SKY_THEMES[environmentFor().skyName] || SKY_THEMES.desert;
  }

  function paintSkyBackground(ctx, width, height, horizon = .72) {
    const theme = currentSkyTheme();
    const gradient = ctx.createLinearGradient(0, 0, 0, height * horizon);
    gradient.addColorStop(0, theme.colors[0]);
    gradient.addColorStop(.66, theme.colors[1]);
    gradient.addColorStop(1, theme.colors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function octagonPoints(x, y, w, d, cut = Math.min(w, d) * .22) {
    return [
      [x + cut, y], [x + w - cut, y], [x + w, y + cut], [x + w, y + d - cut],
      [x + w - cut, y + d], [x + cut, y + d], [x, y + d - cut], [x, y + cut]
    ];
  }

  function pointInProp(x, y, prop) {
    if (prop.kind === "diagonal") return pointInPolygon(x, y, diagonalCorners(prop));
    if (prop.points?.length) return pointInPolygon(x, y, prop.points);
    return x >= prop.x && x < prop.x + prop.w && y >= prop.y && y < prop.y + prop.d;
  }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
      const a = points[index], b = points[previous];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / ((b[1] - a[1]) || .00001) + a[0]) inside = !inside;
    }
    return inside;
  }

  function pointInScreenPolygon(point, points) {
    let inside=false;
    for(let index=0,previous=points.length-1;index<points.length;previous=index++){
      const a=points[index],b=points[previous];
      if((a.y>point.y)!==(b.y>point.y) && point.x < (b.x-a.x)*(point.y-a.y)/((b.y-a.y)||.00001)+a.x) inside=!inside;
    }
    return inside;
  }

  function polygonSignedArea(points) {
    return points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0) / 2;
  }

  function polygonValidation(points) {
    if (!Array.isArray(points) || points.length < 3) return "Add at least three corners";
    if (points.length > 16) return "Use no more than 16 corners in one room";
    if (Math.abs(polygonSignedArea(points)) < 1) return "The room is too small or flat";
    let direction = 0;
    for (let index = 0; index < points.length; index++) {
      const a = points[index], b = points[(index + 1) % points.length], c = points[(index + 2) % points.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < .5) return "Two corners are too close together";
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cross) < .01) return "Remove corners that sit on the same straight edge";
      const sign = Math.sign(cross);
      if (!direction) direction = sign;
      else if (direction !== sign) return "GoldSrc rooms must be convex—move the inward corner outward";
    }
    return "";
  }

  function polygonBounds(points) {
    const xs = points.map((point) => point[0]), ys = points.map((point) => point[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), d: Math.max(...ys) - Math.min(...ys) };
  }

  function updatePolygonBounds(item) {
    Object.assign(item, polygonBounds(item.points));
  }

  function polygonIsInsideSpace(points) {
    const bounds = polygonBounds(points);
    const center = points.reduce((sum, point) => [sum[0] + point[0] / points.length, sum[1] + point[1] / points.length], [0,0]);
    if (!points.every(([x,y]) => isPointInSpace(x * .98 + center[0] * .02, y * .98 + center[1] * .02))) return false;
    for (let y = Math.floor(bounds.y); y < Math.ceil(bounds.y + bounds.d); y++) {
      for (let x = Math.floor(bounds.x); x < Math.ceil(bounds.x + bounds.w); x++) {
        if (pointInPolygon(x + .5, y + .5, points) && !isPointInSpace(x + .5, y + .5)) return false;
      }
    }
    return true;
  }

  function roomFromPoints(points, label = "POLYGON ROOM") {
    const environment = environmentFor();
    const room = {
      id: crypto.randomUUID(), kind: "room", label, points: points.map((point) => [...point]),
      height: 4, floorLevel: planLevel ?? 0, texture: "C1A0_LABW3", floorTexture: "CSTRIKE_FP2DARK",
      ceilingTexture: "C1A0_LABW3", ceilingMode: environment.openSkyDefault ? "sky" : "ceiling"
    };
    updatePolygonBounds(room);
    return room;
  }

  function diagonalCorners(prop) {
    const inset = Math.min(.28, Math.max(.08, Math.min(prop.w, prop.d) * .08));
    const start = prop.slope === "up"
      ? [prop.x + inset, prop.y + prop.d - inset]
      : [prop.x + inset, prop.y + inset];
    const end = prop.slope === "up"
      ? [prop.x + prop.w - inset, prop.y + inset]
      : [prop.x + prop.w - inset, prop.y + prop.d - inset];
    const dx = end[0] - start[0], dy = end[1] - start[1];
    const length = Math.max(.001, Math.hypot(dx, dy));
    const half = Math.max(.14, Math.min(.5, prop.thickness || .42)) / 2;
    const nx = -dy / length * half, ny = dx / length * half;
    return [
      [start[0] + nx, start[1] + ny], [end[0] + nx, end[1] + ny],
      [end[0] - nx, end[1] - ny], [start[0] - nx, start[1] - ny]
    ];
  }

  function rectIsInsideSpace(rect) {
    const axisSamples=(start,size)=>{
      const inset=Math.min(.25,size/2),values=[start+inset,start+size/2,start+size-inset];
      for(let value=start+inset;value<start+size-inset;value+=.5)values.push(value);
      return [...new Set(values.map((value)=>Math.round(value*1000)/1000))];
    };
    const xs=axisSamples(rect.x,rect.w),ys=axisSamples(rect.y,rect.d);
    return ys.every((y)=>xs.every((x)=>isPointInSpace(x,y)));
  }

  function directionFromDrag(start, end) {
    const dx = end.x - start.x, dy = end.y - start.y;
    return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "e" : "w") : (dy >= 0 ? "s" : "n");
  }

  function polygonEdgeDistance(world,points) {
    return points.reduce((best,point,index)=>Math.min(best,projectToSegment(world,point,points[(index+1)%points.length]).distance),Infinity);
  }

  function hitCandidates(world) {
    const refs=[],lineTolerance=Math.max(.08,8/cellSize),markerTolerance=Math.max(.18,10/cellSize);
    for (let i = state.windows.length - 1; i >= 0; i--) {
      const window = state.windows[i];
      if (isItemHidden(window)) continue;
      if (!onPlanLevel("window", window)) continue;
      const segment=openingSegment(window);
      if(projectToSegment(world,segment[0],segment[1]).distance<=lineTolerance)refs.push({type:"window",id:window.id});
    }
    for (let i = state.doors.length - 1; i >= 0; i--) {
      const door = state.doors[i];
      if (isItemHidden(door)) continue;
      if (!onPlanLevel("door", door)) continue;
      const segment=openingSegment(door);
      if(projectToSegment(world,segment[0],segment[1]).distance<=lineTolerance)refs.push({type:"door",id:door.id});
    }
    for (let i = state.entities.length - 1; i >= 0; i--) {
      const entity = state.entities[i];
      if (isItemHidden(entity)) continue;
      if (!onPlanLevel("entity", entity)) continue;
      if(Math.hypot(world.x-(entity.x+.5),world.y-(entity.y+.5))<=markerTolerance)refs.push({type:"entity",id:entity.id});
    }
    for (let i = state.props.length - 1; i >= 0; i--) {
      const prop = state.props[i];
      if (isItemHidden(prop)) continue;
      if (!onPlanLevel("prop", prop)) continue;
      const points=prop.kind==="diagonal"?diagonalCorners(prop):prop.points;
      const hit=points?.length
        ? pointInPolygon(world.x,world.y,points)||polygonEdgeDistance(world,points)<=lineTolerance
        : world.x>=prop.x-lineTolerance&&world.x<=prop.x+(prop.w||1)+lineTolerance&&world.y>=prop.y-lineTolerance&&world.y<=prop.y+(prop.d||1)+lineTolerance;
      if(hit)refs.push({type:"prop",id:prop.id});
    }
    for (let i = state.zones.length - 1; i >= 0; i--) {
      const zone = state.zones[i];
      if (isItemHidden(zone)) continue;
      if (!onPlanLevel("zone", zone)) continue;
      if(world.x>=zone.x&&world.x<=zone.x+zone.w&&world.y>=zone.y&&world.y<=zone.y+zone.d)refs.push({type:"zone",id:zone.id});
    }
    for (let i = state.rooms.length - 1; i >= 0; i--) {
      const room = state.rooms[i];
      if (isItemHidden(room)) continue;
      if (!onPlanLevel("room", room)) continue;
      const points=roomPlanPoints(room);
      if(pointInRoom(world.x,world.y,room)||polygonEdgeDistance(world,points)<=lineTolerance*.65)refs.push({type:"room",id:room.id});
    }
    return refs;
  }

  function hitTest(world) {
    return hitCandidates(world)[0]||null;
  }

  function cyclingHitTest(world) {
    const candidates=hitCandidates(world);
    if(!candidates.length){planHitCycle=null;return null;}
    const signature=candidates.map((ref)=>`${ref.type}:${ref.id}`).join("|"),now=performance.now(),threshold=Math.max(.12,7/cellSize);
    const same=planHitCycle&&planHitCycle.signature===signature&&Math.hypot(world.x-planHitCycle.x,world.y-planHitCycle.y)<=threshold&&now-planHitCycle.time<1100;
    const index=same?(planHitCycle.index+1)%candidates.length:0;
    planHitCycle={signature,index,x:world.x,y:world.y,time:now};
    if(candidates.length>1&&!same)showToast(`${candidates.length} overlapping objects — click again to cycle`);
    return candidates[index];
  }

  function selectedItem() {
    if (!selected) return null;
    const list = selected.type === "room" ? state.rooms
      : selected.type === "door" ? state.doors
      : selected.type === "window" ? state.windows
      : selected.type === "zone" ? state.zones
      : selected.type === "prop" ? state.props : state.entities;
    return list.find((item) => item.id === selected.id) || null;
  }

  function itemListFor(type) {
    return type === "room" ? state.rooms : type === "door" ? state.doors : type === "window" ? state.windows
      : type === "zone" ? state.zones : type === "prop" ? state.props : state.entities;
  }

  function itemForRef(ref) {
    return ref ? itemListFor(ref.type).find((item) => item.id === ref.id) || null : null;
  }

  function sameRef(a, b) {
    return !!a && !!b && a.type === b.type && a.id === b.id;
  }

  function syncSelection() {
    selection = selection.filter((ref, index, refs) => itemForRef(ref) && refs.findIndex((other) => sameRef(ref, other)) === index);
    if (selected && itemForRef(selected) && !selection.some((ref) => sameRef(ref, selected))) selection = [{ ...selected }];
    if (!selected || !itemForRef(selected)) selected = selection[0] ? { ...selection[0] } : null;
  }

  function selectedEntries() {
    syncSelection();
    return selection.map((ref) => ({ ref, item:itemForRef(ref) })).filter((entry) => entry.item);
  }

  function isRefSelected(type, id) {
    return selection.some((ref) => ref.type === type && ref.id === id) || (selected?.type === type && selected.id === id);
  }

  function refsForHit(ref) {
    const item = itemForRef(ref);
    if (!item?.groupId) return ref ? [{ ...ref }] : [];
    const refs = [];
    ["room","door","window","zone","prop","entity"].forEach((type) => itemListFor(type).forEach((candidate) => {
      if (candidate.groupId === item.groupId) refs.push({ type, id:candidate.id });
    }));
    return refs;
  }

  function applySelectionHit(ref, additive = false) {
    if (!ref) {
      if (!additive) { selection = []; selected = null; }
      return;
    }
    setRightPanel("selection");
    const refs = refsForHit(ref);
    if (additive) {
      const removing = refs.every((candidate) => selection.some((current) => sameRef(current, candidate)));
      selection = removing ? selection.filter((current) => !refs.some((candidate) => sameRef(current, candidate)))
        : [...selection, ...refs.filter((candidate) => !selection.some((current) => sameRef(current, candidate)))];
    } else selection = refs;
    selected = selection.find((candidate) => sameRef(candidate, ref)) || selection[0] || null;
    editingVertices = false;
    selectedVertexIndex = -1;
    selectedEdgeIndex = -1;
  }

  function itemBoundsForRef(ref) {
    const item = itemForRef(ref);
    if (!item) return null;
    if (ref.type === "door" || ref.type === "window") return item.axis === "h"
      ? { x:item.along, y:item.boundary-.1, w:item.width || 1, d:.2 }
      : { x:item.boundary-.1, y:item.along, w:.2, d:item.width || 1 };
    if (ref.type === "entity") return { x:item.x, y:item.y, w:1, d:1 };
    return { x:item.x, y:item.y, w:item.w || 1, d:item.d || 1 };
  }

  function selectionBounds(entries = selectedEntries()) {
    const bounds = entries.map((entry) => itemBoundsForRef(entry.ref)).filter(Boolean);
    if (!bounds.length) return null;
    const minX = Math.min(...bounds.map((box) => box.x)), minY = Math.min(...bounds.map((box) => box.y));
    const maxX = Math.max(...bounds.map((box) => box.x + box.w)), maxY = Math.max(...bounds.map((box) => box.y + box.d));
    return { x:minX, y:minY, w:maxX-minX, d:maxY-minY };
  }

  function entryHeight(entry) {
    const { ref, item } = entry;
    if (ref.type === "zone" || ref.type === "entity") return null;
    if (ref.type === "prop" && ["floor","floorPolygon"].includes(item.kind)) return Number(item.thickness) || .25;
    return Number(item.height) || null;
  }

  function selectionBaseLevel(entries = selectedEntries()) {
    const values = entries.map(({ref,item}) => itemLevel(ref.type,item)).filter(Number.isFinite);
    return values.length ? Math.min(...values) : 0;
  }

  function moveEntryBy(entry, dx = 0, dy = 0, dz = 0) {
    const { ref, item } = entry;
    if (ref.type === "door" || ref.type === "window") {
      if (item.axis === "h") { item.along += dx; item.boundary += dy; }
      else { item.boundary += dx; item.along += dy; }
    } else {
      item.x = (Number(item.x) || 0) + dx;
      item.y = (Number(item.y) || 0) + dy;
      if (item.points?.length) item.points = item.points.map(([x,y]) => [x+dx,y+dy]);
      if (item.planPoints?.length) item.planPoints = item.planPoints.map(([x,y]) => [x+dx,y+dy]);
    }
    if (!dz) return;
    const current = itemLevel(ref.type,item);
    if (ref.type === "room") item.floorLevel = current + dz;
    else if (ref.type === "prop" && ["floor","floorPolygon"].includes(item.kind)) item.elevation = current + dz;
    else item.floorLevel = current + dz;
  }

  function scaleEntryInSelection(entry, bounds, scaleX, scaleY) {
    const { ref, item } = entry;
    if (ref.type === "door" || ref.type === "window") {
      if (item.axis === "h") {
        item.along = bounds.x + (item.along-bounds.x)*scaleX;
        item.boundary = bounds.y + (item.boundary-bounds.y)*scaleY;
        item.width = Math.max(.25,(item.width || 1)*scaleX);
      } else {
        item.boundary = bounds.x + (item.boundary-bounds.x)*scaleX;
        item.along = bounds.y + (item.along-bounds.y)*scaleY;
        item.width = Math.max(.25,(item.width || 1)*scaleY);
      }
      return;
    }
    if (item.points?.length) item.points = item.points.map(([x,y]) => [bounds.x+(x-bounds.x)*scaleX,bounds.y+(y-bounds.y)*scaleY]);
    if (item.planPoints?.length) item.planPoints = item.planPoints.map(([x,y]) => [bounds.x+(x-bounds.x)*scaleX,bounds.y+(y-bounds.y)*scaleY]);
    item.x = bounds.x + ((Number(item.x)||0)-bounds.x)*scaleX;
    item.y = bounds.y + ((Number(item.y)||0)-bounds.y)*scaleY;
    if (ref.type !== "entity") {
      item.w = Math.max(.25,(Number(item.w)||1)*scaleX);
      item.d = Math.max(.25,(Number(item.d)||1)*scaleY);
      if (item.points?.length) updatePolygonBounds(item);
    }
  }

  function resizeEntryAxis(entry, axis, target) {
    const { ref, item } = entry;
    if (!["room","prop","zone"].includes(ref.type) || !Number.isFinite(target) || target < .25) return false;
    const key = axis === "x" ? "w" : "d", origin = axis === "x" ? item.x : item.y;
    const old = Math.max(.001,Number(item[key]) || 1), ratio = target/old;
    if (item.points?.length) item.points = item.points.map(([x,y]) => axis === "x" ? [origin+(x-origin)*ratio,y] : [x,origin+(y-origin)*ratio]);
    if (item.planPoints?.length) item.planPoints = item.planPoints.map(([x,y]) => axis === "x" ? [origin+(x-origin)*ratio,y] : [x,origin+(y-origin)*ratio]);
    item[key] = target;
    if (item.points?.length) updatePolygonBounds(item);
    return true;
  }

  function updatePrecisionInspector(entries = selectedEntries()) {
    if (!entries.length) return;
    const bounds = selectionBounds(entries), base = selectionBaseLevel(entries);
    $("#precisionX").value = Math.round(bounds.x*GRID);
    $("#precisionY").value = Math.round(bounds.y*GRID);
    $("#precisionZ").value = Math.round(base*GRID);
    $("#precisionWidth").value = Math.round(bounds.w*GRID);
    $("#precisionDepth").value = Math.round(bounds.d*GRID);
    const heights = entries.map(entryHeight).filter((value) => value != null);
    const commonHeight = heights.length && heights.every((value) => Math.abs(value-heights[0]) < .001) ? heights[0] : null;
    $("#precisionHeight").value = commonHeight == null ? "" : Math.round(commonHeight*GRID);
    $("#precisionHeight").placeholder = commonHeight == null ? "Mixed" : "";
    $("#precisionHeight").disabled = !heights.length;
    $("#precisionActions").classList.toggle("hidden",entries.length < 2);
    $$("[data-distribute]").forEach((button) => { button.disabled = entries.length < 3; });
    $$("[data-equal-size]").forEach((button) => {
      button.disabled = entries.filter((entry) => ["room","prop","zone"].includes(entry.ref.type)).length < 2;
    });
    const layers = ensureLayers();
    const layerIds = [...new Set(entries.map(({item}) => layerForItem(item).id))];
    $("#selectionLayer").innerHTML = `${layerIds.length > 1 ? '<option value="">Mixed layers</option>' : ""}${layers.map((layer) => `<option value="${html(layer.id)}">${html(layer.name)}</option>`).join("")}`;
    $("#selectionLayer").value = layerIds.length === 1 ? layerIds[0] : "";
  }

  function normalizedUv(value = {}) {
    value ||= {};
    return { shiftX:Number(value.shiftX)||0, shiftY:Number(value.shiftY)||0, rotation:Number(value.rotation)||0,
      scaleX:Math.max(.05,Number(value.scaleX)||1), scaleY:Math.max(.05,Number(value.scaleY)||1), mode:value.mode === "fit" ? "fit" : "tile" };
  }

  function surfaceUvFor(item, type, target = surfaceTarget, create = false) {
    if (type === "room" && target === "floor") {
      if (create) item.floorUV = normalizedUv(item.floorUV);
      return normalizedUv(item.floorUV);
    }
    if (type === "room" && target === "ceiling") {
      if (create) item.ceilingUV = normalizedUv(item.ceilingUV);
      return normalizedUv(item.ceilingUV);
    }
    if (type === "room" && target.startsWith("edge:")) {
      const index = Number(target.split(":")[1]);
      item.edgeUV ||= {};
      if (create) item.edgeUV[index] = normalizedUv(item.edgeUV[index]);
      return normalizedUv(item.edgeUV[index]);
    }
    if (type === "room" && target !== "object") {
      item.wallUV ||= {};
      if (create) item.wallUV[target] = normalizedUv(item.wallUV[target]);
      return normalizedUv(item.wallUV[target]);
    }
    if (type === "prop" && target !== "object") {
      item.faceUV ||= {};
      if (create) item.faceUV[target] = normalizedUv(item.faceUV[target]);
      return normalizedUv(item.faceUV[target]);
    }
    if (create) item.textureUV = normalizedUv(item.textureUV);
    return normalizedUv(item.textureUV);
  }

  function setSurfaceUv(item, type, target, uv) {
    const value=normalizedUv(uv);
    if(type==="room"&&target==="floor")item.floorUV=value;
    else if(type==="room"&&target==="ceiling")item.ceilingUV=value;
    else if(type==="room"&&target.startsWith("edge:")){item.edgeUV||={};item.edgeUV[Number(target.split(":")[1])]=value;}
    else if(type==="room"&&target!=="object"){item.wallUV||={};item.wallUV[target]=value;}
    else if(type==="prop"&&target!=="object"){item.faceUV||={};item.faceUV[target]=value;}
    else item.textureUV=value;
    return value;
  }

  function surfaceDimensions(item, type, target = surfaceTarget) {
    if(type==="room"){
      if(target.startsWith("edge:")){
        const index=Number(target.split(":")[1]),points=roomPlanPoints(item),a=points[index],b=points[(index+1)%points.length];
        return {width:Math.hypot(b[0]-a[0],b[1]-a[1])*GRID,height:(item.height||4)*GRID};
      }
      if(["north","south"].includes(target))return {width:(item.w||1)*GRID,height:(item.height||4)*GRID};
      if(["east","west"].includes(target))return {width:(item.d||1)*GRID,height:(item.height||4)*GRID};
      if(["floor","ceiling"].includes(target)){
        const points=roomPlanPoints(item),xs=points.map((point)=>point[0]),ys=points.map((point)=>point[1]);
        return {width:(Math.max(...xs)-Math.min(...xs))*GRID,height:(Math.max(...ys)-Math.min(...ys))*GRID};
      }
      return {width:Math.max(item.w||1,item.d||1)*GRID,height:(item.height||4)*GRID};
    }
    if(type==="prop"){
      if(target.startsWith("side:")){
        const index=Number(target.split(":")[1]),points=item.points||[],a=points[index],b=points[(index+1)%points.length];
        if(a&&b)return {width:Math.hypot(b[0]-a[0],b[1]-a[1])*GRID,height:(item.height||1)*GRID};
      }
      if(["north","south"].includes(target))return {width:(item.w||1)*GRID,height:(item.height||1)*GRID};
      if(["east","west"].includes(target))return {width:(item.d||1)*GRID,height:(item.height||1)*GRID};
      if(["top","bottom"].includes(target))return {width:(item.w||1)*GRID,height:(item.d||1)*GRID};
    }
    return {width:(item.w||1)*GRID,height:(item.d||item.height||1)*GRID};
  }

  function resolvedSurfaceUv(item, type, target = surfaceTarget, source = null) {
    const value=normalizedUv(source || surfaceUvFor(item,type,target));
    if(value.mode!=="fit")return value;
    const dimensions=surfaceDimensions(item,type,target);
    value.scaleX=Math.max(.05,Math.min(16,dimensions.width/256));
    value.scaleY=Math.max(.05,Math.min(16,dimensions.height/256));
    return value;
  }

  function surfaceTextureFor(item, type, target = surfaceTarget) {
    if (type === "room" && target === "floor") return item.floorTexture || "CSTRIKE_FP2DARK";
    if (type === "room" && target === "ceiling") return item.ceilingTexture || "C1A0_LABW3";
    if (type === "room" && target.startsWith("edge:")) return item.edgeTextures?.[Number(target.split(":")[1])] || item.texture || "C1A0_LABW3";
    if (type === "room" && target !== "object") return item.wallTextures?.[target] || item.texture || "C1A0_LABW3";
    if (type === "prop" && target !== "object") return item.faceTextures?.[target] || item.texture || "C1A0_LABW3";
    return item.texture || (item.kind === "crate" ? "BCRATE02" : "C1A0_LABW3");
  }

  function setSurfaceTexture(item, type, texture, target = surfaceTarget) {
    if (type === "room" && target === "floor") item.floorTexture = texture;
    else if (type === "room" && target === "ceiling") item.ceilingTexture = texture;
    else if (type === "room" && target.startsWith("edge:")) {
      item.edgeTextures ||= {};
      item.edgeTextures[Number(target.split(":")[1])] = texture;
    } else if (type === "room" && target !== "object") {
      item.wallTextures ||= {};
      item.wallTextures[target] = texture;
    } else if (type === "prop" && target !== "object") {
      item.faceTextures ||= {};
      item.faceTextures[target] = texture;
    } else item.texture = texture;
    if(texture.startsWith("USR_")){
      const uv=surfaceUvFor(item,type,target,true);uv.mode="fit";setSurfaceUv(item,type,target,uv);
    }
  }

  function wallDirectionForEdge(a, b) {
    const dx = b[0]-a[0], dy = b[1]-a[1];
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "north" : "south";
    return dy >= 0 ? "east" : "west";
  }

  function roomWallTexture(room, edgeIndex, points = roomPlanPoints(room)) {
    const direction = wallDirectionForEdge(points[edgeIndex], points[(edgeIndex+1)%points.length]);
    return room.edgeTextures?.[edgeIndex] || room.wallTextures?.[direction] || room.texture || "C1A0_LABW3";
  }

  function roomWallUv(room, edgeIndex, points = roomPlanPoints(room)) {
    const direction = wallDirectionForEdge(points[edgeIndex], points[(edgeIndex+1)%points.length]);
    const source=room.edgeUV?.[edgeIndex] || room.wallUV?.[direction] || room.textureUV;
    return resolvedSurfaceUv(room,"room",`edge:${edgeIndex}`,source);
  }

  function selectableRefs() {
    const refs = [];
    ["room","door","window","zone","prop","entity"].forEach((type) => itemListFor(type).forEach((item) => {
      if (!isItemHidden(item) && onPlanLevel(type,item)) refs.push({ type, id:item.id });
    }));
    return refs;
  }

  function finishMarqueeSelection() {
    if (!marquee) return;
    const box = { x:Math.min(marquee.start.x,marquee.end.x), y:Math.min(marquee.start.y,marquee.end.y), w:Math.abs(marquee.end.x-marquee.start.x), d:Math.abs(marquee.end.y-marquee.start.y) };
    const hits = selectableRefs().filter((ref) => {
      const bounds = itemBoundsForRef(ref);
      return bounds && bounds.x < box.x+box.w && bounds.x+bounds.w > box.x && bounds.y < box.y+box.d && bounds.y+bounds.d > box.y;
    }).flatMap(refsForHit);
    const unique = hits.filter((ref,index,refs) => refs.findIndex((candidate) => sameRef(candidate,ref)) === index);
    selection = marquee.additive ? [...selection,...unique.filter((ref) => !selection.some((current) => sameRef(current,ref)))] : unique;
    selected = selection[0] || null; marquee = null; refresh();
  }

  function screenToWorld(point) {
    return { x: (point.x - viewOffset.x) / cellSize, y: (point.y - viewOffset.y) / cellSize };
  }

  function geometrySnapResolution(world=null) {
    const values=[];
    ["room","zone","prop","entity"].forEach((type)=>itemListFor(type).forEach((item)=>{
      if(isItemHidden(item))return;
      const bounds=itemBoundsForRef({type,id:item.id});
      if(world&&bounds){
        const dx=Math.max(bounds.x-world.x,0,world.x-(bounds.x+bounds.w)),dy=Math.max(bounds.y-world.y,0,world.y-(bounds.y+bounds.d));
        if(Math.hypot(dx,dy)>6)return;
      }
      if(item.points?.length)item.points.forEach(([x,y])=>values.push(x,y));
      values.push(item.x,item.y,item.w||1,item.d||1,item.x+(item.w||1),item.y+(item.d||1));
    }));
    let resolution=1;
    values.filter(Number.isFinite).forEach((value)=>{
      if(Math.abs(value*4-Math.round(value*4))>.01)return;
      if(Math.abs(value*2-Math.round(value*2))>.01)resolution=Math.min(resolution,.25);
      else if(Math.abs(value-Math.round(value))>.01)resolution=Math.min(resolution,.5);
    });
    return resolution;
  }

  function snapStep(world=null) {
    const manual=Math.max(.25,snapUnits/GRID);
    if(!adaptiveGridEnabled)return manual;
    const zoom=cellSize>=36?.25:cellSize>=20?.5:1;
    return Math.max(.25,Math.min(manual,zoom,geometrySnapResolution(world)));
  }

  function baseSnap(value,step=snapStep()) {
    return Math.round(value / step) * step;
  }

  function snapCandidates(excluded = []) {
    const ignored = new Set(excluded.map((ref) => `${ref.type}:${ref.id}`));
    const xs = [], ys = [];
    ["room","zone","prop","entity"].forEach((type) => itemListFor(type).forEach((item) => {
      if (isItemHidden(item) || ignored.has(`${type}:${item.id}`)) return;
      const points = item.points?.length ? item.points : [[item.x,item.y],[item.x+(item.w||1),item.y+(item.d||1)]];
      points.forEach(([x,y]) => { xs.push(x); ys.push(y); });
      xs.push(item.x+(item.w||1)/2); ys.push(item.y+(item.d||1)/2);
    }));
    return { xs, ys };
  }

  function snapWorldPoint(world, excluded = []) {
    const step=snapStep(world),snapped = { x:baseSnap(world.x,step), y:baseSnap(world.y,step), guides:[], step };
    if (!objectSnapEnabled) return snapped;
    const tolerance = Math.max(.08, 9 / cellSize);
    const candidates = snapCandidates(excluded);
    const nearestX = candidates.xs.reduce((best, value) => Math.abs(value-world.x) < Math.abs((best ?? Infinity)-world.x) ? value : best, null);
    const nearestY = candidates.ys.reduce((best, value) => Math.abs(value-world.y) < Math.abs((best ?? Infinity)-world.y) ? value : best, null);
    if (nearestX != null && Math.abs(nearestX-world.x) <= tolerance) { snapped.x = nearestX; snapped.guides.push("x"); }
    if (nearestY != null && Math.abs(nearestY-world.y) <= tolerance) { snapped.y = nearestY; snapped.guides.push("y"); }
    return snapped;
  }

  function normalizeSnappedRect(a, b) {
    const step = Math.min(a.step||snapStep(a),b.step||snapStep(b));
    return { x:Math.min(a.x,b.x), y:Math.min(a.y,b.y), w:Math.max(step,Math.abs(a.x-b.x)), d:Math.max(step,Math.abs(a.y-b.y)) };
  }

  function placementAnchor(world,w=1,d=1) {
    const raw={x:world.x-w/2,y:world.y-d/2};
    const snapped=snapWorldPoint(raw,selection);
    return{x:snapped.x,y:snapped.y};
  }

  function drawEditor() {
    const rect = resizeCanvas(editor, ectx);
    ectx.clearRect(0, 0, rect.width, rect.height);

    ectx.lineWidth = 1;
    const adaptiveStep=snapStep(),subPixels=cellSize*adaptiveStep;
    if(adaptiveStep<1&&subPixels>=5){
      const subStartX=((viewOffset.x%subPixels)+subPixels)%subPixels,subStartY=((viewOffset.y%subPixels)+subPixels)%subPixels;
      ectx.strokeStyle="rgba(65,76,58,.095)";
      for(let x=subStartX;x<rect.width;x+=subPixels){
        const world=(x-viewOffset.x)/cellSize;
        if(Math.abs(world-Math.round(world))<.02)continue;
        ectx.beginPath();ectx.moveTo(x+.5,0);ectx.lineTo(x+.5,rect.height);ectx.stroke();
      }
      for(let y=subStartY;y<rect.height;y+=subPixels){
        const world=(y-viewOffset.y)/cellSize;
        if(Math.abs(world-Math.round(world))<.02)continue;
        ectx.beginPath();ectx.moveTo(0,y+.5);ectx.lineTo(rect.width,y+.5);ectx.stroke();
      }
    }
    const startX = ((viewOffset.x % cellSize) + cellSize) % cellSize;
    const startY = ((viewOffset.y % cellSize) + cellSize) % cellSize;
    for (let x = startX; x < rect.width; x += cellSize) {
      const major = Math.round((x - viewOffset.x) / cellSize) % 4 === 0;
      ectx.strokeStyle = major ? "rgba(93,108,82,.22)" : "rgba(65,76,58,.15)";
      ectx.beginPath(); ectx.moveTo(x + .5, 0); ectx.lineTo(x + .5, rect.height); ectx.stroke();
    }
    for (let y = startY; y < rect.height; y += cellSize) {
      const major = Math.round((y - viewOffset.y) / cellSize) % 4 === 0;
      ectx.strokeStyle = major ? "rgba(93,108,82,.22)" : "rgba(65,76,58,.15)";
      ectx.beginPath(); ectx.moveTo(0, y + .5); ectx.lineTo(rect.width, y + .5); ectx.stroke();
    }

    const terrain = environmentFor();
    const terrainBounds = terrain.groundEnabled ? environmentBounds() : null;
    if (terrainBounds) {
      const topLeft = cellToScreen(terrainBounds.minX, terrainBounds.minY);
      const bottomRight = cellToScreen(terrainBounds.maxX, terrainBounds.maxY);
      ectx.save();
      ectx.globalAlpha = .16;
      ectx.fillStyle = MATERIAL_COLORS[terrain.groundMaterial] || "#59624a";
      ectx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      ectx.globalAlpha = .52;
      ectx.setLineDash([6,5]);
      ectx.strokeStyle = MATERIAL_COLORS[terrain.groundMaterial] || "#77836a";
      ectx.strokeRect(topLeft.x+.5, topLeft.y+.5, bottomRight.x-topLeft.x-1, bottomRight.y-topLeft.y-1);
      ectx.setLineDash([]); ectx.fillStyle = "#a8b59b"; ectx.font = "8px ui-monospace, monospace";
      ectx.fillText(`MAP GROUND · ${MATERIAL_INFO[terrain.groundMaterial] || terrain.groundMaterial}`, topLeft.x+8, topLeft.y+14);
      ectx.restore();
    }

    state.rooms.forEach((room, index) => {
      if (isItemHidden(room)) return;
      const points = roomPlanPoints(room).map(([x, y]) => cellToScreen(x, y));
      if (!onPlanLevel("room", room)) {
        if (!ghostLevels) return;
        ectx.save(); ectx.globalAlpha = .22; ectx.beginPath();
        points.forEach((point, pointIndex) => pointIndex ? ectx.lineTo(point.x, point.y) : ectx.moveTo(point.x, point.y));
        ectx.closePath(); ectx.fillStyle = "#263026"; ectx.fill(); ectx.strokeStyle = "#71806a"; ectx.setLineDash([3,4]); ectx.stroke(); ectx.restore();
        return;
      }
      const center = points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 });
      const isSelected = isRefSelected("room", room.id);
      const corridor = room.kind === "corridor";
      const materialColor = MATERIAL_COLORS[room.floorTexture || room.texture] || "#647556";
      ectx.beginPath();
      points.forEach((point, pointIndex) => pointIndex ? ectx.lineTo(point.x, point.y) : ectx.moveTo(point.x, point.y));
      ectx.closePath();
      ectx.fillStyle = isSelected ? "rgba(215,244,90,.22)" : corridor ? "rgba(82,169,190,.18)" : `${materialColor}38`;
      ectx.fill();
      ectx.strokeStyle = isSelected ? "#d7f45a" : corridor ? "#4f8c98" : "#68785d";
      ectx.lineWidth = isSelected ? 2 : 1;
      ectx.stroke();
      ectx.fillStyle = isSelected ? "#d7f45a" : "#929f88";
      ectx.font = "700 9px system-ui";
      ectx.textAlign = "center";
      ectx.fillText(room.label || (corridor ? "CORRIDOR" : `ROOM ${index + 1}`), center.x, center.y - 2);
      ectx.fillStyle = "#65705e";
      ectx.font = "8px ui-monospace";
      const elevation = roomFloor(room) * GRID;
      ectx.fillText(`${room.w * GRID} × ${room.d * GRID}  ${elevation >= 0 ? "+" : ""}${elevation}`, center.x, center.y + 10);
      ectx.textAlign = "left";
    });

    if (["polygon", "polyPlatform", "polyFloor", "polyWall"].includes(activeTool) && polygonDraft.length) {
      const draftPoints = polygonDraft.map(([x, y]) => cellToScreen(x, y));
      const candidate = hoverWorld ? cellToScreen(hoverWorld.x, hoverWorld.y) : null;
      ectx.save();
      ectx.beginPath();
      draftPoints.forEach((point, index) => index ? ectx.lineTo(point.x, point.y) : ectx.moveTo(point.x, point.y));
      if (candidate) ectx.lineTo(candidate.x, candidate.y);
      if (polygonDraft.length >= 3) ectx.lineTo(draftPoints[0].x, draftPoints[0].y);
      const draftColor = activeTool === "polyFloor" ? "#72c8c0" : activeTool === "polyWall" ? "#e7c28b" : activeTool === "polyPlatform" ? "#f0a45a" : "#d7f45a";
      ectx.fillStyle = activeTool === "polyFloor" ? "rgba(114,200,192,.13)" : activeTool === "polyWall" ? "rgba(231,194,139,.14)" : activeTool === "polyPlatform" ? "rgba(240,164,90,.12)" : "rgba(215,244,90,.1)";
      if (polygonDraft.length >= 3) ectx.fill();
      ectx.strokeStyle = draftColor; ectx.lineWidth = 2; ectx.setLineDash([6,4]); ectx.stroke(); ectx.setLineDash([]);
      draftPoints.forEach((point, index) => {
        ectx.beginPath(); ectx.arc(point.x, point.y, index === 0 ? 6 : 4, 0, Math.PI * 2);
        ectx.fillStyle = index === 0 ? draftColor : "#10140f"; ectx.fill(); ectx.strokeStyle = draftColor; ectx.stroke();
      });
      ectx.restore();
    }

    const vertexItem = editingVertices && (["room", "prop"].includes(selected?.type)) ? selectedItem() : null;
    if (vertexItem?.points?.length) {
      ectx.save();
      vertexItem.points.forEach(([x, y], index) => {
        const point = cellToScreen(x, y);
        ectx.beginPath(); ectx.arc(point.x, point.y, index === selectedVertexIndex ? 7 : 5, 0, Math.PI * 2);
        ectx.fillStyle = index === selectedVertexIndex ? "#f0a45a" : "#d7f45a"; ectx.fill();
        ectx.strokeStyle = "#10140f"; ectx.lineWidth = 2; ectx.stroke();
        ectx.fillStyle = "#10140f"; ectx.font = "700 7px system-ui"; ectx.textAlign = "center";
        ectx.fillText(String(index + 1), point.x, point.y + 2.5);
        const next=vertexItem.points[(index+1)%vertexItem.points.length],mid=cellToScreen((x+next[0])/2,(y+next[1])/2);
        ectx.fillStyle=index===selectedEdgeIndex?"#72ddec":"#10140f"; ectx.strokeStyle="#72ddec"; ectx.lineWidth=1.5;
        ectx.fillRect(mid.x-4,mid.y-4,8,8); ectx.strokeRect(mid.x-4,mid.y-4,8,8);
      });
      ectx.restore();
    }

    state.zones.filter((zone) => !isItemHidden(zone) && onPlanLevel("zone", zone)).forEach((zone) => drawZone(zone));
    state.props.filter((prop) => !isItemHidden(prop) && onPlanLevel("prop", prop)).forEach((prop) => drawProp(prop));

    if (drawing) {
      const box = normalizeSnappedRect(drawing.start, drawing.end);
      const p = cellToScreen(box.x, box.y);
      const corridor = activeTool === "corridor" || activeTool === "vent";
      const structure = ["stairs", "stairPrefab", "ramp", "wall", "diagonal", "platform", "floor", "floorHole", "cylinder", "wedge", "arch", "slopeRoof", "elevator", "rotatingDoor", "train"].includes(activeTool);
      const buyCt = activeTool === "buyCt", buyT = activeTool === "buyT";
      ectx.fillStyle = buyCt ? "rgba(98,169,255,.16)" : buyT ? "rgba(240,156,74,.16)" : corridor ? "rgba(82,169,190,.14)" : structure ? "rgba(240,156,74,.16)" : "rgba(215,244,90,.14)";
      ectx.strokeStyle = buyCt ? "#62a9ff" : buyT ? "#f09c4a" : corridor ? "#62b5c4" : structure ? "#f09c4a" : "#d7f45a";
      ectx.lineWidth = 2;
      ectx.setLineDash([5, 4]);
      const presetPreview = presetRoomPoints(activeTool, box)?.map(([x, y]) => cellToScreen(x, y));
      if (presetPreview) {
        ectx.beginPath();
        presetPreview.forEach((point, index) => index ? ectx.lineTo(point.x, point.y) : ectx.moveTo(point.x, point.y));
        ectx.closePath(); ectx.fill(); ectx.stroke();
      } else {
        ectx.fillRect(p.x + 1, p.y + 1, box.w * cellSize - 2, box.d * cellSize - 2);
        ectx.strokeRect(p.x + 1, p.y + 1, box.w * cellSize - 2, box.d * cellSize - 2);
      }
      ectx.setLineDash([]);
      const label = `${box.w * GRID} × ${box.d * GRID} units`;
      ectx.font = "8px ui-monospace";
      const width = ectx.measureText(label).width + 10;
      ectx.fillStyle = structure ? "#f09c4a" : "#d7f45a";
      ectx.fillRect(p.x, p.y - 19, width, 16);
      ectx.fillStyle = "#15180b";
      ectx.fillText(label, p.x + 5, p.y - 8);
    }

    if(lightingOverlay){
      ectx.save();ectx.setLineDash([5,5]);
      state.entities.filter((entity)=>["light","spotlight"].includes(entity.kind)&&!isItemHidden(entity)).forEach((entity)=>{const p=cellToScreen(entity.x+.5,entity.y+.5),radius=(entity.radius||512)/GRID*cellSize;ectx.beginPath();ectx.arc(p.x,p.y,radius,0,Math.PI*2);ectx.fillStyle=`${entity.color||"#fff0d0"}0d`;ectx.fill();ectx.strokeStyle=`${entity.color||"#fff0d0"}66`;ectx.stroke();});
      ectx.restore();
    }
    state.entities.filter((entity) => !isItemHidden(entity) && onPlanLevel("entity", entity)).forEach((entity) => drawEntity(entity));
    state.doors.filter((door) => !isItemHidden(door) && onPlanLevel("door", door)).forEach((door) => drawDoor(door));
    state.windows.filter((window) => !isItemHidden(window) && onPlanLevel("window", window)).forEach((window) => drawWindow(window));
    drawAnalysisOverlay();
    drawEditorSelectionOverlay();

    if (buildDiagnosticMarker) {
      const point = cellToScreen(buildDiagnosticMarker.x, buildDiagnosticMarker.y);
      ectx.save();
      if (buildDiagnosticMarker.points?.length > 1) {
        ectx.beginPath();
        buildDiagnosticMarker.points.forEach((entry,index) => {
          const screen=cellToScreen(entry.x,entry.y);
          if(index)ectx.lineTo(screen.x,screen.y);else ectx.moveTo(screen.x,screen.y);
        });
        ectx.strokeStyle="#ff7b72";ectx.lineWidth=2;ectx.setLineDash([5,4]);ectx.stroke();ectx.setLineDash([]);
      }
      ectx.strokeStyle = "#ff6b63"; ectx.fillStyle = "rgba(255,107,99,.2)"; ectx.lineWidth = 2;
      ectx.beginPath(); ectx.arc(point.x, point.y, 13, 0, Math.PI * 2); ectx.fill(); ectx.stroke();
      ectx.beginPath(); ectx.moveTo(point.x-19,point.y); ectx.lineTo(point.x+19,point.y); ectx.moveTo(point.x,point.y-19); ectx.lineTo(point.x,point.y+19); ectx.stroke();
      ectx.fillStyle = "#ff9b94"; ectx.font = "800 8px system-ui"; ectx.fillText("COMPILER",point.x+16,point.y-13);
      ectx.restore();
    }

    if(hoverWorld?.guides?.length){
      const point=cellToScreen(hoverWorld.x,hoverWorld.y);
      ectx.save();ectx.strokeStyle="rgba(114,221,236,.5)";ectx.lineWidth=1;ectx.setLineDash([4,4]);
      if(hoverWorld.guides.includes("x")){ectx.beginPath();ectx.moveTo(point.x+.5,0);ectx.lineTo(point.x+.5,rect.height);ectx.stroke();}
      if(hoverWorld.guides.includes("y")){ectx.beginPath();ectx.moveTo(0,point.y+.5);ectx.lineTo(rect.width,point.y+.5);ectx.stroke();}
      ectx.restore();
    }
    if (hoverWorld && !["select", "polygon", "polyPlatform", "polyFloor", "polyWall","eyedropper","paint"].includes(activeTool) && !drawing) {
      const oneClickTools=["crate","ladder","column","prefab","ct","t","bombA","bombB","light","spotlight","hostage","button","teleDest","decal","ambient","pathCorner","targetDummy"];
      ectx.save();ectx.strokeStyle="rgba(215,244,90,.7)";ectx.fillStyle="rgba(215,244,90,.07)";ectx.lineWidth=1;ectx.setLineDash([4,3]);
      if(oneClickTools.includes(activeTool)){
        let [w,d]=activeTool==="prefab"?prefabFootprint(activePrefabId):[1,1],anchor=placementAnchor(hoverWorld,w,d);
        if(activeTool==="prefab"&&activePrefabId.startsWith("custom:")){
          const prefab=customPrefabs.find((item)=>item.id===activePrefabId.slice(7));
          if(prefab){const bounds=customPrefabBounds(prefab),target=[hoverWorld.x,hoverWorld.y],placed=transformPrefabRect(bounds,customPrefabPivotPoint(prefab),target,customPrefabRotation,customPrefabMirrored);anchor={x:placed.x,y:placed.y};w=placed.w;d=placed.d;}
        }
        const p=cellToScreen(anchor.x,anchor.y);
        ectx.fillRect(p.x+1,p.y+1,w*cellSize-2,d*cellSize-2);ectx.strokeRect(p.x+1,p.y+1,w*cellSize-2,d*cellSize-2);
        const label=`${Math.round(w*GRID)} × ${Math.round(d*GRID)}`;ectx.setLineDash([]);ectx.font="700 7px ui-monospace";ectx.fillStyle="#d7f45a";ectx.fillText(label,p.x+5,p.y+12);
      }else{
        const p=cellToScreen(hoverWorld.x,hoverWorld.y),size=5;
        ectx.setLineDash([]);ectx.beginPath();ectx.moveTo(p.x-size,p.y);ectx.lineTo(p.x+size,p.y);ectx.moveTo(p.x,p.y-size);ectx.lineTo(p.x,p.y+size);ectx.stroke();
      }
      ectx.restore();
    }
  }

  function transformHandlesForSelection() {
    const entries=selectedEntries(); if(entries.length!==1||editingVertices||!["room","prop","zone"].includes(entries[0].ref.type))return [];
    const bounds=itemBoundsForRef(entries[0].ref),a=cellToScreen(bounds.x,bounds.y),b=cellToScreen(bounds.x+bounds.w,bounds.y+bounds.d),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
    return [
      {mode:"resize",corner:"nw",x:a.x,y:a.y},{mode:"resize",corner:"ne",x:b.x,y:a.y},{mode:"resize",corner:"se",x:b.x,y:b.y},{mode:"resize",corner:"sw",x:a.x,y:b.y},
      {mode:"rotate",x:cx,y:a.y-28},{mode:"height",x:b.x+28,y:cy}
    ];
  }

  function transformHandleHit(point) {
    return transformHandlesForSelection().find((handle)=>Math.hypot(handle.x-point.x,handle.y-point.y)<=10)||null;
  }

  function drawEditorSelectionOverlay() {
    const entries = selectedEntries().filter((entry) => !isItemHidden(entry.item));
    if (entries.length > 1) {
      const bounds = selectionBounds(entries), a = cellToScreen(bounds.x,bounds.y), b = cellToScreen(bounds.x+bounds.w,bounds.y+bounds.d);
      ectx.save(); ectx.strokeStyle = "#ffffff"; ectx.lineWidth = 1.5; ectx.setLineDash([6,4]);
      ectx.strokeRect(a.x-4,a.y-4,b.x-a.x+8,b.y-a.y+8); ectx.setLineDash([]);
      const label = `${entries.length} objects${entries.every((entry) => entry.item.groupId && entry.item.groupId === entries[0].item.groupId) ? " · GROUP" : ""}`;
      ectx.font = "800 8px system-ui"; const width = ectx.measureText(label).width + 10;
      ectx.fillStyle = "rgba(10,13,9,.9)"; ectx.fillRect(a.x-4,a.y-21,width,15); ectx.fillStyle = "#d7f45a"; ectx.fillText(label,a.x+1,a.y-10);
      ectx.restore();
    }
    if (marquee) {
      const box = { x:Math.min(marquee.start.x,marquee.end.x), y:Math.min(marquee.start.y,marquee.end.y), w:Math.abs(marquee.end.x-marquee.start.x), d:Math.abs(marquee.end.y-marquee.start.y) };
      const a = cellToScreen(box.x,box.y), b = cellToScreen(box.x+box.w,box.y+box.d);
      ectx.save(); ectx.fillStyle = "rgba(215,244,90,.09)"; ectx.strokeStyle = "#d7f45a"; ectx.setLineDash([5,4]);
      ectx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y); ectx.strokeRect(a.x+.5,a.y+.5,b.x-a.x-1,b.y-a.y-1); ectx.restore();
    }
    if (measurement?.start && measurement?.end) {
      const a = cellToScreen(measurement.start.x,measurement.start.y), b = cellToScreen(measurement.end.x,measurement.end.y);
      const dx = measurement.end.x-measurement.start.x, dy = measurement.end.y-measurement.start.y;
      const units = Math.hypot(dx,dy)*GRID, angle = (Math.atan2(dy,dx)*180/Math.PI+360)%360;
      ectx.save(); ectx.strokeStyle = "#72ddec"; ectx.fillStyle = "#72ddec"; ectx.lineWidth = 2; ectx.setLineDash([6,3]);
      ectx.beginPath(); ectx.moveTo(a.x,a.y); ectx.lineTo(b.x,b.y); ectx.stroke(); ectx.setLineDash([]);
      [a,b].forEach((point) => { ectx.beginPath(); ectx.arc(point.x,point.y,4,0,Math.PI*2); ectx.fill(); });
      const label = `${Math.round(units)} units · ΔX ${Math.round(Math.abs(dx)*GRID)} · ΔY ${Math.round(Math.abs(dy)*GRID)} · ${Math.round(angle)}°`;
      ectx.font = "800 8px system-ui"; const width = ectx.measureText(label).width+10, x=(a.x+b.x)/2-width/2, y=(a.y+b.y)/2-19;
      ectx.fillStyle = "rgba(8,12,12,.9)"; ectx.fillRect(x,y,width,15); ectx.fillStyle = "#bff7ff"; ectx.fillText(label,x+5,y+11); ectx.restore();
    }
    const handles=transformHandlesForSelection();
    if(handles.length){
      const resize=handles.filter((handle)=>handle.mode==="resize"),rotate=handles.find((handle)=>handle.mode==="rotate"),height=handles.find((handle)=>handle.mode==="height"),topMid={x:(resize[0].x+resize[1].x)/2,y:resize[0].y},rightMid={x:resize[1].x,y:(resize[1].y+resize[2].y)/2};
      ectx.save();ectx.strokeStyle="#72ddec";ectx.lineWidth=1.5;ectx.beginPath();ectx.moveTo(topMid.x,topMid.y);ectx.lineTo(rotate.x,rotate.y);ectx.moveTo(rightMid.x,rightMid.y);ectx.lineTo(height.x,height.y);ectx.stroke();
      resize.forEach((handle)=>{ectx.fillStyle="#10140f";ectx.strokeStyle="#d7f45a";ectx.fillRect(handle.x-5,handle.y-5,10,10);ectx.strokeRect(handle.x-5,handle.y-5,10,10);});
      ectx.beginPath();ectx.arc(rotate.x,rotate.y,7,0,Math.PI*2);ectx.fillStyle="#10140f";ectx.fill();ectx.strokeStyle="#f0a45a";ectx.stroke();ectx.fillStyle="#f0a45a";ectx.font="800 8px system-ui";ectx.textAlign="center";ectx.fillText("↻",rotate.x,rotate.y+3);
      ectx.beginPath();ectx.moveTo(height.x,height.y-7);ectx.lineTo(height.x+7,height.y);ectx.lineTo(height.x,height.y+7);ectx.lineTo(height.x-7,height.y);ectx.closePath();ectx.fillStyle="#72ddec";ectx.fill();ectx.fillStyle="#bff7ff";ectx.font="700 7px system-ui";ectx.fillText("Z",height.x,height.y+2.5);ectx.restore();
    }
  }

  function drawZone(zone) {
    const p = cellToScreen(zone.x, zone.y);
    const selectedZone = isRefSelected("zone", zone.id);
    const ct = zone.kind === "buyCt";
    const color = {buyCt:"#62a9ff",buyT:"#f09c4a",rescue:"#78d6a5",triggerHurt:"#df6658",teleport:"#a27ee8"}[zone.kind]||"#f09c4a";
    ectx.save();
    ectx.fillStyle = `${color}29`;
    ectx.fillRect(p.x + 3, p.y + 3, zone.w * cellSize - 6, zone.d * cellSize - 6);
    ectx.strokeStyle = selectedZone ? "#ffffff" : color;
    ectx.lineWidth = selectedZone ? 2.5 : 1.5;
    ectx.setLineDash([5, 3]);
    ectx.strokeRect(p.x + 3, p.y + 3, zone.w * cellSize - 6, zone.d * cellSize - 6);
    ectx.setLineDash([]);
    ectx.fillStyle = color; ectx.font = "900 8px system-ui";
    ectx.fillText({buyCt:"CT BUY",buyT:"T BUY",rescue:"RESCUE",triggerHurt:"DAMAGE",teleport:"TELEPORT"}[zone.kind]||"ZONE", p.x + 8, p.y + 16);
    ectx.restore();
  }

  function drawProp(prop) {
    const p = cellToScreen(prop.x, prop.y);
    const width = prop.w * cellSize, depth = prop.d * cellSize;
    const isSelected = isRefSelected("prop", prop.id);
    const base = MATERIAL_COLORS[prop.texture] || "#7a735f";
    ectx.save();
    if(prop.kind==="floorHole"){ectx.fillStyle="rgba(3,5,3,.82)";ectx.fillRect(p.x+3,p.y+3,width-6,depth-6);ectx.strokeStyle=isSelected?"#d7f45a":"#ef6658";ectx.lineWidth=isSelected?2.5:1.5;ectx.setLineDash([6,4]);ectx.strokeRect(p.x+2,p.y+2,width-4,depth-4);ectx.setLineDash([]);ectx.fillStyle=isSelected?"#d7f45a":"#ffaaa3";ectx.font="800 7px system-ui";ectx.fillText("FLOOR OPEN",p.x+7,p.y+15);ectx.restore();return;}
    if (["platformPolygon", "floorPolygon", "wallPolygon", "cylinder"].includes(prop.kind)) {
      const corners = (prop.points || []).map(([x, y]) => cellToScreen(x, y));
      ectx.beginPath();
      corners.forEach((point, index) => index ? ectx.lineTo(point.x, point.y) : ectx.moveTo(point.x, point.y));
      ectx.closePath(); ectx.fillStyle = base; ectx.globalAlpha = isSelected ? .92 : .74; ectx.fill(); ectx.globalAlpha = 1;
      const floorShape = prop.kind === "floorPolygon", wallShape = ["wallPolygon","cylinder"].includes(prop.kind);
      ectx.strokeStyle = isSelected ? "#d7f45a" : floorShape ? "#72c8c0" : wallShape ? "#e7c28b" : "#f3c95f"; ectx.lineWidth = isSelected ? 2.5 : 1.5; ectx.stroke();
      ectx.fillStyle = floorShape ? "#c2f3ee" : wallShape ? "#f5dfbd" : "#fff0b3"; ectx.font = "800 7px system-ui"; ectx.textAlign = "center";
      const label = floorShape ? `FLOOR Z ${Math.round((prop.elevation || 0) * GRID)}` : prop.kind === "cylinder" ? "CYLINDER" : wallShape ? (prop.label || "POLY WALL") : prop.label;
      if (label) ectx.fillText(label, p.x + width / 2, p.y + depth / 2 + 2); ectx.restore(); return;
    }
    if (prop.kind === "diagonal") {
      const corners = diagonalCorners(prop).map(([x, y]) => cellToScreen(x, y));
      ectx.beginPath();
      corners.forEach((point, index) => index ? ectx.lineTo(point.x, point.y) : ectx.moveTo(point.x, point.y));
      ectx.closePath();
      ectx.fillStyle = base; ectx.globalAlpha = isSelected ? .92 : .78; ectx.fill(); ectx.globalAlpha = 1;
      ectx.strokeStyle = isSelected ? "#d7f45a" : "#f0c87a"; ectx.lineWidth = isSelected ? 2.5 : 1.5; ectx.stroke();
      if (isSelected) {
        const centerX = p.x + width / 2, centerY = p.y + depth / 2;
        ectx.fillStyle = "rgba(10,14,10,.78)"; ectx.fillRect(centerX - 19, centerY - 7, 38, 13);
        ectx.fillStyle = "#d7f45a"; ectx.font = "800 7px system-ui"; ectx.textAlign = "center";
        ectx.fillText(prop.architectural ? "WALL" : "COVER", centerX, centerY + 2);
      }
      ectx.restore(); return;
    }
    ectx.fillStyle = base;
    ectx.globalAlpha = isSelected ? .9 : .72;
    ectx.fillRect(p.x + 3, p.y + 3, width - 6, depth - 6);
    ectx.globalAlpha = 1;
    ectx.strokeStyle = isSelected ? "#d7f45a" : "#c4b184";
    ectx.lineWidth = isSelected ? 2 : 1;
    ectx.strokeRect(p.x + 2, p.y + 2, width - 4, depth - 4);

    if (prop.kind === "ladder") {
      ectx.strokeStyle = isSelected ? "#ffffff" : "#8fd8cc";
      ectx.lineWidth = 2;
      const horizontal = prop.direction === "n" || prop.direction === "s";
      if (horizontal) {
        const y = prop.direction === "n" ? p.y + 6 : p.y + depth - 6;
        ectx.beginPath(); ectx.moveTo(p.x + 5, y - 4); ectx.lineTo(p.x + width - 5, y - 4);
        ectx.moveTo(p.x + 5, y + 4); ectx.lineTo(p.x + width - 5, y + 4);
        for (let x = p.x + 9; x < p.x + width - 5; x += 7) { ectx.moveTo(x, y - 4); ectx.lineTo(x, y + 4); }
      } else {
        const x = prop.direction === "w" ? p.x + 6 : p.x + width - 6;
        ectx.beginPath(); ectx.moveTo(x - 4, p.y + 5); ectx.lineTo(x - 4, p.y + depth - 5);
        ectx.moveTo(x + 4, p.y + 5); ectx.lineTo(x + 4, p.y + depth - 5);
        for (let y = p.y + 9; y < p.y + depth - 5; y += 7) { ectx.moveTo(x - 4, y); ectx.lineTo(x + 4, y); }
      }
      ectx.stroke();
    } else if (["crate","wall","platform","floor","arch","water","breakable","elevator","rotatingDoor","train"].includes(prop.kind)) {
      ectx.beginPath();
      if (prop.kind === "crate") {
        ectx.moveTo(p.x + 4, p.y + 4); ectx.lineTo(p.x + width - 4, p.y + depth - 4);
        ectx.moveTo(p.x + width - 4, p.y + 4); ectx.lineTo(p.x + 4, p.y + depth - 4);
      } else if (prop.kind === "wall") {
        for (let offset = 8; offset < width - 4; offset += 9) {
          ectx.moveTo(p.x + offset, p.y + 3);
          ectx.lineTo(p.x + offset, p.y + depth - 3);
        }
      } else if (prop.kind === "platform") {
        ectx.moveTo(p.x + 5, p.y + depth - 6); ectx.lineTo(p.x + width - 5, p.y + 6);
      } else {
        ectx.strokeStyle = isSelected ? "#d7f45a" : "#72c8c0";
        for (let offset = -depth; offset < width; offset += 9) {
          ectx.moveTo(p.x + Math.max(3, offset), p.y + Math.max(3, -offset));
          ectx.lineTo(p.x + Math.min(width - 3, offset + depth), p.y + Math.min(depth - 3, depth - offset));
        }
      }
      ectx.stroke();
      if (prop.kind === "wall" && width > 36 && depth > 18) {
        ectx.fillStyle = "rgba(10,14,10,.72)"; ectx.fillRect(p.x + 5, p.y + 5, 29, 12);
        ectx.fillStyle = isSelected ? "#d7f45a" : "#dce4d6"; ectx.font = "800 7px system-ui"; ectx.fillText("WALL", p.x + 9, p.y + 14);
      }
      if (prop.kind === "platform" && width > 42 && depth > 18) {
        ectx.fillStyle = "rgba(10,14,10,.72)"; ectx.fillRect(p.x + 5, p.y + 5, 43, 12);
        ectx.fillStyle = isSelected ? "#d7f45a" : "#f0c87a"; ectx.font = "800 7px system-ui"; ectx.fillText("PLATFORM", p.x + 8, p.y + 14);
      }
      if (prop.kind === "floor" && width > 42 && depth > 18) {
        ectx.fillStyle = "rgba(10,14,10,.72)"; ectx.fillRect(p.x + 5, p.y + 5, 58, 12);
        ectx.fillStyle = isSelected ? "#d7f45a" : "#9fe1db"; ectx.font = "800 7px system-ui"; ectx.fillText(`FLOOR ${Math.round((prop.elevation || 0) * GRID)}`, p.x + 8, p.y + 14);
      }
      if (["water","breakable"].includes(prop.kind) && width > 36 && depth > 18) {
        ectx.fillStyle="rgba(10,14,10,.72)";ectx.fillRect(p.x+5,p.y+5,prop.kind==="water"?35:58,12);ectx.fillStyle=isSelected?"#d7f45a":prop.kind==="water"?"#72ddec":"#f0a45a";ectx.font="800 7px system-ui";ectx.fillText(prop.kind==="water"?"WATER":"BREAKABLE",p.x+8,p.y+14);
      }
      if (["elevator","rotatingDoor","train"].includes(prop.kind) && width > 36 && depth > 18) {
        const label={elevator:"ELEVATOR",rotatingDoor:"ROT DOOR",train:"MOVING"}[prop.kind];
        ectx.fillStyle="rgba(10,14,10,.78)";ectx.fillRect(p.x+5,p.y+5,Math.max(48,label.length*7),12);ectx.fillStyle=isSelected?"#d7f45a":"#a9e1f0";ectx.font="800 7px system-ui";ectx.fillText(label,p.x+8,p.y+14);
      }
    } else {
      const count = ["ramp","wedge","slopeRoof"].includes(prop.kind) ? 6 : Math.max(2, Math.round(prop.steps || recommendedStairSteps(prop)));
      for (let i = 1; i < count; i++) {
        const t = i / count;
        ectx.beginPath();
        if (prop.direction === "e" || prop.direction === "w") {
          ectx.moveTo(p.x + width * t, p.y + 3); ectx.lineTo(p.x + width * t, p.y + depth - 3);
        } else {
          ectx.moveTo(p.x + 3, p.y + depth * t); ectx.lineTo(p.x + width - 3, p.y + depth * t);
        }
        ectx.stroke();
      }
      const angle = { e: 0, s: Math.PI / 2, w: Math.PI, n: -Math.PI / 2 }[prop.direction];
      const cx = p.x + width / 2, cy = p.y + depth / 2;
      ectx.translate(cx, cy); ectx.rotate(angle);
      ectx.beginPath(); ectx.moveTo(-7, -5); ectx.lineTo(7, 0); ectx.lineTo(-7, 5); ectx.stroke();
    }
    ectx.restore();
  }

  function drawDoor(door) {
    const selectedDoor = isRefSelected("door", door.id);
    const sliding = door.mode === "sliding";
    const segment=openingSegment(door),a=cellToScreen(segment[0][0],segment[0][1]),b=cellToScreen(segment[1][0],segment[1][1]);
    ectx.save();
    ectx.strokeStyle = selectedDoor ? "#ffffff" : sliding ? "#f0a45a" : "#d7f45a";
    ectx.lineWidth = selectedDoor ? 6 : 4;
    ectx.beginPath(); ectx.moveTo(a.x, a.y); ectx.lineTo(b.x, b.y); ectx.stroke();
    ectx.strokeStyle = "#10140f"; ectx.lineWidth = 2; ectx.setLineDash(sliding ? [] : [4, 4]);
    ectx.beginPath(); ectx.moveTo(a.x, a.y); ectx.lineTo(b.x, b.y); ectx.stroke();
    ectx.restore();
  }

  function drawWindow(window) {
    const selectedWindow = isRefSelected("window", window.id);
    const segment=openingSegment(window),a=cellToScreen(segment[0][0],segment[0][1]),b=cellToScreen(segment[1][0],segment[1][1]);
    ectx.save();
    ectx.strokeStyle = selectedWindow ? "#ffffff" : "#72ddec";
    ectx.lineWidth = selectedWindow ? 7 : 5;
    ectx.beginPath(); ectx.moveTo(a.x, a.y); ectx.lineTo(b.x, b.y); ectx.stroke();
    ectx.strokeStyle = window.mode === "open" ? "#10140f" : "rgba(220,252,255,.9)";
    ectx.lineWidth = 1.5; ectx.setLineDash(window.mode === "open" ? [4, 4] : [2, 3]);
    ectx.beginPath(); ectx.moveTo(a.x, a.y); ectx.lineTo(b.x, b.y); ectx.stroke();
    ectx.restore();
  }

  function drawEntity(entity) {
    const p = cellToScreen(entity.x + .5, entity.y + .5);
    const selectedEntity = isRefSelected("entity", entity.id);
    const styles = {
      ct: ["#62a9ff", "CT"], t: ["#f09c4a", "T"],
      bombA: ["#d7f45a", "A"], bombB: ["#d7f45a", "B"],
      light: [entity.color || "#fff0d0", "L"], spotlight:[entity.color || "#fff0d0", "SP"], hostage:["#e9d9a4","H"], button:["#b7a780","E"],
      teleDest:["#a27ee8","D"], decal:["#c4b184","#"], ambient:["#d7f45a","S"], pathCorner:["#8fe1ff","P"], targetDummy:["#ef6658","TG"]
    }[entity.kind];
    if (["light","spotlight"].includes(entity.kind)) {
      const glow = ectx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 17);
      glow.addColorStop(0, `${entity.color || "#fff0d0"}88`); glow.addColorStop(1, "rgba(255,240,208,0)");
      ectx.fillStyle = glow; ectx.fillRect(p.x - 18, p.y - 18, 36, 36);
    }
    ectx.beginPath();
    if (entity.kind.startsWith("bomb")) {
      ectx.roundRect(p.x - 10, p.y - 10, 20, 20, 4);
    } else {
      ectx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    }
    ectx.fillStyle = styles[0]; ectx.fill();
    if (selectedEntity) {
      ectx.strokeStyle = "#fff"; ectx.lineWidth = 2; ectx.stroke();
    }
    ectx.fillStyle = "#10140f";
    ectx.font = "900 8px system-ui";
    ectx.textAlign = "center"; ectx.textBaseline = "middle";
    ectx.fillText(styles[1], p.x, p.y + .5);
    if (["ct", "t"].includes(entity.kind)) {
      const angle = (entity.angle || 0) * Math.PI / 180;
      const tip = { x: p.x + Math.cos(angle) * 18, y: p.y + Math.sin(angle) * 18 };
      ectx.strokeStyle = styles[0]; ectx.fillStyle = styles[0]; ectx.lineWidth = 2;
      ectx.beginPath(); ectx.moveTo(p.x + Math.cos(angle) * 10, p.y + Math.sin(angle) * 10); ectx.lineTo(tip.x, tip.y); ectx.stroke();
      ectx.beginPath(); ectx.moveTo(tip.x, tip.y);
      ectx.lineTo(tip.x - Math.cos(angle - .55) * 5, tip.y - Math.sin(angle - .55) * 5);
      ectx.lineTo(tip.x - Math.cos(angle + .55) * 5, tip.y - Math.sin(angle + .55) * 5);
      ectx.closePath(); ectx.fill();
    }
    ectx.textAlign = "left"; ectx.textBaseline = "alphabetic";
  }

  function drawPreview() {
    const rect = resizeCanvas(preview, pctx);
    previewPickRegions = [];
    previewTransformHandle = null;
    pctx.clearRect(0, 0, rect.width, rect.height);
    if (previewMode === "walk") {
      drawWalkPreview(rect);
      return;
    }
    if (!state.rooms.length && !environmentFor().groundEnabled) {
      pctx.fillStyle = "#687263";
      pctx.textAlign = "center";
      pctx.font = "9px system-ui";
      pctx.fillText("Your rooms will appear here", rect.width / 2, rect.height / 2);
      pctx.textAlign = "left";
      return;
    }

    if (environmentFor().groundEnabled || state.rooms.some((room) => room.ceilingMode === "sky")) {
      paintSkyBackground(pctx, rect.width, rect.height);
    }

    const visibleRooms = state.rooms.filter((room) => !isItemHidden(room));
    const orbitRooms = previewLevelOnly && planLevel != null ? visibleRooms.filter((room) => onPlanLevel("room", room)) : visibleRooms;
    const shownRooms = orbitRooms.length ? orbitRooms : state.rooms;
    const fallbackBounds = environmentBounds(shownRooms);
    const allX = shownRooms.length ? shownRooms.flatMap((r) => [r.x, r.x + r.w]) : [fallbackBounds.minX,fallbackBounds.maxX];
    const allY = shownRooms.length ? shownRooms.flatMap((r) => [r.y, r.y + r.d]) : [fallbackBounds.minY,fallbackBounds.maxY];
    const focusedProp = selected?.type === "prop" ? state.props.find((prop) => prop.id === selected.id) : null;
    const center = focusedProp
      ? { x: focusedProp.x + focusedProp.w / 2, y: focusedProp.y + focusedProp.d / 2 }
      : { x: (Math.min(...allX) + Math.max(...allX)) / 2, y: (Math.min(...allY) + Math.max(...allY)) / 2 };
    const extent = focusedProp
      ? Math.max(focusedProp.w, focusedProp.d, 4)
      : Math.max(Math.max(...allX) - Math.min(...allX), Math.max(...allY) - Math.min(...allY), 5);
    const baseScale = Math.min(focusedProp ? 30 : 16, rect.width / (extent * 2.05), rect.height / (extent * 1.05));
    const scale = baseScale * previewZoom;
    const cos = Math.cos(previewAngle), sin = Math.sin(previewAngle);
    const origin = { x: rect.width / 2 + previewPan.x, y: rect.height * .63 + previewPan.y };

    function project(x, y, z = 0) {
      const dx = x - center.x, dy = y - center.y;
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      return { x: origin.x + rx * scale, y: origin.y + ry * scale * .48 - z * scale * .58 };
    }

    function registerPick(type, id, points, pickedSurface = null) {
      if (points?.length >= 3) previewPickRegions.push({ ref:{type,id}, surface:pickedSurface, points:points.map((point)=>({x:point.x,y:point.y})) });
    }

    const environment = environmentFor();
    const terrainBounds = environment.groundEnabled ? environmentBounds(shownRooms) : null;
    if (terrainBounds) {
      const terrainPoints = [
        project(terrainBounds.minX,terrainBounds.minY,terrainBounds.base-.03),
        project(terrainBounds.maxX,terrainBounds.minY,terrainBounds.base-.03),
        project(terrainBounds.maxX,terrainBounds.maxY,terrainBounds.base-.03),
        project(terrainBounds.minX,terrainBounds.maxY,terrainBounds.base-.03)
      ];
      polygon(terrainPoints, MATERIAL_COLORS[environment.groundMaterial] || "#586348", "#7d8c6c", environment.groundMaterial, .12);
    }

    const sorted = [...shownRooms].sort((a, b) => {
      const ac = project(a.x + a.w / 2, a.y + a.d / 2).y;
      const bc = project(b.x + b.w / 2, b.y + b.d / 2).y;
      return ac - bc;
    });

    sorted.forEach((room) => {
      const base = roomFloor(room);
      const z = base + Math.min(room.height, 8) * .35;
      const planPoints = roomPlanPoints(room);
      const b = planPoints.map(([x, y]) => project(x, y, base));
      const t = planPoints.map(([x, y]) => project(x, y, z));
      const floorPlane = planPoints.map(([x, y]) => project(x, y, base + .025));
      const isSelected = isRefSelected("room", room.id);

      const floorTexture = room.floorTexture || "CSTRIKE_FP2DARK";
      const topColor = room.kind === "corridor" ? "#456a6d" : (MATERIAL_COLORS[floorTexture] || "#343a36");
      polygon(floorPlane, isSelected ? "#a2b34f" : topColor, isSelected ? "#d7f45a" : "#89957f", floorTexture, .06, resolvedSurfaceUv(room,"room","floor"));
      registerPick("room",room.id,floorPlane,"floor");

      b.forEach((point, index) => {
        const next = (index + 1) % b.length;
        polygon([point, b[next], t[next], t[index]], isSelected ? "#667438" : index % 2 ? "#293226" : "#36402f", "#637159", roomWallTexture(room,index,planPoints), index % 2 ? .42 : .3, roomWallUv(room,index,planPoints));
        registerPick("room",room.id,[point,b[next],t[next],t[index]],`edge:${index}`);
      });
      if (room.ceilingMode !== "sky") {
        pctx.save();
        pctx.globalAlpha = isSelected ? .78 : .62;
        polygon(t, isSelected ? "#a8b55d" : "#535d50", isSelected ? "#e7ff79" : "#9aa493", room.ceilingTexture || "C1A0_LABW3", .12, resolvedSurfaceUv(room,"room","ceiling"));
        pctx.restore();
      }
      if (room.ceilingMode !== "sky") registerPick("room",room.id,t,"ceiling");
    });

    state.zones.filter((zone) => !isItemHidden(zone) && (!previewLevelOnly || planLevel == null || onPlanLevel("zone", zone))).forEach((zone) => {
      const hostRoom = state.rooms.find((room) => pointInRoom(zone.x + zone.w / 2, zone.y + zone.d / 2, room));
      const baseZ = roomFloor(hostRoom) + .1;
      pctx.save(); pctx.globalAlpha = isRefSelected("zone",zone.id) ? .72 : .38;
      drawIsoPrism(zone.x, zone.y, zone.x + zone.w, zone.y + zone.d, .025,
        ({buyCt:"#62a9ff",buyT:"#f09c4a",rescue:"#78d6a5",triggerHurt:"#df6658",teleport:"#a27ee8"}[zone.kind]||"#f09c4a"), isRefSelected("zone",zone.id), baseZ);
      registerPick("zone",zone.id,[project(zone.x,zone.y,baseZ),project(zone.x+zone.w,zone.y,baseZ),project(zone.x+zone.w,zone.y+zone.d,baseZ),project(zone.x,zone.y+zone.d,baseZ)]);
      pctx.restore();
    });

    state.doors.filter((door) => !isItemHidden(door) && door.mode === "sliding" && (!previewLevelOnly || planLevel == null || onPlanLevel("door", door))).forEach((door) => {
      const hostRoom = adjacentRoomsForOpening(door)[0];
      const baseZ = roomFloor(hostRoom) + .08;
      const selectedDoor = isRefSelected("door",door.id);
      const doorCorners=openingCorners(door,.14);
      drawIsoPolygonPrism(doorCorners,(door.height||2)*.68,MATERIAL_COLORS[door.texture]||"#53666b",selectedDoor,baseZ,door.texture);
      registerPick("door",door.id,doorCorners.map(([x,y])=>project(x,y,baseZ+1)));
    });

    state.windows.filter((window) => !isItemHidden(window) && (!previewLevelOnly || planLevel == null || onPlanLevel("window", window))).forEach((window) => {
      const hostRoom = adjacentRoomsForOpening(window)[0];
      const baseZ = roomFloor(hostRoom) + .08 + (window.sill || .75) * .58;
      const selectedWindow = isRefSelected("window",window.id);
      pctx.save();
      pctx.globalAlpha = window.mode === "open" ? .18 : .56;
      const windowCorners=openingCorners(window,.07);
      drawIsoPolygonPrism(windowCorners,(window.height||1.5)*.58,"#86dce8",selectedWindow,baseZ);
      pctx.restore();
      registerPick("window",window.id,windowCorners.map(([x,y])=>project(x,y,baseZ+.5)));
    });

    const sortedProps = state.props.filter((prop) => !isItemHidden(prop) && (!previewLevelOnly || planLevel == null || onPlanLevel("prop", prop))).sort((a, b) => project(a.x + a.w / 2, a.y + a.d / 2).y - project(b.x + b.w / 2, b.y + b.d / 2).y);
    sortedProps.forEach((prop) => {
      const color = prop.kind === "stairs" ? "#d7f45a" : prop.kind === "ramp" ? "#f0a45a" : (MATERIAL_COLORS[prop.texture] || "#7a735f");
      const selectedProp = isRefSelected("prop",prop.id);
      const hostRoom = state.rooms
        .filter((room) => pointInRoom(prop.x + prop.w / 2, prop.y + prop.d / 2, room))
        .sort((a, b) => b.height - a.height)[0];
      const baseZ = Number(prop.floorLevel ?? roomFloor(hostRoom)) + .08;
      const pickCorners = prop.points?.length ? prop.points : prop.kind === "diagonal" ? diagonalCorners(prop) : [[prop.x,prop.y],[prop.x+prop.w,prop.y],[prop.x+prop.w,prop.y+prop.d],[prop.x,prop.y+prop.d]];
      registerPick("prop",prop.id,pickCorners.map(([x,y])=>project(x,y,baseZ+Math.max(.12,(prop.height||.25)*.55))));
      if(prop.kind==="floorHole"){const points=pickCorners.map(([x,y])=>project(x,y,baseZ+.03));polygon(points,"#050705",selectedProp?"#d7f45a":"#ef6658");return;}
      if (["floor", "floorPolygon"].includes(prop.kind)) {
        const top = Number(prop.elevation) || 0;
        const thickness = Math.max(.125, Number(prop.thickness) || .25);
        const slabBase = top - thickness + .08;
        if (prop.kind === "floorPolygon") drawIsoPolygonPrism(prop.points || [], thickness, color, selectedProp, slabBase, prop.texture, resolvedSurfaceUv(prop,"prop","object"),prop.faceTextures,prop.faceUV);
        else drawIsoPrism(prop.x, prop.y, prop.x + prop.w, prop.y + prop.d, thickness, color, selectedProp, slabBase, prop.texture, resolvedSurfaceUv(prop,"prop","object"),prop.faceTextures,prop.faceUV);
        return;
      }
      if (prop.kind === "ladder") {
        const thickness = .07;
        if (prop.direction === "n") drawIsoPrism(prop.x, prop.y, prop.x + prop.w, prop.y + thickness, prop.height * .7, "#75b9ad", selectedProp, baseZ, prop.texture);
        else if (prop.direction === "s") drawIsoPrism(prop.x, prop.y + prop.d - thickness, prop.x + prop.w, prop.y + prop.d, prop.height * .7, "#75b9ad", selectedProp, baseZ, prop.texture);
        else if (prop.direction === "w") drawIsoPrism(prop.x, prop.y, prop.x + thickness, prop.y + prop.d, prop.height * .7, "#75b9ad", selectedProp, baseZ, prop.texture);
        else drawIsoPrism(prop.x + prop.w - thickness, prop.y, prop.x + prop.w, prop.y + prop.d, prop.height * .7, "#75b9ad", selectedProp, baseZ, prop.texture);
        return;
      }
      if (prop.kind === "diagonal") {
        drawIsoPolygonPrism(diagonalCorners(prop), prop.height * .7, color, selectedProp, baseZ, prop.texture, resolvedSurfaceUv(prop,"prop","object"),prop.faceTextures,prop.faceUV);
        return;
      }
      if (["wallPolygon","cylinder"].includes(prop.kind)) {
        drawIsoPolygonPrism(prop.points || [], prop.height * .7, color, selectedProp, baseZ, prop.texture, resolvedSurfaceUv(prop,"prop","object"),prop.faceTextures,prop.faceUV);
        return;
      }
      if (prop.kind === "platformPolygon") {
        drawIsoPolygonPrism(prop.points || [], prop.height * .7, color, selectedProp, baseZ, prop.texture, resolvedSurfaceUv(prop,"prop","object"),prop.faceTextures,prop.faceUV);
        return;
      }
      if (["crate","wall","platform","arch","water","breakable","elevator","rotatingDoor","train"].includes(prop.kind)) {
        drawIsoPrism(prop.x, prop.y, prop.x + prop.w, prop.y + prop.d, prop.height * .7, color, selectedProp, baseZ, prop.texture, resolvedSurfaceUv(prop,"prop","object"),prop.faceTextures,prop.faceUV);
        return;
      }
      if (["ramp","wedge","slopeRoof"].includes(prop.kind)) {
        drawIsoRamp(prop, baseZ, prop.height * .9, color, selectedProp, prop.texture, resolvedSurfaceUv(prop,"prop","object"));
      } else {
        const alongX = prop.direction === "e" || prop.direction === "w";
        const segments = Math.max(1, Math.round(prop.steps || recommendedStairSteps(prop)));
        for (let i = 0; i < segments; i++) {
          const uphillIndex = prop.direction === "e" || prop.direction === "s" ? i : segments - 1 - i;
          const height = prop.height * .9 * (uphillIndex + 1) / segments;
          if (alongX) {
            const x1 = prop.x + prop.w * i / segments, x2 = prop.x + prop.w * (i + 1) / segments;
            drawIsoPrism(x1, prop.y, x2, prop.y + prop.d, height, color, selectedProp, baseZ, prop.texture);
          } else {
            const y1 = prop.y + prop.d * i / segments, y2 = prop.y + prop.d * (i + 1) / segments;
            drawIsoPrism(prop.x, y1, prop.x + prop.w, y2, height, color, selectedProp, baseZ, prop.texture);
          }
        }
      }
      const footprint = [
        project(prop.x, prop.y, baseZ + .06), project(prop.x + prop.w, prop.y, baseZ + .06),
        project(prop.x + prop.w, prop.y + prop.d, baseZ + .06), project(prop.x, prop.y + prop.d, baseZ + .06)
      ];
      pctx.beginPath();
      footprint.forEach((point, index) => index ? pctx.lineTo(point.x, point.y) : pctx.moveTo(point.x, point.y));
      pctx.closePath(); pctx.strokeStyle = selectedProp ? "#ffffff" : color; pctx.lineWidth = selectedProp ? 2.5 : 1.8; pctx.stroke();

      const label = prop.kind === "stairs" ? "STAIRS" : "RAMP";
      const labelPoint = project(prop.x + prop.w / 2, prop.y + prop.d / 2, baseZ + prop.height * .9 + .28);
      pctx.fillStyle = selectedProp ? "#d7f45a" : "#f0f2ea";
      pctx.font = "900 8px system-ui";
      pctx.textAlign = "center";
      const labelWidth = pctx.measureText(label).width + 8;
      pctx.fillStyle = "rgba(8,11,8,.88)"; pctx.fillRect(labelPoint.x - labelWidth / 2, labelPoint.y - 9, labelWidth, 12);
      pctx.fillStyle = selectedProp ? "#d7f45a" : color; pctx.fillText(label, labelPoint.x, labelPoint.y);
      pctx.textAlign = "left";
    });

    state.entities.filter((entity) => !isItemHidden(entity) && (!previewLevelOnly || planLevel == null || onPlanLevel("entity", entity))).forEach((entity) => {
      const point = project(entity.x + .5, entity.y + .5, ["light","spotlight"].includes(entity.kind) ? (entity.z || 2.5) : 3.2);
      const color = entity.kind === "ct" ? "#62a9ff" : entity.kind === "t" ? "#f09c4a" : ["light","spotlight"].includes(entity.kind) ? (entity.color || "#fff0d0") : ({hostage:"#e9d9a4",button:"#b7a780",teleDest:"#a27ee8",decal:"#c4b184",ambient:"#d7f45a",pathCorner:"#8fe1ff",targetDummy:"#ef6658"}[entity.kind]||"#d7f45a");
      if (["light","spotlight"].includes(entity.kind)) {
        const radius = Math.max(9, Math.min(24, (entity.brightness || 300) / 22));
        const glow = pctx.createRadialGradient(point.x, point.y, 1, point.x, point.y, radius);
        glow.addColorStop(0, `${color}bb`); glow.addColorStop(1, "rgba(255,240,208,0)");
        pctx.fillStyle = glow; pctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
      }
      pctx.beginPath(); pctx.arc(point.x, point.y, 4, 0, Math.PI * 2); pctx.fillStyle = color; pctx.fill();
      pctx.strokeStyle = "#0f130e"; pctx.lineWidth = 1.5; pctx.stroke();
      if (!["light","spotlight"].includes(entity.kind)) {
        const angle = ["ct", "t"].includes(entity.kind) ? (entity.angle || 0) * Math.PI / 180 : Math.PI / 2;
        const directionPoint = project(entity.x + .5 + Math.cos(angle) * .7, entity.y + .5 + Math.sin(angle) * .7, 3.2);
        pctx.beginPath(); pctx.moveTo(point.x, point.y); pctx.lineTo(directionPoint.x, directionPoint.y); pctx.strokeStyle = color; pctx.lineWidth = 1.5; pctx.stroke();
      }
      registerPick("entity",entity.id,[{x:point.x-8,y:point.y-8},{x:point.x+8,y:point.y-8},{x:point.x+8,y:point.y+8},{x:point.x-8,y:point.y+8}]);
    });

    const gizmoEntries=selectedEntries();
    if(gizmoEntries.length===1&&["room","prop","zone"].includes(gizmoEntries[0].ref.type)){
      const {ref,item}=gizmoEntries[0],cx=item.x+(item.w||1)/2,cy=item.y+(item.d||1)/2;
      const base=ref.type==="room"?roomFloor(item):ref.type==="prop"?(Number(item.floorLevel)||0):floorLevelAt(cx,cy);
      const height=ref.type==="room"?(item.height||4):ref.type==="zone"?(item.height||2):["floor","floorPolygon"].includes(item.kind)?Math.max(.25,(Number(item.elevation)||base)-base):(item.height||1);
      const bottom=project(cx,cy,base),top=project(cx,cy,base+height*.7);
      pctx.save();pctx.strokeStyle="#72ddec";pctx.lineWidth=2;pctx.setLineDash([4,3]);pctx.beginPath();pctx.moveTo(bottom.x,bottom.y);pctx.lineTo(top.x,top.y);pctx.stroke();pctx.setLineDash([]);pctx.beginPath();pctx.arc(top.x,top.y,7,0,Math.PI*2);pctx.fillStyle="#72ddec";pctx.fill();pctx.strokeStyle="#fff";pctx.stroke();pctx.fillStyle="#071010";pctx.font="800 7px system-ui";pctx.textAlign="center";pctx.fillText("Z",top.x,top.y+2.5);pctx.restore();
      previewTransformHandle={x:top.x,y:top.y,ref:{...ref},height:item.height||height};
    }

    function drawIsoRamp(prop, baseZ, height, color, isSelected, texture, uv = null) {
      const corners = [
        [prop.x, prop.y], [prop.x + prop.w, prop.y],
        [prop.x + prop.w, prop.y + prop.d], [prop.x, prop.y + prop.d]
      ];
      const heights = {
        e: [0, height, height, 0], w: [height, 0, 0, height],
        s: [0, 0, height, height], n: [height, height, 0, 0]
      }[prop.direction] || [0, height, height, 0];
      const b = corners.map(([x, y]) => project(x, y, baseZ));
      const t = corners.map(([x, y], index) => project(x, y, baseZ + heights[index]));
      const stroke = isSelected ? "#ffffff" : "#f0a45a";
      polygon([b[0],b[1],t[1],t[0]], "#67462d", stroke, texture, .34, uv);
      polygon([b[1],b[2],t[2],t[1]], "#513c2b", stroke, texture, .44, uv);
      polygon([b[2],b[3],t[3],t[2]], "#795334", stroke, texture, .24, uv);
      polygon([b[3],b[0],t[0],t[3]], "#5c422f", stroke, texture, .38, uv);
      polygon(t, isSelected ? "#ffd39e" : color, stroke, texture, .04, uv);
    }

    function drawIsoPrism(x1, y1, x2, y2, height, color, isSelected, baseZ = 0, texture, uv = null, faceTextures = null, faceUV = null) {
      const b = [project(x1,y1,baseZ), project(x2,y1,baseZ), project(x2,y2,baseZ), project(x1,y2,baseZ)];
      const t = [project(x1,y1,baseZ+height), project(x2,y1,baseZ+height), project(x2,y2,baseZ+height), project(x1,y2,baseZ+height)];
      const ft=(name)=>faceTextures?.[name]||texture,fu=(name)=>faceUV?.[name]||uv;
      polygon([b[0],b[1],t[1],t[0]], "#4a4234", isSelected ? "#d7f45a" : "#7d7058", ft("north"), .3, fu("north"));
      polygon([b[1],b[2],t[2],t[1]], "#3b3831", isSelected ? "#d7f45a" : "#6f695a", ft("east"), .42, fu("east"));
      polygon([b[2],b[3],t[3],t[2]], "#51493a", isSelected ? "#d7f45a" : "#81755e", ft("south"), .22, fu("south"));
      polygon(t, isSelected ? "#a8b55d" : color, isSelected ? "#d7f45a" : "#a3987c", ft("top"), .04, fu("top"));
    }

    function drawIsoPolygonPrism(corners, height, color, isSelected, baseZ = 0, texture, uv = null, faceTextures = null, faceUV = null) {
      const bottom = corners.map(([x, y]) => project(x, y, baseZ));
      const top = corners.map(([x, y]) => project(x, y, baseZ + height));
      for (let index = 0; index < corners.length; index++) {
        const next = (index + 1) % corners.length;
        polygon([bottom[index], bottom[next], top[next], top[index]], index % 2 ? "#3b3831" : "#4a4234",
          isSelected ? "#d7f45a" : "#80735a", faceTextures?.[`side:${index}`]||texture, index % 2 ? .42 : .3, faceUV?.[`side:${index}`]||uv);
      }
      polygon(top, isSelected ? "#a8b55d" : color, isSelected ? "#d7f45a" : "#a3987c", faceTextures?.top||texture, .04, faceUV?.top||uv);
    }

    function polygon(points, fill, stroke, texture, shade = 0, uv = null) {
      pctx.beginPath();
      points.forEach((point, index) => index ? pctx.lineTo(point.x, point.y) : pctx.moveTo(point.x, point.y));
      pctx.closePath();
      const mapping=normalizedUv(uv),image=materialImages[texture];
      if(mapping.mode==="fit"&&image?.complete&&image.naturalWidth){
        pctx.fillStyle=fill;pctx.fill();pctx.save();pctx.clip();pctx.imageSmoothingEnabled=false;
        const minX=Math.min(...points.map((point)=>point.x)),maxX=Math.max(...points.map((point)=>point.x));
        const minY=Math.min(...points.map((point)=>point.y)),maxY=Math.max(...points.map((point)=>point.y));
        const width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY),centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
        pctx.translate(centerX,centerY);pctx.rotate(mapping.rotation*Math.PI/180);
        pctx.drawImage(image,-width/2,-height/2,width,height);pctx.restore();
      }else{
        pctx.fillStyle = previewPattern(texture, .32, mapping) || fill;
        pctx.fill();
      }
      if (texture && shade) {
        pctx.fillStyle = `rgba(7,10,7,${shade})`;
        pctx.fill();
      }
      pctx.strokeStyle = stroke; pctx.lineWidth = 1; pctx.stroke();
    }
  }

  function boundaryOpenings(axis, boundary, start, end, level = null) {
    return [
      ...state.doors.map((item) => ({ kind: "door", item })),
      ...state.windows.map((item) => ({ kind: "window", item }))
    ].filter(({ item }) => (level==null||Math.abs(Number(item.floorLevel??openingLevel(item))-level)<.13) && item.axis === axis && item.boundary === boundary && item.along < end && item.along + (item.width || 1) > start)
      .map(({ kind, item }) => ({ kind, item, start: Math.max(start, item.along), end: Math.min(end, item.along + (item.width || 1)) }))
      .sort((a, b) => a.start - b.start);
  }

  function openingCuts(axis, boundary, start, end, level = null) {
    return boundaryOpenings(axis, boundary, start, end,level)
      .map((opening) => [opening.start, opening.end])
      .sort((a, b) => a[0] - b[0]);
  }

  function edgeOpenings(a,b,level = null) {
    const items=[...state.doors.map((item)=>({kind:"door",item})),...state.windows.map((item)=>({kind:"window",item}))];
    return items.filter(({item})=>level==null||Math.abs(Number(item.floorLevel??openingLevel(item))-level)<.13).map(({kind,item})=>{
      const segment=openingSegment(item),p1=projectToSegment({x:segment[0][0],y:segment[0][1]},a,b),p2=projectToSegment({x:segment[1][0],y:segment[1][1]},a,b);
      return {kind,item,start:Math.max(0,Math.min(p1.t,p2.t)),end:Math.min(1,Math.max(p1.t,p2.t)),distance:Math.max(p1.distance,p2.distance)};
    }).filter((opening)=>opening.distance<.08&&opening.end-opening.start>.001).sort((left,right)=>left.start-right.start);
  }

  function splitRange(start, end, cuts) {
    const pieces = [];
    let cursor = start;
    cuts.forEach(([cutStart, cutEnd]) => {
      if (cutStart > cursor) pieces.push([cursor, cutStart]);
      cursor = Math.max(cursor, cutEnd);
    });
    if (cursor < end) pieces.push([cursor, end]);
    return pieces;
  }

  function buildWalkWalls(level = null) {
    const walls = [];
    const addPropBox = (prop, x1, y1, x2, y2, heightScale, walkable) => {
      const details = { prop: true, propKind: prop.kind, heightScale, walkable };
      walls.push({ axis: "h", pos: y1, start: x1, end: x2, ...details });
      walls.push({ axis: "h", pos: y2, start: x1, end: x2, ...details });
      walls.push({ axis: "v", pos: x1, start: y1, end: y2, ...details });
      walls.push({ axis: "v", pos: x2, start: y1, end: y2, ...details });
    };
    state.rooms.filter((room)=>!isItemHidden(room)&&(level==null||(roomFloor(room)<=level+.8&&roomFloor(room)+room.height>level+.1))).forEach((room) => {
      if (room.points?.length >= 3) {
        room.points.forEach((point, index) => {
          const next = room.points[(index + 1) % room.points.length];
          if (Math.abs(point[1] - next[1]) < .001) {
            const start = Math.min(point[0], next[0]), end = Math.max(point[0], next[0]);
            splitRange(start, end, openingCuts("h", point[1], start, end,roomFloor(room)))
              .forEach(([pieceStart, pieceEnd]) => walls.push({ axis: "h", pos: point[1], start: pieceStart, end: pieceEnd, texture: room.texture }));
          } else if (Math.abs(point[0] - next[0]) < .001) {
            const start = Math.min(point[1], next[1]), end = Math.max(point[1], next[1]);
            splitRange(start, end, openingCuts("v", point[0], start, end,roomFloor(room)))
              .forEach(([pieceStart, pieceEnd]) => walls.push({ axis: "v", pos: point[0], start: pieceStart, end: pieceEnd, texture: room.texture }));
          } else {
            const openings=edgeOpenings(point,next,roomFloor(room)),lerp=(t)=>[point[0]+(next[0]-point[0])*t,point[1]+(next[1]-point[1])*t];
            splitRange(0,1,openings.map((opening)=>[opening.start,opening.end])).forEach(([start,end])=>{const a=lerp(start),b=lerp(end);walls.push({axis:"d",x1:a[0],y1:a[1],x2:b[0],y2:b[1],texture:room.texture});});
          }
        });
        return;
      }
      const horizontal = [room.y, room.y + room.d];
      const vertical = [room.x, room.x + room.w];
      horizontal.forEach((boundary) => {
        splitRange(room.x, room.x + room.w, openingCuts("h", boundary, room.x, room.x + room.w,roomFloor(room)))
          .forEach(([start, end]) => walls.push({ axis: "h", pos: boundary, start, end, texture: room.texture }));
      });
      vertical.forEach((boundary) => {
        splitRange(room.y, room.y + room.d, openingCuts("v", boundary, room.y, room.y + room.d,roomFloor(room)))
          .forEach(([start, end]) => walls.push({ axis: "v", pos: boundary, start, end, texture: room.texture }));
      });
    });
    if (environmentFor().groundEnabled) {
      const bounds=environmentBounds();
      const details={texture:"SKY",environmentBoundary:true};
      walls.push({axis:"h",pos:bounds.minY,start:bounds.minX,end:bounds.maxX,...details});
      walls.push({axis:"h",pos:bounds.maxY,start:bounds.minX,end:bounds.maxX,...details});
      walls.push({axis:"v",pos:bounds.minX,start:bounds.minY,end:bounds.maxY,...details});
      walls.push({axis:"v",pos:bounds.maxX,start:bounds.minY,end:bounds.maxY,...details});
    }
    state.doors.filter((door) => door.mode === "sliding" && !openWalkDoors.has(door.id)&&(level==null||Math.abs(itemLevel("door",door)-level)<.8)).forEach((door) => {
      const segment=openingSegment(door),details={door:true,heightWorld:door.height||2,texture:door.texture||"CSTRIKE_ME4METL"};
      walls.push(door.axis==="v"?{axis:"v",pos:door.boundary,start:door.along,end:door.along+(door.width||1),...details}:door.axis==="h"?{axis:"h",pos:door.boundary,start:door.along,end:door.along+(door.width||1),...details}:{axis:"d",x1:segment[0][0],y1:segment[0][1],x2:segment[1][0],y2:segment[1][1],...details});
    });
    state.windows.filter((window) => (window.mode !== "breakable" || !brokenWalkWindows.has(window.id))&&(level==null||Math.abs(itemLevel("window",window)-level)<.8)).forEach((window) => {
      const details = {
        window: true, windowMode: window.mode, bottomWorld: window.sill || .75,
        heightWorld: window.height || 1.5, texture: null
      };
      const segment=openingSegment(window);
      walls.push(window.axis==="v"?{axis:"v",pos:window.boundary,start:window.along,end:window.along+(window.width||1),...details}:window.axis==="h"?{axis:"h",pos:window.boundary,start:window.along,end:window.along+(window.width||1),...details}:{axis:"d",x1:segment[0][0],y1:segment[0][1],x2:segment[1][0],y2:segment[1][1],...details});
    });
    state.props.filter((prop)=>!isItemHidden(prop)&&(level==null||((Number(prop.floorLevel??itemLevel("prop",prop))<=level+.8)&&verticalBounds({type:"prop"},prop)?.top>level+.05))).forEach((prop) => {
      if (prop.kind === "ladder") return;
      if (prop.kind === "diagonal") {
        const details = { prop: true, propKind: prop.kind, heightScale: Math.min(1, Math.max(.22, prop.height / 2.4)), walkable: false };
        const corners = diagonalCorners(prop);
        corners.forEach((corner, index) => {
          const next = corners[(index + 1) % corners.length];
          walls.push({ axis: "d", x1: corner[0], y1: corner[1], x2: next[0], y2: next[1], ...details });
        });
        return;
      }
      if (["wallPolygon","cylinder"].includes(prop.kind)) {
        const details = { prop:true, propKind:prop.kind, heightScale:Math.min(1, Math.max(.22, prop.height / 2.4)), walkable:false };
        const corners = prop.points || [];
        corners.forEach((corner,index) => { const next=corners[(index+1)%corners.length]; walls.push({axis:"d",x1:corner[0],y1:corner[1],x2:next[0],y2:next[1],...details}); });
        return;
      }
      if (prop.kind === "platformPolygon") {
        const details = { prop: true, propKind: prop.kind, heightScale: Math.min(1, Math.max(.12, prop.height / 2.4)), walkable: true };
        const corners = prop.points || [];
        corners.forEach((corner, index) => {
          const next = corners[(index + 1) % corners.length];
          walls.push({ axis: "d", x1: corner[0], y1: corner[1], x2: next[0], y2: next[1], ...details });
        });
        return;
      }
      if (prop.kind === "floorPolygon") {
        const details = { prop: true, propKind: prop.kind, heightScale: Math.min(1, Math.max(.08, (prop.thickness || .25) / 2.4)), walkable: true };
        const corners = prop.points || [];
        corners.forEach((corner, index) => {
          const next = corners[(index + 1) % corners.length];
          walls.push({ axis: "d", x1: corner[0], y1: corner[1], x2: next[0], y2: next[1], ...details });
        });
        return;
      }
      if (prop.kind === "floor") {
        addPropBox(prop, prop.x, prop.y, prop.x + prop.w, prop.y + prop.d, Math.min(1, Math.max(.08, (prop.thickness || .25) / 2.4)), true);
        return;
      }
      if (prop.kind === "platform") {
        addPropBox(prop, prop.x, prop.y, prop.x + prop.w, prop.y + prop.d, Math.min(1, Math.max(.12, prop.height / 2.4)), true);
        return;
      }
      if (["crate","wall","arch","breakable","elevator","rotatingDoor","train"].includes(prop.kind)) {
        addPropBox(prop, prop.x, prop.y, prop.x + prop.w, prop.y + prop.d, Math.min(1, Math.max(.22, prop.height / 2.4)), false);
        return;
      }
      if(prop.kind==="water")return;
      const alongX = prop.direction === "e" || prop.direction === "w";
      const segments = ["ramp","wedge","slopeRoof"].includes(prop.kind) ? Math.max(4, Math.round((alongX ? prop.w : prop.d) * 4)) : Math.max(1, Math.round(prop.steps || recommendedStairSteps(prop)));
      for (let index = 0; index < segments; index++) {
        const uphillIndex = prop.direction === "e" || prop.direction === "s" ? index : segments - 1 - index;
        const structureHeight = prop.height * (uphillIndex + 1) / segments;
        const heightScale = Math.min(.95, Math.max(.08, structureHeight / 2.5));
        if (alongX) {
          const x1 = prop.x + prop.w * index / segments;
          const x2 = prop.x + prop.w * (index + 1) / segments;
          addPropBox(prop, x1, prop.y, x2, prop.y + prop.d, heightScale, true);
        } else {
          const y1 = prop.y + prop.d * index / segments;
          const y2 = prop.y + prop.d * (index + 1) / segments;
          addPropBox(prop, prop.x, y1, prop.x + prop.w, y2, heightScale, true);
        }
      }
    });
    return walls;
  }

  function rayWallDistance(x, y, dx, dy, wall) {
    if (wall.axis === "d") {
      const sx = wall.x2 - wall.x1, sy = wall.y2 - wall.y1;
      const denominator = dx * sy - dy * sx;
      if (Math.abs(denominator) < .00001) return Infinity;
      const qx = wall.x1 - x, qy = wall.y1 - y;
      const distance = (qx * sy - qy * sx) / denominator;
      const along = (qx * dy - qy * dx) / denominator;
      return distance > .001 && along >= -.0001 && along <= 1.0001 ? distance : Infinity;
    }
    if (wall.axis === "v") {
      if (Math.abs(dx) < .00001) return Infinity;
      const distance = (wall.pos - x) / dx;
      const hit = y + distance * dy;
      return distance > .001 && hit >= wall.start - .0001 && hit <= wall.end + .0001 ? distance : Infinity;
    }
    if (Math.abs(dy) < .00001) return Infinity;
    const distance = (wall.pos - y) / dy;
    const hit = x + distance * dx;
    return distance > .001 && hit >= wall.start - .0001 && hit <= wall.end + .0001 ? distance : Infinity;
  }

  function isPointInSpace(x, y) {
    return state.rooms.some((room) => pointInRoom(x, y, room)) || pointInEnvironmentGround(x,y);
  }

  function walkSurfaceHeightAt(x, y, reference = player.z) {
    let surface = floorLevelAt(x, y, reference);
    state.props.forEach((prop) => {
      if (!["stairs", "ramp", "platform", "platformPolygon", "floor", "floorPolygon", "ladder"].includes(prop.kind)) return;
      if (["platformPolygon", "floorPolygon"].includes(prop.kind) ? !pointInPolygon(x, y, prop.points || []) : (x < prop.x || x > prop.x + prop.w || y < prop.y || y > prop.y + prop.d)) return;
      const bounds=verticalBounds({type:"prop"},prop);if(bounds&&!(bounds.base<=reference+.8&&bounds.top>=reference-.15))return;
      if (["floor", "floorPolygon"].includes(prop.kind)) {
        surface = Math.max(surface, Number(prop.elevation) || 0);
        return;
      }
      if (["platform", "platformPolygon", "ladder"].includes(prop.kind)) {
        surface = Math.max(surface, (Number(prop.floorLevel) || 0) + (prop.height || 1));
        return;
      }
      let uphill;
      if (prop.direction === "w") uphill = (prop.x + prop.w - x) / prop.w;
      else if (prop.direction === "s") uphill = (y - prop.y) / prop.d;
      else if (prop.direction === "n") uphill = (prop.y + prop.d - y) / prop.d;
      else uphill = (x - prop.x) / prop.w;
      uphill = Math.max(0, Math.min(1, uphill));
      if (prop.kind === "stairs") {
        const segments = Math.max(1, Math.round(prop.steps || recommendedStairSteps(prop)));
        uphill = Math.min(1, (Math.floor(uphill * segments) + 1) / segments);
      }
      surface = Math.max(surface, (Number(prop.floorLevel) || 0) + prop.height * uphill);
    });
    return surface;
  }

  function moveIsBlocked(from, to) {
    if (!isPointInSpace(to.x, to.y)) return true;
    const targetRoom = state.rooms.find((room) => pointInRoom(to.x, to.y, room));
    const crouched = pressedKeys.has("control") || pressedKeys.has("c");
    if ((targetRoom?.height || 4) < 1.15 && !crouched) return true;
    const dx = to.x - from.x, dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance < .0001) return false;
    if (buildWalkWalls(player.z).some((wall) => !wall.walkable && rayWallDistance(from.x, from.y, dx / distance, dy / distance, wall) < distance + .02)) return true;
    const rise = walkSurfaceHeightAt(to.x, to.y) - walkSurfaceHeightAt(from.x, from.y);
    const onLadder = state.props.some((prop) => prop.kind === "ladder" && (
      (from.x >= prop.x && from.x <= prop.x + prop.w && from.y >= prop.y && from.y <= prop.y + prop.d)
      || (to.x >= prop.x && to.x <= prop.x + prop.w && to.y >= prop.y && to.y <= prop.y + prop.d)
    ));
    return rise > .75 && !onLadder;
  }

  function walkEyeHeight() {
    return pressedKeys.has("control") || pressedKeys.has("c") ? .65 : 1.25;
  }

  function toggleNearestWalkDoor() {
    const nearestDoor = state.doors.filter((door) => door.mode === "sliding").map((door) => {
      const segment=openingSegment(door),center={x:(segment[0][0]+segment[1][0])/2,y:(segment[0][1]+segment[1][1])/2};
      return { door, distance: Math.hypot(player.x - center.x, player.y - center.y) };
    }).sort((a, b) => a.distance - b.distance)[0];
    const nearestWindow = state.windows.map((window) => {
      const segment=openingSegment(window),center={x:(segment[0][0]+segment[1][0])/2,y:(segment[0][1]+segment[1][1])/2};
      return { window, distance: Math.hypot(player.x - center.x, player.y - center.y) };
    }).sort((a, b) => a.distance - b.distance)[0];
    if (nearestDoor && nearestDoor.distance <= 1.6 && (!nearestWindow || nearestDoor.distance <= nearestWindow.distance)) {
      if (openWalkDoors.has(nearestDoor.door.id)) {
        openWalkDoors.delete(nearestDoor.door.id);
        showToast("Door closed");
      } else {
        openWalkDoors.add(nearestDoor.door.id);
        showToast("Door opened");
      }
    } else if (nearestWindow && nearestWindow.distance <= 1.6) {
      if (nearestWindow.window.mode !== "breakable") {
        showToast(nearestWindow.window.mode === "open" ? "This is an open window frame" : "This glass is unbreakable");
      } else if (brokenWalkWindows.has(nearestWindow.window.id)) {
        showToast("The glass is already broken");
      } else {
        brokenWalkWindows.add(nearestWindow.window.id);
        showToast("Glass broken");
      }
    } else {
      showToast("Move closer to a door or breakable window");
      return;
    }
    drawPreview();
  }

  function resetPlayerToSafeStart() {
    const spawn = state.entities.find((entity) => entity.kind === "ct") || state.entities.find((entity) => entity.kind === "t");
    const overlapsStructure = (x, y, margin = .28) => state.props.some((prop) =>
      x >= prop.x - margin && x <= prop.x + prop.w + margin && y >= prop.y - margin && y <= prop.y + prop.d + margin
    );
    let start = null;
    let hostRoom = null;
    if (spawn && !overlapsStructure(spawn.x + .5, spawn.y + .5)) {
      start = { x: spawn.x + .5, y: spawn.y + .5 };
      hostRoom = state.rooms.find((room) => pointInRoom(spawn.x, spawn.y, room)) || null;
    }
    if (!start && state.rooms.length) {
      const roomsWithStructures = state.rooms.filter((room) => state.props.some((prop) =>
        pointInRoom(prop.x + prop.w / 2, prop.y + prop.d / 2, room)
      ));
      const roomsToSearch = roomsWithStructures.length ? roomsWithStructures : state.rooms;
      let bestScore = -Infinity;
      roomsToSearch.forEach((room) => {
        for (let y = room.y; y < room.y + room.d; y++) {
          for (let x = room.x; x < room.x + room.w; x++) {
            const candidate = { x: x + .5, y: y + .5 };
            if (!pointInRoom(candidate.x, candidate.y, room)) continue;
            if (overlapsStructure(candidate.x, candidate.y)) continue;
            const clearance = state.props.length
              ? Math.min(...state.props.map((prop) => Math.hypot(candidate.x - (prop.x + prop.w / 2), candidate.y - (prop.y + prop.d / 2))))
              : 1;
            if (clearance > bestScore) {
              bestScore = clearance;
              start = candidate;
              hostRoom = room;
            }
          }
        }
      });
    }
    if (!start && state.rooms.length) {
      hostRoom = state.rooms[0];
      start = { x: hostRoom.x + .5, y: hostRoom.y + .5 };
    }
    if (!start && environmentFor().groundEnabled) {
      const bounds = environmentBounds();
      for (let radius=0; radius<Math.max(bounds.maxX-bounds.minX,bounds.maxY-bounds.minY) && !start; radius+=1) {
        for (const [dx,dy] of [[radius,0],[-radius,0],[0,radius],[0,-radius],[radius,radius],[-radius,-radius]]) {
          const candidate={x:Math.floor((bounds.minX+bounds.maxX)/2+dx)+.5,y:Math.floor((bounds.minY+bounds.maxY)/2+dy)+.5};
          if (pointInEnvironmentGround(candidate.x,candidate.y) && !overlapsStructure(candidate.x,candidate.y)) { start=candidate; break; }
        }
      }
    }
    if (start) {
      const visibleStructures = state.props.filter((prop) => !hostRoom || pointInRoom(prop.x + prop.w / 2, prop.y + prop.d / 2, hostRoom));
      const target = visibleStructures.sort((a, b) =>
        Math.hypot(start.x - (a.x + a.w / 2), start.y - (a.y + a.d / 2))
        - Math.hypot(start.x - (b.x + b.w / 2), start.y - (b.y + b.d / 2))
      )[0];
      const angle = spawn
        ? (Number(spawn.angle) || 0) * Math.PI / 180
        : target ? Math.atan2(target.y + target.d / 2 - start.y, target.x + target.w / 2 - start.x) : 0;
      player = { ...start, z: walkSurfaceHeightAt(start.x, start.y), angle };
    }
  }

  function buildWalkPropPolygons() {
    const polygons = [];
    const paletteFor = (kind) => ["floor", "floorPolygon"].includes(kind)
      ? { top: "#72c8c0", front: "#467f79", side: "#315c58", edge: "rgba(190,255,248,.5)" }
      : kind === "stairs"
      ? { top: "#d7f45a", front: "#a8c83d", side: "#79962b", edge: "rgba(235,255,154,.48)" }
      : kind === "ramp"
        ? { top: "#f4b570", front: "#d88943", side: "#a96330", edge: "rgba(255,225,187,.48)" }
        : kind === "ladder"
          ? { top: "#9ce5d8", front: "#6fac9f", side: "#4c7e74", edge: "rgba(202,255,245,.65)" }
        : { top: "#b28a5f", front: "#8a6847", side: "#674c35", edge: "rgba(231,205,172,.35)" };
    const addFace = (prop, vertices, shade) => {
      const palette = paletteFor(prop.kind);
      polygons.push({
        vertices,
        fill: palette[shade],
        edge: palette.edge,
        texture: prop.texture,
        uv: prop.textureUV,
        textureShade: shade === "top" ? .04 : shade === "front" ? .24 : .38
      });
    };
    const addBox = (prop, x1, y1, x2, y2, height) => {
      const base = Number(prop.floorLevel) || 0, z = base + height;
      addFace(prop, [[x1,y1,z],[x2,y1,z],[x2,y2,z],[x1,y2,z]], "top");
      addFace(prop, [[x1,y1,base],[x2,y1,base],[x2,y1,z],[x1,y1,z]], "front");
      addFace(prop, [[x2,y2,base],[x1,y2,base],[x1,y2,z],[x2,y2,z]], "front");
      addFace(prop, [[x1,y2,base],[x1,y1,base],[x1,y1,z],[x1,y2,z]], "side");
      addFace(prop, [[x2,y1,base],[x2,y2,base],[x2,y2,z],[x2,y1,z]], "side");
    };

    state.props.filter((prop)=>!isItemHidden(prop)).forEach((prop) => {
      if (["floor", "floorPolygon"].includes(prop.kind)) {
        const top = Number(prop.elevation) || 0;
        const base = top - Math.max(.125, Number(prop.thickness) || .25);
        const corners = prop.kind === "floorPolygon" ? (prop.points || []) : [[prop.x,prop.y],[prop.x+prop.w,prop.y],[prop.x+prop.w,prop.y+prop.d],[prop.x,prop.y+prop.d]];
        addFace(prop, corners.map(([x, y]) => [x, y, top]), "top");
        corners.forEach((corner, index) => {
          const next = corners[(index + 1) % corners.length];
          addFace(prop, [[corner[0],corner[1],base],[next[0],next[1],base],[next[0],next[1],top],[corner[0],corner[1],top]], index % 2 ? "side" : "front");
        });
        return;
      }
      if (prop.kind === "ladder") {
        const base = Number(prop.floorLevel) || 0, z = base + (prop.height || 3);
        if (prop.direction === "n") addFace(prop, [[prop.x,prop.y,base],[prop.x+prop.w,prop.y,base],[prop.x+prop.w,prop.y,z],[prop.x,prop.y,z]], "front");
        else if (prop.direction === "s") addFace(prop, [[prop.x+prop.w,prop.y+prop.d,base],[prop.x,prop.y+prop.d,base],[prop.x,prop.y+prop.d,z],[prop.x+prop.w,prop.y+prop.d,z]], "front");
        else if (prop.direction === "w") addFace(prop, [[prop.x,prop.y+prop.d,base],[prop.x,prop.y,base],[prop.x,prop.y,z],[prop.x,prop.y+prop.d,z]], "front");
        else addFace(prop, [[prop.x+prop.w,prop.y,base],[prop.x+prop.w,prop.y+prop.d,base],[prop.x+prop.w,prop.y+prop.d,z],[prop.x+prop.w,prop.y,z]], "front");
        return;
      }
      if (prop.kind === "diagonal") {
        const corners = diagonalCorners(prop);
        const base = Number(prop.floorLevel) || 0, z = base + (prop.height || 2);
        addFace(prop, corners.map(([x, y]) => [x, y, z]), "top");
        corners.forEach((corner, index) => {
          const next = corners[(index + 1) % corners.length];
          addFace(prop, [[corner[0],corner[1],base],[next[0],next[1],base],[next[0],next[1],z],[corner[0],corner[1],z]], index % 2 ? "side" : "front");
        });
        return;
      }
      if (["wallPolygon","cylinder"].includes(prop.kind)) {
        const corners=prop.points || [], base=Number(prop.floorLevel)||0, z=base+(prop.height||3);
        addFace(prop,corners.map(([x,y])=>[x,y,z]),"top");
        corners.forEach((corner,index)=>{const next=corners[(index+1)%corners.length];addFace(prop,[[corner[0],corner[1],base],[next[0],next[1],base],[next[0],next[1],z],[corner[0],corner[1],z]],index%2?"side":"front");});
        return;
      }
      if (prop.kind === "platformPolygon") {
        const corners = prop.points || [];
        const base = Number(prop.floorLevel) || 0, z = base + (prop.height || 1);
        addFace(prop, corners.map(([x, y]) => [x, y, z]), "top");
        corners.forEach((corner, index) => {
          const next = corners[(index + 1) % corners.length];
          addFace(prop, [[corner[0],corner[1],base],[next[0],next[1],base],[next[0],next[1],z],[corner[0],corner[1],z]], index % 2 ? "side" : "front");
        });
        return;
      }
      if (["crate","wall","platform","arch"].includes(prop.kind)) {
        addBox(prop, prop.x, prop.y, prop.x + prop.w, prop.y + prop.d, prop.height);
        return;
      }
      if (["ramp","wedge","slopeRoof"].includes(prop.kind)) {
        const base = Number(prop.floorLevel) || 0;
        const corners = [
          [prop.x, prop.y], [prop.x + prop.w, prop.y],
          [prop.x + prop.w, prop.y + prop.d], [prop.x, prop.y + prop.d]
        ];
        const heights = {
          e: [0, prop.height, prop.height, 0], w: [prop.height, 0, 0, prop.height],
          s: [0, 0, prop.height, prop.height], n: [prop.height, prop.height, 0, 0]
        }[prop.direction] || [0, prop.height, prop.height, 0];
        addFace(prop, corners.map(([x, y], index) => [x, y, base + heights[index]]), "top");
        for (let index = 0; index < 4; index++) {
          const next = (index + 1) % 4;
          addFace(prop, [
            [corners[index][0], corners[index][1], base],
            [corners[next][0], corners[next][1], base],
            [corners[next][0], corners[next][1], base + heights[next]],
            [corners[index][0], corners[index][1], base + heights[index]]
          ], index % 2 ? "side" : "front");
        }
        return;
      }

      const alongX = prop.direction === "e" || prop.direction === "w";
      const segments = Math.max(1, Math.round(prop.steps || recommendedStairSteps(prop)));
      for (let index = 0; index < segments; index++) {
        const uphillIndex = prop.direction === "e" || prop.direction === "s" ? index : segments - 1 - index;
        const z = prop.height * (uphillIndex + 1) / segments;
        if (alongX) {
          const x1 = prop.x + prop.w * index / segments;
          const x2 = prop.x + prop.w * (index + 1) / segments;
          addBox(prop, x1, prop.y, x2, prop.y + prop.d, z);
        } else {
          const y1 = prop.y + prop.d * index / segments;
          const y2 = prop.y + prop.d * (index + 1) / segments;
          addBox(prop, prop.x, y1, prop.x + prop.w, y2, z);
        }
      }
    });
    state.zones.forEach((zone) => {
      const z = floorLevelAt(zone.x + zone.w / 2, zone.y + zone.d / 2) + .012;
      polygons.push({
      vertices: [[zone.x,zone.y,z],[zone.x+zone.w,zone.y,z],[zone.x+zone.w,zone.y+zone.d,z],[zone.x,zone.y+zone.d,z]],
      fill: zone.kind === "buyCt" ? "#477daf" : "#a96b37", edge: zone.kind === "buyCt" ? "#7fc1ff" : "#ffc17e", alpha: .42
    }); });
    return polygons;
  }

  function drawWalkProps3D(rect, fov) {
    const near = .08;
    const focalX = rect.width / (2 * Math.tan(fov / 2));
    const hostRoom = state.rooms.find((room) => pointInRoom(player.x, player.y, room));
    const wallWorldHeight = Math.max(2.5, hostRoom?.height || 4);
    const focalY = rect.height * .82 / wallWorldHeight;
    const eyeZ = (player.z || 0) + walkEyeHeight();
    const cos = Math.cos(player.angle), sin = Math.sin(player.angle);
    const toCamera = ([x, y, z]) => {
      const dx = x - player.x, dy = y - player.y;
      return { side: -dx * sin + dy * cos, forward: dx * cos + dy * sin, z };
    };
    const clipNear = (vertices) => {
      const clipped = [];
      for (let index = 0; index < vertices.length; index++) {
        const current = vertices[index], next = vertices[(index + 1) % vertices.length];
        const currentInside = current.forward >= near, nextInside = next.forward >= near;
        if (currentInside) clipped.push(current);
        if (currentInside !== nextInside) {
          const amount = (near - current.forward) / (next.forward - current.forward);
          clipped.push({
            side: current.side + (next.side - current.side) * amount,
            forward: near,
            z: current.z + (next.z - current.z) * amount
          });
        }
      }
      return clipped;
    };
    const projected = buildWalkPropPolygons().map((polygon) => {
      const cameraVertices = clipNear(polygon.vertices.map(toCamera));
      if (cameraVertices.length < 3) return null;
      return {
        ...polygon,
        depth: cameraVertices.reduce((sum, vertex) => sum + vertex.forward, 0) / cameraVertices.length,
        points: cameraVertices.map((vertex) => ({
          x: rect.width / 2 + vertex.side / vertex.forward * focalX,
          y: rect.height / 2 + (eyeZ - vertex.z) / vertex.forward * focalY
        }))
      };
    }).filter(Boolean).sort((a, b) => b.depth - a.depth);

    projected.forEach((polygon) => {
      pctx.save();
      pctx.globalAlpha = polygon.alpha || 1;
      pctx.beginPath();
      polygon.points.forEach((point, index) => index ? pctx.lineTo(point.x, point.y) : pctx.moveTo(point.x, point.y));
      pctx.closePath();
      pctx.fillStyle = previewPattern(polygon.texture, .3, polygon.uv) || polygon.fill;
      pctx.fill();
      if (polygon.texture && polygon.textureShade) {
        pctx.fillStyle = `rgba(7,10,7,${polygon.textureShade})`;
        pctx.fill();
      }
      pctx.strokeStyle = polygon.edge;
      pctx.lineWidth = .7;
      pctx.stroke();
      pctx.restore();
    });
  }

  function drawWalkLights(rect, fov, hostRoom) {
    const focalX = rect.width / (2 * Math.tan(fov / 2));
    const wallWorldHeight = Math.max(2.5, hostRoom?.height || 4);
    const focalY = rect.height * .82 / wallWorldHeight;
    const eyeZ = (player.z || 0) + walkEyeHeight();
    const cos = Math.cos(player.angle), sin = Math.sin(player.angle);
    state.entities.filter((entity) => ["light","spotlight"].includes(entity.kind) && (!hostRoom || pointInRoom(entity.x + .5, entity.y + .5, hostRoom))).forEach((light) => {
      const dx = light.x + .5 - player.x, dy = light.y + .5 - player.y;
      const forward = dx * cos + dy * sin;
      if (forward <= .08) return;
      const side = -dx * sin + dy * cos;
      const x = rect.width / 2 + side / forward * focalX;
      const y = rect.height / 2 + (eyeZ - (light.z || 2.5)) / forward * focalY;
      if (x < -40 || x > rect.width + 40 || y < -40 || y > rect.height + 40) return;
      const radius = Math.max(8, Math.min(34, (light.brightness || 300) / (forward * 11)));
      const color = light.color || "#fff0d0";
      const glow = pctx.createRadialGradient(x, y, 1, x, y, radius);
      glow.addColorStop(0, `${color}dd`); glow.addColorStop(.22, `${color}66`); glow.addColorStop(1, "rgba(255,240,208,0)");
      pctx.fillStyle = glow; pctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      pctx.beginPath(); pctx.arc(x, y, 2.2, 0, Math.PI * 2); pctx.fillStyle = color; pctx.fill();
    });
  }

  function drawWalkTargets(rect,fov) {
    const focalX=rect.width/(2*Math.tan(fov/2)),focalY=rect.height*.82/4,eyeZ=(player.z||0)+walkEyeHeight(),cos=Math.cos(player.angle),sin=Math.sin(player.angle);
    state.entities.filter((entity)=>entity.kind==="targetDummy").forEach((target)=>{const position={x:target.x+.5,y:target.y+.5},dx=position.x-player.x,dy=position.y-player.y,forward=dx*cos+dy*sin;if(forward<=.08||!clearSight(player,position))return;const side=-dx*sin+dy*cos,x=rect.width/2+side/forward*focalX,base=Number(target.floorLevel??floorLevelAt(position.x,position.y)),topY=rect.height/2+(eyeZ-(base+1.75))/forward*focalY,bottomY=rect.height/2+(eyeZ-base)/forward*focalY,width=Math.max(5,Math.min(34,(bottomY-topY)*.34));pctx.save();pctx.fillStyle="rgba(235,78,68,.72)";pctx.strokeStyle="#ffd7d3";pctx.lineWidth=1.5;pctx.fillRect(x-width/2,topY,width,bottomY-topY);pctx.strokeRect(x-width/2,topY,width,bottomY-topY);pctx.beginPath();pctx.arc(x,topY-width*.35,width*.32,0,Math.PI*2);pctx.fill();pctx.stroke();pctx.restore();});
  }

  function drawWalkPreview(rect) {
    const width = rect.width, height = rect.height;
    if (!state.rooms.length && !environmentFor().groundEnabled) {
      pctx.fillStyle = "#111710"; pctx.fillRect(0, 0, width, height);
      pctx.fillStyle = "#899584"; pctx.textAlign = "center"; pctx.font = "10px system-ui";
      pctx.fillText("Enable map-wide ground or draw a room before Walkthrough", width / 2, height / 2);
      pctx.textAlign = "left"; return;
    }

    if (!isPointInSpace(player.x, player.y)) resetPlayerToSafeStart();
    const hostRoom = state.rooms.find((room) => pointInRoom(player.x, player.y, room)) || null;
    if (!hostRoom || hostRoom.ceilingMode === "sky") {
      paintSkyBackground(pctx, width, height / 2, 1);
    } else {
      const ceilingTexture = hostRoom.ceilingTexture || "C1A0_LABW3";
      const ceilingPattern = previewPattern(ceilingTexture, .3);
      if (ceilingPattern) {
        pctx.fillStyle = ceilingPattern;
        pctx.fillRect(0, 0, width, height / 2);
        const shade = pctx.createLinearGradient(0, 0, 0, height / 2);
        shade.addColorStop(0, "rgba(5,8,5,.64)"); shade.addColorStop(1, "rgba(5,8,5,.18)");
        pctx.fillStyle = shade; pctx.fillRect(0, 0, width, height / 2);
      } else {
        const ceiling = pctx.createLinearGradient(0, 0, 0, height / 2);
        ceiling.addColorStop(0, "#111710"); ceiling.addColorStop(1, "#293126");
        pctx.fillStyle = ceiling; pctx.fillRect(0, 0, width, height / 2);
      }
    }
    const floorTexture = hostRoom?.floorTexture || environmentFor().groundMaterial;
    const floorPattern = previewPattern(floorTexture, .3);
    if (floorPattern) {
      pctx.fillStyle = floorPattern;
      pctx.fillRect(0, height / 2, width, height / 2);
      const floorShade = pctx.createLinearGradient(0, height / 2, 0, height);
      floorShade.addColorStop(0, "rgba(6,9,6,.12)"); floorShade.addColorStop(1, "rgba(6,9,6,.7)");
      pctx.fillStyle = floorShade; pctx.fillRect(0, height / 2, width, height / 2);
    } else {
      const floor = pctx.createLinearGradient(0, height / 2, 0, height);
      floor.addColorStop(0, "#323a2e"); floor.addColorStop(1, "#10140f");
      pctx.fillStyle = floor; pctx.fillRect(0, height / 2, width, height / 2);
    }

    const walls = buildWalkWalls(player.z);
    const fov = Math.PI / 3;
    const wallWorldHeight = Math.max(2.5, hostRoom?.height || 4);
    const focalY = height * .82 / wallWorldHeight;
    const eyeZ = (player.z || 0) + walkEyeHeight();
    for (let column = 0; column < width; column += 2) {
      const rayAngle = player.angle + (column / width - .5) * fov;
      const dx = Math.cos(rayAngle), dy = Math.sin(rayAngle);
      let nearest = Infinity, hitWall = null, nearestWindow = Infinity, windowWall = null;
      walls.forEach((wall) => {
        if (wall.prop) return;
        const distance = rayWallDistance(player.x, player.y, dx, dy, wall);
        if (wall.window) {
          if (distance < nearestWindow) { nearestWindow = distance; windowWall = wall; }
          return;
        }
        if (distance < nearest) { nearest = distance; hitWall = wall; }
      });
      if (hitWall && Number.isFinite(nearest)) {
        const corrected = Math.max(.12, nearest * Math.cos(rayAngle - player.angle));
        const fullWallHeight = Math.min(height * 1.65, wallWorldHeight * focalY / corrected);
        const raisedObject = hitWall.prop || hitWall.door;
        const wallHeight = hitWall.door ? fullWallHeight * Math.min(1, (hitWall.heightWorld || 2) / wallWorldHeight)
          : hitWall.prop ? fullWallHeight * (hitWall.heightScale || .4) : fullWallHeight;
        const top = raisedObject
          ? height / 2 + eyeZ * focalY / corrected - wallHeight
          : height / 2 + (eyeZ - wallWorldHeight) * focalY / corrected;
        const light = Math.max(20, Math.min(58, 63 - corrected * 6)) + (hitWall.axis === "v" ? 4 : 0);
        const wallPattern = previewPattern(hitWall.texture, .28);
        pctx.fillStyle = wallPattern || (hitWall.propKind === "stairs" ? `hsl(70 62% ${Math.max(35, light)}%)`
        : hitWall.propKind === "ramp" ? `hsl(29 70% ${Math.max(34, light)}%)`
        : hitWall.prop ? `hsl(34 25% ${Math.max(22, light - 7)}%)`
        : `hsl(91 13% ${light}%)`);
        pctx.fillRect(column, top, 2.5, wallHeight);
        if (wallPattern) {
          pctx.fillStyle = `rgba(6,9,6,${Math.max(.08, Math.min(.48, (61 - light) / 72))})`;
          pctx.fillRect(column, top, 2.5, wallHeight);
        }
        if ((column >> 1) % 16 === 0) {
          pctx.fillStyle = "rgba(15,20,14,.1)"; pctx.fillRect(column, top, 1, wallHeight);
        }
      }
      if (windowWall && Number.isFinite(nearestWindow) && nearestWindow < nearest) {
        const corrected = Math.max(.12, nearestWindow * Math.cos(rayAngle - player.angle));
        const fullWallHeight = Math.min(height * 1.65, wallWorldHeight * focalY / corrected);
        const windowHeight = fullWallHeight * Math.min(1, (windowWall.heightWorld || 1.5) / wallWorldHeight);
        const top = height / 2 + (eyeZ - ((windowWall.bottomWorld || .75) + (windowWall.heightWorld || 1.5))) * focalY / corrected;
        pctx.fillStyle = windowWall.windowMode === "open" ? "rgba(89,204,220,.1)" : "rgba(127,224,237,.3)";
        pctx.fillRect(column, top, 2.5, windowHeight);
        if (windowWall.windowMode !== "open" && (column >> 1) % 6 === 0) {
          pctx.fillStyle = "rgba(225,253,255,.38)"; pctx.fillRect(column, top, 1, windowHeight);
        }
      }
    }

    drawWalkProps3D(rect, fov);
    drawWalkLights(rect, fov, hostRoom);
    drawWalkTargets(rect,fov);

    pctx.strokeStyle = "rgba(215,244,90,.72)"; pctx.lineWidth = 1;
    pctx.beginPath(); pctx.moveTo(width / 2 - 5, height / 2); pctx.lineTo(width / 2 + 5, height / 2); pctx.moveTo(width / 2, height / 2 - 5); pctx.lineTo(width / 2, height / 2 + 5); pctx.stroke();

    const mapSize = 62, padding = 9;
    const xs = state.rooms.flatMap((room) => [room.x, room.x + room.w]);
    const ys = state.rooms.flatMap((room) => [room.y, room.y + room.d]);
    const minX = Math.min(...xs), minY = Math.min(...ys), span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 1);
    const mapScale = mapSize / span;
    pctx.fillStyle = "rgba(8,11,8,.72)"; pctx.fillRect(padding, padding, mapSize, mapSize);
    state.rooms.forEach((room) => {
      pctx.fillStyle = room.kind === "corridor" ? "#38575a" : "#3d4938";
      pctx.beginPath();
      roomPlanPoints(room).forEach(([x, y], index) => index
        ? pctx.lineTo(padding + (x-minX)*mapScale, padding + (y-minY)*mapScale)
        : pctx.moveTo(padding + (x-minX)*mapScale, padding + (y-minY)*mapScale));
      pctx.closePath(); pctx.fill();
    });
    state.props.forEach((prop) => {
      pctx.fillStyle = prop.kind === "crate" ? "#8a6844" : prop.kind === "wall" ? "#697064" : "#b18d55";
      if (prop.kind === "diagonal" || ["platformPolygon", "floorPolygon", "wallPolygon"].includes(prop.kind)) {
        pctx.beginPath();
        (prop.kind === "diagonal" ? diagonalCorners(prop) : prop.points || []).forEach(([x, y], index) => index
          ? pctx.lineTo(padding + (x-minX)*mapScale, padding + (y-minY)*mapScale)
          : pctx.moveTo(padding + (x-minX)*mapScale, padding + (y-minY)*mapScale));
        pctx.closePath(); pctx.fill();
      } else {
        pctx.fillRect(padding + (prop.x-minX)*mapScale, padding + (prop.y-minY)*mapScale, prop.w*mapScale, prop.d*mapScale);
      }
    });
    pctx.fillStyle = "#d7f45a"; pctx.beginPath(); pctx.arc(padding + (player.x-minX)*mapScale, padding + (player.y-minY)*mapScale, 2.5, 0, Math.PI*2); pctx.fill();
    pctx.strokeStyle = "#d7f45a"; pctx.beginPath(); pctx.moveTo(padding + (player.x-minX)*mapScale, padding + (player.y-minY)*mapScale); pctx.lineTo(padding + (player.x-minX)*mapScale + Math.cos(player.angle)*8, padding + (player.y-minY)*mapScale + Math.sin(player.angle)*8); pctx.stroke();
  }

  function projectToSegment(point,a,b) {
    const dx=b[0]-a[0],dy=b[1]-a[1],length2=Math.max(.0001,dx*dx+dy*dy);
    const t=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/length2));
    const projected=[a[0]+dx*t,a[1]+dy*t];
    return {t,point:projected,distance:Math.hypot(point.x-projected[0],point.y-projected[1]),length:Math.sqrt(length2)};
  }

  function openingSegment(opening) {
    if (opening.segment?.length===2) return opening.segment.map((point)=>[Number(point[0]),Number(point[1])]);
    return opening.axis === "h"
      ? [[opening.along,opening.boundary],[opening.along+(opening.width||1),opening.boundary]]
      : [[opening.boundary,opening.along],[opening.boundary,opening.along+(opening.width||1)]];
  }

  function syncOpeningLegacy(opening) {
    const [a,b]=openingSegment(opening),dx=b[0]-a[0],dy=b[1]-a[1];
    opening.width=Math.max(.25,Math.hypot(dx,dy));
    if(Math.abs(dy)<.001){opening.axis="h";opening.boundary=(a[1]+b[1])/2;opening.along=Math.min(a[0],b[0]);}
    else if(Math.abs(dx)<.001){opening.axis="v";opening.boundary=(a[0]+b[0])/2;opening.along=Math.min(a[1],b[1]);}
    else opening.axis="d";
    return opening;
  }

  function openingCorners(opening,thickness=.14) {
    const [a,b]=openingSegment(opening),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(.001,Math.hypot(dx,dy)),nx=-dy/length*thickness/2,ny=dx/length*thickness/2;
    return [[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]];
  }

  function resizeOpening(opening,width) {
    const edge=opening.edge?.length===2?opening.edge:openingSegment(opening),a=edge[0],b=edge[1],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(.001,Math.hypot(dx,dy));
    const old=openingSegment(opening),center=[(old[0][0]+old[1][0])/2,(old[0][1]+old[1][1])/2],projection=projectToSegment({x:center[0],y:center[1]},a,b);
    const half=Math.min(length/2,Math.max(.25,Number(width)||1)/2),ux=dx/length,uy=dy/length,centerT=Math.max(half/length,Math.min(1-half/length,projection.t)),centerPoint=[a[0]+dx*centerT,a[1]+dy*centerT];
    opening.segment=[[centerPoint[0]-ux*half,centerPoint[1]-uy*half],[centerPoint[0]+ux*half,centerPoint[1]+uy*half]];
    return syncOpeningLegacy(opening);
  }

  function getDoorCandidate(world,width=1) {
    const candidates=[];
    state.rooms.filter((room)=>planLevel==null||Math.abs(roomFloor(room)-planLevel)<.13).forEach((room)=>roomPlanPoints(room).forEach((a,index)=>{
      const b=roomPlanPoints(room)[(index+1)%roomPlanPoints(room).length],projection=projectToSegment(world,a,b);
      if(projection.t>.001&&projection.t<.999)candidates.push({roomId:room.id,edgeIndex:index,edge:[a,b],...projection});
    }));
    candidates.sort((a,b)=>a.distance-b.distance);
    const best=candidates[0]; if(!best||best.distance>.42)return null;
    const edgeRoom=state.rooms.find((room)=>room.id===best.roomId);
    const opening={edge:best.edge.map((point)=>[...point]),edgeRoomId:best.roomId,edgeIndex:best.edgeIndex,floorLevel:roomFloor(edgeRoom),segment:[[...best.point],[...best.point]]};
    return resizeOpening(opening,width);
  }

  function openingsOverlap(a,b) {
    const [a1,a2]=openingSegment(a),[b1,b2]=openingSegment(b),ap=projectToSegment({x:b1[0],y:b1[1]},a1,a2),bp=projectToSegment({x:b2[0],y:b2[1]},a1,a2);
    return Math.min(ap.distance,bp.distance)<.08&&Math.max(Math.min(ap.t,bp.t),0)<Math.min(Math.max(ap.t,bp.t),1);
  }

  function placeDoor(world, width = 1) {
    const door = getDoorCandidate(world,width);
    if (!door) { showToast("Click closer to the edge of a room or corridor"); return; }
    if (!doorIsConnected(door)) { showToast("A door needs a room or corridor on both sides"); return; }
    const existing = [...state.doors, ...state.windows].find((item) => openingsOverlap(item,door));
    if (existing) {
      selected = { type: state.windows.includes(existing) ? "window" : "door", id: existing.id };
      refresh(); showToast("That wall section already has an opening"); return;
    }
    const before = snapshot();
    door.id = crypto.randomUUID();
    door.mode = "opening";
    door.height = 2;
    door.texture = "CSTRIKE_ME4METL";
    door.speed = 100;
    state.doors.push(door);
    selected = { type: "door", id: door.id };
    commit(before);
    showToast(width > 1 ? "Wide doorway prefab created" : "Door opening created");
  }

  function sharedRectRoomBoundary(a,b) {
    if (a.points?.length || b.points?.length || Math.abs(roomFloor(a)-roomFloor(b))>.13) return null;
    const overlap=(a1,a2,b1,b2)=>[Math.max(a1,b1),Math.min(a2,b2)];
    let span;
    if (Math.abs(a.x+a.w-b.x)<.01 || Math.abs(b.x+b.w-a.x)<.01) {
      const boundary=Math.abs(a.x+a.w-b.x)<.01?b.x:a.x;
      span=overlap(a.y,a.y+a.d,b.y,b.y+b.d);
      if(span[1]-span[0]>=.75)return{axis:"v",boundary,start:span[0],end:span[1],edge:[[boundary,span[0]],[boundary,span[1]]]};
    }
    if (Math.abs(a.y+a.d-b.y)<.01 || Math.abs(b.y+b.d-a.y)<.01) {
      const boundary=Math.abs(a.y+a.d-b.y)<.01?b.y:a.y;
      span=overlap(a.x,a.x+a.w,b.x,b.x+b.w);
      if(span[1]-span[0]>=.75)return{axis:"h",boundary,start:span[0],end:span[1],edge:[[span[0],boundary],[span[1],boundary]]};
    }
    return null;
  }

  function smartOpeningForBoundary(room,boundary) {
    const length=boundary.end-boundary.start,width=Math.max(.5,Math.min(1,length*.72)),center=(boundary.start+boundary.end)/2,half=width/2;
    const segment=boundary.axis==="v"
      ? [[boundary.boundary,center-half],[boundary.boundary,center+half]]
      : [[center-half,boundary.boundary],[center+half,boundary.boundary]];
    return syncOpeningLegacy({
      id:crypto.randomUUID(),mode:"opening",height:2,texture:"CSTRIKE_ME4METL",speed:100,
      edge:boundary.edge.map((point)=>[...point]),edgeRoomId:room.id,edgeIndex:-1,
      floorLevel:roomFloor(room),segment,
    });
  }

  function openingOccupiesBoundary(opening,boundary) {
    const segment=openingSegment(opening),epsilon=.02;
    if(boundary.axis==="v")return segment.every(([x])=>Math.abs(x-boundary.boundary)<epsilon)
      &&Math.max(segment[0][1],segment[1][1])>boundary.start+epsilon&&Math.min(segment[0][1],segment[1][1])<boundary.end-epsilon;
    return segment.every(([,y])=>Math.abs(y-boundary.boundary)<epsilon)
      &&Math.max(segment[0][0],segment[1][0])>boundary.start+epsilon&&Math.min(segment[0][0],segment[1][0])<boundary.end-epsilon;
  }

  function smartConnectRoom(room) {
    if (!smartConnectionsEnabled || room.points?.length) return [];
    const created=[];
    state.rooms.filter((candidate)=>candidate.id!==room.id).forEach((candidate)=>{
      const boundary=sharedRectRoomBoundary(room,candidate);
      if(!boundary)return;
      if([...state.doors,...state.windows].some((item)=>openingOccupiesBoundary(item,boundary)))return;
      const opening=smartOpeningForBoundary(room,boundary);
      if(!doorIsConnected(opening))return;
      state.doors.push(opening);created.push(opening);
    });
    return created;
  }

  function adjacentRoomsForOpening(opening) {
    const [a,b]=openingSegment(opening),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(.001,Math.hypot(dx,dy)),nx=-dy/length*.2,ny=dx/length*.2;
    const level=opening.floorLevel;
    return state.rooms.filter((room)=>(level==null||Math.abs(roomFloor(room)-Number(level))<.13)&&(pointInRoom(mid[0]+nx,mid[1]+ny,room)||pointInRoom(mid[0]-nx,mid[1]-ny,room)));
  }

  function clampWindowDimensions(window) {
    const rooms = adjacentRoomsForOpening(window);
    const maxTop = Math.max(.75, Math.min(...rooms.map((room) => room.height), 4) - .25);
    window.sill = Math.max(.25, Math.min(maxTop - .5, Number(window.sill) || .75));
    window.height = Math.max(.5, Math.min(maxTop - window.sill, Number(window.height) || 1.5));
  }

  function placeWindow(world) {
    const window = getDoorCandidate(world,1);
    if (!window) { showToast("Click closer to a shared wall"); return; }
    if (!doorIsConnected(window)) { showToast("A window needs a room or corridor on both sides"); return; }
    const existing = [...state.doors, ...state.windows].find((item) => openingsOverlap(item,window));
    if (existing) {
      selected = { type: state.windows.includes(existing) ? "window" : "door", id: existing.id };
      refresh(); showToast("That wall section already has an opening"); return;
    }
    const before = snapshot();
    Object.assign(window, {
      id: crypto.randomUUID(), mode: "breakable", sill: .75, height: 1.5,
      health: 20, texture: "GLASS_BRIGHT"
    });
    clampWindowDimensions(window);
    state.windows.push(window);
    selected = { type: "window", id: window.id };
    commit(before);
    showToast("Breakable window added — press E near it in Walkthrough");
  }

  function doorIsConnected(door) {
    const [a,b]=openingSegment(door),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(.001,Math.hypot(dx,dy)),nx=-dy/length*.2,ny=dx/length*.2;
    return isPointInSpace(mid[0]-nx,mid[1]-ny)&&isPointInSpace(mid[0]+nx,mid[1]+ny);
  }

  function setPreviewMode(mode) {
    previewMode = mode;
    previewDrag = null;
    $("#previewWrap").classList.remove("panning");
    if (previewMode === "walk") {
      openWalkDoors.clear();
      brokenWalkWindows.clear();
      resetPlayerToSafeStart();
      preview.focus();
    }
    $("#previewModeButton").textContent = previewMode === "walk" ? "Orbit" : "Walk";
    $("#previewModeButton").classList.toggle("active", previewMode === "walk");
    $("#rotateButton").classList.toggle("hidden", previewMode === "walk");
    $("#previewNavigation").classList.toggle("hidden", previewMode === "walk");
    $("#previewModeBadge").textContent = previewMode === "walk" ? "WALKTHROUGH" : "ORBIT MODEL";
    $("#previewCaption").textContent = previewMode === "walk" ? "WASD move · Ctrl/C crouch · E use" : "Wheel zoom · drag rotate · Shift drag pan";
    updatePreviewNavigation();
    drawPreview();
  }

  function updatePreviewNavigation() {
    $("#previewZoomLabel").textContent = `${Math.round(previewZoom * 100)}%`;
    $("#previewPanButton").classList.toggle("active", previewPanMode);
    $("#previewPanButton").setAttribute("aria-pressed", String(previewPanMode));
    $("#previewWrap").classList.toggle("pan-mode", previewPanMode);
  }

  function setPreviewZoom(value, anchor = null) {
    const next = Math.max(.4, Math.min(4, Number(value) || 1));
    if (Math.abs(next - previewZoom) < .001) return;
    if (anchor) {
      const rect = preview.getBoundingClientRect();
      const baseOrigin = { x: rect.width / 2, y: rect.height * .63 };
      const ratio = next / previewZoom;
      previewPan.x = anchor.x - baseOrigin.x - (anchor.x - baseOrigin.x - previewPan.x) * ratio;
      previewPan.y = anchor.y - baseOrigin.y - (anchor.y - baseOrigin.y - previewPan.y) * ratio;
    }
    previewZoom = next;
    updatePreviewNavigation();
    drawPreview();
  }

  function fitPreview() {
    previewZoom = 1;
    previewPan = { x: 0, y: 0 };
    previewPanMode = false;
    updatePreviewNavigation();
    drawPreview();
  }

  function finishPolygonDraft() {
    if (!polygonDraft.length) return false;
    const error = polygonValidation(polygonDraft);
    if (error) { showToast(error); return false; }
    const before = snapshot();
    const platformMode = activeTool === "polyPlatform";
    const floorMode = activeTool === "polyFloor";
    const wallMode = activeTool === "polyWall";
    if (platformMode || floorMode || wallMode) {
      const bounds = polygonBounds(polygonDraft);
      const center = polygonDraft.reduce((sum, point) => [sum[0] + point[0] / polygonDraft.length, sum[1] + point[1] / polygonDraft.length], [0,0]);
      if (!polygonIsInsideSpace(polygonDraft)) { showToast(`Keep the whole polygon ${floorMode ? "floor" : wallMode ? "wall" : "platform"} on a room floor or map ground`); return false; }
      const host = state.rooms.find((room) => pointInRoom(center[0], center[1], room));
      const surfaceLevel = floorLevelAt(center[0],center[1]);
      const prop = {
        id:crypto.randomUUID(), kind:floorMode ? "floorPolygon" : wallMode ? "wallPolygon" : "platformPolygon", label:floorMode ? "CUSTOM FLOOR" : wallMode ? "POLYGON WALL" : "CUSTOM PLATFORM", points:polygonDraft.map((point) => [...point]),
        ...bounds, height:wallMode ? Math.min(host?.height || 4, 4) : 1, floorLevel:surfaceLevel, texture:floorMode ? (host?.floorTexture || environmentFor().groundMaterial) : wallMode ? (host?.texture || "CSTRIKE_WR4RGH") : "CSTRIKE_CH3TILE", direction:"e"
      };
      if (floorMode) { prop.elevation = surfaceLevel + .25; prop.thickness = .25; }
      state.props.push(prop);
      selected = { type:"prop", id:prop.id };
    } else {
      const room = roomFromPoints(polygonDraft, "CUSTOM POLYGON");
      state.rooms.push(room);
      selected = { type: "room", id: room.id };
    }
    polygonDraft = [];
    commit(before);
    setTool("select");
    showToast(floorMode ? "Polygon floor created—set elevation and thickness in Selection" : wallMode ? "Polygon wall created—physical cover in preview and export" : platformMode ? "Polygon platform created—select Edit corners to reshape it" : "Polygon room created—select Edit corners to reshape it");
    return true;
  }

  function cancelPolygonDraft(showMessage = true) {
    if (!polygonDraft.length) return;
    polygonDraft = [];
    if (showMessage) showToast("Polygon drawing cancelled");
    drawEditor();
  }

  function presetRoomPoints(tool, box) {
    if (tool === "triangle") return [
      [box.x + box.w / 2, box.y], [box.x + box.w, box.y + box.d], [box.x, box.y + box.d]
    ];
    if (tool === "octagon") return octagonPoints(box.x, box.y, box.w, box.d, Math.min(box.w, box.d) * .24);
    return null;
  }

  function setTool(tool) {
    if (!["polygon", "polyPlatform", "polyFloor", "polyWall"].includes(tool)) cancelPolygonDraft(false);
    if (tool !== "select") { editingVertices = false; selectedVertexIndex = -1; selectedEdgeIndex = -1; movingVertex = null; movingEdge = null; }
    activeTool = tool;
    if (["wall", "polyWall", "diagonal", "platform", "polyPlatform", "floor", "polyFloor", "floorHole", "column", "ladder", "crate", "stairs", "ramp", "stairPrefab", "prefab", "cylinder", "wedge", "arch", "slopeRoof", "water", "breakable", "elevator", "rotatingDoor", "train", "spotlight", "pathCorner", "targetDummy", "eyedropper", "paint"].includes(tool) && previewMode !== "orbit") {
      setPreviewMode("orbit");
    }
    $$(".tool").forEach((button) => button.classList.toggle("active", button.dataset.tool === tool));
    $("#toolTip").textContent = TOOL_INFO[tool].tip;
    $("#editorTitle").textContent = TOOL_INFO[tool].title;
    $("#canvasWrap").style.cursor = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair";
    if(tool==="select"&&selected)setRightPanel("selection");
    rememberRecentTool(tool);
    drawEditor();
  }

  function updateChecklist() {
    const hasGround = environmentFor().groundEnabled;
    const checks = {
      room: state.rooms.length > 0 || hasGround,
      ct: state.entities.some((item) => item.kind === "ct"),
      t: state.entities.some((item) => item.kind === "t"),
      bomb: state.entities.some((item) => item.kind === "bombA" || item.kind === "bombB") || (state.entities.some((item)=>item.kind==="hostage")&&state.zones.some((zone)=>zone.kind==="rescue")),
      connection: hasGround || (state.rooms.length > 0 && (state.rooms.length === 1 || state.doors.length > 0 || state.props.some((item)=>item.kind==="floorHole")))
    };
    Object.entries(checks).forEach(([key, value]) => {
      $(`[data-check="${key}"]`).classList.toggle("done", value);
    });
    const score = Object.values(checks).filter(Boolean).length;
    $("#score").textContent = `${score}/5`;
    $("#guideTabStatus").textContent = `${score} of 5 complete`;
    $("#checkTitle").textContent = score === 5 ? "Ready to export" : score ? "Keep building" : "Let’s get started";

    let step = 1;
    if (checks.room) step = checks.ct && checks.t ? 3 : 2;
    const lessons = {
      1: ["Create the layout", "Use the map-wide ground as an outdoor build surface, then add rooms and structures where needed."],
      2: ["Place both teams", "Choose CT spawn and T spawn, then click on a room floor or the map-wide ground."],
      3: ["Add an objective", "Place bombsite A or B, check the preview, and export your editable .map file."]
    };
    $("#lessonNumber").textContent = step;
    $("#lessonTitle").textContent = lessons[step][0];
    $("#lessonText").textContent = lessons[step][1];
    $$(".lesson-progress i").forEach((item, index) => item.classList.toggle("active", index < step));
  }

  function updateInspector() {
    const entries = selectedEntries();
    const item = selectedItem();
    const multiple = entries.length > 1;
    $("#selectionTabStatus").textContent=entries.length?`${entries.length} object${entries.length===1?"":"s"} selected`:"Nothing selected";
    $("#deleteButton").disabled = !entries.length;
    $("#nothingSelected").classList.toggle("hidden", !!entries.length);
    $("#selectionFields").classList.toggle("hidden", !entries.length);
    $("#multiSelectionSummary").classList.toggle("hidden", !multiple);
    if (entries.length) updatePrecisionInspector(entries);
    $("#openBrushStudioSelection").disabled = !brushStudioEntries().length;
    if (multiple) {
      const grouped = entries.every((entry) => entry.item.groupId && entry.item.groupId === entries[0].item.groupId);
      $("#selectionType").value = `${entries.length} selected objects`;
      $("#multiSelectionSummary").textContent = `${entries.length} objects · ${grouped ? "one group" : "mixed selection"}${entries.some((entry) => isItemLocked(entry.item)) ? " · includes locked" : ""}`;
      ["shapeFields","floorFields","vertexFields","lightFields","logicFields","spawnFields","doorFields","windowFields","gameEntityFields","zoneEntityFields","materialRow","roomSurfaceFields","materialPreview","openTextureBrowser","textureAlignmentFields"].forEach((id) => $(`#${id}`).classList.add("hidden"));
      $(".field-row").classList.add("hidden");
      $("#selectionActions").classList.remove("hidden");
      $("#rotateLeftSelection").disabled = false; $("#rotateRightSelection").disabled = false;
      $("#reverseSelection").disabled = true; $("#duplicateSelection").disabled = false; $("#copySelection").disabled = false;
      $("#pasteSelection").disabled = !objectClipboard;
      $("#levelDownSelection").disabled = !entries.some((entry) => ["room","prop"].includes(entry.ref.type));
      $("#levelUpSelection").disabled = $("#levelDownSelection").disabled;
      $("#groupSelection").disabled = entries.length < 2 || grouped;
      $("#ungroupSelection").disabled = !entries.some((entry) => entry.item.groupId);
      $("#lockSelection").textContent = entries.every((entry) => isItemLocked(entry.item)) ? "Unlock" : "Lock";
      $("#saveSelectionPrefab").disabled = false;
      return;
    }
    if (!item) return;
    const isRoom = selected.type === "room";
    const isPolygonRoom = isRoom && item.points?.length >= 3;
    const isProp = selected.type === "prop";
    const isRamp = isProp && ["ramp","wedge","slopeRoof"].includes(item.kind);
    const isStairs = isProp && item.kind === "stairs";
    const isWall = isProp && ["wall", "wallPolygon", "cylinder", "arch"].includes(item.kind);
    const isDiagonal = isProp && item.kind === "diagonal";
    const isPlatform = isProp && ["platform", "platformPolygon"].includes(item.kind);
    const isFloor = isProp && ["floor", "floorPolygon"].includes(item.kind);
    const isFloorHole = isProp && item.kind === "floorHole";
    const convertibleShape = isRoom || (isProp && ["wall","platform","floor","wallPolygon","platformPolygon","floorPolygon","cylinder"].includes(item.kind));
    const isEditablePolygon = convertibleShape;
    const isLadder = isProp && item.kind === "ladder";
    const isLight = selected.type === "entity" && ["light","spotlight"].includes(item.kind);
    const isSpawn = selected.type === "entity" && ["ct", "t"].includes(item.kind);
    const isGameEntity = selected.type === "entity" && ["hostage","button","teleDest","decal","ambient","pathCorner","targetDummy"].includes(item.kind);
    const isLogicProp = isProp && ["elevator","rotatingDoor","train"].includes(item.kind);
    const isDoor = selected.type === "door";
    const isWindow = selected.type === "window";
    const isZone = selected.type === "zone";
    const hasDimensions = isRoom || isProp || isZone;
    $("#selectionType").value = isRoom ? (item.kind === "corridor" ? "Corridor" : isPolygonRoom ? `Polygon room · ${item.points.length} corners` : "Room")
      : isProp ? ({ crate: "Crate", wall: "Solid wall", wallPolygon: item.label === "COLUMN" ? "Octagonal column" : "Polygon wall", diagonal: "Diagonal cover", platform: "Elevated platform", platformPolygon: "Polygon platform", floor: "Floor slab", floorPolygon: "Polygon floor", floorHole:"Floor opening", ladder: "Ladder", stairs: "Stairs", ramp: "Ramp", wedge:"Solid wedge", slopeRoof:"Sloped roof", cylinder:"Cylinder", arch:"Archway part",water:"Water volume",breakable:"Breakable brush",elevator:"Elevator platform",rotatingDoor:"Rotating door",train:"Moving platform" })[item.kind]
      : isZone ? ({buyCt:"CT buy zone",buyT:"T buy zone",rescue:"Hostage rescue zone",triggerHurt:"Damage trigger",teleport:"Teleport trigger"}[item.kind]||"Gameplay volume")
      : selected.type === "door" ? "Door opening" : isWindow ? "Window" : ({ ct: "CT spawn", t: "T spawn", bombA: "Bombsite A", bombB: "Bombsite B", light: "Point light",spotlight:"Spotlight" })[item.kind];
    if(isGameEntity)$("#selectionType").value=({hostage:"Hostage",button:"Usable button",teleDest:"Teleport destination",decal:"Decal",ambient:"Ambient sound",pathCorner:"Path corner",targetDummy:"Target dummy"}[item.kind]);
    $(".field-row").classList.toggle("hidden", !hasDimensions);
    $("#heightField").classList.toggle("hidden", isZone||isFloorHole);
    $("#materialRow").classList.toggle("hidden", !(isRoom || (isProp&&!isFloorHole)));
    $("#materialPreview").classList.toggle("hidden", !(isProp || (isDoor && item.mode === "sliding")));
    $("#openTextureBrowser").classList.toggle("hidden", !(isRoom || (isProp&&!isFloorHole)));
    $("#textureAlignmentFields").classList.toggle("hidden", !(isRoom || (isProp&&!isFloorHole)));
    $("#roomSurfaceFields").classList.toggle("hidden", !isRoom);
    $("#floorFields").classList.toggle("hidden", !isFloor);
    $("#lightFields").classList.toggle("hidden", !isLight);
    $("#logicFields").classList.toggle("hidden", !isLogicProp);
    $("#spawnFields").classList.toggle("hidden", !isSpawn);
    $("#doorFields").classList.toggle("hidden", !isDoor);
    $("#windowFields").classList.toggle("hidden", !isWindow);
    $("#gameEntityFields").classList.toggle("hidden", !isGameEntity);
    $("#zoneEntityFields").classList.toggle("hidden", !(isZone&&["rescue","triggerHurt","teleport"].includes(item.kind)));
    $("#shapeFields").classList.toggle("hidden", !(isRoom || isRamp || isStairs || isPlatform || isFloor || isLadder));
    $("#vertexFields").classList.toggle("hidden", !isEditablePolygon);
    $("#editVerticesButton").classList.toggle("active", isEditablePolygon && editingVertices);
    $("#editVerticesButton").textContent = editingVertices ? "Finish corners" : "Edit corners";
    $("#removeVertexButton").disabled = !item.points?.length || selectedVertexIndex < 0 || item.points.length <= 3;
    $("#geometryOperations").classList.toggle("hidden", !(isEditablePolygon && editingVertices));
    $("#clipVertexButton").disabled = selectedVertexIndex < 0 || (item.points?.length || 0) >= 16;
    $("#extrudeEdgeButton").disabled = selectedEdgeIndex < 0;
    if (isEditablePolygon) $("#vertexSummary").textContent = editingVertices
      ? `Drag corner ${selectedVertexIndex >= 0 ? selectedVertexIndex + 1 : "handles"}. The editor rejects concave or flat results.`
      : item.points?.length ? `${item.points.length}-corner convex ${isPolygonRoom ? "room" : "shape"} · safe polygon brush export.`
        : "Choose Edit corners to convert this rectangle into an editable convex shape.";
    $("#directionRow").classList.toggle("hidden", !(isRamp || isStairs || isLadder));
    $("#directionLabel").textContent = isLadder ? "Ladder facing" : "Uphill direction";
    $("#rampSteepnessRow").classList.toggle("hidden", !isRamp);
    $("#stairStepsRow").classList.toggle("hidden", !isStairs);
    const supportsActions = ["room", "prop", "entity", "zone"].includes(selected.type);
    $("#selectionActions").classList.toggle("hidden", !supportsActions);
    $("#rotateLeftSelection").disabled = !isProp;
    $("#rotateRightSelection").disabled = !isProp;
    $("#reverseSelection").disabled = !(isRamp || isStairs);
    $("#duplicateSelection").disabled = !supportsActions;
    $("#copySelection").disabled = !supportsActions;
    $("#pasteSelection").disabled = !objectClipboard;
    $("#levelDownSelection").disabled = !(isRoom || isProp);
    $("#levelUpSelection").disabled = !(isRoom || isProp);
    $("#groupSelection").disabled = true;
    $("#ungroupSelection").disabled = !item.groupId;
    $("#lockSelection").textContent = isItemLocked(item) ? "Unlock" : "Lock";
    $("#saveSelectionPrefab").disabled = !supportsActions;
    $("#materialLabel").textContent = isRoom ? "Wall material" : isFloor ? "Floor material" : "Material";
    if (isDoor) {
      item.mode ||= "opening";
      item.texture ||= "CSTRIKE_ME4METL";
      item.speed ||= 100;
      item.height ||= 2;
      $("#doorWidth").value=item.width||1;
      $("#doorHeight").value=item.height;
      $("#doorModeSelect").value = item.mode;
      $("#doorSpeed").value = item.speed;
      populateMaterialSelect("doorMaterialSelect","props",item.texture);
      $("#doorMaterialSelect").value = item.texture;
      $("#doorSpeedRow").classList.toggle("hidden", item.mode !== "sliding");
      $("#doorMaterialRow").classList.toggle("hidden", item.mode !== "sliding");
      $("#doorSummary").textContent = item.mode === "sliding"
        ? "Walkthrough: approach and press E. Export: func_door."
        : "A permanently open passage.";
      if (item.mode === "sliding") updateMaterialPreview(item.texture);
    }
    if (isWindow) {
      item.mode ||= "breakable";
      item.sill ||= .75;
      item.height ||= 1.5;
      item.health ||= 20;
      clampWindowDimensions(item);
      $("#windowWidth").value=item.width||1;
      const rooms = adjacentRoomsForOpening(item);
      const roomHeight = Math.min(...rooms.map((room) => room.height), 4);
      $("#windowModeSelect").value = item.mode;
      $("#windowSill").value = item.sill;
      $("#windowHeight").value = item.height;
      $("#windowHealth").value = item.health;
      $("#windowSill").max = Math.max(.25, roomHeight - .75);
      $("#windowHeight").max = Math.max(.5, roomHeight - item.sill - .25);
      $("#windowHealthRow").classList.toggle("hidden", item.mode !== "breakable");
      $("#windowSummary").textContent = item.mode === "breakable"
        ? "Walkthrough: approach and press E to break it. Export: func_breakable glass."
        : item.mode === "glass" ? "Solid unbreakable glass. Export: translucent func_wall."
          : "Open frame with a solid sill and no glass entity.";
    }
    if (isLight) {
      item.z ||= 2.5;
      item.brightness ||= 300;
      item.radius ||= 512;
      item.style ??= "0";
      item.target ||= "";
      item.color ||= "#fff0d0";
      const lightRoom = state.rooms.find((room) => pointInRoom(item.x + .5, item.y + .5, room));
      $("#lightHeight").max = Math.max(.5, (lightRoom?.height || 4) - .25);
      $("#lightHeight").value = item.z;
      $("#lightBrightness").value = item.brightness;
      $("#lightColor").value = item.color;
      $("#lightRadius").value = item.radius;
      $("#lightStyle").value = item.style;
      $("#lightTarget").value = item.target;
      $("#spotlightFields").classList.toggle("hidden",item.kind!=="spotlight");
      if(item.kind==="spotlight"){$("#spotlightAngle").value=String(item.angle||0);$("#spotlightCone").value=item.cone||45;$("#spotlightPitch").value=item.pitch??-45;}
      $("#lightSummary").textContent = `${item.kind === "spotlight" ? "Spotlight" : "Point light"} · ${Math.round(item.z * GRID)} units high · ${item.radius} unit planning radius`;
    }
    if (isSpawn) {
      item.angle = Number(item.angle) || 0;
      $("#spawnAngleSelect").value = String(((item.angle % 360) + 360) % 360);
      $("#spawnSummary").textContent = `${item.kind === "ct" ? "CT" : "T"} players spawn facing ${$("#spawnAngleSelect").selectedOptions[0]?.textContent.trim() || "East"}.`;
    }
    if(isGameEntity){
      item.target||=(item.kind==="teleDest"?"tele_dest_1":item.kind==="button"?"target_1":"");
      $("#entityTarget").value=item.kind==="pathCorner"?(item.targetName||"path_1"):(item.target||""); $("#entityTargetRow").classList.toggle("hidden",!["button","teleDest","pathCorner"].includes(item.kind));
      $("#entityNextRow").classList.toggle("hidden",item.kind!=="pathCorner");if(item.kind==="pathCorner")$("#entityNext").value=item.target||"";
      $("#entitySoundRow").classList.toggle("hidden",item.kind!=="ambient"); $("#entityVolumeRow").classList.toggle("hidden",item.kind!=="ambient");
      $("#entityDecalRow").classList.toggle("hidden",item.kind!=="decal");
      if(item.kind==="ambient"){item.sound||="ambience/wind1.wav";item.volume??=7;$("#entitySound").value=item.sound;$("#entityVolume").value=item.volume;}
      if(item.kind==="decal"){item.decal||="{lambda01";$("#entityDecal").value=item.decal;}
      $("#gameEntitySummary").textContent={hostage:"Exports as hostage_entity.",button:"A small func_button that fires the named target.",teleDest:"Landing point for trigger_teleport volumes.",decal:"Exports as infodecal at this position.",ambient:"Exports as ambient_generic; use a WAV path installed with the game.",pathCorner:"Named route point for a moving platform.",targetDummy:"Editor and Walkthrough target; excluded from the compiled BSP."}[item.kind];
    }
    if(isLogicProp){
      item.targetName ||= `${item.kind}_1`; item.target ||= item.kind==="train"?"path_1":""; item.speed ||= 100; item.wait ??= 3;
      $("#logicName").value=item.targetName;$("#logicTarget").value=item.target;$("#logicSpeed").value=item.speed;$("#logicWait").value=item.wait;
      $("#logicSummary").textContent={elevator:"Exports as func_plat and travels by its configured height.",rotatingDoor:"Exports as func_door_rotating with a centered hinge.",train:"Exports as func_train and begins at the named path_corner."}[item.kind];
    }
    if(isZone&&["rescue","triggerHurt","teleport"].includes(item.kind)){
      $("#zoneDamageRow").classList.toggle("hidden",item.kind!=="triggerHurt");$("#zoneTargetRow").classList.toggle("hidden",item.kind!=="teleport");
      if(item.kind==="triggerHurt"){item.damage||=25;$("#zoneDamage").value=item.damage;}
      if(item.kind==="teleport"){item.target||="tele_dest_1";$("#zoneTarget").value=item.target;}
      $("#zoneEntitySummary").textContent={rescue:"Exports as func_hostage_rescue.",triggerHurt:"Invisible trigger_hurt volume.",teleport:"Sends players to the matching destination name."}[item.kind];
    }
    if (hasDimensions) {
      $("#widthLabel").textContent = "Width";
      $("#depthLabel").textContent = "Depth";
      $("#heightLabel").textContent = isRoom || isWall ? "Wall height" : isFloor ? "Floor elevation" : isDiagonal ? "Cover height" : isPlatform ? "Platform height" : isLadder ? "Ladder height" : isRamp ? "Ramp rise" : isStairs ? "Total rise" : "Crate height";
      $("#roomWidth").value = item.w;
      $("#roomDepth").value = item.d;
      $("#roomHeight").value = isFloor ? (Number(item.elevation) || 0) : (item.height || 1);
      $("#roomHeight").min = isFloor ? -8 : isRoom ? 2 : .25;
      $("#roomHeight").step = isRoom ? 1 : .25;
      $("#roomHeight").max = isFloor ? 16 : 12;
      if (!isRoom && !isProp) surfaceTarget = "object";
      const surfaceSelect = $("#surfaceTargetSelect");
      [...surfaceSelect.querySelectorAll("option[data-edge],option[data-brush-face]")].forEach((option) => option.remove());
      if (isRoom) roomPlanPoints(item).forEach((_, index) => {
        const option = document.createElement("option"); option.value = `edge:${index}`; option.dataset.edge = "true";
        option.textContent = `Wall face ${index + 1}`; surfaceSelect.append(option);
      });
      if (isProp) {
        [["top","Top face"],["bottom","Bottom face"]].forEach(([value,label]) => {
          const option=document.createElement("option");option.value=value;option.dataset.brushFace="true";option.textContent=label;surfaceSelect.append(option);
        });
        if(item.points?.length)item.points.forEach((_,index)=>{
          const option=document.createElement("option");option.value=`side:${index}`;option.dataset.brushFace="true";option.textContent=`Side face ${index+1}`;surfaceSelect.append(option);
        });
      }
      if (isRoom && surfaceTarget.startsWith("edge:") && Number(surfaceTarget.split(":")[1]) >= roomPlanPoints(item).length) surfaceTarget = "object";
      if (isProp && surfaceTarget.startsWith("side:") && Number(surfaceTarget.split(":")[1]) >= (item.points?.length||0)) surfaceTarget = "object";
      if (isRoom && (["top","bottom"].includes(surfaceTarget)||surfaceTarget.startsWith("side:"))) surfaceTarget="object";
      if (isProp && (["floor","ceiling"].includes(surfaceTarget)||surfaceTarget.startsWith("edge:"))) surfaceTarget="object";
      $("#surfaceTargetSelect").value = surfaceTarget;
      $("#surfaceTargetSelect").disabled = !(isRoom||isProp);
      [...$("#surfaceTargetSelect").options].forEach((option) => {
        if(option.value==="object")option.hidden=false;
        else if(["floor","ceiling"].includes(option.value))option.hidden=!isRoom;
        else if(["north","east","south","west"].includes(option.value))option.hidden=!(isRoom||(isProp&&!item.points?.length));
      });
      ["north","east","south","west"].forEach((face)=>{
        const option=[...surfaceSelect.options].find((candidate)=>candidate.value===face);
        if(option)option.textContent=`${face[0].toUpperCase()+face.slice(1)} ${isProp?"face":"wall"}`;
      });
      const texture = surfaceTextureFor(item, selected.type);
      if (!isZone) {
        populateMaterialSelect("materialSelect",textureUsageForSelection(item,selected.type,surfaceTarget),texture);
        $("#materialSelect").value = texture;
        updateSurfaceMiniature("wallMaterialMiniature", texture);
        updateMaterialPreview(texture);
        const storedUv = surfaceUvFor(item, selected.type),uv=resolvedSurfaceUv(item,selected.type,surfaceTarget,storedUv);
        $("#textureMappingMode").value=storedUv.mode;
        $("#textureShiftX").value = uv.shiftX; $("#textureShiftY").value = uv.shiftY;
        $("#textureRotation").value = uv.rotation; $("#textureScaleX").value = uv.scaleX; $("#textureScaleY").value = uv.scaleY;
        $("#textureScaleX").disabled=storedUv.mode==="fit";$("#textureScaleY").disabled=storedUv.mode==="fit";
        $("#sampleMaterialButton").classList.toggle("active", activeTool === "eyedropper");
        $("#paintMaterialButton").classList.toggle("active", activeTool === "paint");
      }
      const summary = $("#shapeSummary");
      summary.classList.remove("warning");
      if (isRoom) {
        summary.textContent = `${isPolygonRoom ? `${item.points.length}-corner polygon · ` : ""}Wall height: ${item.height * GRID} GoldSrc units (${item.height} grid squares).`;
      } else if (isRamp) {
        $("#directionSelect").value = item.direction || "e";
        const run = Math.max(.01, structureRun(item));
        const ratio = item.height / run;
        const preset = [[.25, "0.25"], [.5, "0.5"], [1, "1"]].find(([value]) => Math.abs(ratio - value) < .02);
        $("#rampSteepnessSelect").value = preset ? preset[1] : "custom";
        summary.textContent = `${Math.round(Math.atan(ratio) * 180 / Math.PI)}° slope · ${Math.round(item.height * GRID)}-unit rise over ${Math.round(run * GRID)} units.`;
      } else if (isStairs) {
        $("#directionSelect").value = item.direction || "e";
        item.steps ||= recommendedStairSteps(item);
        $("#stairSteps").value = item.steps;
        const riser = item.height * GRID / item.steps;
        const tread = structureRun(item) * GRID / item.steps;
        summary.textContent = `${item.steps} steps · ${Math.round(riser)}-unit risers · ${Math.round(tread)}-unit treads.`;
        if (riser > 18) {
          summary.textContent += " Risers over 18 units may be too tall in CS 1.6.";
          summary.classList.add("warning");
        }
      } else if (isPlatform) {
        summary.textContent = `${Math.round(item.height * GRID)} units above the floor · walkable in the preview.`;
      } else if (isFloor) {
        item.thickness = Math.max(.125, Number(item.thickness) || .25);
        $("#floorThickness").value = item.thickness;
        $("#floorSummary").textContent = `Walkable top Z ${Math.round((Number(item.elevation) || 0) * GRID)} · ${Math.round(item.thickness * GRID)}-unit solid slab.`;
        summary.textContent = `${item.kind === "floorPolygon" ? `${item.points.length}-corner polygon · ` : ""}Absolute floor elevation in GoldSrc units.`;
      } else if (isLadder) {
        $("#directionSelect").value = item.direction || "n";
        summary.textContent = `Climbs to ${Math.round(item.height * GRID)} units · face it toward the approach side.`;
      } else if (isDiagonal) {
        summary.textContent = `True 45° brush cover · ${Math.round(item.height * GRID)} units high. Rotate to change the angle.`;
      }
      if (isRoom) {
        item.floorTexture ||= "CSTRIKE_FP2DARK";
        item.ceilingTexture ||= "C1A0_LABW3";
        item.ceilingMode ||= "ceiling";
        populateMaterialSelect("floorMaterialSelect","floor",item.floorTexture);
        $("#floorMaterialSelect").value = item.floorTexture;
        updateSurfaceMiniature("floorMaterialMiniature", item.floorTexture);
        $("#roomFloorElevation").value = roomFloor(item);
        populateMaterialSelect("ceilingMaterialSelect","ceiling",item.ceilingTexture);
        $("#ceilingMaterialSelect").value = item.ceilingTexture;
        updateSurfaceMiniature("ceilingMaterialMiniature", item.ceilingTexture);
        $("#ceilingModeSelect").value = item.ceilingMode;
        $("#roomRoofEnabled").checked = item.ceilingMode !== "sky";
        $("#ceilingMaterialRow").classList.toggle("hidden", item.ceilingMode === "sky");
        $("#surfaceNote").textContent = item.ceilingMode === "sky"
          ? "Preview is open. Export adds a thin SKY seal to prevent a GoldSrc leak—no large skybox."
          : "Solid roofs appear as translucent textured panels in Orbit.";
      }
    }
  }

  function updateMaterialPreview(texture) {
    $("#materialPreviewImage").src = texturePreviewUrl(texture);
    $("#materialPreviewImage").alt = `${MATERIAL_INFO[texture] || texture} texture preview`;
    $("#materialPreviewName").textContent = MATERIAL_INFO[texture] || texture;
    $("#materialPreviewCode").textContent = texture;
  }

  function updateSurfaceMiniature(id, texture) {
    const image = $(`#${id}`);
    if (!image) return;
    image.src = texturePreviewUrl(texture);
    image.alt = `${MATERIAL_INFO[texture] || texture} miniature preview`;
    image.title = `${MATERIAL_INFO[texture] || texture} · click to browse`;
  }

  function textureCategory(texture) {
    if (CC0_TEXTURE_CATEGORIES[texture]) return CC0_TEXTURE_CATEGORIES[texture];
    if (texture.startsWith("SUN_")) return "sunburst";
    if (["BCRATE02", "C1A1_CRATE1"].includes(texture)) return "wood";
    if (texture.includes("MET") || texture === "CSTRIKE_ME4METL") return "metal";
    if (texture.includes("FLOOR") || texture.includes("TILE") || texture === "CSTRIKE_FP2DARK" || texture === "CSTRIKE_CH3TILE") return "floor";
    return "architecture";
  }

  function inferredTextureUses(category,text="") {
    const uses=new Set(),value=String(text||"").toLowerCase();
    const add=(...items)=>items.forEach((item)=>uses.add(item));
    if(category==="architecture")add("wall","ceiling","props");
    if(category==="concrete")add("wall","floor","ceiling","props");
    if(category==="brick")add("wall","tile");
    if(category==="stone")add("wall","floor","tile","ground","props");
    if(category==="ground")add("ground","floor");
    if(category==="nature")add("ground","props");
    if(category==="organic")add("wall","props");
    if(category==="fabric")add("wall","floor","ceiling","props");
    if(category==="plaster")add("wall","ceiling");
    if(category==="floor")add("floor","tile");
    if(category==="metal")add("wall","floor","ceiling","props");
    if(category==="wood")add("wall","floor","ceiling","props");
    if(category==="sunburst")add("wall","floor","props");
    if(/\b(tile|tiles|cobble|marble|parquet)\b/.test(value))add("tile","floor");
    if(/\b(grass|sand|gravel|ground|soil|dirt|pavement|asphalt)\b/.test(value))add("ground");
    if(/\b(crate|supply|trim|door|panel)\b/.test(value))add("props");
    if(/\b(ceiling|roof|plaster)\b/.test(value))add("ceiling");
    if(/\b(wall|brick|stucco)\b/.test(value))add("wall");
    if(/\b(floor)\b/.test(value))add("floor");
    if(!uses.size)add("wall");
    return [...uses];
  }

  function textureSurfaceUses(texture) {
    const stored=MATERIAL_SURFACE_USES[texture];
    if(stored?.length)return [...stored];
    const category=textureCategory(texture),text=`${texture} ${MATERIAL_INFO[texture]||""}`;
    if(texture==="SUN_WALL")return ["wall"];
    if(texture==="SUN_METAL")return ["wall","ceiling","props"];
    if(texture==="SUN_TILE")return ["floor","tile","wall"];
    if(texture==="SUN_FLOOR")return ["floor"];
    if(["SUN_CRATE","SUN_SUPPLY","BCRATE02","C1A1_CRATE1"].includes(texture))return ["props"];
    return inferredTextureUses(category,text);
  }

  function textureUsageForSelection(item=selectedItem(),type=selected?.type,target=surfaceTarget) {
    if(type==="room")return target==="floor"?"floor":target==="ceiling"?"ceiling":"wall";
    if(type==="door"||type==="window")return "props";
    if(type!=="prop"||!item)return "wall";
    if(["floor","floorPolygon","platform","platformPolygon","stairs","ramp","wedge"].includes(item.kind))return "floor";
    if(["wall","wallPolygon","diagonal","cylinder","arch","slopeRoof"].includes(item.kind))return "wall";
    return "props";
  }

  function textureUsageForTarget() {
    const target=$("#textureTarget")?.value||"material";
    if(target==="ground")return "ground";
    if(target==="floor")return "floor";
    if(target==="ceiling")return "ceiling";
    return textureUsageForSelection();
  }

  function selectedImportedTextureUses() {
    return $$(".texture-use-picker input:checked").map((input)=>input.value).filter((use)=>TEXTURE_USE_INFO[use]);
  }

  function setImportedTextureUses(uses) {
    const selected=new Set(uses);
    $$(".texture-use-picker input").forEach((input)=>{input.checked=selected.has(input.value);});
  }

  function suggestImportedTextureUses(category,text="") {
    setImportedTextureUses(inferredTextureUses(category,text));
  }

  async function refreshTextureCatalog() {
    let customCatalog=null,officialCatalog=null,mapCatalog=null;
    try {
      customCatalog=await companionRequest("/api/textures");
      (customCatalog.textures||[]).forEach((item)=>registerMaterial(item.name,item.label||item.name,item.category||"architecture","",item.uses));
    } catch (_) {}
    try {
      officialCatalog=await companionRequest("/api/official-textures");
      installOfficialTextureCatalog(officialCatalog);
    } catch (_) {
      officialCatalog=null;officialTextureWads=[];
    }
    try {
      mapCatalog=await companionRequest("/api/map-textures");
      installMapTextureCatalog(mapCatalog);
    } catch (_) {
      mapCatalog=null;installedTextureMaps=[];
    }
    installMaterialOptions();
    populateTextureWadFilter();
    const status=$("#officialTextureStatus");
    if(status)status.textContent=officialCatalog
      ? `Local Steam library: ${officialCatalog.textureCount.toLocaleString()} WAD textures from ${officialCatalog.wadCount} archives${mapCatalog?` plus ${mapCatalog.textureCount.toLocaleString()} embedded textures from ${mapCatalog.mapCount} installed maps`:""}. Game assets stay on this computer.`
      : "Official Steam library: start or pair the Windows companion to browse textures from your legitimate CS 1.6 installation.";
    if($("#textureDialog")?.open)renderTextureBrowser();
    return {custom:customCatalog,official:officialCatalog,maps:mapCatalog};
  }

  function installOfficialTextureCatalog(catalog) {
    officialTextureSources.clear();
    (catalog?.textures||[]).forEach(registerOfficialMaterial);
    officialTextureWads=catalog?.wads||[];
    populateTextureWadFilter();
    refresh();
    if($("#textureDialog")?.open)renderTextureBrowser();
    return {textures:officialTextureSources.size,wads:officialTextureWads.length};
  }

  function installMapTextureCatalog(catalog) {
    (catalog?.textures||[]).forEach(registerMapMaterial);
    installedTextureMaps=catalog?.maps||[];
    populateTextureWadFilter();
    refresh();
    if($("#textureDialog")?.open)renderTextureBrowser();
    return {textures:(catalog?.textures||[]).length,maps:installedTextureMaps.length};
  }

  function populateTextureWadFilter() {
    const select=$("#textureWadFilter");
    if(!select)return;
    const current=select.value||"all";
    select.innerHTML='<option value="all">All texture packs</option><option value="included">Included & imported</option>'
      +(officialTextureWads.length?`<optgroup label="Steam WAD archives">${officialTextureWads.map((wad)=>`<option value="${html(wad.id)}">${html(wad.name)} (${wad.textures})</option>`).join("")}</optgroup>`:"")
      +(installedTextureMaps.length?`<optgroup label="Installed map BSPs">${installedTextureMaps.map((map)=>`<option value="map:${html(map.id)}">${html(map.label)} · ${map.textures}</option>`).join("")}</optgroup>`:"");
    select.value=[...select.options].some((option)=>option.value===current)?current:"all";
  }

  function unregisterMaterial(texture) {
    delete MATERIAL_INFO[texture];delete MATERIAL_COLORS[texture];delete CC0_TEXTURE_CATEGORIES[texture];delete MATERIAL_SURFACE_USES[texture];delete materialImages[texture];officialTextureSources.delete(texture);
    previewPatterns.clear();textureFavorites.delete(texture);
    localStorage.setItem("blockout-texture-favorites",JSON.stringify([...textureFavorites]));
    ["materialSelect","floorMaterialSelect","ceilingMaterialSelect","doorMaterialSelect","environmentGroundMaterialSelect"].forEach((id)=>{
      const option=$(`#${id}`)?.querySelector(`option[value="${texture}"]`);if(option)option.remove();
    });
  }

  function textureUsageCount(texture) {
    let count=environmentFor().groundMaterial===texture?1:0;
    state.rooms.forEach((room)=>{
      count += [room.texture,room.floorTexture,room.ceilingTexture].filter((value)=>value===texture).length;
      count += Object.values(room.wallTextures||{}).filter((value)=>value===texture).length;
      count += Object.values(room.edgeTextures||{}).filter((value)=>value===texture).length;
    });
    state.props.forEach((item)=>{count+=(item.texture===texture?1:0)+Object.values(item.faceTextures||{}).filter((value)=>value===texture).length;});
    count += state.doors.filter((item)=>item.texture===texture).length;
    count += state.windows.filter((item)=>item.texture===texture).length;
    return count;
  }

  async function deleteImportedTexture(texture) {
    if(!texture.startsWith("USR_"))return;
    const usage=textureUsageCount(texture);
    if(usage){showToast(`Used by ${usage} current surface${usage===1?"":"s"} — replace it before deleting`);return;}
    if(!confirm(`Delete ${MATERIAL_INFO[texture]||texture}? This removes its source, preview, and WAD entry.`))return;
    try{
      await companionRequest("/api/textures/remove",{method:"POST",body:JSON.stringify({name:texture})});
      unregisterMaterial(texture);$("#textureSearch").value="";renderTextureBrowser();
      const status=$("#textureImportStatus");status.classList.remove("hidden","error");status.textContent=`${texture} deleted. Its source, preview, and WAD entry were removed safely.`;
      showToast(`${texture} deleted and texture pack rebuilt`);
    }catch(error){showToast(`Delete stopped: ${error.message}`);}
  }

  function importedTextureCode(label) {
    const base=String(label||"TEXTURE").toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,11)||"TEXTURE";
    let code=`USR_${base}`.slice(0,15),index=2;
    while(MATERIAL_INFO[code]){const suffix=String(index++);code=`USR_${base.slice(0,Math.max(1,11-suffix.length))}${suffix}`.slice(0,15);}
    return code;
  }

  function analyzeImportedTexture(fileName,context) {
    const normalized=String(fileName||"").replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
    const lower=normalized.toLowerCase(),keywords={
      brick:["brick","masonry"],concrete:["concrete","cement"],wood:["wood","timber","oak","pine","cedar","plank"],metal:["metal","steel","iron","rust","aluminium","aluminum"],
      stone:["stone","rock","marble","granite","slate","obsidian"],ground:["ground","sand","gravel","dirt","soil","pavement","asphalt","cobble"],nature:["grass","leaf","leaves","moss","bark","plant"],
      fabric:["fabric","cloth","carpet","leather","felt","knit"],plaster:["plaster","stucco","foam"],floor:["floor","tile","tiles","parquet"],organic:["skin","organic","scale"]
    };
    let category=Object.entries(keywords).find(([,words])=>words.some((word)=>lower.includes(word)))?.[0]||null;
    const pixels=context.getImageData(0,0,256,256).data;let red=0,green=0,blue=0,brightness=0,variation=0,edges=0,count=0;
    for(let y=0;y<256;y+=8)for(let x=0;x<256;x+=8){const offset=(y*256+x)*4,r=pixels[offset],g=pixels[offset+1],b=pixels[offset+2],light=(r+g+b)/3;red+=r;green+=g;blue+=b;brightness+=light;count++;if(x>=8){const previous=offset-32;edges+=Math.abs(r-pixels[previous])+Math.abs(g-pixels[previous+1])+Math.abs(b-pixels[previous+2]);}variation+=Math.abs(r-light)+Math.abs(g-light)+Math.abs(b-light);}
    red/=count;green/=count;blue/=count;brightness/=count;variation/=count;edges/=Math.max(1,count-32);
    if(!category){
      if(green>red*1.12&&green>blue*1.12)category="nature";
      else if(brightness<62&&variation<24)category="stone";
      else if(Math.max(red,green,blue)-Math.min(red,green,blue)<20)category=edges>85?"concrete":"plaster";
      else if(red>green*1.18&&red>blue*1.35&&edges>80)category="brick";
      else if(red>green&&green>blue&&red-blue>30)category=edges>95?"wood":"ground";
      else category="architecture";
    }
    const label=(normalized&&!/^(img|image|photo|texture|untitled)(\s*\d*)?$/i.test(normalized)?normalized:`${category} texture`).replace(/\b\w/g,(letter)=>letter.toUpperCase()).slice(0,48);
    return {category,label,code:importedTextureCode(label),average:[Math.round(red),Math.round(green),Math.round(blue)],summary:`Local image analysis suggests ${category} · average RGB ${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}`};
  }

  const TEXTURE_ALCHEMY_DEFAULTS = {
    textureCropMode:"cover",textureRotation:"0",textureZoom:"100",textureOffsetX:"0",textureOffsetY:"0",
    textureSeamWidth:"48",textureBrightness:"100",textureContrast:"100",textureSaturation:"100"
  };

  function resetTextureAlchemyControls(render = true) {
    Object.entries(TEXTURE_ALCHEMY_DEFAULTS).forEach(([id,value])=>{const input=$(`#${id}`);if(input)input.value=value;});
    $("#textureMakeSeamless").checked=true;$("#textureGoldSrcPalette").checked=true;
    $("#textureVariantDark").checked=true;$("#textureVariantLight").checked=true;$("#textureVariantWorn").checked=true;
    if(render&&pendingTextureImport)renderTextureAlchemy();
  }

  function textureAlchemyNumber(id,fallback=0) {
    const value=Number($(`#${id}`)?.value);
    return Number.isFinite(value)?value:fallback;
  }

  function drawTextureAlchemySource() {
    if(!pendingTextureImport?.image)return null;
    const canvas=$("#textureImportSourceCanvas"),context=canvas.getContext("2d",{willReadFrequently:true}),image=pendingTextureImport.image;
    const imageWidth=image.naturalWidth||image.width||256,imageHeight=image.naturalHeight||image.height||256;
    const mode=$("#textureCropMode").value,rotation=textureAlchemyNumber("textureRotation",0),zoom=textureAlchemyNumber("textureZoom",100)/100;
    const offsetX=textureAlchemyNumber("textureOffsetX",0)*1.28,offsetY=textureAlchemyNumber("textureOffsetY",0)*1.28;
    const rotated=rotation%180!==0,effectiveWidth=rotated?imageHeight:imageWidth,effectiveHeight=rotated?imageWidth:imageHeight;
    const baseScale=mode==="contain"?Math.min(256/effectiveWidth,256/effectiveHeight):Math.max(256/effectiveWidth,256/effectiveHeight);
    const average=pendingTextureImport.analysis?.average||[48,52,46];
    context.save();context.clearRect(0,0,256,256);context.fillStyle=`rgb(${average.join(",")})`;context.fillRect(0,0,256,256);
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality="high";
    context.filter=`brightness(${textureAlchemyNumber("textureBrightness",100)}%) contrast(${textureAlchemyNumber("textureContrast",100)}%) saturate(${textureAlchemyNumber("textureSaturation",100)}%)`;
    context.translate(128+offsetX,128+offsetY);context.rotate(rotation*Math.PI/180);
    if(mode==="stretch"){
      const size=256*zoom;context.drawImage(image,-size/2,-size/2,size,size);
    }else{
      const scale=baseScale*zoom;context.drawImage(image,-imageWidth*scale/2,-imageHeight*scale/2,imageWidth*scale,imageHeight*scale);
    }
    context.restore();
    return context.getImageData(0,0,256,256);
  }

  function blendTextureEdges(imageData,band) {
    const width=imageData.width,height=imageData.height,output=new ImageData(new Uint8ClampedArray(imageData.data),width,height);
    const horizontalSource=new Uint8ClampedArray(output.data),safeBand=Math.max(2,Math.min(Math.floor(Math.min(width,height)/2)-1,Math.round(band)));
    const smooth=(value)=>value*value*(3-2*value);
    for(let x=0;x<safeBand;x+=1){
      const opposite=width-1-x,t=smooth(x/(safeBand-1));
      for(let y=0;y<height;y+=1)for(let channel=0;channel<3;channel+=1){
        const left=(y*width+x)*4+channel,right=(y*width+opposite)*4+channel,average=(horizontalSource[left]+horizontalSource[right])/2;
        output.data[left]=Math.round(average*(1-t)+horizontalSource[left]*t);
        output.data[right]=Math.round(average*(1-t)+horizontalSource[right]*t);
      }
    }
    const verticalSource=new Uint8ClampedArray(output.data);
    for(let y=0;y<safeBand;y+=1){
      const opposite=height-1-y,t=smooth(y/(safeBand-1));
      for(let x=0;x<width;x+=1)for(let channel=0;channel<3;channel+=1){
        const top=(y*width+x)*4+channel,bottom=(opposite*width+x)*4+channel,average=(verticalSource[top]+verticalSource[bottom])/2;
        output.data[top]=Math.round(average*(1-t)+verticalSource[top]*t);
        output.data[bottom]=Math.round(average*(1-t)+verticalSource[bottom]*t);
      }
    }
    return output;
  }

  function quantizeGoldSrcImage(imageData) {
    const output=new ImageData(new Uint8ClampedArray(imageData.data),imageData.width,imageData.height);
    for(let index=0;index<output.data.length;index+=4){
      output.data[index]=Math.round(Math.round(output.data[index]*7/255)*255/7);
      output.data[index+1]=Math.round(Math.round(output.data[index+1]*7/255)*255/7);
      output.data[index+2]=Math.round(Math.round(output.data[index+2]*3/255)*255/3);
      output.data[index+3]=255;
    }
    return output;
  }

  function textureEdgeMismatch(imageData) {
    const {data,width,height}=imageData;let difference=0,samples=0;
    for(let y=0;y<height;y+=4)for(let channel=0;channel<3;channel+=1){difference+=Math.abs(data[(y*width)*4+channel]-data[(y*width+width-1)*4+channel]);samples++;}
    for(let x=0;x<width;x+=4)for(let channel=0;channel<3;channel+=1){difference+=Math.abs(data[x*4+channel]-data[((height-1)*width+x)*4+channel]);samples++;}
    return Math.round(difference/Math.max(1,samples)/255*100);
  }

  function renderTextureTilePreview(sourceCanvas) {
    const canvas=$("#textureTileCanvas"),context=canvas.getContext("2d"),cell=256/3;
    context.clearRect(0,0,256,256);context.imageSmoothingEnabled=true;
    for(let row=0;row<3;row+=1)for(let column=0;column<3;column+=1)context.drawImage(sourceCanvas,column*cell,row*cell,cell+1,cell+1);
    context.strokeStyle="rgba(215,244,90,.28)";context.lineWidth=1;
    [cell,cell*2].forEach((point)=>{context.beginPath();context.moveTo(point,0);context.lineTo(point,256);context.moveTo(0,point);context.lineTo(256,point);context.stroke();});
  }

  function renderTextureAlchemy() {
    if(!pendingTextureImport)return;
    let imageData=drawTextureAlchemySource();if(!imageData)return;
    if($("#textureMakeSeamless").checked)imageData=blendTextureEdges(imageData,textureAlchemyNumber("textureSeamWidth",48));
    if($("#textureGoldSrcPalette").checked)imageData=quantizeGoldSrcImage(imageData);
    const canvas=$("#textureImportCanvas"),context=canvas.getContext("2d",{willReadFrequently:true});context.putImageData(imageData,0,0);
    renderTextureTilePreview(canvas);pendingTextureImport.imageData=canvas.toDataURL("image/png");pendingTextureImport.edgeMismatch=textureEdgeMismatch(imageData);
    $("#textureZoomOutput").textContent=`${textureAlchemyNumber("textureZoom",100)}%`;
    $("#textureOffsetXOutput").textContent=String(textureAlchemyNumber("textureOffsetX",0));
    $("#textureOffsetYOutput").textContent=String(textureAlchemyNumber("textureOffsetY",0));
    $("#textureSeamOutput").textContent=`${textureAlchemyNumber("textureSeamWidth",48)} px`;
    $("#textureBrightnessOutput").textContent=`${textureAlchemyNumber("textureBrightness",100)}%`;
    $("#textureContrastOutput").textContent=`${textureAlchemyNumber("textureContrast",100)}%`;
    $("#textureSaturationOutput").textContent=`${textureAlchemyNumber("textureSaturation",100)}%`;
    if(pendingTextureImport.analysis)$("#textureImportAnalysis").textContent=`${pendingTextureImport.analysis.summary} · edge mismatch ${pendingTextureImport.edgeMismatch}%`;
  }

  function textureVariantData(kind) {
    const source=$("#textureImportCanvas"),canvas=document.createElement("canvas"),context=canvas.getContext("2d",{willReadFrequently:true});canvas.width=canvas.height=256;context.drawImage(source,0,0);
    const image=context.getImageData(0,0,256,256),data=image.data;
    for(let index=0;index<data.length;index+=4){
      const pixel=index/4,x=pixel%256,y=Math.floor(pixel/256);
      if(kind==="dark"){data[index]*=.7;data[index+1]*=.72;data[index+2]*=.76;}
      else if(kind==="light"){data[index]=data[index]*.82+46;data[index+1]=data[index+1]*.84+42;data[index+2]=data[index+2]*.86+36;}
      else if(kind==="worn"){
        const noise=((x*37+y*61+(x*y)%97)%43)-21,stain=Math.sin(x*.071+y*.043)*10+Math.sin(x*.019-y*.083)*8;
        const gray=(data[index]+data[index+1]+data[index+2])/3;
        data[index]=data[index]*.82+gray*.18+noise+stain;data[index+1]=data[index+1]*.82+gray*.18+noise*.72+stain;data[index+2]=data[index+2]*.82+gray*.18+noise*.5+stain;
      }
      data[index+3]=255;
    }
    context.putImageData(quantizeGoldSrcImage(image),0,0);return canvas.toDataURL("image/png");
  }

  function textureFamilyCode(base,suffix) {
    const normalized=String(base||"USR_TEXTURE").toUpperCase().replace(/[^A-Z0-9_]+/g,"_").replace(/^_+|_+$/g,"");
    const prefixed=normalized.startsWith("USR_")?normalized:`USR_${normalized}`;
    return `${prefixed.slice(0,Math.max(5,15-suffix.length)).replace(/_+$/,"")}${suffix}`.slice(0,15);
  }

  function resetTextureImport() {
    if(pendingTextureImport?.objectUrl)URL.revokeObjectURL(pendingTextureImport.objectUrl);
    pendingTextureImport=null;$("#textureFileInput").value="";$("#textureImportEditor").classList.add("hidden");$("#textureDropZone").classList.remove("hidden","drag-over");$("#textureImportStatus").classList.add("hidden");$("#textureImportStatus").classList.remove("error");
  }

  async function prepareTextureImport(file) {
    if(!file||!/^image\//.test(file.type)){showToast("Drop a PNG, JPG, WebP, or GIF image");return;}
    if(file.size>12_000_000){showToast("Choose an image smaller than 12 MB");return;}
    const image=new Image(),url=URL.createObjectURL(file);
    try{image.src=url;await image.decode();}catch(_){URL.revokeObjectURL(url);showToast("That image could not be decoded");return;}
    if(pendingTextureImport?.objectUrl)URL.revokeObjectURL(pendingTextureImport.objectUrl);
    pendingTextureImport={fileName:file.name,image,objectUrl:url,analysis:null,imageData:""};resetTextureAlchemyControls(false);
    drawTextureAlchemySource();const analysis=analyzeImportedTexture(file.name,$("#textureImportSourceCanvas").getContext("2d",{willReadFrequently:true}));pendingTextureImport.analysis=analysis;
    $("#textureImportLabel").value=analysis.label;$("#textureImportName").value=analysis.code;$("#textureImportCategory").value=analysis.category;$("#textureImportAnalysis").textContent=analysis.summary;
    suggestImportedTextureUses(analysis.category,`${analysis.label} ${file.name}`);
    renderTextureAlchemy();$("#textureDropZone").classList.add("hidden");$("#textureImportEditor").classList.remove("hidden");$("#textureImportStatus").classList.add("hidden");
  }

  async function installImportedTexture() {
    if(!pendingTextureImport)return;
    const button=$("#installTextureImport"),status=$("#textureImportStatus"),name=$("#textureImportName").value.toUpperCase().replace(/[^A-Z0-9_]+/g,"_").slice(0,15),label=$("#textureImportLabel").value.trim()||name,category=$("#textureImportCategory").value,uses=selectedImportedTextureUses();
    if(!uses.length){showToast("Choose at least one surface use for this texture");return;}
    const textures=[{name,label,category,uses,imageData:pendingTextureImport.imageData,variant:"base"}];
    if($("#textureVariantDark").checked)textures.push({name:textureFamilyCode(name,"_D"),label:`${label} — Dark`,category,uses,imageData:textureVariantData("dark"),variant:"dark"});
    if($("#textureVariantLight").checked)textures.push({name:textureFamilyCode(name,"_L"),label:`${label} — Light`,category,uses,imageData:textureVariantData("light"),variant:"light"});
    if($("#textureVariantWorn").checked)textures.push({name:textureFamilyCode(name,"_W"),label:`${label} — Weathered`,category,uses,imageData:textureVariantData("worn"),variant:"weathered"});
    button.disabled=true;button.textContent="Building texture family…";status.classList.remove("hidden","error");status.textContent=`Creating ${textures.length} GoldSrc textures, mipmaps, previews, and one atomic WAD update…`;
    try{
      const result=await companionRequest("/api/textures/alchemize",{method:"POST",body:JSON.stringify({textures,family:name})}),items=result.textures||[];
      items.forEach((item)=>registerMaterial(item.name,item.label,item.category,Date.now(),item.uses));installMaterialOptions();$("#textureSearch").value=items[0]?.name||name;$("#textureCategory").value="all";$("#textureUseFilter").value="all";resetTextureImport();renderTextureBrowser();status.classList.remove("hidden","error");status.textContent=`Installed ${items.length} matching material${items.length===1?"":"s"} for ${uses.map((use)=>TEXTURE_USE_INFO[use].label.toLowerCase()).join(", ")}. Click a card below to apply it.`;showToast(`${items.length} Texture Alchemist material${items.length===1?"":"s"} installed`);
    }catch(error){status.classList.remove("hidden");status.classList.add("error");status.textContent=`Import stopped: ${error.message}`;}
    finally{button.disabled=false;button.textContent="Install texture family";}
  }

  function selectedTextureForTarget() {
    const item = selectedItem(), target = $("#textureTarget").value;
    if (target === "ground") return environmentFor().groundMaterial;
    if (!item) return "";
    if (selected.type === "room" && target === "floor") return item.floorTexture;
    if (selected.type === "room" && target === "ceiling") return item.ceilingTexture;
    return surfaceTextureFor(item,selected.type);
  }

  function renderTextureBrowser() {
    const query = $("#textureSearch").value.trim().toLowerCase(), category = $("#textureCategory").value,usageFilter=$("#textureUseFilter").value,wadFilter=$("#textureWadFilter")?.value||"all";
    const contextualUsage=textureUsageForTarget(),resolvedUsage=usageFilter==="recommended"?contextualUsage:usageFilter;
    const selectedTexture = selectedTextureForTarget();
    const textures = Object.keys(MATERIAL_INFO).filter((texture) => {
      const matchesSearch = !query || texture.toLowerCase().includes(query) || MATERIAL_INFO[texture].toLowerCase().includes(query);
      const matchesCategory = category === "all" || (category === "favorites" ? textureFavorites.has(texture) : textureCategory(texture) === category);
      const matchesUsage=resolvedUsage==="all"||textureSurfaceUses(texture).includes(resolvedUsage);
      const official=officialTextureSources.get(texture);
      const matchesWad=wadFilter==="all"||(wadFilter==="included"?!official:wadFilter.startsWith("map:")?(official?.mapIds||[]).includes(wadFilter.slice(4)):official?.wadId===wadFilter);
      return matchesSearch && matchesCategory&&matchesUsage&&matchesWad;
    }).sort((a,b)=>(a===selectedTexture?-2:b===selectedTexture?2:0)||(textureFavorites.has(a)?-1:textureFavorites.has(b)?1:0)||MATERIAL_INFO[a].localeCompare(MATERIAL_INFO[b]));
    const categoryLabels = {architecture:"Architecture",concrete:"Concrete",brick:"Brick",stone:"Stone & gems",ground:"Ground",nature:"Nature",organic:"Organic patterns",fabric:"Fabric & leather",plaster:"Plaster",floor:"Floors",metal:"Metal",wood:"Wood",sunburst:"Sunburst"};
    const categoryOrder = ["architecture","concrete","brick","stone","ground","nature","organic","fabric","plaster","floor","metal","wood","sunburst"];
    const sourceLabel = (texture) => {const source=officialTextureSources.get(texture);return source?(wadFilter.startsWith("map:")?`${wadFilter.slice(4)}.bsp`:source.wad||source.map):texture.startsWith("USR_") ? "IMPORTED" : texture.startsWith("BO_") ? "CC0" : texture.startsWith("SUN_") ? "ORIGINAL" : "INCLUDED";};
    const card = (texture) => {const safeTexture=html(texture),label=html(MATERIAL_INFO[texture]),uses=textureSurfaceUses(texture),source=officialTextureSources.get(texture);return `<button class="texture-card ${texture === selectedTexture ? "selected" : ""}" data-texture="${safeTexture}" type="button" title="Apply ${label}"><span class="texture-source ${source?"official":""}">${html(sourceLabel(texture))}</span><img loading="lazy" src="${texturePreviewUrl(texture)}" alt="Miniature preview of ${label}"><strong>${label}</strong><small>${safeTexture}${source?` · ${source.width}×${source.height}`:""}</small><span class="texture-category-badge">${categoryLabels[textureCategory(texture)] || textureCategory(texture)}</span><span class="texture-use-badges">${uses.slice(0,3).map((use)=>`<span>${TEXTURE_USE_INFO[use]?.short||use}</span>`).join("")}${uses.length>3?`<span>+${uses.length-3}</span>`:""}</span><span class="favorite-texture ${textureFavorites.has(texture) ? "active" : ""}" data-favorite="${safeTexture}">★</span>${texture.startsWith("USR_")?`<span class="delete-texture" data-delete-texture="${safeTexture}" title="Delete imported texture">×</span>`:""}</button>`;};
    const visibleTextures=textures.slice(0,320);
    const groups = categoryOrder.map((key) => [key,visibleTextures.filter((texture) => textureCategory(texture) === key)]).filter(([,items]) => items.length);
    const usageSummary=usageFilter==="recommended"?`recommended for ${TEXTURE_USE_INFO[contextualUsage]?.label.toLowerCase()||contextualUsage}`:resolvedUsage==="all"?"all surface uses":TEXTURE_USE_INFO[resolvedUsage]?.label.toLowerCase()||resolvedUsage;
    $("#textureSummary").textContent = `Showing ${Math.min(textures.length,320)} of ${textures.length} matching materials (${Object.keys(MATERIAL_INFO).length.toLocaleString()} total) · ${usageSummary}${textures.length>320?" · narrow by search or WAD":""}`;
    $("#textureGrid").innerHTML = groups.map(([key,items]) => `<section class="texture-category-section"><h3>${categoryLabels[key] || key}<span>${items.length}</span></h3><div class="texture-category-grid">${items.map(card).join("")}</div></section>`).join("") || `<p class="analysis-intro">No textures match this filter.</p>`;
  }

  function renderBuiltInPrefabLibrary() {
    const query = $("#prefabSearch").value.trim().toLowerCase();
    const category = $("#prefabCategory").value;
    const prefabs = PREFAB_LIBRARY.filter((prefab) => {
      const matchesSearch = !query || `${prefab.name} ${prefab.description} ${prefab.size}`.toLowerCase().includes(query);
      return matchesSearch && (category === "all" || prefab.category === category);
    });
    $("#prefabGrid").innerHTML = prefabs.map((prefab) => `<button class="prefab-card" data-prefab="${prefab.id}" type="button"><span class="prefab-card-icon">${prefab.icon}</span><span><strong>${prefab.name}</strong><small>${prefab.description}</small><em>${prefab.category} · ${prefab.size}</em></span></button>`).join("") || `<p class="analysis-intro">No prefabs match this filter.</p>`;
  }

  function persistCustomPrefabs() {
    localStorage.setItem(CUSTOM_PREFAB_STORAGE_KEY, JSON.stringify(customPrefabs));
  }

  function isValidCustomPrefab(prefab) {
    const validTypes=new Set(["room","door","window","zone","prop","entity"]);
    return !!prefab&&typeof prefab.id==="string"&&typeof prefab.name==="string"&&prefab.name.trim().length>0
      &&Array.isArray(prefab.items)&&prefab.items.length>0&&prefab.items.length<=500
      &&prefab.items.every((entry)=>validTypes.has(entry?.type)&&entry.item&&typeof entry.item==="object"&&typeof entry.item.id==="string");
  }

  function storedItemBounds(type, item) {
    const points = item.points?.length ? item.points : item.planPoints?.length ? item.planPoints : null;
    if (points) {
      const xs=points.map((point)=>Number(point[0])),ys=points.map((point)=>Number(point[1]));
      return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),d:Math.max(...ys)-Math.min(...ys)};
    }
    if (type === "door" || type === "window") {
      const segment=openingSegment(item),xs=segment.map((point)=>point[0]),ys=segment.map((point)=>point[1]);
      return {x:Math.min(...xs)-.08,y:Math.min(...ys)-.08,w:Math.max(.16,Math.max(...xs)-Math.min(...xs)+.16),d:Math.max(.16,Math.max(...ys)-Math.min(...ys)+.16)};
    }
    return {x:Number(item.x)||0,y:Number(item.y)||0,w:Number(item.w)||1,d:Number(item.d)||1};
  }

  function customPrefabBounds(prefab) {
    const boxes=(prefab.items||[]).map((entry)=>storedItemBounds(entry.type,entry.item)).filter(Boolean);
    if (!boxes.length) return prefab.bounds || {x:0,y:0,w:1,d:1};
    const minX=Math.min(...boxes.map((box)=>box.x)),minY=Math.min(...boxes.map((box)=>box.y));
    const maxX=Math.max(...boxes.map((box)=>box.x+box.w)),maxY=Math.max(...boxes.map((box)=>box.y+box.d));
    return {x:minX,y:minY,w:Math.max(.25,maxX-minX),d:Math.max(.25,maxY-minY)};
  }

  function customPrefabThumbnail(prefab) {
    const bounds=customPrefabBounds(prefab),padding=.6,view=`${bounds.x-padding} ${bounds.y-padding} ${bounds.w+padding*2} ${bounds.d+padding*2}`;
    const colors={room:"#546b4a",prop:"#d1b057",zone:"#9b71d4",entity:"#72ddec",door:"#d7f45a",window:"#6bc9e8"};
    const shapes=(prefab.items||[]).map(({type,item})=>{
      const color=colors[type]||"#b6c1af";
      if(type==="door"||type==="window"){const [a,b]=openingSegment(item);return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width=".18" stroke-linecap="round"/>`;}
      if(type==="entity")return `<circle cx="${(Number(item.x)||0)+.5}" cy="${(Number(item.y)||0)+.5}" r=".34" fill="${color}" stroke="#071006" stroke-width=".08"/>`;
      const points=item.points?.length?item.points:item.planPoints?.length?item.planPoints:null;
      if(points)return `<polygon points="${points.map((point)=>`${Number(point[0])},${Number(point[1])}`).join(" ")}" fill="${color}" fill-opacity="${type==="room"?".46":".76"}" stroke="${color}" stroke-width=".09"${type==="zone"?' stroke-dasharray=".18 .12"':""}/>`;
      return `<rect x="${Number(item.x)||0}" y="${Number(item.y)||0}" width="${Number(item.w)||1}" height="${Number(item.d)||1}" rx=".06" fill="${color}" fill-opacity="${type==="room"?".46":".76"}" stroke="${color}" stroke-width=".09"${type==="zone"?' stroke-dasharray=".18 .12"':""}/>`;
    }).join("");
    return `<svg viewBox="${view}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${html(prefab.name||"Custom prefab")} miniature"><g>${shapes}</g></svg>`;
  }

  function customPrefabPivotPoint(prefab) {
    const bounds=customPrefabBounds(prefab);
    if(prefab.pivot==="topLeft")return [bounds.x,bounds.y];
    if(prefab.pivot==="bottomLeft")return [bounds.x,bounds.y+bounds.d];
    return [bounds.x+bounds.w/2,bounds.y+bounds.d/2];
  }

  function captureSelectedPrefab() {
    const entries=selectedEntries();
    if(!entries.length){showToast("Select one or more objects first");return null;}
    const selectedRoomIds=new Set(entries.filter((entry)=>entry.ref.type==="room").map((entry)=>entry.item.id));
    const disconnectedOpening=entries.find((entry)=>["door","window"].includes(entry.ref.type)
      &&!adjacentRoomsForOpening(entry.item).some((room)=>selectedRoomIds.has(room.id)));
    if(disconnectedOpening){
      showToast("Include a connected room with every saved door or window");return null;
    }
    const items=entries.map(({ref,item})=>{
      const clone=structuredClone(item);
      if(clone.floorLevel==null&&!["floor","floorPolygon"].includes(clone.kind))clone.floorLevel=itemLevel(ref.type,item);
      if(["door","window"].includes(ref.type)){clone.segment=openingSegment(clone);clone.edge=clone.edge?.length===2?structuredClone(clone.edge):structuredClone(clone.segment);}
      return {type:ref.type,item:clone};
    });
    const bounds=selectionBounds(entries)||{x:0,y:0,w:1,d:1};
    const vertical=entries.map((entry)=>verticalBounds(entry.ref,entry.item)).filter(Boolean);
    const base=vertical.length?Math.min(...vertical.map((item)=>item.base)):Math.min(...entries.map((entry)=>itemLevel(entry.ref.type,entry.item)));
    return {id:crypto.randomUUID(),version:1,name:entries.length===1?`${entries[0].item.label||entries[0].item.kind||entries[0].ref.type} prefab`:`${entries.length}-piece prefab`,category:entries.some((entry)=>entry.ref.type==="room")?"rooms":"architecture",tags:[],description:"",pivot:"center",preserveMaterials:true,bounds:{...bounds,base},items,createdAt:Date.now(),updatedAt:Date.now()};
  }

  function openCustomPrefabStudio(prefab=null) {
    const source=prefab?structuredClone(prefab):captureSelectedPrefab();
    if(!source)return;
    customPrefabDraft=source;editingCustomPrefabId=prefab?.id||null;
    $("#customPrefabDialogTitle").textContent=prefab?"Edit custom prefab":"Save reusable prefab";
    $("#customPrefabName").value=source.name||"";
    $("#customPrefabCategory").value=source.category||"architecture";
    $("#customPrefabPivot").value=source.pivot||"center";
    $("#customPrefabTags").value=(source.tags||[]).join(", ");
    $("#customPrefabDescription").value=source.description||"";
    $("#customPrefabPreserveMaterials").checked=source.preserveMaterials!==false;
    $("#customPrefabPreview").innerHTML=customPrefabThumbnail(source);
    const bounds=customPrefabBounds(source);
    $("#customPrefabFootprint").textContent=`${source.items.length} object${source.items.length===1?"":"s"} / ${Math.round(bounds.w*GRID)} x ${Math.round(bounds.d*GRID)} units`;
    $("#customPrefabSelectionSummary").textContent=prefab?"Update its library metadata. The captured geometry stays intact.":"The selected objects will remain fully editable whenever this prefab is placed.";
    if($("#prefabDialog").open)$("#prefabDialog").close();
    $("#customPrefabDialog").showModal();
    setTimeout(()=>$("#customPrefabName").focus(),0);
  }

  function saveCustomPrefabFromStudio() {
    if(!customPrefabDraft)return;
    const name=$("#customPrefabName").value.trim();
    if(!name){showToast("Give the prefab a name");return;}
    const now=Date.now(),updated={...customPrefabDraft,name,category:$("#customPrefabCategory").value,tags:$("#customPrefabTags").value.split(",").map((tag)=>tag.trim()).filter(Boolean).slice(0,12),description:$("#customPrefabDescription").value.trim(),pivot:$("#customPrefabPivot").value,preserveMaterials:$("#customPrefabPreserveMaterials").checked,updatedAt:now};
    if(editingCustomPrefabId){const index=customPrefabs.findIndex((prefab)=>prefab.id===editingCustomPrefabId);if(index>=0)customPrefabs[index]=updated;}
    else customPrefabs.unshift({...updated,createdAt:now});
    persistCustomPrefabs();$("#customPrefabDialog").close();customPrefabDraft=null;editingCustomPrefabId=null;renderPrefabLibrary();
    showToast(`${name} saved to My prefabs`);
  }

  function renderPrefabTransformSummary() {
    $("#prefabTransformSummary").textContent=`${customPrefabRotation} degrees / ${customPrefabMirrored?"mirrored":"normal"}`;
    $("#prefabMirror").classList.toggle("active",customPrefabMirrored);
  }

  function renderPrefabLibrary() {
    const query = $("#prefabSearch").value.trim().toLowerCase();
    const category = $("#prefabCategory").value;
    const builtIns = PREFAB_LIBRARY.filter((prefab) => {
      const matchesSearch = !query || `${prefab.name} ${prefab.description} ${prefab.size}`.toLowerCase().includes(query);
      return matchesSearch && category!=="personal" && (category === "all" || prefab.category === category);
    });
    const personal=customPrefabs.filter((prefab)=>{
      const matchesSearch=!query||`${prefab.name} ${prefab.description||""} ${(prefab.tags||[]).join(" ")}`.toLowerCase().includes(query);
      return matchesSearch&&(category==="all"||category==="personal"||prefab.category===category);
    });
    const builtInCards=builtIns.map((prefab) => `<button class="prefab-card" data-prefab="${prefab.id}" type="button"><span class="prefab-card-icon">${prefab.icon}</span><span><strong>${prefab.name}</strong><small>${prefab.description}</small><em>${prefab.category} Â· ${prefab.size}</em></span></button>`);
    const personalCards=personal.map((prefab)=>{const bounds=customPrefabBounds(prefab);return `<article class="custom-prefab-card"><button data-prefab="custom:${prefab.id}" type="button"><span class="prefab-card-icon">${customPrefabThumbnail(prefab)}</span><span class="prefab-card-details"><strong>${html(prefab.name)}</strong><small>${html(prefab.description||`${prefab.items.length} editable objects`)}</small><em>MY PREFAB Â· ${html(prefab.category)} Â· ${Math.round(bounds.w)} x ${Math.round(bounds.d)}</em></span></button><span class="custom-prefab-card-actions"><button data-edit-custom-prefab="${prefab.id}" type="button" title="Edit prefab">Edit</button><button data-delete-custom-prefab="${prefab.id}" type="button" title="Delete prefab">X</button></span></article>`;});
    $("#prefabGrid").innerHTML=[...personalCards,...builtInCards].join("")||`<p class="analysis-intro">No prefabs match this filter.</p>`;
    $("#createPrefabFromSelection").disabled=!selectedEntries().length;
    $("#exportCustomPrefabs").disabled=!customPrefabs.length;
    renderPrefabTransformSummary();
  }

  function renderLayoutLibrary() {
    const query = $("#layoutSearch").value.trim().toLowerCase();
    const category = $("#layoutCategory").value;
    const layouts = LAYOUT_LIBRARY.filter((layout) => {
      const matchesSearch = !query || `${layout.name} ${layout.description} ${layout.size}`.toLowerCase().includes(query);
      return matchesSearch && (category === "all" || layout.category === category);
    });
    $("#layoutGrid").innerHTML = layouts.map((layout) => `<button class="prefab-card layout-card" data-layout="${layout.id}" type="button"><span class="prefab-card-icon layout-card-icon">${layout.icon}</span><span><strong>${layout.name}</strong><small>${layout.description}</small><span class="layout-material-strip">${(layout.materials || []).map((texture) => `<img src="${texturePreviewUrl(texture)}" alt="${MATERIAL_INFO[texture] || texture} miniature" title="${MATERIAL_INFO[texture] || texture}">`).join("")}</span><em>${layout.category} · ${layout.size} grid</em></span></button>`).join("") || `<p class="analysis-intro">No layouts match this filter.</p>`;
  }

  function updateSkyThemePreview() {
    const environment = environmentFor();
    const theme = SKY_THEMES[environment.skyName] || SKY_THEMES.desert;
    $("#skyThemePreview").style.background = `linear-gradient(${theme.colors.join(",")})`;
    $("#skyThemeLabel").textContent = `${theme.label} · ${environment.skyName}`;
  }

  function syncEnvironmentDialog() {
    const environment = environmentFor();
    $("#groundEnabled").checked = environment.groundEnabled;
    $("#groundSize").value = environment.groundSize;
    $("#groundPadding").value = environment.groundPadding;
    populateMaterialSelect("environmentGroundMaterialSelect","ground",environment.groundMaterial);
    $("#environmentGroundMaterialSelect").value = environment.groundMaterial;
    $("#openSkyDefault").checked = environment.openSkyDefault;
    $("#skyNameSelect").value = environment.skyName;
    updateSurfaceMiniature("environmentGroundMiniature", environment.groundMaterial);
    updateSkyThemePreview();
  }

  function changeEnvironment(update, message) {
    const before = snapshot();
    update(environmentFor());
    environmentFor();
    commit(before);
    syncEnvironmentDialog();
    if (message) showToast(message);
  }

  function openTextureLibrary(target = "material") {
    const roomSelected = selected?.type === "room";
    $("#textureTarget").value = target;
    [...$("#textureTarget").options].forEach((option) => { if (["floor","ceiling"].includes(option.value)) option.disabled = !roomSelected; });
    $("#textureSearch").value = ""; $("#textureCategory").value = "all";$("#textureUseFilter").value="recommended"; renderTextureBrowser(); $("#textureDialog").showModal();
    refreshTextureCatalog();
  }

  function choosePrefab(prefabId) {
    const customId=prefabId.startsWith("custom:")?prefabId.slice(7):null;
    const prefab = customId?customPrefabs.find((item)=>item.id===customId):PREFAB_LIBRARY.find((item) => item.id === prefabId);
    if (!prefab) return;
    activePrefabId = customId?`custom:${prefab.id}`:prefab.id;
    $("#prefabDialog").close();
    setTool(!customId&&prefab.tool ? prefab.tool : "prefab");
    showToast(!customId&&prefab.tool ? `${prefab.name}: ${TOOL_INFO[prefab.tool].tip}` : `${prefab.name} selected - click the desired pivot position`);
  }

  const BEGINNER_TOOLS = new Set([
    "room","corridor","door","window","select","ruler","pan","wall","diagonal","platform","floor","crate","stairs","ramp",
    "light","ct","t","buyCt","buyT","bombA","bombB","hostage","rescue","targetDummy"
  ]);

  function toolIsEssential(tool) {
    return !tool.dataset.tool || BEGINNER_TOOLS.has(tool.dataset.tool);
  }

  function renderRecentTools() {
    const valid=recentToolIds.filter((id)=>TOOL_INFO[id]&&$(`.tool[data-tool="${id}"]`)).slice(0,4);
    recentToolIds=valid;$("#recentTools").classList.toggle("hidden",!valid.length);
    $("#recentToolList").innerHTML=valid.map((id)=>`<button class="recent-tool" type="button" data-recent-tool="${id}" title="${html(TOOL_INFO[id].tip)}">${html(TOOL_INFO[id].title.replace(/^(Draw|Place|Select|Move) /i,""))}</button>`).join("");
  }

  function rememberRecentTool(tool) {
    if(!TOOL_INFO[tool]||["select","pan"].includes(tool))return;
    recentToolIds=[tool,...recentToolIds.filter((id)=>id!==tool)].slice(0,4);
    localStorage.setItem("blockout-recent-tools",JSON.stringify(recentToolIds));renderRecentTools();
  }

  function filterSidebarTools() {
    const query = $("#toolSearch").value.trim().toLowerCase(),searching=!!query;
    let visibleCount=0;
    $$(".tool-group").forEach((group) => {
      const tools = [...group.querySelectorAll(".tool")],workspaceMatches=toolWorkspace==="start"||group.dataset.workspace===toolWorkspace;
      tools.forEach((tool) => {
        const matchesSearch=!query||`${tool.textContent} ${tool.title||""} ${tool.dataset.tool||""}`.toLowerCase().includes(query);
        const modeMatches=toolWorkspace==="start"?toolIsEssential(tool):(!beginnerToolMode||toolIsEssential(tool));
        tool.classList.toggle("search-hidden",searching&&!matchesSearch);
        tool.classList.toggle("mode-hidden",!searching&&(!workspaceMatches||!modeMatches));
        if(!tool.classList.contains("search-hidden")&&!tool.classList.contains("mode-hidden"))visibleCount++;
      });
      const hasVisible=tools.some((tool)=>!tool.classList.contains("search-hidden")&&!tool.classList.contains("mode-hidden"));
      group.classList.toggle("search-hidden",searching&&!hasVisible);
      group.classList.toggle("workspace-hidden",!searching&&!hasVisible);
      if((searching||toolWorkspace==="start")&&hasVisible)group.open=true;
    });
    $$("#toolWorkspaces [data-tool-workspace]").forEach((button)=>button.classList.toggle("active",button.dataset.toolWorkspace===toolWorkspace));
    $("#toolModeButton").textContent=beginnerToolMode?"Beginner":"All tools";
    $("#toolModeButton").title=beginnerToolMode?"Show every advanced tool in this workspace":"Return to the beginner tool set";
    $("#toolboxSummary").textContent=searching?`${visibleCount} matching tool${visibleCount===1?"":"s"}`:toolWorkspace==="start"?`${visibleCount} essential tools · everything needed to begin`:`${visibleCount} ${beginnerToolMode?"essential ":""}tool${visibleCount===1?"":"s"} in ${toolWorkspace}`;
  }

  function setToolWorkspace(workspace) {
    if(!["start","build","gameplay","logic","assets"].includes(workspace))return;
    toolWorkspace=workspace;localStorage.setItem("blockout-tool-workspace",workspace);
    $("#toolSearch").value="";filterSidebarTools();
  }

  function setRightPanel(panel) {
    if(!["selection","guide"].includes(panel))return;
    rightPanel=panel;localStorage.setItem("blockout-right-panel",panel);
    $$("[data-right-pane]").forEach((pane)=>pane.classList.toggle("hidden",pane.dataset.rightPane!==panel));
    $$("#rightPanelTabs [data-right-panel]").forEach((button)=>button.classList.toggle("active",button.dataset.rightPanel===panel));
  }

  function applyBrowserTexture(texture) {
    ensureMaterialImage(texture);
    const item = selectedItem();
    const before = snapshot(), target = $("#textureTarget").value;
    if (target === "ground") environmentFor().groundMaterial = texture;
    else if (!item || !["room", "prop"].includes(selected.type)) return;
    else setSurfaceTexture(item,selected.type,texture,target==="material"?surfaceTarget:target);
    commit(before); installMaterialOptions(); $("#textureDialog").close(); showToast(`${MATERIAL_INFO[texture]} applied`);
  }

  function analysisLineClear(from, to, walls) {
    const dx=to.x-from.x, dy=to.y-from.y, distance=Math.hypot(dx,dy);
    if (distance < .01) return true;
    return !walls.some((wall) => !wall.walkable && rayWallDistance(from.x,from.y,dx/distance,dy/distance,wall) < distance-.08);
  }

  function findAnalysisRoute(start, goal, walls) {
    const sx=Math.floor(start.x), sy=Math.floor(start.y), gx=Math.floor(goal.x), gy=Math.floor(goal.y);
    const bounds={
      minX:Math.floor(Math.min(...state.rooms.map((room)=>room.x)))-1,
      minY:Math.floor(Math.min(...state.rooms.map((room)=>room.y)))-1,
      maxX:Math.ceil(Math.max(...state.rooms.map((room)=>room.x+room.w)))+1,
      maxY:Math.ceil(Math.max(...state.rooms.map((room)=>room.y+room.d)))+1
    };
    const key=(x,y)=>`${x},${y}`, queue=[[sx,sy]], previous=new Map([[key(sx,sy),null]]);
    for(let cursor=0;cursor<queue.length && cursor<24000;cursor++){
      const [x,y]=queue[cursor];
      if(x===gx&&y===gy) break;
      for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
        const id=key(nx,ny); if(previous.has(id)||nx<bounds.minX||nx>bounds.maxX||ny<bounds.minY||ny>bounds.maxY) continue;
        const from={x:x+.5,y:y+.5}, to={x:nx+.5,y:ny+.5};
        if(!isPointInSpace(to.x,to.y)) continue;
        const distance=1, dx=to.x-from.x, dy=to.y-from.y;
        if(walls.some((wall)=>!wall.walkable&&rayWallDistance(from.x,from.y,dx,dy,wall)<distance+.02)) continue;
        if(walkSurfaceHeightAt(to.x,to.y)-walkSurfaceHeightAt(from.x,from.y)>.75) continue;
        previous.set(id,[x,y]); queue.push([nx,ny]);
      }
    }
    if(!previous.has(key(gx,gy))) return null;
    const path=[]; let current=[gx,gy];
    while(current){path.push({x:current[0]+.5,y:current[1]+.5});current=previous.get(key(current[0],current[1]));}
    path.reverse(); return path;
  }

  function calculateCompetitiveAnalysis() {
    if(!state.rooms.length) return {routes:[],direct:0};
    const walls=buildWalkWalls(), teams={CT:state.entities.filter((item)=>item.kind==="ct"),T:state.entities.filter((item)=>item.kind==="t")};
    const objectives=state.entities.filter((item)=>["bombA","bombB"].includes(item.kind));
    const routes=[];
    Object.entries(teams).forEach(([team,spawns])=>objectives.forEach((objective)=>{
      let best=null;
      spawns.forEach((spawn)=>{
        const from={x:spawn.x+.5,y:spawn.y+.5},to={x:objective.x+.5,y:objective.y+.5},path=findAnalysisRoute(from,to,walls);
        if(path&&(!best||path.length<best.path.length)) best={from,to,path};
      });
      if(best){const units=Math.max(0,best.path.length-1)*GRID,direct=analysisLineClear(best.from,best.to,walls),enemies=teams[team==="CT"?"T":"CT"],samples=best.path.filter((_,index)=>index%2===0),exposed=samples.length?samples.filter((point)=>enemies.some((enemy)=>analysisLineClear(point,{x:enemy.x+.5,y:enemy.y+.5},walls))).length/samples.length:0;routes.push({team,target:objective.kind==="bombA"?"Bombsite A":"Bombsite B",units,seconds:units/250,direct,exposure:Math.round(exposed*100),path:best.path,from:best.from,to:best.to});}
      else routes.push({team,target:objective.kind==="bombA"?"Bombsite A":"Bombsite B",units:null,seconds:null,direct:false,path:[]});
    }));
    const direct=routes.filter((route)=>route.direct).length;
    const narrowOpenings=[...state.doors,...state.windows].filter((item)=>(item.width||1)*GRID<96).length;
    const tacticalCover=state.props.filter((item)=>["crate","wall","wallPolygon","diagonal","breakable"].includes(item.kind)&&(item.height||1)*GRID>=40&&(item.height||1)*GRID<=96).length;
    const longSightlines=routes.filter((route)=>route.direct&&(route.units||0)>1024).length;
    return {routes,direct,walls,narrowOpenings,tacticalCover,longSightlines};
  }

  function runCompetitiveAnalysis() {
    analysisOverlay=calculateCompetitiveAnalysis();
    const valid=analysisOverlay.routes.filter((route)=>route.seconds!=null), average=valid.length?valid.reduce((sum,route)=>sum+route.seconds,0)/valid.length:0;
    $("#analysisSummary").innerHTML=`<div><strong>${valid.length}</strong><small>reachable team routes</small></div><div><strong>${average.toFixed(1)}s</strong><small>average objective timing</small></div><div><strong>${analysisOverlay.direct}</strong><small>direct spawn-to-site sightlines</small></div><div><strong>${analysisOverlay.narrowOpenings}</strong><small>openings below 96 units</small></div><div><strong>${analysisOverlay.tacticalCover}</strong><small>combat-height cover pieces</small></div><div><strong>${analysisOverlay.longSightlines}</strong><small>long direct sightlines</small></div>`;
    $("#analysisRoutes").innerHTML=analysisOverlay.routes.length?analysisOverlay.routes.map((route)=>`<div class="route-row"><strong>${route.team} → ${route.target}</strong><span>${route.units==null?"Blocked":`${route.units} units`}</span><span>${route.seconds==null?"—":`${route.seconds.toFixed(1)} sec`}</span><span class="${route.direct?"clear-shot":""}">${route.direct?"Direct sightline":"Covered route"} · ${route.exposure||0}% exposed</span></div>`).join(""):`<div class="route-row"><strong>Add CT/T spawns and bombsites to analyze competitive routes.</strong></div>`;
    drawEditor();
  }

  function drawAnalysisOverlay() {
    if(!analysisOverlay||!$("#showAnalysisOverlay")?.checked) return;
    ectx.save(); ectx.lineCap="round"; ectx.lineJoin="round";
    analysisOverlay.routes.forEach((route)=>{
      if(!route.path?.length) return;
      ectx.beginPath(); route.path.forEach((point,index)=>{const screen=cellToScreen(point.x,point.y);index?ectx.lineTo(screen.x,screen.y):ectx.moveTo(screen.x,screen.y);});
      ectx.strokeStyle=route.team==="CT"?"rgba(98,169,255,.72)":"rgba(240,156,74,.72)";ectx.lineWidth=3;ectx.setLineDash([6,5]);ectx.stroke();
      if(route.direct){const a=cellToScreen(route.from.x,route.from.y),b=cellToScreen(route.to.x,route.to.y);ectx.beginPath();ectx.moveTo(a.x,a.y);ectx.lineTo(b.x,b.y);ectx.strokeStyle="rgba(255,90,80,.8)";ectx.lineWidth=1.5;ectx.setLineDash([2,3]);ectx.stroke();}
    });
    ectx.restore();
  }

  function verticalBounds(ref,item) {
    const center={x:item.x+(item.w||1)/2,y:item.y+(item.d||1)/2};
    if(ref.type==="room"){const base=roomFloor(item);return{base,top:base+(item.height||4)};}
    if(ref.type==="prop"&&["floor","floorPolygon"].includes(item.kind)){const top=Number(item.elevation)||0;return{base:top-(Number(item.thickness)||.25),top};}
    if(ref.type==="prop"){const base=Number(item.floorLevel)||0;return{base,top:base+(item.height||1)};}
    if(ref.type==="zone"){const base=floorLevelAt(center.x,center.y);return{base,top:base+(item.height||2)};}
    return null;
  }

  function syncElevationSelectionFields() {
    const entries=selectedEntries(),baseInput=$("#elevationBase"),topInput=$("#elevationTop");
    if(entries.length!==1){baseInput.disabled=topInput.disabled=true;baseInput.value=topInput.value="";$("#elevationClearance").textContent="Select one room, floor, structure, or trigger profile.";return;}
    const bounds=verticalBounds(entries[0].ref,entries[0].item);
    if(!bounds){baseInput.disabled=topInput.disabled=true;$("#elevationClearance").textContent="This point entity has no editable vertical volume.";return;}
    baseInput.disabled=topInput.disabled=false;baseInput.value=Math.round(bounds.base*GRID);topInput.value=Math.round(bounds.top*GRID);
    const height=Math.round((bounds.top-bounds.base)*GRID),host=entries[0].ref.type==="room"?null:state.rooms.find((room)=>pointInRoom(entries[0].item.x+(entries[0].item.w||1)/2,entries[0].item.y+(entries[0].item.d||1)/2,room)),clearance=host?Math.round((roomFloor(host)+host.height-bounds.top)*GRID):null;
    $("#elevationClearance").textContent=`Height ${height} units${clearance==null?"":` · ${clearance} units clear below host ceiling`}${clearance!=null&&clearance<72?" · WARNING: player clearance is tight":""}.`;
  }

  function drawElevationEditor() {
    if(!$("#elevationDialog").open)return;
    const rect=resizeCanvas(elevationCanvas,elevationCtx),axis=elevationAxis,perp=axis==="x"?"y":"x",all=[...state.rooms.map((item)=>({ref:{type:"room",id:item.id},item})),...state.props.map((item)=>({ref:{type:"prop",id:item.id},item})),...state.zones.map((item)=>({ref:{type:"zone",id:item.id},item}))];
    elevationCtx.clearRect(0,0,rect.width,rect.height);elevationHitRegions=[];
    if(!all.length){elevationCtx.fillStyle="#81907a";elevationCtx.textAlign="center";elevationCtx.fillText("Draw a room or ground structure first",rect.width/2,rect.height/2);return;}
    const mins=all.map(({item})=>item[axis]||0),maxs=all.map(({item})=>(item[axis]||0)+(item[axis==="x"?"w":"d"]||1)),pmins=all.map(({item})=>item[perp]||0),pmaxs=all.map(({item})=>(item[perp]||0)+(item[perp==="x"?"w":"d"]||1));
    const min=Math.min(...mins)-1,max=Math.max(...maxs)+1,pmin=Math.min(...pmins),pmax=Math.max(...pmaxs),slice=pmin+(pmax-pmin)*(Number($("#elevationSlice").value)||50)/100;
    const vertical=all.map((entry)=>verticalBounds(entry.ref,entry.item)).filter(Boolean),zmin=Math.min(-1,...vertical.map((item)=>item.base))-1,zmax=Math.max(5,...vertical.map((item)=>item.top))+1,pad={l:48,r:18,t:20,b:32},sx=(rect.width-pad.l-pad.r)/Math.max(1,max-min),sz=(rect.height-pad.t-pad.b)/Math.max(1,zmax-zmin),screenX=(value)=>pad.l+(value-min)*sx,screenY=(value)=>rect.height-pad.b-(value-zmin)*sz;
    elevationCtx.strokeStyle="rgba(100,120,91,.22)";elevationCtx.fillStyle="#73806d";elevationCtx.font="7px ui-monospace";
    for(let z=Math.ceil(zmin);z<=zmax;z++){const y=screenY(z);elevationCtx.beginPath();elevationCtx.moveTo(pad.l,y);elevationCtx.lineTo(rect.width-pad.r,y);elevationCtx.stroke();elevationCtx.fillText(`${z*GRID}`,6,y+3);}
    const visible=all.filter(({item})=>slice>=(item[perp]||0)-.001&&slice<=(item[perp]||0)+(item[perp==="x"?"w":"d"]||1)+.001).sort((a,b)=>a.ref.type==="room"?-1:b.ref.type==="room"?1:0);
    visible.forEach(({ref,item})=>{const vb=verticalBounds(ref,item);if(!vb)return;const x=screenX(item[axis]||0),right=screenX((item[axis]||0)+(item[axis==="x"?"w":"d"]||1)),y=screenY(vb.top),bottom=screenY(vb.base),active=isRefSelected(ref.type,ref.id),color=ref.type==="room"?"#637354":ref.type==="zone"?"#a27ee8":MATERIAL_COLORS[item.texture]||"#a37954";elevationCtx.globalAlpha=ref.type==="room"?.28:.72;elevationCtx.fillStyle=color;elevationCtx.fillRect(x,y,Math.max(2,right-x),Math.max(2,bottom-y));elevationCtx.globalAlpha=1;elevationCtx.strokeStyle=active?"#d7f45a":"#819276";elevationCtx.lineWidth=active?2.5:1;elevationCtx.strokeRect(x+.5,y+.5,Math.max(1,right-x-1),Math.max(1,bottom-y-1));if(right-x>42){elevationCtx.fillStyle=active?"#d7f45a":"#d9e2d3";elevationCtx.font="700 7px system-ui";elevationCtx.fillText(item.label||item.kind||ref.type,x+5,y+12);}elevationHitRegions.push({ref,x1:x,y1:y,x2:right,y2:bottom});});
    elevationCtx.strokeStyle="#72ddec";elevationCtx.setLineDash([4,4]);elevationCtx.beginPath();elevationCtx.moveTo(pad.l,screenY(0));elevationCtx.lineTo(rect.width-pad.r,screenY(0));elevationCtx.stroke();elevationCtx.setLineDash([]);$("#elevationSliceLabel").textContent=`${perp.toUpperCase()} slice ${Math.round(slice*GRID)} units · ${visible.length} profiles`;
    syncElevationSelectionFields();
  }

  function applyElevationField(which,value) {
    const entry=selectedEntries()[0];if(!entry)return;const vb=verticalBounds(entry.ref,entry.item);if(!vb)return;const before=snapshot(),next=Number(value)/GRID,item=entry.item;
    if(which==="base"){
      if(entry.ref.type==="room"){const delta=next-roomFloor(item);item.floorLevel=next;state.props.filter((prop)=>pointInRoom(prop.x+(prop.w||1)/2,prop.y+(prop.d||1)/2,item)).forEach((prop)=>{prop.floorLevel=(Number(prop.floorLevel)||0)+delta;if(["floor","floorPolygon"].includes(prop.kind))prop.elevation=(Number(prop.elevation)||0)+delta;});}
      else if(entry.ref.type==="prop"&&["floor","floorPolygon"].includes(item.kind))item.thickness=Math.max(.125,(Number(item.elevation)||vb.top)-next);
      else if(entry.ref.type==="prop")item.floorLevel=next;
    }else{
      if(entry.ref.type==="prop"&&["floor","floorPolygon"].includes(item.kind))item.elevation=next;else item.height=Math.max(.25,next-vb.base);
    }
    commit(before);drawElevationEditor();
  }

  function footprintsOverlap(a,b) {
    const polygons=[roomPlanPoints(a),roomPlanPoints(b)];
    for(const points of polygons)if(!points?.length)return false;
    for(const points of polygons){
      for(let index=0;index<points.length;index++){
        const first=points[index],second=points[(index+1)%points.length],axis=[-(second[1]-first[1]),second[0]-first[0]];
        const projections=polygons.map((polygon)=>polygon.map((point)=>point[0]*axis[0]+point[1]*axis[1]));
        if(Math.max(...projections[0])<=Math.min(...projections[1])+.001||Math.max(...projections[1])<=Math.min(...projections[0])+.001)return false;
      }
    }
    return true;
  }

  function footprintContains(item,x,y) {
    if(item.points?.length)return pointInPolygon(x,y,item.points);
    return x>=item.x&&x<=item.x+(item.w||1)&&y>=item.y&&y<=item.y+(item.d||1);
  }

  function playableSurfaceAt(x,y,level) {
    if(environmentFor().groundEnabled&&Math.abs(environmentFor().groundElevation-level)<.13&&pointInEnvironmentGround(x,y))return true;
    if(state.rooms.some((room)=>Math.abs(roomFloor(room)-level)<.13&&pointInRoom(x,y,room)&&!pointInFloorOpening(x,y,level,room.id)))return true;
    return state.props.some((prop)=>{
      const top=["floor","floorPolygon"].includes(prop.kind)?Number(prop.elevation)||0:["platform","platformPolygon"].includes(prop.kind)?(Number(prop.floorLevel)||0)+(Number(prop.height)||1):null;
      return top!=null&&Math.abs(top-level)<.13&&footprintContains(prop,x,y);
    });
  }

  function connectorTopPoint(prop,offset=.32) {
    if(prop.direction==="w")return{x:prop.x-offset,y:prop.y+prop.d/2};
    if(prop.direction==="s")return{x:prop.x+prop.w/2,y:prop.y+prop.d+offset};
    if(prop.direction==="n")return{x:prop.x+prop.w/2,y:prop.y-offset};
    return{x:prop.x+prop.w+offset,y:prop.y+prop.d/2};
  }

  function hasLandingNear(point,level,radius=.55) {
    return [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius],[radius,radius],[-radius,radius],[radius,-radius],[-radius,-radius]].some(([dx,dy])=>playableSurfaceAt(point.x+dx,point.y+dy,level));
  }

  function connectorLandingRect(prop) {
    const breadth=Math.max(1,prop.direction==="e"||prop.direction==="w"?prop.d:prop.w);
    if(prop.direction==="w")return{x:prop.x-1,y:prop.y,w:1,d:breadth};
    if(prop.direction==="s")return{x:prop.x,y:prop.y+prop.d,w:breadth,d:1};
    if(prop.direction==="n")return{x:prop.x,y:prop.y-1,w:breadth,d:1};
    return{x:prop.x+prop.w,y:prop.y,w:1,d:breadth};
  }

  function connectorOpeningRect(prop,room) {
    const landing=connectorLandingRect(prop),width=Math.min(2,Math.max(1,landing.w)),depth=Math.min(2,Math.max(1,landing.d));
    const maxX=room.x+room.w-width-.25,maxY=room.y+room.d-depth-.25;
    if(maxX<room.x+.25||maxY<room.y+.25)return null;
    return{
      x:Math.max(room.x+.25,Math.min(maxX,landing.x)),
      y:Math.max(room.y+.25,Math.min(maxY,landing.y)),
      w:width,d:depth,
    };
  }

  function connectorDestination(prop) {
    const base=Number(prop.floorLevel)||0,rawLevel=base+(Number(prop.height)||1),point=connectorTopPoint(prop,.18);
    const reach=prop.kind==="ladder"?.55:.13;
    const room=state.rooms
      .filter((candidate)=>pointInRoom(point.x,point.y,candidate)&&roomFloor(candidate)>=rawLevel-.13&&roomFloor(candidate)<=rawLevel+reach)
      .sort((a,b)=>Math.abs(roomFloor(a)-rawLevel)-Math.abs(roomFloor(b)-rawLevel))[0]||null;
    return{base,rawLevel,level:room?roomFloor(room):rawLevel,point,room};
  }

  function assistVerticalConnector(prop) {
    if(!smartConnectionsEnabled||!["stairs","ramp","ladder"].includes(prop.kind))return[];
    const created=[],destination=connectorDestination(prop),{base,level:top,point:topPoint,room:upperRoom}=destination;
    if(upperRoom&&!pointInFloorOpening(topPoint.x,topPoint.y,top,upperRoom.id)){
      const holeRect=!upperRoom.points?.length?connectorOpeningRect(prop,upperRoom):null;
      if(holeRect&&!state.props.some((item)=>item.kind==="floorHole"&&Math.abs((Number(item.floorLevel)||0)-top)<.13&&rectanglesOverlap(item,holeRect))){
        const groupId=prop.groupId||crypto.randomUUID();prop.groupId=groupId;
        const hole={id:crypto.randomUUID(),kind:"floorHole",label:"SMART FLOOR OPENING",...holeRect,height:.25,floorLevel:top,hostRoomId:upperRoom.id,texture:"BLACK",groupId};
        state.props.push(hole);created.push(hole);
      }
      return created;
    }
    if(!hasLandingNear(topPoint,top)){
      const landingRect=connectorLandingRect(prop);
      const clear=rectIsInsideSpace(landingRect)&&!state.props.some((item)=>item.id!==prop.id&&item.kind!=="floorHole"&&rectanglesOverlap(item,landingRect));
      if(clear){
        const groupId=prop.groupId||crypto.randomUUID();prop.groupId=groupId;
        const landing={id:crypto.randomUUID(),kind:"platform",label:"SMART LANDING",...landingRect,height:top-base,floorLevel:base,texture:"BO_CONCRETE",direction:prop.direction,groupId};
        state.props.push(landing);created.push(landing);
      }
    }
    return created;
  }

  function calculatePreflight() {
    const issues=[],add=(severity,title,detail,ref=null)=>issues.push({severity,title,detail,ref});
    if(!state.rooms.length&&!environmentFor().groundEnabled)add("error","No sealed world","Draw a room or enable map-wide ground before compiling.");
    if(!state.entities.some((item)=>item.kind==="ct"))add("error","Missing CT spawn","Competitive and hostage maps need at least one Counter-Terrorist spawn.");
    if(!state.entities.some((item)=>item.kind==="t"))add("error","Missing T spawn","Add at least one Terrorist spawn.");
    if(!state.entities.some((item)=>["bombA","bombB","hostage"].includes(item.kind)))add("error","Missing objective","Add a bombsite or hostage objective.");
    if(state.entities.some((item)=>item.kind==="hostage")&&!state.zones.some((item)=>item.kind==="rescue"))add("error","Hostages have no rescue zone","Draw at least one hostage rescue volume.");
    state.rooms.forEach((room)=>{if(room.points?.length){const error=polygonValidation(room.points);if(error)add("error","Invalid room polygon",error,{type:"room",id:room.id});}if((room.height||0)*GRID<128)add("warning","Low room clearance",`${Math.round((room.height||0)*GRID)} units high; standing players need about 128 units.`,{type:"room",id:room.id});});
    for(let first=0;first<state.rooms.length;first++)for(let second=first+1;second<state.rooms.length;second++){
      const a=state.rooms[first],b=state.rooms[second],aBase=roomFloor(a),bBase=roomFloor(b);
      if(Math.abs(aBase-bBase)<.13||!footprintsOverlap(a,b))continue;
      const overlap=Math.min(aBase+(a.height||4),bBase+(b.height||4))-Math.max(aBase,bBase);
      if(overlap>.13)add("error","Building levels overlap",`${a.label||"Room"} and ${b.label||"Room"} occupy the same horizontal and vertical space by ${Math.round(overlap*GRID)} units.`,{type:"room",id:b.id});
    }
    state.props.forEach((prop)=>{if(prop.points?.length){const error=polygonValidation(prop.points);if(error)add("error","Invalid structure polygon",error,{type:"prop",id:prop.id});}if(!(["platformPolygon","floorPolygon","wallPolygon","cylinder"].includes(prop.kind)?polygonIsInsideSpace(prop.points||[]):rectIsInsideSpace(prop)))add("error","Structure outside buildable space",`${prop.kind} is not fully supported by a room or map ground.`,{type:"prop",id:prop.id});const propLevel=itemLevel("prop",prop),host=state.rooms.find((room)=>Math.abs(roomFloor(room)-propLevel)<.13&&pointInRoom(prop.x+(prop.w||1)/2,prop.y+(prop.d||1)/2,room)),vb=verticalBounds({type:"prop"},prop);if(host&&vb?.top>roomFloor(host)+host.height+.01)add("error","Structure crosses the ceiling",`Top is ${Math.round((vb.top-roomFloor(host))*GRID)} units above this floor, beyond the room ceiling.`,{type:"prop",id:prop.id});if(prop.kind==="stairs"&&prop.height*GRID/Math.max(1,prop.steps||1)>18)add("warning","Stair risers are too tall","Keep individual risers at or below 18 GoldSrc units.",{type:"prop",id:prop.id});if(["ramp","wedge"].includes(prop.kind)&&prop.height/Math.max(.01,structureRun(prop))>1)add("warning","Ramp is steeper than 45°","Reduce its rise or lengthen the run.",{type:"prop",id:prop.id});});
    [...state.rooms.map((item)=>({type:"room",item})),...state.props.map((item)=>({type:"prop",item}))].forEach(({type,item})=>{
      const bounds=itemBoundsForRef({type,id:item.id});
      if(bounds&&Math.min(bounds.w,bounds.d)*GRID<8)add("error","Brush is too thin","GoldSrc brush footprints must remain at least 8 units thick.",{type,id:item.id});
      if(item.points?.length>16)add("error","Brush has too many corners",`${item.points.length} corners exceed Blockout's 16-corner compile-safe limit.`,{type,id:item.id});
      if(type==="room"&&((Number(item.wallThickness)||.25)*GRID<8||(Number(item.wallThickness)||.25)*GRID>64))add("warning","Unusual room wall thickness","Keep room shell thickness between 8 and 64 units.",{type,id:item.id});
    });
    state.props.filter((prop)=>prop.kind==="floorHole").forEach((prop)=>{const host=state.rooms.find((room)=>room.id===prop.hostRoomId),level=Number(prop.floorLevel)||0,cx=prop.x+prop.w/2,cy=prop.y+prop.d/2,lowerRooms=state.rooms.filter((room)=>room.id!==prop.hostRoomId&&roomFloor(room)<level-.1&&pointInRoom(cx,cy,room)).sort((a,b)=>roomFloor(b)-roomFloor(a)),lower=lowerRooms[0];if(!host||host.points?.length)add("error","Unsupported floor opening","Floor openings require one rectangular host room.",{type:"prop",id:prop.id});if(!lower&&!(environmentFor().groundEnabled&&environmentFor().groundElevation<level-.1))add("error","Floor opening has no lower landing","Add a lower room or terrain below this opening to avoid a void leak.",{type:"prop",id:prop.id});if(lower&&lower.points?.length)add("error","Unsupported lower shaft ceiling","The room below a floor opening must be rectangular so its ceiling can be cut safely.",{type:"room",id:lower.id});if(lower&&Math.abs(roomFloor(lower)+(lower.height||4)-level)>.13)add("error","Floor opening crosses a sealed gap",`${lower.label||"Lower room"}'s ceiling does not meet this floor. Align the levels or add a connecting shaft room.`,{type:"prop",id:prop.id});if(Math.min(prop.w,prop.d)<.5)add("error","Floor opening is too small","Use an opening at least 32 units wide.",{type:"prop",id:prop.id});else if(Math.min(prop.w,prop.d)<1)add("warning","Tight floor opening","A 64-unit opening is safer for players and ladders.",{type:"prop",id:prop.id});});
    state.props.filter((prop)=>["stairs","stairPrefab","ramp","ladder"].includes(prop.kind)).forEach((prop)=>{
      const destination=connectorDestination(prop),topLevel=destination.level,topPoint=destination.point,upperRoom=destination.room;
      if(upperRoom&&!pointInFloorOpening(topPoint.x,topPoint.y,topLevel,upperRoom.id))add("error","Vertical connector is blocked by an upper floor",`Cut a floor opening at the ${prop.kind} exit or enable Smart links before placing it.`,{type:"prop",id:prop.id});
      if(!hasLandingNear(topPoint,topLevel))add("error","Vertical connector has no top landing",`${prop.kind} ends at Z ${Math.round(topLevel*GRID)}, but no room floor or platform supports its exit.`,{type:"prop",id:prop.id});
      if(prop.kind==="ladder"&&(prop.height||0)*GRID<64)add("warning","Short ladder","This ladder climbs less than 64 units.",{type:"prop",id:prop.id});
    });
    state.props.filter((prop)=>prop.kind==="elevator").forEach((prop)=>{const top=(Number(prop.floorLevel)||0)+(Number(prop.travel)||2),center={x:prop.x+prop.w/2,y:prop.y+prop.d/2};if(!hasLandingNear(center,top,Math.max(prop.w,prop.d)/2+.35))add("error","Elevator has no destination landing",`Add a room floor or platform beside the elevator at Z ${Math.round(top*GRID)}.`,{type:"prop",id:prop.id});});
    [...state.doors.map((item)=>({type:"door",item})),...state.windows.map((item)=>({type:"window",item}))].forEach(({type,item})=>{if(!doorIsConnected(item))add("error","Disconnected opening","The opening no longer has playable space on both sides.",{type,id:item.id});const segment=openingSegment(item);if(Math.hypot(segment[1][0]-segment[0][0],segment[1][1]-segment[0][1])<.5)add("error","Opening is too narrow","Use at least 32 GoldSrc units of width.",{type,id:item.id});});
    state.entities.forEach((entity)=>{if(!isPointInSpace(entity.x+.5,entity.y+.5))add("error","Entity outside playable space",`${entity.kind} is outside every floor.`,{type:"entity",id:entity.id});if(entity.kind==="ambient"&&!/\.wav$/i.test(entity.sound||""))add("warning","Ambient sound is not a WAV","GoldSrc ambient_generic expects an installed .wav path.",{type:"entity",id:entity.id});});
    state.zones.forEach((zone)=>{if(!rectIsInsideSpace(zone))add("error","Trigger outside playable space",`${zone.kind} extends beyond the floor.`,{type:"zone",id:zone.id});if(zone.kind==="teleport"&&!state.entities.some((entity)=>entity.kind==="teleDest"&&entity.target===(zone.target||"tele_dest_1")))add("error","Teleporter target is missing",`No destination named ${zone.target||"tele_dest_1"}.`,{type:"zone",id:zone.id});});
    const namedTargetList=[
      ...state.props.map((item)=>item.targetName).filter(Boolean),
      ...state.entities.map((item)=>item.kind==="pathCorner"?item.targetName:["light","spotlight"].includes(item.kind)?item.target:null).filter(Boolean)
    ];
    const namedTargets=new Set(namedTargetList);
    state.entities.filter((item)=>item.kind==="button").forEach((item)=>{if(item.target&&!namedTargets.has(item.target))add("warning","Button target is unresolved",`No mover or switchable light is named ${item.target}.`,{type:"entity",id:item.id});});
    state.props.filter((item)=>item.kind==="train").forEach((item)=>{if(!state.entities.some((entity)=>entity.kind==="pathCorner"&&entity.targetName===(item.target||"path_1")))add("error","Moving platform has no first path",`Add a path corner named ${item.target||"path_1"}.`,{type:"prop",id:item.id});});
    state.entities.filter((item)=>item.kind==="pathCorner"&&item.target).forEach((item)=>{if(!state.entities.some((next)=>next.kind==="pathCorner"&&next.targetName===item.target))add("error","Broken path chain",`${item.targetName||"Path corner"} points to missing ${item.target}.`,{type:"entity",id:item.id});});
    [...new Set(namedTargetList.filter((name,index)=>namedTargetList.indexOf(name)!==index))].forEach((name)=>add("warning","Duplicate target name",`${name} is used by more than one object.`));
    state.props.filter((item)=>item.kind==="elevator").forEach((item)=>{const base=Number(item.floorLevel)||0,target=base+(Number(item.travel)||2),host=state.rooms.find((room)=>Math.abs(roomFloor(room)-base)<.13&&pointInRoom(item.x+item.w/2,item.y+item.d/2,room)),shaft=state.props.some((prop)=>prop.kind==="floorHole"&&Math.abs((Number(prop.floorLevel)||0)-target)<.13&&prop.x<=item.x+.01&&prop.y<=item.y+.01&&prop.x+prop.w>=item.x+item.w-.01&&prop.y+prop.d>=item.y+item.d-.01);if(host&&!shaft&&base+(item.height||1)+(item.travel||2)>roomFloor(host)+host.height)add("warning","Elevator travel crosses ceiling","Add a floor opening around the elevator shaft, increase room height, or reduce travel.",{type:"prop",id:item.id});});
    const solids=state.props.filter((prop)=>["crate","wall","wallPolygon","cylinder","arch","breakable"].includes(prop.kind));for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++)if(rectanglesOverlap(solids[i],solids[j])&&Math.abs((solids[i].floorLevel||0)-(solids[j].floorLevel||0))<.1)add("warning","Overlapping solid brushes",`${solids[i].kind} overlaps ${solids[j].kind}; this may create unnecessary cuts.`,{type:"prop",id:solids[j].id});
    const all=[...state.rooms,...state.props,...state.zones,...state.entities],extent=all.length?Math.max(...all.flatMap((item)=>[Math.abs((item.x||0)*GRID),Math.abs(((item.x||0)+(item.w||1))*GRID),Math.abs((item.y||0)*GRID),Math.abs(((item.y||0)+(item.d||1))*GRID)])):0;if(extent>4096)add(extent>8192?"error":"warning","Large world coordinates",`The map reaches ${Math.round(extent)} units from origin; GoldSrc is safest inside ±4096.`);
    const mapText=generateMapText();if(mapText&&/undefined|NaN/.test(mapText))add("error","Invalid exported number","The generated MAP contains an undefined or NaN value.");const entityCount=state.entities.length+state.zones.length+state.doors.length+state.windows.length;if(entityCount>450)add(entityCount>512?"error":"warning","Entity limit pressure",`${entityCount} designed entities; GoldSrc's practical limit is near 512.`);
    return {issues,errors:issues.filter((issue)=>issue.severity==="error").length,warnings:issues.filter((issue)=>issue.severity==="warning").length,infos:issues.filter((issue)=>issue.severity==="info").length};
  }

  function renderPreflight() {
    lastPreflight=calculatePreflight();const result=lastPreflight;
    $("#preflightSummary").innerHTML=`<div class="${result.errors?"error":"good"}"><strong>${result.errors}</strong><small>blocking errors</small></div><div class="${result.warnings?"warning":"good"}"><strong>${result.warnings}</strong><small>warnings</small></div><div class="good"><strong>${result.errors?"FIX":"READY"}</strong><small>compile recommendation</small></div>`;
    $("#preflightList").innerHTML=result.issues.length?result.issues.map((issue,index)=>`<button class="preflight-issue ${issue.severity}" data-preflight-index="${index}"><em>${issue.severity.toUpperCase()}</em><span><strong>${issue.title}</strong><small>${issue.detail}</small></span><b>${issue.ref?"SELECT":""}</b></button>`).join(""):`<div class="preflight-empty">No blocking geometry or gameplay issues found.</div>`;
    return result;
  }

  function html(value) {
    return String(value ?? "").replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  }

  function productionObjects() {
    return [
      ...state.rooms.map((item,index)=>({type:"room",item,label:item.label||`Room ${index+1}`})),
      ...state.props.map((item,index)=>({type:"prop",item,label:item.label||({wall:"Wall",wallPolygon:"Polygon wall",platform:"Platform",floor:"Floor",crate:"Crate",stairs:"Stairs",ramp:"Ramp",elevator:"Elevator",rotatingDoor:"Rotating door",train:"Moving platform"}[item.kind]||item.kind||`Geometry ${index+1}`)})),
      ...state.doors.map((item,index)=>({type:"door",item,label:`${item.mode==="sliding"?"Sliding door":"Opening"} ${index+1}`})),
      ...state.windows.map((item,index)=>({type:"window",item,label:`Window ${index+1}`})),
      ...state.zones.map((item,index)=>({type:"zone",item,label:`${item.kind} ${index+1}`})),
      ...state.entities.map((item,index)=>({type:"entity",item,label:`${item.kind} ${index+1}`}))
    ];
  }

  function renderLayers() {
    const layers=ensureLayers(),activeIds=new Set(selectedEntries().map(({item})=>layerForItem(item).id));
    $("#layerList").innerHTML=layers.map((layer)=>{
      const count=productionObjects().filter(({item})=>layerForItem(item).id===layer.id).length;
      return `<div class="layer-row ${activeIds.has(layer.id)?"active":""}" data-layer-row="${html(layer.id)}">
        <input type="color" value="${html(layer.color)}" data-layer-color="${html(layer.id)}" title="Layer color" />
        <input type="text" value="${html(layer.name)}" data-layer-name="${html(layer.id)}" maxlength="32" aria-label="Layer name" />
        <button class="${layer.visible?"active":""}" data-layer-visible="${html(layer.id)}" title="Show or hide layer">${layer.visible?"VISIBLE":"HIDDEN"} ${count}</button>
        <button class="${layer.locked?"active":""}" data-layer-lock="${html(layer.id)}" title="Lock or unlock layer">${layer.locked?"LOCKED":"FREE"}</button>
        <button data-layer-delete="${html(layer.id)}" title="Delete layer" ${layer.id===DEFAULT_LAYER_ID?"disabled":""}>×</button>
      </div>`;
    }).join("");
    const filter=$("#outlinerLayer"),current=filter.value;
    filter.innerHTML=`<option value="all">All layers</option>${layers.map((layer)=>`<option value="${html(layer.id)}">${html(layer.name)}</option>`).join("")}`;
    filter.value=layers.some((layer)=>layer.id===current)?current:"all";
  }

  function renderOutlinerLegacy() {
    renderLayers();
    const search=$("#outlinerSearch").value.trim().toLowerCase(),type=$("#outlinerType").value;
    const rows=productionObjects().filter((entry)=>(type==="all"||entry.type===type)&&(!search||`${entry.label} ${entry.item.kind||""}`.toLowerCase().includes(search)));
    $("#outlinerList").innerHTML=rows.length?rows.map(({type,item,label})=>`<div class="outliner-row ${isRefSelected(type,item.id)?"selected":""}" data-outline-select="${type}:${item.id}"><span><strong>${html(label)}</strong><small>${type} · Z ${Math.round(itemLevel(type,item)*GRID)}${item.groupId?" · grouped":""}</small></span><span>${item.locked?"LOCKED":""}${item.hidden?" HIDDEN":""}</span><span class="row-actions"><button data-outline-lock="${type}:${item.id}" title="Lock">L</button><button data-outline-hide="${type}:${item.id}" title="Hide">H</button></span></div>`).join(""):`<div class="preflight-empty">No matching objects.</div>`;
  }

  function renderOutliner() {
    renderLayers();
    const search=$("#outlinerSearch").value.trim().toLowerCase(),type=$("#outlinerType").value,layerId=$("#outlinerLayer").value;
    const rows=productionObjects().filter((entry)=>(type==="all"||entry.type===type)&&(layerId==="all"||layerForItem(entry.item).id===layerId)&&(!search||`${entry.label} ${entry.item.kind||""} ${layerForItem(entry.item).name}`.toLowerCase().includes(search)));
    $("#outlinerList").innerHTML=rows.length?rows.map(({type,item,label})=>{
      const layer=layerForItem(item),locked=isItemLocked(item),hidden=isItemHidden(item);
      return `<div class="outliner-row ${isRefSelected(type,item.id)?"selected":""}" data-outline-select="${type}:${item.id}"><span><strong><i class="layer-dot" style="background:${html(layer.color)}"></i>${html(label)}</strong><small>${type} · ${html(layer.name)} · Z ${Math.round(itemLevel(type,item)*GRID)}${item.groupId?" · grouped":""}</small></span><span>${locked?"LOCKED ":""}${hidden?"HIDDEN":""}</span><span class="row-actions"><button data-outline-lock="${type}:${item.id}" title="Lock object">L</button><button data-outline-hide="${type}:${item.id}" title="Hide object">H</button></span></div>`;
    }).join(""):`<div class="preflight-empty">No matching objects.</div>`;
  }

  function syncStories() {
    state.stories ||= [];
    const levels=[...new Set(state.rooms.map((room)=>Math.round(roomFloor(room)*4)/4))].sort((a,b)=>a-b);
    levels.forEach((elevation)=>{if(!state.stories.some((story)=>Math.abs(Number(story.elevation)-elevation)<.01))state.stories.push({id:crypto.randomUUID(),name:elevation===0?"Ground floor":elevation>0?`Upper ${Math.round(elevation*GRID)}`:`Lower ${Math.abs(Math.round(elevation*GRID))}`,elevation});});
    state.stories.sort((a,b)=>Number(a.elevation)-Number(b.elevation));
  }

  function renderStories() {
    syncStories();
    $("#storyList").innerHTML=state.stories.map((story)=>{const level=Number(story.elevation)||0,count=state.rooms.filter((room)=>Math.abs(roomFloor(room)-level)<.13).length;return `<div class="story-row"><span><strong>${html(story.name)}</strong><small>Z ${Math.round(level*GRID)} · ${count} room${count===1?"":"s"}</small></span><span>${planLevel!=null&&Math.abs(planLevel-level)<.13?"ACTIVE":""}</span><span class="row-actions"><button data-story-view="${story.id}" title="View level">V</button><button data-story-copy="${story.id}" title="Duplicate above the tallest room">+</button><button data-story-remove="${story.id}" title="Remove empty level">×</button></span></div>`;}).join("");
  }

  function duplicateStory(story) {
    const source=Number(story.elevation)||0,storyHeight=Math.max(3,...state.rooms.filter((room)=>Math.abs(roomFloor(room)-source)<.13).map((room)=>room.height||4)),target=source+storyHeight,before=snapshot(),idMap=new Map(),clone=(item)=>{const copy=structuredClone(item);idMap.set(item.id,crypto.randomUUID());copy.id=idMap.get(item.id);if(copy.groupId)copy.groupId=`${copy.groupId}-${copy.id.slice(0,6)}`;return copy;};
    const rooms=state.rooms.filter((item)=>Math.abs(roomFloor(item)-source)<.13).map((item)=>{const copy=clone(item);copy.floorLevel=target;copy.label=`${item.label||"ROOM"} · COPY`;return copy;});
    const props=state.props.filter((item)=>Math.abs(itemLevel("prop",item)-source)<.13).map((item)=>{const copy=clone(item);if(["floor","floorPolygon"].includes(copy.kind))copy.elevation=(Number(copy.elevation)||source)+storyHeight;else copy.floorLevel=target;if(copy.hostRoomId)copy.hostRoomId=idMap.get(copy.hostRoomId)||copy.hostRoomId;return copy;});
    const entities=state.entities.filter((item)=>Math.abs(itemLevel("entity",item)-source)<.13).map((item)=>{const copy=clone(item);copy.floorLevel=target;if(copy.targetName)copy.targetName=`${copy.targetName}_up`;return copy;});
    const zones=state.zones.filter((item)=>Math.abs(itemLevel("zone",item)-source)<.13).map((item)=>{const copy=clone(item);copy.floorLevel=target;return copy;});
    const doors=state.doors.filter((item)=>Math.abs(itemLevel("door",item)-source)<.13).map((item)=>{const copy=clone(item);copy.floorLevel=target;copy.edgeRoomId=idMap.get(item.edgeRoomId)||item.edgeRoomId;return copy;});
    const windows=state.windows.filter((item)=>Math.abs(itemLevel("window",item)-source)<.13).map((item)=>{const copy=clone(item);copy.floorLevel=target;copy.edgeRoomId=idMap.get(item.edgeRoomId)||item.edgeRoomId;return copy;});
    state.rooms.push(...rooms);state.props.push(...props);state.entities.push(...entities);state.zones.push(...zones);state.doors.push(...doors);state.windows.push(...windows);
    state.stories.push({id:crypto.randomUUID(),name:`${story.name} copy`,elevation:target});planLevel=target;ghostLevels=true;selection=[];selected=null;commit(before);renderProduction();showToast(`Level duplicated at Z ${target*GRID}`);
  }

  function roomLightingScore(room) {
    const center={x:room.x+room.w/2,y:room.y+room.d/2};
    const lights=state.entities.filter((entity)=>["light","spotlight"].includes(entity.kind)&&Math.abs(itemLevel("entity",entity)-roomFloor(room))<room.height+1);
    return lights.reduce((score,light)=>{const distance=Math.hypot(light.x+.5-center.x,light.y+.5-center.y)*GRID,radius=light.radius||512;if(distance>radius)return score;return score+(light.brightness||300)*(1-distance/radius);},0);
  }

  function darkestRoom() { return [...state.rooms].sort((a,b)=>roomLightingScore(a)-roomLightingScore(b))[0]||null; }

  function renderLightingWorkspace() {
    const rows=state.rooms.map((room)=>({room,score:roomLightingScore(room)})).sort((a,b)=>a.score-b.score),dark=rows.filter((row)=>row.score<80).length,lights=state.entities.filter((item)=>["light","spotlight"].includes(item.kind)).length;
    $("#lightingSummary").innerHTML=`<div><strong>${lights}</strong><small>authored lights</small></div><div><strong>${dark}</strong><small>dark rooms</small></div><div><strong>${rows.length?Math.round(rows.reduce((sum,row)=>sum+row.score,0)/rows.length):0}</strong><small>average coverage</small></div>`;
    $("#lightingList").innerHTML=rows.length?rows.map(({room,score})=>`<button class="lighting-row" data-light-room="${room.id}"><span><strong>${html(room.label||"Room")}</strong><small>Z ${Math.round(roomFloor(room)*GRID)}</small></span><span>${score<80?"DARK":score<180?"LOW":"LIT"}</span><strong>${Math.round(score)}</strong></button>`).join(""):`<div class="preflight-empty">Draw rooms to analyze light coverage.</div>`;
  }

  function routeReport() {
    if(recordedRoute.length<2)return "No route recorded yet.";
    const distance=recordedRoute.slice(1).reduce((sum,point,index)=>sum+Math.hypot(point.x-recordedRoute[index].x,point.y-recordedRoute[index].y)*GRID,0),duration=(recordedRoute.at(-1).time-recordedRoute[0].time)/1000,zValues=recordedRoute.map((point)=>point.z*GRID),threats=state.entities.filter((item)=>["ct","t","targetDummy"].includes(item.kind));
    const exposed=recordedRoute.filter((point)=>threats.some((threat)=>clearSight(point,{x:threat.x+.5,y:threat.y+.5}))).length/recordedRoute.length*100;
    return `<strong>${Math.round(distance)} units</strong> traveled in <strong>${duration.toFixed(1)} seconds</strong><br>Elevation range: ${Math.round(Math.min(...zValues))} to ${Math.round(Math.max(...zValues))} units · Exposure samples: ${Math.round(exposed)}%`;
  }

  function renderSnapshots() {
    $("#snapshotList").innerHTML=projectSnapshots.length?projectSnapshots.map((entry)=>`<div class="snapshot-row"><span><strong>${html(entry.name)}</strong><small>${new Date(entry.createdAt).toLocaleString()}</small></span><span>${Math.round((entry.project?.length||0)/1024)} KB</span><span class="row-actions"><button data-snapshot-restore="${entry.id}" title="Restore">R</button><button data-snapshot-delete="${entry.id}" title="Delete">×</button></span></div>`).join(""):`<div class="preflight-empty">No named versions yet. Autosave is still active.</div>`;
  }

  function renderProduction() {
    if(!$("#productionDialog")?.open)return;
    $$("[data-production-tab]").forEach((button)=>button.classList.toggle("active",button.dataset.productionTab===productionTab));
    $$("[data-production-pane]").forEach((pane)=>pane.classList.toggle("active",pane.dataset.productionPane===productionTab));
    lightingOverlay=productionTab==="lighting";
    if(productionTab==="outliner")renderOutliner();
    if(productionTab==="stories")renderStories();
    if(productionTab==="lighting")renderLightingWorkspace();
    if(productionTab==="playtest")$("#routeReport").innerHTML=routeReport();
    if(productionTab==="project")renderSnapshots();
    drawEditor();
  }

  function startWalkAt(entity) {
    if(!entity)return showToast("Add or select a spawn first");
    setPreviewMode("walk");player={x:entity.x+.5,y:entity.y+.5,z:Number(entity.floorLevel??floorLevelAt(entity.x+.5,entity.y+.5)),angle:(Number(entity.angle)||0)*Math.PI/180};preview.focus();$("#productionDialog").close();showToast("Walkthrough started at selected spawn");
  }

  function downloadBlob(content,type,name) {
    const blob=content instanceof Blob?content:new Blob([content],{type}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function projectDocument() { return JSON.stringify({format:"blockout-project",version:2,exportedAt:new Date().toISOString(),project:state},null,2); }

  function createNamedSnapshot(name="") {
    const cleanName=String(name||"").trim().slice(0,40)||`Manual save ${new Date().toLocaleString([], {dateStyle:"short",timeStyle:"short"})}`;
    saveProjectNow({announce:false});
    projectSnapshots.unshift({id:crypto.randomUUID(),name:cleanName,createdAt:Date.now(),project:snapshot()});
    projectSnapshots=projectSnapshots.slice(0,20);
    localStorage.setItem("blockout-project-snapshots-v1",JSON.stringify(projectSnapshots));
    if ($("#snapshotName")) $("#snapshotName").value="";
    renderSnapshots();
    showToast(`Local version saved: ${cleanName}`);
    return projectSnapshots[0];
  }

  function downloadProjectFile() {
    saveProjectNow({announce:false});
    downloadBlob(projectDocument(),"application/json",`${safeName(state.name)}.blockout.json`);
    showToast("Editable project downloaded");
  }

  function normalizeImportedProject(document) {
    const source=document?.format==="blockout-project"?document.project:document;
    if(!source||typeof source!=="object"||!Array.isArray(source.rooms)||!Array.isArray(source.props))throw new Error("Not a Blockout project");
    const project=structuredClone(source);
    project.name=String(project.name||"Imported map").slice(0,40);
    ["doors","windows","zones","entities","stories","layers"].forEach((key)=>{if(!Array.isArray(project[key]))project[key]=[];});
    project.updatedAt=Date.now();
    environmentFor(project);
    return project;
  }

  function importProjectDocument(document,{announce=true}={}) {
    const project=normalizeImportedProject(document),before=snapshot();
    state=project;
    selected=null;selection=[];history.push(before);if(history.length>80)history.shift();future=[];
    saveProjectNow({announce:false});
    fitView();refresh();
    if(announce)showToast(`Project opened: ${state.name}`);
    return structuredClone(state);
  }

  async function importProjectFile(file) {
    if(!file)return false;
    try{
      const document=JSON.parse(await file.text());
      importProjectDocument(document);
      return true;
    }catch(error){
      showToast(`Import failed: ${error.message}`);
      return false;
    }
  }

  function crc32(bytes) {
    let crc=-1;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^-1)>>>0;
  }
  function zipBytes(files) {
    const encoder=new TextEncoder(),parts=[],central=[];let offset=0;
    const u16=(value)=>new Uint8Array([value&255,(value>>>8)&255]),u32=(value)=>new Uint8Array([value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255]),join=(items)=>{const output=new Uint8Array(items.reduce((sum,item)=>sum+item.length,0));let at=0;items.forEach((item)=>{output.set(item,at);at+=item.length;});return output;};
    Object.entries(files).forEach(([name,value])=>{const filename=encoder.encode(name),data=typeof value==="string"?encoder.encode(value):value,crc=crc32(data),header=join([u32(0x04034b50),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(filename.length),u16(0),filename]);parts.push(header,data);central.push(join([u32(0x02014b50),u16(20),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(filename.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),filename]));offset+=header.length+data.length;});
    const directory=join(central),end=join([u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),u32(directory.length),u32(offset),u16(0)]);return join([...parts,directory,end]);
  }

  function exportProductionPackage() {
    const map=generateMapText();if(!map)return showToast("Draw a room or enable ground before packaging");
    const textures=[...new Set([...state.rooms.flatMap((room)=>[room.texture,room.floorTexture,room.ceilingTexture,...Object.values(room.wallTextures||{}),...Object.values(room.edgeTextures||{})]),...state.props.map((prop)=>prop.texture),...state.doors.map((door)=>door.texture)].filter(Boolean))];
    const report=calculatePreflight(),name=safeName(state.name),files={[`${name}.map`]:map,[`${name}.blockout.json`]:projectDocument(),"resources.txt":`Textures (${textures.length})\n${textures.join("\n")}\n\nSky\n${environmentFor().skyName}\n`,"BUILD_README.txt":`${state.name}\nGenerated ${new Date().toISOString()}\nPreflight: ${report.errors} errors, ${report.warnings} warnings\n\nOpen the MAP in J.A.C.K./Hammer or use Blockout Build & Test.\n`};
    downloadBlob(new Blob([zipBytes(files)],{type:"application/zip"}),"application/zip",`${name}_production.zip`);showToast("Production package downloaded");
  }

  function refresh() {
    $("#projectName").value = state.name;
    $("#emptyHint").classList.toggle("hidden", state.rooms.length > 0);
    $("#undoButton").disabled = history.length === 0;
    $("#redoButton").disabled = future.length === 0;
    updateLevelControls();
    updateChecklist();
    updateInspector();
    updateBuildDialog();
    drawEditor();
    drawPreview();
    if($("#elevationDialog")?.open)drawElevationEditor();
    if($("#productionDialog")?.open)renderProduction();
    if($("#brushStudioDialog")?.open)syncBrushStudio();
  }

  function fitView() {
    const rect = editor.getBoundingClientRect();
    if (!state.rooms.length) {
      const bounds = environmentBounds([]);
      cellSize = Math.max(7,Math.min(28,(rect.width-100)/(bounds.maxX-bounds.minX),(rect.height-90)/(bounds.maxY-bounds.minY)));
      viewOffset = { x:(rect.width-(bounds.maxX-bounds.minX)*cellSize)/2-bounds.minX*cellSize, y:(rect.height-(bounds.maxY-bounds.minY)*cellSize)/2-bounds.minY*cellSize };
    } else {
      const xs = state.rooms.flatMap((r) => [r.x, r.x + r.w]);
      const ys = state.rooms.flatMap((r) => [r.y, r.y + r.d]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      cellSize = Math.max(7, Math.min(42, (rect.width - 100) / Math.max(maxX - minX, 5), (rect.height - 90) / Math.max(maxY - minY, 4)));
      viewOffset = { x: (rect.width - (maxX - minX) * cellSize) / 2 - minX * cellSize, y: (rect.height - (maxY - minY) * cellSize) / 2 - minY * cellSize };
    }
    drawEditor();
  }

  function placeEntity(cell, kind) {
    const hostRoom = state.rooms.find((room) => pointInRoom(cell.x + .5, cell.y + .5, room));
    if (!isPointInSpace(cell.x + .5,cell.y + .5)) {
      showToast(["light","spotlight"].includes(kind) ? "Place lights on a room floor or map ground" : "Place gameplay markers on a room floor or map ground");
      return;
    }
    const occupied = state.entities.some((entity) => entity.x === cell.x && entity.y === cell.y);
    if (occupied) {
      showToast("That grid cell already has a marker");
      return;
    }
    const before = snapshot();
    const entity = { id: crypto.randomUUID(), kind, x: cell.x, y: cell.y, floorLevel:roomFloor(hostRoom) };
    if (["ct", "t"].includes(kind)) entity.angle = 0;
    if(kind==="teleDest")Object.assign(entity,{target:"tele_dest_1",angle:0});
    if(kind==="button")entity.target="target_1";
    if(kind==="decal")entity.decal="{lambda01";
    if(kind==="ambient")Object.assign(entity,{sound:"ambience/wind1.wav",volume:7});
    if (["light","spotlight"].includes(kind)) {
      entity.z = Math.max(.5, (hostRoom?.height || 4) - .75);
      entity.brightness = 300;
      entity.radius = 512;
      entity.style = "0";
      entity.target = "";
      entity.color = "#fff0d0";
      if(kind === "spotlight") Object.assign(entity,{angle:0,pitch:-45,cone:45});
    }
    if(kind === "pathCorner") Object.assign(entity,{targetName:`path_${state.entities.filter((item)=>item.kind==="pathCorner").length+1}`,target:"",wait:0});
    if(kind === "targetDummy") entity.angle=0;
    state.entities.push(entity);
    selected = { type: "entity", id: entity.id };
    commit(before);
    if (["light","spotlight"].includes(kind)) showToast(`${kind === "spotlight" ? "Spotlight" : "Light"} placed — adjust it in Selection`);
    else if (["hostage","button","teleDest","decal","ambient"].includes(kind)) showToast(`${TOOL_INFO[kind].title.replace("Place ","")} placed — configure it in Selection`);
  }

  function placeCrate(cell) {
    const box = { x: cell.x, y: cell.y, w: 1, d: 1 };
    if (!rectIsInsideSpace(box)) { showToast("Place crates on a room floor or map ground"); return; }
    if (state.props.some((prop) => prop.kind!=="floorHole"&&rectanglesOverlap(box,prop))) { showToast("That placement overlaps another structure"); return; }
    const hostRoom = state.rooms.find((room) => pointInRoom(cell.x + .5, cell.y + .5, room));
    const before = snapshot();
    const prop = { id: crypto.randomUUID(), kind: "crate", ...box, height: 1, floorLevel: floorLevelAt(cell.x+.5,cell.y+.5), texture: "BCRATE02", direction: "e" };
    state.props.push(prop);
    selected = { type: "prop", id: prop.id };
    if (previewMode !== "orbit") setPreviewMode("orbit");
    commit(before);
    showToast("Crate placed — physical 3D object shown in Orbit");
  }

  function placeLadder(cell) {
    const hostRoom = state.rooms.find((room) => pointInRoom(cell.x + .5, cell.y + .5, room));
    if (!isPointInSpace(cell.x+.5,cell.y+.5)) { showToast("Place ladders on a room floor or map ground"); return; }
    if (state.props.some((prop) => prop.kind!=="floorHole"&&rectanglesOverlap({x:cell.x,y:cell.y,w:1,d:1},prop))) { showToast("That placement overlaps another structure"); return; }
    const before = snapshot();
    const prop = {
      id: crypto.randomUUID(), kind: "ladder", x: cell.x, y: cell.y, w: 1, d: 1,
      height: Math.max(1, (hostRoom?.height || 3.5) - .5), floorLevel: floorLevelAt(cell.x+.5,cell.y+.5), direction: "n", texture: "CSTRIKE_ME4METL"
    };
    state.props.push(prop);
    const assistance=assistVerticalConnector(prop);
    selected = { type: "prop", id: prop.id };
    if (previewMode !== "orbit") setPreviewMode("orbit");
    commit(before);
    showToast(assistance.length ? "Ladder placed with a smart landing or floor opening" : "Ladder placed — choose its facing and height in Selection");
  }

  function placeColumn(cell) {
    const center = [cell.x + .5, cell.y + .5];
    const host = state.rooms.find((room) => pointInRoom(center[0], center[1], room));
    if (!isPointInSpace(center[0],center[1])) { showToast("Place columns on a room floor or map ground"); return; }
    const points = Array.from({length:8}, (_, index) => {
      const angle = Math.PI / 8 + index * Math.PI / 4;
      return [center[0] + Math.cos(angle) * .43, center[1] + Math.sin(angle) * .43];
    });
    if (!polygonIsInsideSpace(points) || state.props.some((prop) => prop.kind!=="floorHole"&&rectanglesOverlap({x:cell.x,y:cell.y,w:1,d:1},prop))) { showToast("That column needs a free grid cell"); return; }
    const before = snapshot(), bounds = polygonBounds(points);
    const prop = { id:crypto.randomUUID(), kind:"wallPolygon", label:"COLUMN", points, ...bounds, height:Math.min(host?.height || 4,4), floorLevel:floorLevelAt(center[0],center[1]), texture:host?.texture || "CSTRIKE_WR4RGH", direction:"e" };
    state.props.push(prop); selected = {type:"prop", id:prop.id}; commit(before);
    showToast("Octagonal column placed—resize or edit its corners in Selection");
  }

  function prefabColumn(x, y, floorLevel, texture = "BO_CONCRETE") {
    const center = [x + .5, y + .5];
    const points = Array.from({ length:8 }, (_, index) => {
      const angle = Math.PI / 8 + index * Math.PI / 4;
      return [center[0] + Math.cos(angle) * .43, center[1] + Math.sin(angle) * .43];
    });
    return { id:crypto.randomUUID(), kind:"wallPolygon", label:"PREFAB COLUMN", points, ...polygonBounds(points), height:3, floorLevel, texture, direction:"e" };
  }

  function prefabProp(kind, x, y, w, d, height, floorLevel, texture, extra = {}) {
    return { id:crypto.randomUUID(), kind, x, y, w, d, height, floorLevel, texture, direction:"e", ...extra };
  }

  function prefabFootprint(prefabId) {
    const footprints = {
      halfCover:[2,1], doubleCrate:[2,1], crateCorner:[2,2], pillarPair:[4,1], coverLane:[5,3], bombCover:[4,4],
      catwalk:[5,2], rampLanding:[5,2], ladderTower:[3,2], windowNest:[4,3], columnArc:[5,2],
      archFrame:[4,1], cratePyramid:[2,2], tCover:[4,3], zigzag:[7,4], bridge:[6,3], sniperNest:[5,4],
      marketStall:[6,3], bollardRow:[7,1], highLowCover:[5,2], stairTower:[8,4]
    };
    return footprints[prefabId]||[1,1];
  }

  function transformPrefabPoint(point,pivot,target,rotation=0,mirrored=false) {
    let x=Number(point[0])-pivot[0],y=Number(point[1])-pivot[1];
    if(mirrored)x=-x;
    const turns=((Math.round(rotation/90)%4)+4)%4;
    for(let turn=0;turn<turns;turn++)[x,y]=[-y,x];
    return [target[0]+x,target[1]+y];
  }

  function transformPrefabRect(item,pivot,target,rotation,mirrored) {
    const x=Number(item.x)||0,y=Number(item.y)||0,w=Number(item.w)||1,d=Number(item.d)||1;
    const corners=[[x,y],[x+w,y],[x+w,y+d],[x,y+d]].map((point)=>transformPrefabPoint(point,pivot,target,rotation,mirrored));
    const xs=corners.map((point)=>point[0]),ys=corners.map((point)=>point[1]);
    return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),d:Math.max(...ys)-Math.min(...ys)};
  }

  function transformPrefabDirection(direction,rotation,mirrored) {
    const vectors={n:[0,-1],e:[1,0],s:[0,1],w:[-1,0]},names={"0,-1":"n","1,0":"e","0,1":"s","-1,0":"w"};
    let [x,y]=vectors[direction]||vectors.e;
    if(mirrored)x=-x;
    const turns=((Math.round(rotation/90)%4)+4)%4;
    for(let turn=0;turn<turns;turn++)[x,y]=[-y,x];
    return names[`${Math.round(x)},${Math.round(y)}`]||direction;
  }

  function transformCustomPrefabItem(entry,prefab,pivot,target,newBase,idMap,groupMap,targetMap) {
    const clone=structuredClone(entry.item),rotation=customPrefabRotation,mirrored=customPrefabMirrored;
    clone.id=idMap.get(entry.item.id)||crypto.randomUUID();
    if(clone.groupId)clone.groupId=groupMap.get(clone.groupId)||clone.groupId;
    ["hostRoomId","edgeRoomId"].forEach((key)=>{
      if(!clone[key])return;
      if(idMap.has(clone[key]))clone[key]=idMap.get(clone[key]);
      else delete clone[key];
    });
    if(clone.targetName&&targetMap.has(clone.targetName))clone.targetName=targetMap.get(clone.targetName);
    if(clone.target&&targetMap.has(clone.target))clone.target=targetMap.get(clone.target);
    if(["room","prop","zone"].includes(entry.type))Object.assign(clone,transformPrefabRect(clone,pivot,target,rotation,mirrored));
    else if(entry.type==="entity"){const point=transformPrefabPoint([clone.x,clone.y],pivot,target,rotation,mirrored);clone.x=point[0];clone.y=point[1];}
    ["points","planPoints","segment","edge"].forEach((key)=>{if(clone[key]?.length)clone[key]=clone[key].map((point)=>transformPrefabPoint(point,pivot,target,rotation,mirrored));});
    if(["door","window"].includes(entry.type))syncOpeningLegacy(clone);
    if(clone.direction)clone.direction=transformPrefabDirection(clone.direction,rotation,mirrored);
    if(Number.isFinite(Number(clone.angle)))clone.angle=((Number(clone.angle)+(mirrored?180-2*Number(clone.angle):0)+rotation)%360+360)%360;
    if(clone.slope&&(mirrored!==(((rotation/90)%2)!==0)))clone.slope=clone.slope==="up"?"down":"up";
    const sourceBase=Number(prefab.bounds?.base)||0,delta=newBase-sourceBase;
    if(entry.type==="room")clone.floorLevel=(Number(entry.item.floorLevel)||0)+delta;
    else if(entry.type==="prop"&&["floor","floorPolygon"].includes(clone.kind))clone.elevation=(Number(entry.item.elevation)||0)+delta;
    else if(clone.floorLevel!=null)clone.floorLevel=Number(entry.item.floorLevel||0)+delta;
    if(prefab.preserveMaterials===false){
      const material=sampledMaterial||"BO_CONCRETE";
      if(entry.type==="room"){clone.texture=material;clone.floorTexture=material;clone.ceilingTexture=material;clone.wallTextures={};clone.edgeTextures={};}
      else if(entry.type==="prop")clone.texture=material;
    }
    clone.locked=false;clone.hidden=false;
    return {type:entry.type,item:clone};
  }

  function placeCustomPrefab(prefab,world) {
    const snapped=snapWorldPoint(world),target=[snapped.x,snapped.y],pivot=customPrefabPivotPoint(prefab);
    const idMap=new Map((prefab.items||[]).map((entry)=>[entry.item.id,crypto.randomUUID()]));
    const groupMap=new Map(),targetMap=new Map();
    (prefab.items||[]).forEach(({type,item})=>{
      if(item.groupId&&!groupMap.has(item.groupId))groupMap.set(item.groupId,crypto.randomUUID());
      if(item.targetName&&!targetMap.has(item.targetName))targetMap.set(item.targetName,`${item.targetName}_${crypto.randomUUID().slice(0,5)}`);
      if(type==="entity"&&["teleDest","light","spotlight"].includes(item.kind)&&item.target&&!targetMap.has(item.target))targetMap.set(item.target,`${item.target}_${crypto.randomUUID().slice(0,5)}`);
    });
    const newBase=floorLevelAt(target[0],target[1]);
    const entries=prefab.items.map((entry)=>transformCustomPrefabItem(entry,prefab,pivot,target,newBase,idMap,groupMap,targetMap));
    const newRooms=entries.filter((entry)=>entry.type==="room").map((entry)=>entry.item);
    if(newRooms.some((room)=>state.rooms.some((existing)=>Math.abs(roomFloor(room)-roomFloor(existing))<.13&&footprintsOverlap(room,existing)))){
      showToast("That prefab would overlap an existing room on the same level");return;
    }
    const oldPropIds=new Set(state.props.map((item)=>item.id)),before=snapshot();
    entries.forEach(({type,item})=>itemListFor(type).push(item));
    entries.filter(({type,item})=>type==="prop"&&item.kind==="floorHole").forEach(({item})=>{
      const host=state.rooms.find((room)=>Math.abs(roomFloor(room)-(Number(item.floorLevel)||0))<.13&&!room.points?.length
        &&item.x>=room.x+.125&&item.y>=room.y+.125&&item.x+item.w<=room.x+room.w-.125&&item.y+item.d<=room.y+room.d-.125);
      if(host)item.hostRoomId=host.id;else delete item.hostRoomId;
    });
    const invalidProp=entries.find(({type,item})=>type==="prop"&&!["floorHole"].includes(item.kind)&&!(item.points?.length?polygonIsInsideSpace(item.points):rectIsInsideSpace(item)));
    const invalidHole=entries.find(({type,item})=>type==="prop"&&item.kind==="floorHole"&&!item.hostRoomId);
    const invalidZone=entries.find(({type,item})=>type==="zone"&&!rectIsInsideSpace(item));
    const invalidEntity=entries.find(({type,item})=>type==="entity"&&!isPointInSpace(item.x+.5,item.y+.5));
    const invalidOpening=entries.find(({type,item})=>["door","window"].includes(type)&&!doorIsConnected(item));
    const overlappingProp=entries.find(({type,item})=>type==="prop"&&state.props.some((existing)=>oldPropIds.has(existing.id)&&rectanglesOverlap(item,existing)&&verticalBounds({type:"prop"},item).base<verticalBounds({type:"prop"},existing).top-.01&&verticalBounds({type:"prop"},item).top>verticalBounds({type:"prop"},existing).base+.01));
    if(invalidProp||invalidHole||invalidZone||invalidEntity||invalidOpening||overlappingProp){
      state=JSON.parse(before);environmentFor(state);refresh();
      showToast(overlappingProp?"That prefab needs a clear physical area":invalidOpening?"A placed door or window lost its connected spaces":"Keep the complete prefab on buildable floor or map ground");return;
    }
    selection=entries.map(({type,item})=>({type,id:item.id}));selected=selection[0]||null;
    if(previewMode!=="orbit")setPreviewMode("orbit");
    commit(before);
    showToast(`${prefab.name} placed - ${entries.length} editable object${entries.length===1?"":"s"}`);
  }

  function placePrefab(world) {
    if(activePrefabId.startsWith("custom:")){
      const prefab=customPrefabs.find((item)=>item.id===activePrefabId.slice(7));
      if(prefab)placeCustomPrefab(prefab,world);
      return;
    }
    const prefab = PREFAB_LIBRARY.find((item) => item.id === activePrefabId);
    if (!prefab || prefab.tool) return;
    const [w,d] = prefabFootprint(prefab.id);
    const anchor=placementAnchor(world,w,d),area = { x:anchor.x, y:anchor.y, w, d };
    if (!rectIsInsideSpace(area)) { showToast(`Keep the whole ${prefab.name} on a room floor or map ground`); return; }
    if (state.props.some((prop) => rectanglesOverlap(area, prop))) { showToast("That prefab needs a clear area"); return; }
    const host = state.rooms.find((room) => pointInRoom(anchor.x+w/2,anchor.y+d/2,room));
    const z = floorLevelAt(anchor.x+w/2,anchor.y+d/2), x = anchor.x, y = anchor.y;
    let props = [];
    if (prefab.id === "halfCover") props = [prefabProp("wall",x,y,2,1,.75,z,"BO_CONCRETE")];
    if (prefab.id === "doubleCrate") props = [0,1].map((offset) => prefabProp("crate",x+offset,y,1,1,1,z,"BO_WOOD01"));
    if (prefab.id === "crateCorner") props = [[0,0],[1,0],[0,1]].map(([dx,dy]) => prefabProp("crate",x+dx,y+dy,1,1,1,z,"BO_WOODREAL"));
    if (prefab.id === "pillarPair") props = [prefabColumn(x,y,z), prefabColumn(x+3,y,z)];
    if (prefab.id === "coverLane") props = [
      prefabProp("diagonal",x,y,2,2,1.25,z,"BO_RUST",{slope:"up",thickness:.42}),
      prefabProp("wall",x+2,y+1,1,1,.75,z,"BO_CONCRETE"),
      prefabProp("diagonal",x+3,y+1,2,2,1.25,z,"BO_RUST",{slope:"down",thickness:.42})
    ];
    if (prefab.id === "bombCover") props = [[0,0],[3,0],[0,3],[3,3]].map(([dx,dy],index) => prefabProp(index % 2 ? "wall" : "crate",x+dx,y+dy,1,1,index % 2 ? .75 : 1,z,index % 2 ? "BO_CONCBRICK" : "BO_WOOD02"));
    if (prefab.id === "catwalk") props = [
      prefabProp("stairs",x,y,2,2,1,z,"BO_CONCRETE",{direction:"e",steps:4}),
      prefabProp("platform",x+2,y,3,2,1,z,"BO_PAVEMENT")
    ];
    if (prefab.id === "rampLanding") props = [
      prefabProp("ramp",x,y,3,2,1,z,"BO_CONCRETE",{direction:"e"}),
      prefabProp("platform",x+3,y,2,2,1,z,"BO_PAVEMENT")
    ];
    if (prefab.id === "ladderTower") props = [
      prefabProp("ladder",x,y,1,1,2,z,"BO_RUST",{direction:"e"}),
      prefabProp("platform",x+1,y,2,2,2,z,"BO_CONCBRICK")
    ];
    if (prefab.id === "windowNest") props = [
      prefabProp("wall",x,y,1,3,1.5,z,"BO_BRICK03"), prefabProp("wall",x+3,y,1,3,1.5,z,"BO_BRICK03"),
      prefabProp("wall",x+1,y+2,2,1,.75,z,"BO_CONCRETE")
    ];
    if (prefab.id === "columnArc") props = [prefabColumn(x,y+1,z,"BO_STUCCO"), prefabColumn(x+2,y,z,"BO_STUCCO"), prefabColumn(x+4,y+1,z,"BO_STUCCO")];
    if (prefab.id === "archFrame") props = [
      prefabProp("wall",x,y,1,1,3,z,"BO_CONC1K2"), prefabProp("wall",x+3,y,1,1,3,z,"BO_CONC1K2"),
      prefabProp("wall",x+1,y,2,1,.5,z+2.5,"BO_MARBLE")
    ];
    if (prefab.id === "cratePyramid") props = [
      prefabProp("crate",x,y,1,1,1,z,"BO_CEDAR"), prefabProp("crate",x+1,y,1,1,1,z,"BO_CEDAR"),
      prefabProp("crate",x+.5,y,1,1,1,z+1,"BO_WOOD02")
    ];
    if (prefab.id === "tCover") props = [
      prefabProp("wall",x,y+1,4,1,.75,z,"BO_CONCRETE"), prefabProp("wall",x+1.5,y,1,3,1.5,z,"BO_REDBRICK")
    ];
    if (prefab.id === "zigzag") props = [
      prefabProp("diagonal",x,y,2,2,1.25,z,"BO_RUSTIRON",{slope:"up",thickness:.42}),
      prefabProp("diagonal",x+2.5,y+1,2,2,1.25,z,"BO_RUSTIRON",{slope:"down",thickness:.42}),
      prefabProp("diagonal",x+5,y+2,2,2,1.25,z,"BO_RUSTIRON",{slope:"up",thickness:.42})
    ];
    if (prefab.id === "bridge") props = [
      prefabProp("platform",x,y+1,6,1,1,z,"BO_FLOORTILE"),
      prefabProp("wall",x,y,6,.25,.5,z+1,"BO_RUST"), prefabProp("wall",x,y+2.75,6,.25,.5,z+1,"BO_RUST")
    ];
    if (prefab.id === "sniperNest") props = [
      prefabProp("stairs",x,y+1,2,2,1,z,"BO_CONCRETE",{direction:"e",steps:4}), prefabProp("platform",x+2,y,3,4,1,z,"BO_CONC1K1"),
      prefabProp("wall",x+2,y,3,.5,.75,z+1,"BO_CONCRETE"), prefabProp("wall",x+4.5,y+.5,.5,3,.75,z+1,"BO_CONCRETE")
    ];
    if (prefab.id === "marketStall") props = [0,2,4].map((dx,index) => prefabProp("wall",x+dx,y+1,1.5,1,.75,z,index===1?"BO_MARBLE":"BO_WOODREAL"));
    if (prefab.id === "bollardRow") props = [0,2,4,6].map((dx) => { const column=prefabColumn(x+dx,y,z,"BO_CONC1K2"); column.height=.75; return column; });
    if (prefab.id === "highLowCover") props = [
      prefabProp("wall",x,y,1,2,.75,z,"BO_CONCRETE"), prefabProp("wall",x+2,y,1,2,2,z,"BO_REDBRICK"), prefabProp("wall",x+4,y,1,2,.75,z,"BO_CONCRETE")
    ];
    if (prefab.id === "stairTower") props = [
      prefabProp("stairs",x,y+1,2,2,1,z,"BO_CONCRETE",{direction:"e",steps:4}), prefabProp("platform",x+2,y,2,4,1,z,"BO_FLOORTILE"),
      prefabProp("stairs",x+4,y+1,2,2,1,z+1,"BO_CONCRETE",{direction:"e",steps:4}), prefabProp("platform",x+6,y,2,4,1,z+1,"BO_MARBLE")
    ];
    if (!props.length) return;
    const before = snapshot();
    state.props.push(...props);
    selected = { type:"prop", id:props.at(-1).id };
    if (previewMode !== "orbit") setPreviewMode("orbit");
    commit(before);
    showToast(`${prefab.name} placed - ${props.length} physical piece${props.length === 1 ? "" : "s"}`);
  }

  function placeDrawnStructure(kind, start, end) {
    const box = normalizeSnappedRect(start, end);
    if (kind === "diagonal" && (box.w < 2 || box.d < 2)) {
      showToast("Drag at least 2 by 2 grid cells for diagonal cover"); return;
    }
    if (!rectIsInsideSpace(box)) { showToast("Keep the whole structure on a room floor or map ground"); return; }
    if (["wall", "diagonal", "cylinder"].includes(kind) && state.props.some((prop) => rectanglesOverlap(box, prop))) {
      showToast("That wall would overlap another structure"); return;
    }
    const before = snapshot();
    const hostRooms = state.rooms.filter((room) => pointInRoom(box.x + box.w / 2, box.y + box.d / 2, room));
    const surfaceLevel = floorLevelAt(box.x+box.w/2,box.y+box.d/2);
    const hostHeight = hostRooms[0]?.height || 4;
    if(kind==="floorHole"){
      const host=hostRooms.filter((room)=>!room.points?.length&&(planLevel==null||Math.abs(roomFloor(room)-planLevel)<.13)).sort((a,b)=>Math.abs(roomFloor(a)-surfaceLevel)-Math.abs(roomFloor(b)-surfaceLevel))[0];
      if(!host||box.x<host.x+.25||box.y<host.y+.25||box.x+box.w>host.x+host.w-.25||box.y+box.d>host.y+host.d-.25){showToast("Floor openings must stay inside one rectangular room");return;}
      if(state.props.some((item)=>item.kind==="floorHole"&&Math.abs((item.floorLevel||0)-roomFloor(host))<.13&&rectanglesOverlap(item,box))){showToast("That floor opening overlaps another opening");return;}
      const hole={id:crypto.randomUUID(),kind:"floorHole",label:"FLOOR OPENING",...box,height:.25,floorLevel:roomFloor(host),hostRoomId:host.id,texture:"BLACK"};state.props.push(hole);selected={type:"prop",id:hole.id};commit(before);showToast("Compile-safe floor opening cut");return;
    }
    if (kind === "arch") {
      if (box.w < 3*snapStep() || box.d < snapStep()) { showToast("Draw a wider arch opening"); return; }
      const groupId=crypto.randomUUID(), thickness=Math.max(snapStep(),Math.min(1,box.w*.18)), lintel=.6, openingHeight=Math.min(3,hostHeight-1);
      const props=[
        {id:crypto.randomUUID(),kind:"arch",label:"ARCH SUPPORT",x:box.x,y:box.y,w:thickness,d:box.d,height:openingHeight,floorLevel:surfaceLevel,texture:"BO_ROCK",groupId},
        {id:crypto.randomUUID(),kind:"arch",label:"ARCH SUPPORT",x:box.x+box.w-thickness,y:box.y,w:thickness,d:box.d,height:openingHeight,floorLevel:surfaceLevel,texture:"BO_ROCK",groupId},
        {id:crypto.randomUUID(),kind:"arch",label:"ARCH LINTEL",x:box.x,y:box.y,w:box.w,d:box.d,height:lintel,floorLevel:surfaceLevel+openingHeight-lintel,texture:"BO_ROCK",groupId}
      ];
      state.props.push(...props); selection=props.map((prop)=>({type:"prop",id:prop.id})); selected=selection[0]; commit(before); showToast("Grouped three-brush archway created"); return;
    }
    const prop = {
      id: crypto.randomUUID(), kind, ...box,
      height: ["wall", "diagonal", "cylinder"].includes(kind) ? Math.min(hostHeight, kind === "diagonal" ? 1.5 : kind === "cylinder" ? 3 : 4) : ["platform","elevator","train"].includes(kind) ? 1 : kind === "rotatingDoor" ? Math.min(3,hostHeight-.25) : kind === "slopeRoof" ? 1.5 : kind === "water" ? 1 : 2,
      direction: directionFromDrag(start, end),
      texture: kind === "wall" ? (hostRooms[0]?.texture || "CSTRIKE_WR4RGH") : kind === "diagonal" ? "CSTRIKE_ME4METL" : ["platform","elevator","train"].includes(kind) ? "CSTRIKE_CH3TILE" : kind === "rotatingDoor" ? "BO_WOOD02" : kind === "cylinder" ? "BO_ROCK" : kind === "slopeRoof" ? "BO_REDBRICK" : kind === "water" ? "BO_TURQUOISE" : kind === "breakable" ? "BCRATE02" : "CSTRIKE_ME4METL"
    };
    prop.floorLevel = surfaceLevel;
    if(kind === "elevator") Object.assign(prop,{targetName:`elevator_${state.props.filter((item)=>item.kind==="elevator").length+1}`,target:"",speed:120,wait:3,travel:2});
    if(kind === "rotatingDoor") Object.assign(prop,{targetName:`rot_door_${state.props.filter((item)=>item.kind==="rotatingDoor").length+1}`,target:"",speed:100,wait:3,angle:90});
    if(kind === "train") Object.assign(prop,{targetName:`train_${state.props.filter((item)=>item.kind==="train").length+1}`,target:"path_1",speed:100,wait:0});
    if (kind === "cylinder") {
      prop.points = Array.from({length:12},(_,index)=>{const angle=-Math.PI/2+index*Math.PI*2/12;return [box.x+box.w/2+Math.cos(angle)*box.w/2,box.y+box.d/2+Math.sin(angle)*box.d/2];});
    }
    if (kind === "slopeRoof") prop.floorLevel = surfaceLevel + Math.max(2,hostHeight-.75);
    if (kind === "floor") {
      prop.elevation = surfaceLevel + .25;
      prop.thickness = .25;
      prop.texture = hostRooms[0]?.floorTexture || environmentFor().groundMaterial;
    }
    if (kind === "diagonal") {
      prop.slope = (end.x - start.x) * (end.y - start.y) >= 0 ? "down" : "up";
      prop.thickness = .42;
    }
    if (kind === "stairs") prop.steps = recommendedStairSteps(prop);
    state.props.push(prop);
    const assistance=assistVerticalConnector(prop);
    selected = { type: "prop", id: prop.id };
    if (previewMode !== "orbit") setPreviewMode("orbit");
    commit(before);
    showToast(`${kind === "stairs" ? "Stairs" : ["ramp","wedge"].includes(kind) ? (kind === "wedge" ? "Solid wedge" : "Ramp") : kind === "slopeRoof" ? "Sloped roof" : kind === "cylinder" ? "Cylinder" : kind === "water" ? "Water volume" : kind === "breakable" ? "Breakable brush" : kind === "platform" ? "Platform" : kind === "floor" ? "Floor slab" : kind === "diagonal" ? "Diagonal cover" : "Solid wall"} created — physical in Orbit and Walkthrough`);
    if(assistance.length)showToast(`${kind === "stairs" ? "Stairs" : "Ramp"} created with a smart landing or floor opening`);
  }

  function rectanglesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y;
  }

  function findCopiedPosition(type, item) {
    const offsets = [];
    for (let distance = 1; distance <= 24; distance++) {
      offsets.push([distance, 0], [0, distance], [-distance, 0], [0, -distance], [distance, distance], [-distance, distance]);
    }
    for (const [dx, dy] of offsets) {
      const candidate = { ...item, x: item.x + dx, y: item.y + dy };
      if (item.points) candidate.points = item.points.map(([x, y]) => [x + dx, y + dy]);
      if (item.planPoints) candidate.planPoints = item.planPoints.map(([x, y]) => [x + dx, y + dy]);
      if (type === "room" && !state.rooms.some((room) => rectanglesOverlap(candidate, room))) return candidate;
      if (type === "prop" && (["platformPolygon", "floorPolygon", "wallPolygon"].includes(candidate.kind) ? polygonIsInsideSpace(candidate.points || []) : rectIsInsideSpace(candidate)) && !state.props.some((prop) => rectanglesOverlap(candidate, prop))) return candidate;
      if (type === "zone" && rectIsInsideSpace(candidate) && !state.zones.some((zone) => rectanglesOverlap(candidate, zone))) return candidate;
      if (type === "entity" && isPointInSpace(candidate.x + .5,candidate.y + .5)
        && !state.entities.some((entity) => entity.x === candidate.x && entity.y === candidate.y)) return candidate;
    }
    return null;
  }

  function copySelected(showMessage = true) {
    const entries = selectedEntries().filter((entry) => !["door","window"].includes(entry.ref.type));
    if (!entries.length) {
      if (showMessage) showToast("Select a room, structure, or marker to copy");
      return false;
    }
    objectClipboard = { items:entries.map((entry) => ({ type:entry.ref.type, item:structuredClone(entry.item) })) };
    if (showMessage) showToast(`${entries.length} object${entries.length === 1 ? "" : "s"} copied — paste with Ctrl+V`);
    updateInspector();
    return true;
  }

  function pasteCopied() {
    if (!objectClipboard) { showToast("Copy something first"); return; }
    const before = snapshot();
    const sourceItems = objectClipboard.items || [{ type:objectClipboard.type, item:objectClipboard.item }];
    const groupMap = new Map();
    const pasted = sourceItems.map(({type,item}) => {
      const candidate = structuredClone(item), offset = snapStep();
      candidate.id = crypto.randomUUID(); candidate.x += offset; candidate.y += offset;
      if (candidate.points) candidate.points = candidate.points.map(([x,y]) => [x+offset,y+offset]);
      if (candidate.planPoints) candidate.planPoints = candidate.planPoints.map(([x,y]) => [x+offset,y+offset]);
      if (candidate.groupId) {
        if (!groupMap.has(candidate.groupId)) groupMap.set(candidate.groupId,crypto.randomUUID());
        candidate.groupId = groupMap.get(candidate.groupId);
      }
      itemListFor(type).push(candidate);
      return { type, id:candidate.id };
    });
    selection = pasted; selected = pasted[0] || null;
    commit(before);
    showToast(`${pasted.length} object${pasted.length === 1 ? "" : "s"} pasted ${snapUnits} units diagonally`);
  }

  function duplicateSelected() {
    if (!copySelected(false)) return;
    pasteCopied();
  }

  function rotateSelected(clockwise) {
    const entries = selectedEntries();
    if (entries.length && entries.every((entry) => isItemLocked(entry.item))) { showToast("Unlock the selection or its layer before rotating"); return; }
    if (entries.length > 1) {
      const before = snapshot(), bounds = selectionBounds(entries), cx = bounds.x+bounds.w/2, cy = bounds.y+bounds.d/2;
      entries.filter((entry) => !isItemLocked(entry.item) && !["door","window"].includes(entry.ref.type)).forEach(({ref,item}) => {
        const center = { x:item.x+(item.w||1)/2, y:item.y+(item.d||1)/2 };
        const rx = clockwise ? cx-(center.y-cy) : cx+(center.y-cy), ry = clockwise ? cy+(center.x-cx) : cy-(center.x-cx);
        if (item.points) item.points = item.points.map(([x,y]) => clockwise ? [cx-(y-cy),cy+(x-cx)] : [cx+(y-cy),cy-(x-cx)]);
        const oldW=item.w||1; item.w=item.d||1; item.d=oldW; item.x=rx-item.w/2; item.y=ry-item.d/2;
        if (item.points) updatePolygonBounds(item);
        if (ref.type === "prop") item.direction = (clockwise ? {n:"e",e:"s",s:"w",w:"n"}:{n:"w",w:"s",s:"e",e:"n"})[item.direction] || item.direction;
        if (ref.type === "entity" && ["ct","t"].includes(item.kind)) item.angle = ((Number(item.angle)||0)+(clockwise?90:-90)+360)%360;
      });
      commit(before); showToast(`${entries.length} objects rotated around their center`); return;
    }
    const item = selectedItem();
    if (!item || selected.type !== "prop") { showToast("Select a wall, crate, stairs, or ramp to rotate"); return; }
    const before = snapshot();
    if (["platformPolygon", "floorPolygon", "wallPolygon"].includes(item.kind) && item.points?.length) {
      const centerX = item.x + item.w / 2, centerY = item.y + item.d / 2;
      item.points = item.points.map(([x,y]) => clockwise
        ? [centerX - (y - centerY), centerY + (x - centerX)]
        : [centerX + (y - centerY), centerY - (x - centerX)]);
      updatePolygonBounds(item);
      if (!polygonIsInsideSpace(item.points)) {
        state = JSON.parse(before); showToast("Rotation would leave the room—move the platform first"); refresh(); return;
      }
      commit(before); showToast(clockwise ? "Rotated 90° right" : "Rotated 90° left"); return;
    }
    const oldWidth = item.w;
    item.w = item.d;
    item.d = oldWidth;
    const directions = clockwise ? { n: "e", e: "s", s: "w", w: "n" } : { n: "w", w: "s", s: "e", e: "n" };
    if (item.kind === "diagonal") item.slope = item.slope === "down" ? "up" : "down";
    else item.direction = directions[item.direction] || "e";
    if (!rectIsInsideSpace(item)) {
      state = JSON.parse(before);
      showToast("Rotation would leave the room — move the structure first");
      refresh();
      return;
    }
    commit(before);
    showToast(clockwise ? "Rotated 90° right" : "Rotated 90° left");
  }

  function reverseSelected() {
    const item = selectedItem();
    if (!item || selected.type !== "prop" || !["stairs", "ramp", "wedge", "slopeRoof"].includes(item.kind)) {
      showToast("Select stairs or a ramp to reverse"); return;
    }
    if (isItemLocked(item)) { showToast("Unlock the structure or its layer before reversing"); return; }
    const before = snapshot();
    item.direction = ({ n: "s", s: "n", e: "w", w: "e" })[item.direction] || "w";
    commit(before);
    showToast("Uphill direction reversed");
  }

  function applyPrecisionField(field, rawValue) {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;
    const entries = selectedEntries().filter((entry) => !isItemLocked(entry.item));
    if (!entries.length) { showToast("Unlock the selection or its layer first"); return; }
    const before = snapshot(), bounds = selectionBounds(entries);
    if (field === "x") entries.forEach((entry) => moveEntryBy(entry,value/GRID-bounds.x,0,0));
    else if (field === "y") entries.forEach((entry) => moveEntryBy(entry,0,value/GRID-bounds.y,0));
    else if (field === "z") {
      const delta = value/GRID-selectionBaseLevel(entries);
      entries.forEach((entry) => moveEntryBy(entry,0,0,delta));
      planLevel = value/GRID;
    } else if (field === "width" || field === "depth") {
      const target = Math.max(.25,value/GRID), old = field === "width" ? bounds.w : bounds.d;
      if (old <= .001) return;
      entries.forEach((entry) => scaleEntryInSelection(entry,bounds,field === "width" ? target/old : 1,field === "depth" ? target/old : 1));
    } else if (field === "height") {
      const target = Math.max(.125,value/GRID);
      entries.forEach(({ref,item}) => {
        if (ref.type === "prop" && ["floor","floorPolygon"].includes(item.kind)) item.thickness = target;
        else if (!["zone","entity"].includes(ref.type)) item.height = target;
      });
    }
    commit(before);
    showToast(`Exact ${field.toUpperCase()} applied to ${entries.length} object${entries.length===1?"":"s"}`);
  }

  function alignSelected(mode) {
    const entries = selectedEntries().filter((entry) => !isItemLocked(entry.item) && !["door","window"].includes(entry.ref.type));
    if (entries.length < 2) { showToast("Select at least two unlocked objects"); return; }
    const before = snapshot(), bounds = selectionBounds(entries);
    entries.forEach((entry) => {
      const box = itemBoundsForRef(entry.ref);
      let dx=0,dy=0;
      if (mode === "left") dx=bounds.x-box.x;
      if (mode === "centerX") dx=bounds.x+bounds.w/2-(box.x+box.w/2);
      if (mode === "right") dx=bounds.x+bounds.w-(box.x+box.w);
      if (mode === "top") dy=bounds.y-box.y;
      if (mode === "centerY") dy=bounds.y+bounds.d/2-(box.y+box.d/2);
      if (mode === "bottom") dy=bounds.y+bounds.d-(box.y+box.d);
      moveEntryBy(entry,dx,dy,0);
    });
    commit(before); showToast(`Selection aligned ${mode}`);
  }

  function distributeSelected(axis) {
    const entries = selectedEntries().filter((entry) => !isItemLocked(entry.item) && !["door","window"].includes(entry.ref.type));
    if (entries.length < 3) { showToast("Select at least three unlocked objects"); return; }
    const key = axis === "x" ? "x" : "y", size = axis === "x" ? "w" : "d";
    const ordered = entries.map((entry) => ({entry,box:itemBoundsForRef(entry.ref)})).sort((a,b)=>(a.box[key]+a.box[size]/2)-(b.box[key]+b.box[size]/2));
    const first=ordered[0].box[key]+ordered[0].box[size]/2,last=ordered.at(-1).box[key]+ordered.at(-1).box[size]/2,step=(last-first)/(ordered.length-1);
    const before=snapshot();
    ordered.forEach(({entry,box},index) => {
      const delta=first+step*index-(box[key]+box[size]/2);
      moveEntryBy(entry,axis==="x"?delta:0,axis==="y"?delta:0,0);
    });
    commit(before); showToast(`Selection distributed on ${axis.toUpperCase()}`);
  }

  function equalizeSelected(mode) {
    const entries = selectedEntries().filter((entry) => !isItemLocked(entry.item) && ["room","prop","zone"].includes(entry.ref.type));
    if (entries.length < 2) { showToast("Select at least two resizable unlocked objects"); return; }
    const primary = entries.find((entry) => sameRef(entry.ref,selected)) || entries[0], target = itemBoundsForRef(primary.ref), before=snapshot();
    entries.forEach((entry) => {
      if (mode !== "depth") resizeEntryAxis(entry,"x",target.w);
      if (mode !== "width") resizeEntryAxis(entry,"y",target.d);
    });
    commit(before); showToast(mode === "both" ? "Selection size matched" : `${mode} matched to the primary object`);
  }

  function centerSelectionOnOrigin() {
    const entries=selectedEntries().filter((entry)=>!isItemLocked(entry.item));
    if(!entries.length)return;
    const bounds=selectionBounds(entries),before=snapshot(),dx=-(bounds.x+bounds.w/2),dy=-(bounds.y+bounds.d/2);
    entries.forEach((entry)=>moveEntryBy(entry,dx,dy,0));
    commit(before);showToast("Selection centered on world origin");
  }

  function groupSelected() {
    const entries = selectedEntries();
    if (entries.length < 2) { showToast("Select at least two objects to group"); return; }
    const before = snapshot(), groupId = crypto.randomUUID();
    entries.forEach((entry) => { entry.item.groupId = groupId; });
    commit(before); showToast(`${entries.length} objects grouped`);
  }

  function ungroupSelected() {
    const entries = selectedEntries().filter((entry) => entry.item.groupId);
    if (!entries.length) return;
    const before = snapshot(); entries.forEach((entry) => { delete entry.item.groupId; }); commit(before); showToast("Selection ungrouped");
  }

  function toggleLockSelected() {
    const entries = selectedEntries(); if (!entries.length) return;
    const before = snapshot(), lock = !entries.every((entry) => entry.item.locked);
    entries.forEach((entry) => { entry.item.locked = lock; }); commit(before); showToast(lock ? "Selection locked" : "Selection unlocked");
  }

  function hideSelected() {
    const entries = selectedEntries(); if (!entries.length) return;
    const before = snapshot(); entries.forEach((entry) => { entry.item.hidden = true; }); selection=[]; selected=null; commit(before); showToast(`${entries.length} object${entries.length===1?"":"s"} hidden`);
  }

  function unhideAll() {
    const hidden = ["room","door","window","zone","prop","entity"].flatMap((type) => itemListFor(type)).filter((item) => item.hidden);
    if (!hidden.length) { showToast("Nothing is hidden"); return; }
    const before = snapshot(); hidden.forEach((item) => { delete item.hidden; }); commit(before); showToast(`${hidden.length} hidden objects shown`);
  }

  function toggleVertexEditing() {
    const item = selectedItem();
    if (!item || !["room", "prop"].includes(selected?.type)) return;
    if (isItemLocked(item)) { showToast("Unlock the shape or its layer before editing corners"); return; }
    if (!item.points?.length) {
      const before = snapshot();
      item.points = [[item.x,item.y],[item.x+item.w,item.y],[item.x+item.w,item.y+item.d],[item.x,item.y+item.d]];
      if (selected.type === "prop") item.kind = ({ wall:"wallPolygon", platform:"platformPolygon", floor:"floorPolygon", cylinder:"wallPolygon" })[item.kind] || item.kind;
      updatePolygonBounds(item);
      commit(before);
    }
    editingVertices = !editingVertices;
    selectedVertexIndex = -1;
    selectedEdgeIndex = -1;
    if (editingVertices) setTool("select");
    refresh();
    showToast(editingVertices ? "Corner editing on—drag a numbered handle" : "Corner editing finished");
  }

  function removeSelectedVertex() {
    const item = selectedItem();
    if (!item || !["room", "prop"].includes(selected?.type) || !item.points?.length || selectedVertexIndex < 0) return;
    if (item.points.length <= 3) { showToast("A polygon needs at least three corners"); return; }
    const before = snapshot();
    const original = item.points.map((point) => [...point]);
    item.points.splice(selectedVertexIndex, 1);
    const error = polygonValidation(item.points);
    updatePolygonBounds(item);
    const editedPlatform = selected.type === "prop";
    const orphaned = editedPlatform ? !polygonIsInsideSpace(item.points) : (
      state.entities.some((entity) => !isPointInSpace(entity.x + .5,entity.y + .5))
      || state.props.some((prop) => ["platformPolygon", "floorPolygon", "wallPolygon"].includes(prop.kind) ? !polygonIsInsideSpace(prop.points || []) : !rectIsInsideSpace(prop))
      || state.zones.some((zone) => !rectIsInsideSpace(zone))
    );
    if (error || orphaned) {
      item.points = original; updatePolygonBounds(item);
      showToast(error || (editedPlatform ? "Keep the polygon platform on a buildable surface" : "Removing that corner would leave an object outside the build area"));
      refresh(); return;
    }
    selectedVertexIndex = -1;
    commit(before);
    showToast("Corner removed");
  }

  function polygonEditWouldOrphan(item, type) {
    if (type === "prop") return item.points?.length ? !polygonIsInsideSpace(item.points) : !rectIsInsideSpace(item);
    return state.entities.some((entity) => !isPointInSpace(entity.x + .5,entity.y + .5))
      || state.props.some((prop) => ["platformPolygon","floorPolygon","wallPolygon"].includes(prop.kind) ? !polygonIsInsideSpace(prop.points || []) : !rectIsInsideSpace(prop))
      || state.zones.some((zone) => !rectIsInsideSpace(zone));
  }

  function applySafePolygonEdit(nextPoints, message) {
    const item = selectedItem();
    if (!item || !["room","prop"].includes(selected?.type) || !item.points?.length) return false;
    const before = snapshot(), original = item.points.map((point) => [...point]);
    item.points = nextPoints.map((point) => [baseSnap(point[0]),baseSnap(point[1])]);
    updatePolygonBounds(item);
    const error = polygonValidation(item.points);
    if (error || polygonEditWouldOrphan(item,selected.type)) {
      item.points = original; updatePolygonBounds(item); refresh();
      showToast(error || "That edit would leave existing geometry outside its floor"); return false;
    }
    commit(before); showToast(message); return true;
  }

  function clipSelectedVertex() {
    const item=selectedItem(),index=selectedVertexIndex;
    if(!item?.points?.length||index<0||item.points.length>=16)return;
    const previous=item.points[(index-1+item.points.length)%item.points.length],current=item.points[index],next=item.points[(index+1)%item.points.length];
    const amount=.28;
    const first=[current[0]+(previous[0]-current[0])*amount,current[1]+(previous[1]-current[1])*amount];
    const second=[current[0]+(next[0]-current[0])*amount,current[1]+(next[1]-current[1])*amount];
    const points=[...item.points.slice(0,index),first,second,...item.points.slice(index+1)];
    if(applySafePolygonEdit(points,"Corner clipped into two compile-safe faces")){selectedVertexIndex=-1;selectedEdgeIndex=index;}
  }

  function extrudeSelectedEdge() {
    const item=selectedItem(),index=selectedEdgeIndex;
    if(!item?.points?.length||index<0)return;
    const a=item.points[index],b=item.points[(index+1)%item.points.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(.001,Math.hypot(dx,dy));
    const area=item.points.reduce((sum,point,i)=>{const next=item.points[(i+1)%item.points.length];return sum+point[0]*next[1]-next[0]*point[1];},0);
    const normal=area>0?[dy/length,-dx/length]:[-dy/length,dx/length],distance=Math.max(.25,snapStep());
    const points=item.points.map((point,i)=>i===index||i===(index+1)%item.points.length?[point[0]+normal[0]*distance,point[1]+normal[1]*distance]:[...point]);
    applySafePolygonEdit(points,`Edge extruded ${Math.round(distance*GRID)} units`);
  }

  function offsetSelectedPolygon(direction) {
    const item=selectedItem();if(!item?.points?.length)return;
    const center=item.points.reduce((sum,point)=>[sum[0]+point[0]/item.points.length,sum[1]+point[1]/item.points.length],[0,0]);
    const distance=Math.max(.25,snapStep())*direction;
    const points=item.points.map((point)=>{const dx=center[0]-point[0],dy=center[1]-point[1],length=Math.max(.001,Math.hypot(dx,dy));return [point[0]+dx/length*distance,point[1]+dy/length*distance];});
    applySafePolygonEdit(points,direction>0?"Polygon inset safely":"Polygon outset safely");
  }

  function brushStudioEntries() {
    const propKinds=new Set(["crate","wall","wallPolygon","platform","platformPolygon","floor","floorPolygon","cylinder","arch","breakable"]);
    return selectedEntries().filter(({ref,item})=>ref.type==="room"||(ref.type==="prop"&&propKinds.has(item.kind)));
  }

  function brushPresetPoints(item,preset) {
    const x=Number(item.x)||0,y=Number(item.y)||0,w=Math.max(.5,Number(item.w)||1),d=Math.max(.5,Number(item.d)||1),cut=Math.min(w,d)*.22;
    if(preset==="rectangle")return [[x,y],[x+w,y],[x+w,y+d],[x,y+d]];
    if(preset==="triangle")return [[x+w/2,y],[x+w,y+d],[x,y+d]];
    if(preset==="trapezoid")return [[x+cut,y],[x+w-cut,y],[x+w,y+d],[x,y+d]];
    if(preset==="hexagon")return [[x+cut,y],[x+w-cut,y],[x+w,y+d/2],[x+w-cut,y+d],[x+cut,y+d],[x,y+d/2]];
    if(preset==="octagon")return octagonPoints(x,y,w,d,cut);
    if(preset==="round12")return Array.from({length:12},(_,index)=>{
      const angle=-Math.PI/2+index*Math.PI/6;
      return [x+w/2+Math.cos(angle)*w/2,y+d/2+Math.sin(angle)*d/2];
    });
    return [[x,y],[x+w,y],[x+w,y+d],[x,y+d]];
  }

  function convertBrushKind(item,type,polygon) {
    if(type==="room"){item.kind=item.kind==="corridor"?"corridor":"room";return;}
    if(!polygon){
      if(["wallPolygon","cylinder"].includes(item.kind))item.kind="wall";
      if(item.kind==="platformPolygon")item.kind="platform";
      if(item.kind==="floorPolygon")item.kind="floor";
      return;
    }
    if(["floor","floorPolygon"].includes(item.kind))item.kind="floorPolygon";
    else if(["platform","platformPolygon"].includes(item.kind))item.kind="platformPolygon";
    else item.kind="wallPolygon";
  }

  function clearRemappedBrushFaces(item,type) {
    if(type==="room"){item.edgeTextures={};item.edgeUV={};}
    else {
      const keptTextures={},keptUv={};
      ["top","bottom"].forEach((face)=>{if(item.faceTextures?.[face])keptTextures[face]=item.faceTextures[face];if(item.faceUV?.[face])keptUv[face]=item.faceUV[face];});
      item.faceTextures=keptTextures;item.faceUV=keptUv;
    }
  }

  function applyBrushPreset() {
    const entries=brushStudioEntries();
    if(entries.length!==1)return showToast("Select one room or brush for a shape preset");
    const entry=entries[0],item=entry.item;
    if(isItemLocked(item))return showToast("Unlock the brush or its layer first");
    const preset=$("#brushPreset").value,before=snapshot(),points=brushPresetPoints(item,preset);
    if(preset==="rectangle"){delete item.points;delete item.planPoints;convertBrushKind(item,entry.ref.type,false);}
    else {item.points=points;delete item.planPoints;convertBrushKind(item,entry.ref.type,true);updatePolygonBounds(item);}
    clearRemappedBrushFaces(item,entry.ref.type);
    const error=preset==="rectangle"?"":polygonValidation(item.points);
    if(error||polygonEditWouldOrphan(item,entry.ref.type)){state=JSON.parse(before);environmentFor(state);refresh();return showToast(error||"That shape would leave existing geometry outside its floor");}
    commit(before);syncBrushStudio();showToast(`${$("#brushPreset").selectedOptions[0].textContent} brush applied`);
  }

  function bevelSelectedBrush() {
    const entries=brushStudioEntries();
    if(entries.length!==1)return showToast("Select one room or brush to bevel");
    const {ref,item}=entries[0];
    if(isItemLocked(item))return showToast("Unlock the brush or its layer first");
    const source=(item.points?.length?item.points:brushPresetPoints(item,"rectangle")).map((point)=>[...point]);
    if(source.length*2>16)return showToast("This bevel would exceed the 16-corner safety limit");
    const amount=Math.max(.375,Math.min(2,Number($("#brushBevelAmount").value)/GRID||.5)),points=[];
    source.forEach((current,index)=>{
      const previous=source[(index-1+source.length)%source.length],next=source[(index+1)%source.length];
      const previousLength=Math.max(.001,Math.hypot(previous[0]-current[0],previous[1]-current[1])),nextLength=Math.max(.001,Math.hypot(next[0]-current[0],next[1]-current[1]));
      const firstDistance=Math.min(amount,previousLength*.4),secondDistance=Math.min(amount,nextLength*.4);
      points.push([current[0]+(previous[0]-current[0])*firstDistance/previousLength,current[1]+(previous[1]-current[1])*firstDistance/previousLength]);
      points.push([current[0]+(next[0]-current[0])*secondDistance/nextLength,current[1]+(next[1]-current[1])*secondDistance/nextLength]);
    });
    const before=snapshot();item.points=points;delete item.planPoints;convertBrushKind(item,ref.type,true);updatePolygonBounds(item);clearRemappedBrushFaces(item,ref.type);
    const error=polygonValidation(item.points);
    if(error||polygonEditWouldOrphan(item,ref.type)){state=JSON.parse(before);environmentFor(state);refresh();return showToast(error||"That bevel would orphan contained geometry");}
    commit(before);syncBrushStudio();showToast(`${Math.round(amount*GRID)}-unit bevel applied`);
  }

  function splitSelectedBrush() {
    const entries=brushStudioEntries();
    if(entries.length!==1)return showToast("Select one rectangular room or brush to split");
    const {ref,item}=entries[0];
    if(item.points?.length)return showToast("Split currently needs a rectangular brush; use Edit corners for polygons");
    if(isItemLocked(item))return showToast("Unlock the brush or its layer first");
    const axis=$("#brushSplitAxis").value,ratio=Math.max(.1,Math.min(.9,(Number($("#brushSplitRatio").value)||50)/100));
    const key=axis==="x"?"w":"d",position=axis==="x"?"x":"y",total=Number(item[key])||1,first=Math.max(.25,baseSnap(total*ratio,.25)),second=total-first;
    if(second<.25)return showToast("The cut would create a brush thinner than 16 units");
    const before=snapshot(),clone=structuredClone(item),groupId=crypto.randomUUID();
    clone.id=crypto.randomUUID();clone[position]=(Number(item[position])||0)+first;clone[key]=second;clone.groupId=groupId;
    item[key]=first;item.groupId=groupId;
    itemListFor(ref.type).push(clone);
    if(ref.type==="room"){
      [...state.doors,...state.windows].filter((opening)=>opening.edgeRoomId===item.id).forEach((opening)=>{
        const adjacent=adjacentRoomsForOpening(opening);if(!adjacent.some((room)=>room.id===item.id)&&adjacent.some((room)=>room.id===clone.id))opening.edgeRoomId=clone.id;
      });
      smartConnectRoom(clone);
    }
    selection=[{...ref},{type:ref.type,id:clone.id}];selected=selection[0];
    commit(before);syncBrushStudio();showToast(`Brush split into ${Math.round(first*GRID)} and ${Math.round(second*GRID)} units`);
  }

  function extrudeBrushSide() {
    const entries=brushStudioEntries();
    if(entries.length!==1)return showToast("Select one room or brush to extrude");
    const {ref,item}=entries[0];
    if(isItemLocked(item))return showToast("Unlock the brush or its layer first");
    const side=$("#brushExtrudeSide").value,amount=Math.max(.125,Math.min(8,Math.abs(Number($("#brushExtrudeAmount").value)||64)/GRID)),before=snapshot();
    if(item.points?.length){
      const values=item.points.map((point)=>["east","west"].includes(side)?point[0]:point[1]),extreme=["north","west"].includes(side)?Math.min(...values):Math.max(...values);
      item.points=item.points.map(([x,y])=>{
        if(["east","west"].includes(side)&&Math.abs(x-extreme)<.01)x+=side==="east"?amount:-amount;
        if(["north","south"].includes(side)&&Math.abs(y-extreme)<.01)y+=side==="south"?amount:-amount;
        return [x,y];
      });
      updatePolygonBounds(item);
    }else{
      if(side==="north"){item.y-=amount;item.d+=amount;}
      if(side==="south")item.d+=amount;
      if(side==="west"){item.x-=amount;item.w+=amount;}
      if(side==="east")item.w+=amount;
    }
    const error=item.points?.length?polygonValidation(item.points):"";
    if(error||polygonEditWouldOrphan(item,ref.type)){state=JSON.parse(before);environmentFor(state);refresh();return showToast(error||"That extrusion would orphan contained geometry");}
    commit(before);syncBrushStudio();showToast(`${Math.round(amount*GRID)} units extruded ${side}`);
  }

  function mirrorBrushSelection(axis) {
    const entries=selectedEntries().filter(({item})=>!isItemLocked(item));
    if(!entries.length)return showToast("Select unlocked objects to mirror");
    const bounds=selectionBounds(entries),pivot=[bounds.x+bounds.w/2,bounds.y+bounds.d/2],rotation=axis==="y"?180:0,before=snapshot();
    entries.forEach(({ref,item})=>{
      if(["room","prop","zone"].includes(ref.type))Object.assign(item,transformPrefabRect(item,pivot,pivot,rotation,true));
      else if(ref.type==="entity"){const point=transformPrefabPoint([item.x,item.y],pivot,pivot,rotation,true);item.x=point[0];item.y=point[1];}
      ["points","planPoints","segment","edge"].forEach((key)=>{if(item[key]?.length)item[key]=item[key].map((point)=>transformPrefabPoint(point,pivot,pivot,rotation,true));});
      if(["door","window"].includes(ref.type))syncOpeningLegacy(item);
      if(item.direction)item.direction=transformPrefabDirection(item.direction,rotation,true);
      if(Number.isFinite(Number(item.angle)))item.angle=((Number(item.angle)+(180-2*Number(item.angle))+rotation)%360+360)%360;
      if(item.points?.length)updatePolygonBounds(item);
    });
    commit(before);syncBrushStudio();showToast(`Selection mirrored on ${axis.toUpperCase()}`);
  }

  function createBrushArray() {
    const prefab=captureSelectedPrefab();
    if(!prefab)return;
    if(selectedEntries().some(({item})=>isItemLocked(item)))return showToast("Unlock the complete selection before creating an array");
    const copies=Math.max(1,Math.min(32,Math.round(Number($("#brushArrayCopies").value)||1))),dx=(Number($("#brushArrayX").value)||0)/GRID,dy=(Number($("#brushArrayY").value)||0)/GRID;
    if(Math.abs(dx)<.001&&Math.abs(dy)<.001)return showToast("Set X or Y spacing for the array");
    const before=snapshot(),pivot=customPrefabPivotPoint(prefab),created=[],oldRotation=customPrefabRotation,oldMirrored=customPrefabMirrored;
    customPrefabRotation=0;customPrefabMirrored=false;
    for(let copyIndex=1;copyIndex<=copies;copyIndex++){
      const idMap=new Map(prefab.items.map((entry)=>[entry.item.id,crypto.randomUUID()])),groupMap=new Map(),targetMap=new Map();
      prefab.items.forEach(({type,item})=>{
        if(item.groupId&&!groupMap.has(item.groupId))groupMap.set(item.groupId,crypto.randomUUID());
        if(item.targetName&&!targetMap.has(item.targetName))targetMap.set(item.targetName,`${item.targetName}_${crypto.randomUUID().slice(0,5)}`);
        if(type==="entity"&&["teleDest","light","spotlight"].includes(item.kind)&&item.target&&!targetMap.has(item.target))targetMap.set(item.target,`${item.target}_${crypto.randomUUID().slice(0,5)}`);
      });
      const target=[pivot[0]+dx*copyIndex,pivot[1]+dy*copyIndex];
      prefab.items.map((entry)=>transformCustomPrefabItem(entry,prefab,pivot,target,prefab.bounds.base,idMap,groupMap,targetMap)).forEach((entry)=>{itemListFor(entry.type).push(entry.item);created.push({type:entry.type,id:entry.item.id});});
    }
    customPrefabRotation=oldRotation;customPrefabMirrored=oldMirrored;
    selection=[...selection,...created];selected=selection[0]||null;
    commit(before);syncBrushStudio();showToast(`${copies} array cop${copies===1?"y":"ies"} created as editable geometry`);
  }

  function applyBrushWallThickness() {
    const entries=brushStudioEntries();
    if(entries.length!==1||entries[0].ref.type!=="room")return showToast("Select one room to set wall thickness");
    const room=entries[0].item;if(isItemLocked(room))return showToast("Unlock the room or its layer first");
    const before=snapshot(),units=Math.max(8,Math.min(64,Number($("#brushWallThickness").value)||16));room.wallThickness=units/GRID;
    commit(before);syncBrushStudio();showToast(`Room shell thickness set to ${units} units`);
  }

  function syncBrushStudio() {
    if(!$("#brushStudioDialog")?.open)return;
    const entries=brushStudioEntries(),single=entries.length===1?entries[0]:null,locked=entries.some(({item})=>isItemLocked(item));
    $("#brushStudioSummary").textContent=entries.length?`${entries.length} selected brush${entries.length===1?"":"es"} · ${Math.round((selectionBounds(entries)?.w||0)*GRID)} × ${Math.round((selectionBounds(entries)?.d||0)*GRID)} units${locked?" · includes locked geometry":""}`:"Select a room, wall, platform, floor, crate, or brush group in the plan.";
    ["applyBrushPreset","bevelBrush","splitBrush","extrudeBrush"].forEach((id)=>{$(`#${id}`).disabled=!single||locked;});
    $("#applyWallThickness").disabled=!single||single.ref.type!=="room"||locked;
    $("#editBrushCorners").disabled=!single||locked;
    $("#mirrorBrushX").disabled=$("#mirrorBrushY").disabled=$("#createBrushArray").disabled=!entries.length||locked;
    if(single?.ref.type==="room")$("#brushWallThickness").value=Math.round((Number(single.item.wallThickness)||.25)*GRID);
    const reports=[],errors=[];
    entries.forEach(({ref,item})=>{
      const points=item.points?.length?item.points:null;
      if(points){
        const error=polygonValidation(points);if(error)errors.push(error);
        reports.push(`${item.label||item.kind||ref.type}: ${points.length} convex faces`);
        if(points.length>16)errors.push("More than 16 plan corners");
      }else reports.push(`${item.label||item.kind||ref.type}: rectangular brush`);
      const bounds=itemBoundsForRef(ref);if(bounds&&(bounds.w*GRID<8||bounds.d*GRID<8))errors.push("Brush is thinner than 8 units");
    });
    $("#brushSafetyBadge").textContent=errors.length?"CHECK":"READY";
    $("#brushSafetyBadge").classList.toggle("warning",!!errors.length);
    $("#brushSafetyReport").textContent=errors.length?[...new Set(errors)].join(" · "):reports.length?`${reports.join(" · ")}. Every operation creates one Undo step and exports as convex GoldSrc brushes.`:"No brush selected.";
  }

  function openBrushStudio() {
    $("#brushStudioDialog").showModal();syncBrushStudio();
  }

  function deleteSelected() {
    const entries = selectedEntries();
    if (!entries.length) return;
    const before = snapshot();
    const ids = new Map();
    entries.forEach((entry) => { if (!isItemLocked(entry.item)) { if (!ids.has(entry.ref.type)) ids.set(entry.ref.type,new Set()); ids.get(entry.ref.type).add(entry.ref.id); } });
    if (!ids.size) { showToast("Unlock the selection before deleting it"); return; }
    ["room","door","window","zone","prop","entity"].forEach((type) => {
      const remove = ids.get(type); if (!remove) return;
      const key = type === "room" ? "rooms" : type === "entity" ? "entities" : `${type}s`;
      state[key] = state[key].filter((item) => !remove.has(item.id));
    });
    if (ids.has("room")) {
      state.entities = state.entities.filter((entity) => isPointInSpace(entity.x + .5,entity.y + .5));
      state.props = state.props.filter((prop) => ["platformPolygon", "floorPolygon", "wallPolygon"].includes(prop.kind) ? polygonIsInsideSpace(prop.points || []) : rectIsInsideSpace(prop));
      state.zones = state.zones.filter((zone) => rectIsInsideSpace(zone));
      state.doors = state.doors.filter(doorIsConnected);
      state.windows = state.windows.filter(doorIsConnected);
    }
    selected = null; selection = [];
    editingVertices = false;
    selectedVertexIndex = -1;
    commit(before);
    showToast(`${[...ids.values()].reduce((sum,set)=>sum+set.size,0)} object${entries.length===1?"":"s"} deleted`);
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function safeName(value) {
    return (value || "my_first_map").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "my_first_map";
  }

  function hexToRgb(value) {
    const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value || "");
    return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : [255, 240, 208];
  }

  function textureFace(texture, uv = null) {
    const value=normalizedUv(uv);
    return `${texture} ${Math.round(value.shiftX)} ${Math.round(value.shiftY)} ${Math.round(value.rotation)} ${value.scaleX} ${value.scaleY}`;
  }

  function boxBrush(x1, y1, z1, x2, y2, z2, texture = "C1A0_LABW3", uv = null, faceTextures = null, faceUV = null) {
    const f = (a, b, c, face) => `( ${a.join(" ")} ) ( ${b.join(" ")} ) ( ${c.join(" ")} ) ${textureFace(faceTextures?.[face]||texture,faceUV?.[face]||uv)}`;
    return [
      "{",
      f([x1,y1,z2],[x2,y2,z2],[x2,y1,z2],"top"),
      f([x2,y1,z1],[x1,y2,z1],[x1,y1,z1],"bottom"),
      f([x1,y1,z1],[x1,y2,z2],[x1,y1,z2],"west"),
      f([x2,y2,z1],[x2,y1,z2],[x2,y2,z2],"east"),
      f([x2,y1,z1],[x1,y1,z2],[x2,y1,z2],"north"),
      f([x1,y2,z1],[x2,y2,z2],[x1,y2,z2],"south"),
      "}"
    ].join("\n");
  }

  function polygonPrismBrush(corners, z1, z2, texture = "C1A0_LABW3", uv = null, faceTextures = null, faceUV = null) {
    let rounded = corners.map(([x, y]) => [Math.round(x), Math.round(y)]);
    const signedArea = rounded.reduce((sum, point, index) => {
      const next = rounded[(index + 1) % rounded.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0);
    const reversed=signedArea>0;
    if (reversed) rounded = [...rounded].reverse();
    const f = (a, b, c, face) => `( ${a.join(" ")} ) ( ${b.join(" ")} ) ( ${c.join(" ")} ) ${textureFace(faceTextures?.[face]||texture,faceUV?.[face]||uv)}`;
    const top = rounded.map(([x, y]) => [x, y, Math.round(z2)]);
    const bottom = rounded.map(([x, y]) => [x, y, Math.round(z1)]);
    // diagonalCorners is clockwise. GoldSrc expects the top plane clockwise,
    // the bottom plane reversed, and each side to follow its clockwise edge.
    const faces = [f(top[0], top[1], top[2],"top"), f(bottom[0], bottom[2], bottom[1],"bottom")];
    for (let index = 0; index < rounded.length; index++) {
      const next = (index + 1) % rounded.length;
      const sourceIndex=reversed?(rounded.length-2-index+rounded.length)%rounded.length:index;
      faces.push(f(bottom[index], top[next], top[index],`side:${sourceIndex}`));
    }
    return ["{", ...faces, "}"].join("\n");
  }

  function overlapPolygon(corners, amount) {
    const center = corners.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0])
      .map((value) => value / corners.length);
    return corners.map(([x, y]) => {
      const dx = x - center[0], dy = y - center[1];
      const length = Math.max(1, Math.hypot(dx, dy));
      return [x + dx / length * amount, y + dy / length * amount];
    });
  }

  function segmentPrismBrush(start, end, z1, z2, texture, thickness = 16, uv = null) {
    const dx = end[0] - start[0], dy = end[1] - start[1];
    const length = Math.max(.001, Math.hypot(dx, dy));
    const nx = -dy / length * thickness / 2, ny = dx / length * thickness / 2;
    return polygonPrismBrush([
      [start[0] + nx, start[1] + ny], [end[0] + nx, end[1] + ny],
      [end[0] - nx, end[1] - ny], [start[0] - nx, start[1] - ny]
    ], z1, z2, texture, uv);
  }

  function buildPolygonRoomWalls(room, wall) {
    const output = [];
    const floorZ = Math.round(roomFloor(room) * GRID);
    const ceiling = floorZ + room.height * GRID;
    const lerp=(a,b,t)=>[(a[0]+(b[0]-a[0])*t)*GRID,(a[1]+(b[1]-a[1])*t)*GRID];
    room.points.forEach((point, index) => {
      const next = room.points[(index + 1) % room.points.length];
      const texture=roomWallTexture(room,index,room.points),uv=roomWallUv(room,index,room.points);
      const openings=edgeOpenings(point,next,roomFloor(room));
      splitRange(0,1,openings.map((opening)=>[opening.start,opening.end])).forEach(([start,end])=>output.push(segmentPrismBrush(lerp(point,next,start),lerp(point,next,end),floorZ,ceiling,texture,wall,uv)));
      openings.forEach((opening)=>{
        const start=lerp(point,next,opening.start),end=lerp(point,next,opening.end);
        if(opening.kind==="door"){
          const doorHeight=Math.min(Math.round((opening.item.height||2)*GRID),room.height*GRID-16);
          if(floorZ+doorHeight<ceiling)output.push(segmentPrismBrush(start,end,floorZ+doorHeight,ceiling,texture,wall,uv));
        }else{
          const sill=Math.round((opening.item.sill||.75)*GRID),top=Math.round(((opening.item.sill||.75)+(opening.item.height||1.5))*GRID);
          if(sill>0)output.push(segmentPrismBrush(start,end,floorZ,floorZ+sill,texture,wall,uv));
          if(floorZ+top<ceiling)output.push(segmentPrismBrush(start,end,floorZ+top,ceiling,texture,wall,uv));
        }
      });
    });
    return output;
  }

  function buildRoomWalls(room, wall) {
    const output = [];
    const floorZ = Math.round(roomFloor(room) * GRID);
    const ceiling = floorZ + room.height * GRID;
    const addHorizontal = (boundary, topSide, direction) => {
      const texture=room.wallTextures?.[direction]||room.texture||"C1A0_LABW3",uv=resolvedSurfaceUv(room,"room",direction,room.wallUV?.[direction]||room.textureUV);
      const openings = boundaryOpenings("h", boundary, room.x, room.x + room.w,roomFloor(room));
      const cuts = openings.map((opening) => [opening.start, opening.end]);
      const y1 = boundary * GRID + (topSide ? -wall : 0);
      const y2 = boundary * GRID + (topSide ? 0 : wall);
      splitRange(room.x, room.x + room.w, cuts).forEach(([start, end]) => {
        const extendedStart = start === room.x ? start * GRID - wall : start * GRID;
        const extendedEnd = end === room.x + room.w ? end * GRID + wall : end * GRID;
        output.push(boxBrush(extendedStart, y1, floorZ, extendedEnd, y2, ceiling, texture,uv));
      });
      openings.forEach((opening) => {
        if (opening.kind === "door") {
          const doorHeight=Math.min(Math.round((opening.item.height||2)*GRID),room.height*GRID-16);
          if (floorZ + doorHeight < ceiling) output.push(boxBrush(opening.start * GRID, y1, floorZ + doorHeight, opening.end * GRID, y2, ceiling, texture,uv));
          return;
        }
        const sill = Math.round((opening.item.sill || .75) * GRID);
        const top = Math.round(((opening.item.sill || .75) + (opening.item.height || 1.5)) * GRID);
        if (sill > 0) output.push(boxBrush(opening.start * GRID, y1, floorZ, opening.end * GRID, y2, floorZ + sill, texture,uv));
        if (floorZ + top < ceiling) output.push(boxBrush(opening.start * GRID, y1, floorZ + top, opening.end * GRID, y2, ceiling, texture,uv));
      });
    };
    const addVertical = (boundary, leftSide, direction) => {
      const texture=room.wallTextures?.[direction]||room.texture||"C1A0_LABW3",uv=resolvedSurfaceUv(room,"room",direction,room.wallUV?.[direction]||room.textureUV);
      const openings = boundaryOpenings("v", boundary, room.y, room.y + room.d,roomFloor(room));
      const cuts = openings.map((opening) => [opening.start, opening.end]);
      const x1 = boundary * GRID + (leftSide ? -wall : 0);
      const x2 = boundary * GRID + (leftSide ? 0 : wall);
      splitRange(room.y, room.y + room.d, cuts).forEach(([start, end]) => {
        output.push(boxBrush(x1, start * GRID, floorZ, x2, end * GRID, ceiling, texture,uv));
      });
      openings.forEach((opening) => {
        if (opening.kind === "door") {
          const doorHeight=Math.min(Math.round((opening.item.height||2)*GRID),room.height*GRID-16);
          if (floorZ + doorHeight < ceiling) output.push(boxBrush(x1, opening.start * GRID, floorZ + doorHeight, x2, opening.end * GRID, ceiling, texture,uv));
          return;
        }
        const sill = Math.round((opening.item.sill || .75) * GRID);
        const top = Math.round(((opening.item.sill || .75) + (opening.item.height || 1.5)) * GRID);
        if (sill > 0) output.push(boxBrush(x1, opening.start * GRID, floorZ, x2, opening.end * GRID, floorZ + sill, texture,uv));
        if (floorZ + top < ceiling) output.push(boxBrush(x1, opening.start * GRID, floorZ + top, x2, opening.end * GRID, ceiling, texture,uv));
      });
    };
    addHorizontal(room.y, true,"north");
    addHorizontal(room.y + room.d, false,"south");
    addVertical(room.x, true,"west");
    addVertical(room.x + room.w, false,"east");
    return output;
  }

  function buildPropBrushes(prop) {
    const texture = prop.texture || (prop.kind === "crate" ? "BCRATE02" : prop.kind === "wall" ? "CSTRIKE_WR4RGH" : "CSTRIKE_ME4METL");
    const uv=resolvedSurfaceUv(prop,"prop","object");
    const x1 = prop.x * GRID, y1 = prop.y * GRID;
    const x2 = (prop.x + prop.w) * GRID, y2 = (prop.y + prop.d) * GRID;
    const totalHeight = prop.height * GRID;
    const floorZ = Math.round((Number(prop.floorLevel) || 0) * GRID);
    if (prop.kind === "ladder") return [];
    if (["water","breakable","elevator","rotatingDoor","train","floorHole"].includes(prop.kind)) return [];
    if (prop.kind === "diagonal") {
      const corners = diagonalCorners(prop).map(([x, y]) => [x * GRID, y * GRID]);
      return [polygonPrismBrush(corners, floorZ, floorZ + totalHeight, texture, uv, prop.faceTextures, prop.faceUV)];
    }
    if (["wallPolygon","cylinder"].includes(prop.kind)) {
      const corners = (prop.points || []).map(([x, y]) => [x * GRID, y * GRID]);
      return [polygonPrismBrush(corners, floorZ, floorZ + totalHeight, texture, uv, prop.faceTextures, prop.faceUV)];
    }
    if (prop.kind === "platformPolygon") {
      const corners = (prop.points || []).map(([x, y]) => [x * GRID, y * GRID]);
      return [polygonPrismBrush(corners, floorZ, floorZ + totalHeight, texture, uv, prop.faceTextures, prop.faceUV)];
    }
    if (["floor", "floorPolygon"].includes(prop.kind)) {
      const top = Math.round((Number(prop.elevation) || 0) * GRID);
      const bottom = top - Math.max(8, Math.round((Number(prop.thickness) || .25) * GRID));
      if (prop.kind === "floorPolygon") {
        const corners = (prop.points || []).map(([x, y]) => [x * GRID, y * GRID]);
        return [polygonPrismBrush(corners, bottom, top, texture, uv, prop.faceTextures, prop.faceUV)];
      }
      return [boxBrush(x1, y1, bottom, x2, y2, top, texture, uv, prop.faceTextures, prop.faceUV)];
    }
    if (["crate","wall","platform","arch"].includes(prop.kind)) return [boxBrush(x1, y1, floorZ, x2, y2, floorZ + totalHeight, texture, uv, prop.faceTextures, prop.faceUV)];

    const alongX = prop.direction === "e" || prop.direction === "w";
    const segments = ["ramp","wedge","slopeRoof"].includes(prop.kind) ? Math.max(4, Math.round((alongX ? prop.w : prop.d) * 4)) : Math.max(1, Math.round(prop.steps || recommendedStairSteps(prop)));
    const output = [];
    for (let i = 0; i < segments; i++) {
      const uphillIndex = prop.direction === "e" || prop.direction === "s" ? i : segments - 1 - i;
      const height = Math.max(8, Math.round(totalHeight * (uphillIndex + 1) / segments));
      if (alongX) {
        const start = Math.round(x1 + (x2 - x1) * i / segments);
        const end = Math.round(x1 + (x2 - x1) * (i + 1) / segments);
        output.push(boxBrush(start, y1, floorZ, end, y2, floorZ + height, texture, uv, prop.faceTextures, prop.faceUV));
      } else {
        const start = Math.round(y1 + (y2 - y1) * i / segments);
        const end = Math.round(y1 + (y2 - y1) * (i + 1) / segments);
        output.push(boxBrush(x1, start, floorZ, x2, end, floorZ + height, texture, uv, prop.faceTextures, prop.faceUV));
      }
    }
    return output;
  }

  function buildRoomFloorBrushes(room,wall,floorZ,texture,uv) {
    const x1=room.x*GRID-wall,y1=room.y*GRID-wall,x2=(room.x+room.w)*GRID+wall,y2=(room.y+room.d)*GRID+wall;
    const holes=state.props.filter((prop)=>prop.kind==="floorHole"&&prop.hostRoomId===room.id&&Math.abs((Number(prop.floorLevel)||0)-roomFloor(room))<.13).map((prop)=>({x1:prop.x*GRID,y1:prop.y*GRID,x2:(prop.x+prop.w)*GRID,y2:(prop.y+prop.d)*GRID}));
    let pieces=[{x1,y1,x2,y2}];
    holes.forEach((hole)=>{pieces=pieces.flatMap((piece)=>{const ix1=Math.max(piece.x1,hole.x1),iy1=Math.max(piece.y1,hole.y1),ix2=Math.min(piece.x2,hole.x2),iy2=Math.min(piece.y2,hole.y2);if(ix1>=ix2||iy1>=iy2)return [piece];const result=[];if(piece.x1<ix1)result.push({x1:piece.x1,y1:piece.y1,x2:ix1,y2:piece.y2});if(ix2<piece.x2)result.push({x1:ix2,y1:piece.y1,x2:piece.x2,y2:piece.y2});if(piece.y1<iy1)result.push({x1:ix1,y1:piece.y1,x2:ix2,y2:iy1});if(iy2<piece.y2)result.push({x1:ix1,y1:iy2,x2:ix2,y2:piece.y2});return result;});});
    return pieces.filter((piece)=>piece.x2-piece.x1>=8&&piece.y2-piece.y1>=8).map((piece)=>boxBrush(piece.x1,piece.y1,floorZ-wall,piece.x2,piece.y2,floorZ,texture,uv));
  }

  function buildRoomCeilingBrushes(room,wall,ceilingZ,texture,uv) {
    const x1=room.x*GRID-wall,y1=room.y*GRID-wall,x2=(room.x+room.w)*GRID+wall,y2=(room.y+room.d)*GRID+wall;
    const ceilingLevel=ceilingZ/GRID;
    const holes=state.props.filter((prop)=>prop.kind==="floorHole"&&Math.abs((Number(prop.floorLevel)||0)-ceilingLevel)<.13&&pointInRoom(prop.x+prop.w/2,prop.y+prop.d/2,room)).map((prop)=>({x1:prop.x*GRID,y1:prop.y*GRID,x2:(prop.x+prop.w)*GRID,y2:(prop.y+prop.d)*GRID}));
    let pieces=[{x1,y1,x2,y2}];
    holes.forEach((hole)=>{pieces=pieces.flatMap((piece)=>{const ix1=Math.max(piece.x1,hole.x1),iy1=Math.max(piece.y1,hole.y1),ix2=Math.min(piece.x2,hole.x2),iy2=Math.min(piece.y2,hole.y2);if(ix1>=ix2||iy1>=iy2)return[piece];const result=[];if(piece.x1<ix1)result.push({x1:piece.x1,y1:piece.y1,x2:ix1,y2:piece.y2});if(ix2<piece.x2)result.push({x1:ix2,y1:piece.y1,x2:piece.x2,y2:piece.y2});if(piece.y1<iy1)result.push({x1:ix1,y1:piece.y1,x2:ix2,y2:iy1});if(iy2<piece.y2)result.push({x1:ix1,y1:iy2,x2:ix2,y2:piece.y2});return result;});});
    return pieces.filter((piece)=>piece.x2-piece.x1>=8&&piece.y2-piece.y1>=8).map((piece)=>boxBrush(piece.x1,piece.y1,ceilingZ,piece.x2,piece.y2,ceilingZ+wall,texture,uv));
  }

  function buildTerrainFloorBrushes(bounds,terrainZ,texture) {
    const holes=state.props.filter((prop)=>prop.kind==="floorHole"&&Math.abs((Number(prop.floorLevel)||0)-terrainZ/GRID)<.13).map((prop)=>({x1:prop.x*GRID,y1:prop.y*GRID,x2:(prop.x+prop.w)*GRID,y2:(prop.y+prop.d)*GRID}));
    let pieces=[{x1:Math.round(bounds.minX*GRID),y1:Math.round(bounds.minY*GRID),x2:Math.round(bounds.maxX*GRID),y2:Math.round(bounds.maxY*GRID)}];
    holes.forEach((hole)=>{pieces=pieces.flatMap((piece)=>{const ix1=Math.max(piece.x1,hole.x1),iy1=Math.max(piece.y1,hole.y1),ix2=Math.min(piece.x2,hole.x2),iy2=Math.min(piece.y2,hole.y2);if(ix1>=ix2||iy1>=iy2)return[piece];const result=[];if(piece.x1<ix1)result.push({x1:piece.x1,y1:piece.y1,x2:ix1,y2:piece.y2});if(ix2<piece.x2)result.push({x1:ix2,y1:piece.y1,x2:piece.x2,y2:piece.y2});if(piece.y1<iy1)result.push({x1:ix1,y1:piece.y1,x2:ix2,y2:iy1});if(iy2<piece.y2)result.push({x1:ix1,y1:iy2,x2:ix2,y2:piece.y2});return result;});});
    return pieces.filter((piece)=>piece.x2-piece.x1>=8&&piece.y2-piece.y1>=8).map((piece)=>boxBrush(piece.x1,piece.y1,terrainZ-16,piece.x2,piece.y2,terrainZ,texture));
  }

  function generateMapText() {
    if (!state.rooms.length && !environmentFor().groundEnabled) {
      return null;
    }
    const wall = 16;
    const brushes = [];
    const environment = environmentFor();
    const terrainBounds = environment.groundEnabled ? environmentBounds() : null;
    const terrainZ = terrainBounds ? Math.round(terrainBounds.base * GRID) : null;
    const skyEnabled = environment.groundEnabled || state.rooms.some((room) => room.ceilingMode === "sky");
    state.rooms.forEach((room) => {
      const floorZ = Math.round(roomFloor(room) * GRID);
      const ceiling = floorZ + room.height * GRID;
      const roomWall=Math.max(8,Math.min(64,Math.round((Number(room.wallThickness)||.25)*GRID)));
      const floorTexture = room.floorTexture || "CSTRIKE_FP2DARK";
      const ceilingTexture = room.ceilingMode === "sky" ? "SKY" : (room.ceilingTexture || "C1A0_LABW3");
      const floorUv=resolvedSurfaceUv(room,"room","floor"),ceilingUv=resolvedSurfaceUv(room,"room","ceiling");
      if (room.points?.length >= 3) {
        const corners = room.points.map(([x, y]) => [x * GRID, y * GRID]);
        const shellCorners = overlapPolygon(corners, roomWall * 1.5);
        if (!environment.groundEnabled || floorZ !== terrainZ) brushes.push(polygonPrismBrush(shellCorners, floorZ - roomWall, floorZ, floorTexture,floorUv));
        brushes.push(polygonPrismBrush(shellCorners, ceiling, ceiling + roomWall, ceilingTexture,ceilingUv));
        brushes.push(...buildPolygonRoomWalls(room, roomWall));
      } else {
        const x1 = room.x * GRID, y1 = room.y * GRID;
        const x2 = (room.x + room.w) * GRID, y2 = (room.y + room.d) * GRID;
        if (!environment.groundEnabled || floorZ !== terrainZ) brushes.push(...buildRoomFloorBrushes(room,roomWall,floorZ,floorTexture,floorUv));
        brushes.push(...buildRoomCeilingBrushes(room,roomWall,ceiling,ceilingTexture,ceilingUv));
        brushes.push(...buildRoomWalls(room, roomWall));
      }
    });
    if (terrainBounds) {
      const minX = Math.round(terrainBounds.minX * GRID), minY = Math.round(terrainBounds.minY * GRID);
      const maxX = Math.round(terrainBounds.maxX * GRID), maxY = Math.round(terrainBounds.maxY * GRID);
      const highestRoom = state.rooms.length ? Math.max(...state.rooms.map((room) => roomFloor(room) + room.height)) : terrainBounds.base + 6;
      const skyTop = Math.round(highestRoom * GRID + GRID * 4);
      const shell = 32;
      brushes.push(...buildTerrainFloorBrushes(terrainBounds,terrainZ,environment.groundMaterial));
      brushes.push(boxBrush(minX,minY,skyTop-shell,maxX,maxY,skyTop,"SKY"));
      brushes.push(boxBrush(minX,minY,terrainZ,minX+shell,maxY,skyTop,"SKY"));
      brushes.push(boxBrush(maxX-shell,minY,terrainZ,maxX,maxY,skyTop,"SKY"));
      brushes.push(boxBrush(minX,minY,terrainZ,maxX,minY+shell,skyTop,"SKY"));
      brushes.push(boxBrush(minX,maxY-shell,terrainZ,maxX,maxY,skyTop,"SKY"));
    }
    // Faceted rooms create many angled floor/ceiling seams. A thin outer hull
    // keeps GoldSrc's flood-fill outside those seams without changing the
    // playable room outlines or collision surfaces.
    if (!environment.groundEnabled && state.rooms.some((room) => room.points?.length >= 3)) {
      const minX = Math.min(...state.rooms.map((room) => room.x)) * GRID - GRID * 2;
      const minY = Math.min(...state.rooms.map((room) => room.y)) * GRID - GRID * 2;
      const maxX = Math.max(...state.rooms.map((room) => room.x + room.w)) * GRID + GRID * 2;
      const maxY = Math.max(...state.rooms.map((room) => room.y + room.d)) * GRID + GRID * 2;
      const hullBottom = Math.min(...state.rooms.map((room) => roomFloor(room) * GRID)) - GRID;
      const hullTop = Math.max(...state.rooms.map((room) => (roomFloor(room) + room.height) * GRID)) + GRID;
      const hullWall = 32;
      brushes.push(boxBrush(minX, minY, hullBottom, maxX, maxY, hullBottom + hullWall, "CSTRIKE_FP2DARK"));
      brushes.push(boxBrush(minX, minY, hullTop - hullWall, maxX, maxY, hullTop, skyEnabled ? "SKY" : "C1A0_LABW3"));
      brushes.push(boxBrush(minX, minY, hullBottom, minX + hullWall, maxY, hullTop, "C1A0_LABW3"));
      brushes.push(boxBrush(maxX - hullWall, minY, hullBottom, maxX, maxY, hullTop, "C1A0_LABW3"));
      brushes.push(boxBrush(minX, minY, hullBottom, maxX, minY + hullWall, hullTop, "C1A0_LABW3"));
      brushes.push(boxBrush(minX, maxY - hullWall, hullBottom, maxX, maxY, hullTop, "C1A0_LABW3"));
    }
    state.props.forEach((prop) => brushes.push(...buildPropBrushes(prop)));

    const officialWads=[...new Set(Object.keys(MATERIAL_INFO).filter((texture)=>officialTextureSources.get(texture)?.wadId&&textureUsageCount(texture)>0).map((texture)=>officialTextureSources.get(texture).wad))];
    const worldWads=[...new Set(["cstrike.wad","halflife.wad",...officialWads])].join(";");
    const world = ["{", '"classname" "worldspawn"', `"wad" "${worldWads}"`, '"message" "Created with Blockout"', ...(skyEnabled ? [`"skyname" "${environment.skyName}"`] : []), ...brushes, "}"].join("\n");
    const entities = state.entities.map((entity) => {
      const x = entity.x * GRID + GRID / 2;
      const y = entity.y * GRID + GRID / 2;
      const floorZ = Math.round(Number(entity.floorLevel ?? floorLevelAt(entity.x + .5, entity.y + .5)) * GRID);
      if (["light","spotlight"].includes(entity.kind)) {
        const [red, green, blue] = hexToRgb(entity.color);
        const z = floorZ + Math.round((entity.z || 2.5) * GRID);
        const classname=entity.kind==="spotlight"?"light_spot":"light";
        return ["{", `"classname" "${classname}"`, `"origin" "${x} ${y} ${z}"`, `"_light" "${red} ${green} ${blue} ${entity.brightness || 300}"`,
          ...(entity.kind==="spotlight"?[`"angles" "${entity.pitch??-45} ${entity.angle||0} 0"`,`"_cone" "${entity.cone||45}"`,`"_cone2" "${Math.min(90,(entity.cone||45)+10)}"`]:[]),
          ...(entity.style==="switch"&&entity.target?[`"targetname" "${entity.target}"`]:entity.style&&entity.style!=="0"?[`"style" "${entity.style}"`]:[]), "}"].join("\n");
      }
      if (entity.kind === "bombA" || entity.kind === "bombB") {
        const target = boxBrush(x-64, y-64, floorZ, x+64, y+64, floorZ + 64, "AAATRIGGER");
        return ["{", '"classname" "func_bomb_target"', `"targetname" "bombsite_${entity.kind === "bombA" ? "a" : "b"}"`, target, "}"].join("\n");
      }
      if(entity.kind==="hostage")return ["{",'"classname" "hostage_entity"',`"origin" "${x} ${y} ${floorZ+36}"`,"}"].join("\n");
      if(entity.kind==="teleDest")return ["{",'"classname" "info_teleport_destination"',`"targetname" "${entity.target||"tele_dest_1"}"`,`"origin" "${x} ${y} ${floorZ+36}"`,`"angles" "0 ${Number(entity.angle)||0} 0"`,"}"].join("\n");
      if(entity.kind==="decal")return ["{",'"classname" "infodecal"',`"texture" "${entity.decal||"{lambda01"}"`,`"origin" "${x} ${y} ${floorZ+48}"`,"}"].join("\n");
      if(entity.kind==="ambient")return ["{",'"classname" "ambient_generic"',`"message" "${entity.sound||"ambience/wind1.wav"}"`,`"health" "${Math.max(0,Math.min(10,Number.isFinite(Number(entity.volume))?Number(entity.volume):7))*10}"`,`"origin" "${x} ${y} ${floorZ+48}"`,"}"].join("\n");
      if(entity.kind==="button"){
        const brush=boxBrush(x-12,y-4,floorZ+32,x+12,y+4,floorZ+64,"CSTRIKE_ME4METL");
        return ["{",'"classname" "func_button"',`"target" "${entity.target||"target_1"}"`,'"speed" "5"',brush,"}"].join("\n");
      }
      if(entity.kind==="pathCorner")return ["{",'"classname" "path_corner"',`"targetname" "${entity.targetName||"path_1"}"`,...(entity.target?[`"target" "${entity.target}"`]:[]),`"wait" "${entity.wait||0}"`,`"origin" "${x} ${y} ${floorZ+16}"`,"}"].join("\n");
      if(entity.kind==="targetDummy")return null;
      const classname = entity.kind === "ct" ? "info_player_start" : "info_player_deathmatch";
      return ["{", `"classname" "${classname}"`, `"origin" "${x} ${y} ${floorZ + 36}"`, `"angles" "0 ${Number(entity.angle) || 0} 0"`, "}"].join("\n");
    }).filter(Boolean);

    const ladderEntities = state.props.filter((prop) => prop.kind === "ladder").map((ladder) => {
      const x1 = ladder.x * GRID, y1 = ladder.y * GRID;
      const x2 = (ladder.x + ladder.w) * GRID, y2 = (ladder.y + ladder.d) * GRID;
      const floorZ = Math.round((Number(ladder.floorLevel) || 0) * GRID);
      const top = floorZ + Math.round((ladder.height || 3) * GRID);
      const thickness = 4;
      const brush = ladder.direction === "n" ? boxBrush(x1, y1, floorZ, x2, y1 + thickness, top, ladder.texture || "CSTRIKE_ME4METL")
        : ladder.direction === "s" ? boxBrush(x1, y2 - thickness, floorZ, x2, y2, top, ladder.texture || "CSTRIKE_ME4METL")
          : ladder.direction === "w" ? boxBrush(x1, y1, floorZ, x1 + thickness, y2, top, ladder.texture || "CSTRIKE_ME4METL")
            : boxBrush(x2 - thickness, y1, floorZ, x2, y2, top, ladder.texture || "CSTRIKE_ME4METL");
      return ["{", '"classname" "func_ladder"', brush, "}"].join("\n");
    });

    const buyZoneEntities = state.zones.filter((zone)=>["buyCt","buyT"].includes(zone.kind)).map((zone) => {
      const floorZ = Math.round(Number(zone.floorLevel ?? floorLevelAt(zone.x + zone.w / 2, zone.y + zone.d / 2)) * GRID);
      const brush = boxBrush(zone.x * GRID, zone.y * GRID, floorZ, (zone.x + zone.w) * GRID, (zone.y + zone.d) * GRID, floorZ + 64, "AAATRIGGER");
      const team = zone.kind === "buyCt" ? 2 : 1;
      return ["{", '"classname" "func_buyzone"', `"team" "${team}"`, brush, "}"].join("\n");
    });
    const gameplayZoneEntities=state.zones.filter((zone)=>["rescue","triggerHurt","teleport"].includes(zone.kind)).map((zone)=>{
      const floorZ=Math.round(Number(zone.floorLevel ?? floorLevelAt(zone.x+zone.w/2,zone.y+zone.d/2))*GRID),brush=boxBrush(zone.x*GRID,zone.y*GRID,floorZ,(zone.x+zone.w)*GRID,(zone.y+zone.d)*GRID,floorZ+Math.max(64,Math.round((zone.height||2)*GRID)),"AAATRIGGER");
      if(zone.kind==="rescue")return ["{",'"classname" "func_hostage_rescue"',brush,"}"].join("\n");
      if(zone.kind==="triggerHurt")return ["{",'"classname" "trigger_hurt"',`"dmg" "${zone.damage||25}"`,brush,"}"].join("\n");
      return ["{",'"classname" "trigger_teleport"',`"target" "${zone.target||"tele_dest_1"}"`,brush,"}"].join("\n");
    });
    const specialBrushEntities=state.props.filter((prop)=>["water","breakable","elevator","rotatingDoor","train"].includes(prop.kind)).map((prop)=>{
      const x1=prop.x*GRID,y1=prop.y*GRID,x2=(prop.x+prop.w)*GRID,y2=(prop.y+prop.d)*GRID,floorZ=Math.round((Number(prop.floorLevel)||0)*GRID),top=floorZ+Math.round((prop.height||1)*GRID);
      if(prop.kind==="water")return ["{",'"classname" "func_water"','"renderamt" "120"','"rendermode" "2"',boxBrush(x1,y1,floorZ,x2,y2,top,"!WATERBLUE"),"}"].join("\n");
      if(prop.kind==="breakable")return ["{",'"classname" "func_breakable"',`"health" "${prop.health||40}"`,'"material" "1"',boxBrush(x1,y1,floorZ,x2,y2,top,prop.texture||"BCRATE02",resolvedSurfaceUv(prop,"prop","object")),"}"].join("\n");
      const brush=boxBrush(x1,y1,floorZ,x2,y2,top,prop.texture||"CSTRIKE_ME4METL",resolvedSurfaceUv(prop,"prop","object"),prop.faceTextures,prop.faceUV);
      if(prop.kind==="elevator")return ["{",'"classname" "func_plat"',`"targetname" "${prop.targetName||"elevator_1"}"`,`"speed" "${prop.speed||120}"`,`"height" "${Math.round((prop.travel||2)*GRID)}"`,brush,"}"].join("\n");
      if(prop.kind==="rotatingDoor")return ["{",'"classname" "func_door_rotating"',`"targetname" "${prop.targetName||"rot_door_1"}"`,`"speed" "${prop.speed||100}"`,`"wait" "${prop.wait??3}"`,`"distance" "${prop.angle||90}"`,brush,"}"].join("\n");
      return ["{",'"classname" "func_train"',`"targetname" "${prop.targetName||"train_1"}"`,`"target" "${prop.target||"path_1"}"`,`"speed" "${prop.speed||100}"`,brush,"}"].join("\n");
    });

    const doorEntities = state.doors.filter((door) => door.mode === "sliding").map((door) => {
      const rooms=adjacentRoomsForOpening(door),segment=openingSegment(door),start=segment[0].map((value)=>value*GRID),end=segment[1].map((value)=>value*GRID);
      const maxHeight=rooms.length?Math.min(...rooms.map((room)=>room.height))*GRID-16:128;
      const doorHeight=Math.min(Math.round((door.height||2)*GRID),Math.max(64,maxHeight));
      const floorZ=Math.round((rooms.length?Math.max(...rooms.map((room)=>roomFloor(room))):0)*GRID);
      const brush=segmentPrismBrush(start,end,floorZ,floorZ+doorHeight,door.texture||"CSTRIKE_ME4METL",16);
      const angle=Math.round((Math.atan2(end[1]-start[1],end[0]-start[0])*180/Math.PI+360)%360);
      return ["{", '"classname" "func_door"', `"angle" "${angle}"`, `"speed" "${door.speed || 100}"`, '"wait" "3"', '"lip" "4"', brush, "}"].join("\n");
    });

    const windowEntities = state.windows.filter((window) => window.mode !== "open").map((window) => {
      const bottom = Math.round((window.sill || .75) * GRID);
      const top = Math.round(((window.sill || .75) + (window.height || 1.5)) * GRID);
      const segment=openingSegment(window),start=segment[0].map((value)=>value*GRID),end=segment[1].map((value)=>value*GRID),rooms=adjacentRoomsForOpening(window);
      const floorZ=Math.round((rooms.length?Math.max(...rooms.map((room)=>roomFloor(room))):floorLevelAt((segment[0][0]+segment[1][0])/2,(segment[0][1]+segment[1][1])/2))*GRID);
      const brush=segmentPrismBrush(start,end,floorZ+bottom,floorZ+top,window.texture||"GLASS_BRIGHT",4);
      const common = ['"rendermode" "2"', '"renderamt" "90"', '"rendercolor" "180 225 255"'];
      return window.mode === "breakable"
        ? ["{", '"classname" "func_breakable"', '"material" "0"', `"health" "${window.health || 20}"`, ...common, brush, "}"].join("\n")
        : ["{", '"classname" "func_wall"', ...common, brush, "}"].join("\n");
    });

    const manualLights = state.entities.filter((entity) => ["light","spotlight"].includes(entity.kind));
    const lights = state.rooms.filter((room) => !manualLights.some((light) => pointInRoom(light.x + .5, light.y + .5, room))).map((room) => {
      const x = Math.round((room.x + room.w / 2) * GRID);
      const y = Math.round((room.y + room.d / 2) * GRID);
      const z = Math.round(roomFloor(room) * GRID) + Math.max(64, room.height * GRID - 48);
      return ["{", '"classname" "light"', `"origin" "${x} ${y} ${z}"`, '"_light" "230 225 205 300"', "}"].join("\n");
    });
    if (skyEnabled) {
      const skyTheme = currentSkyTheme();
      lights.push(["{", '"classname" "light_environment"', `"angles" "${skyTheme.angles}"`, `"_light" "${skyTheme.light}"`, "}"].join("\n"));
    }

    return ["// Generated by Blockout — CS 1.6 Map Builder", "// Editable GoldSrc MAP source", world, ...entities, ...ladderEntities, ...buyZoneEntities, ...gameplayZoneEntities, ...specialBrushEntities, ...doorEntities, ...windowEntities, ...lights, ""].join("\n");
  }

  function exportMap() {
    const mapText = generateMapText();
    if (!mapText) {
      showToast("Draw at least one room before exporting");
      return;
    }
    const blob = new Blob([mapText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${safeName(state.name)}.map`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("GoldSrc .map exported");
  }

  function mapIsReady() {
    const hasPlayableBase = state.rooms.length > 0 || environmentFor().groundEnabled;
    return hasPlayableBase
      && state.entities.some((item) => item.kind === "ct")
      && state.entities.some((item) => item.kind === "t")
      && (state.entities.some((item) => item.kind === "bombA" || item.kind === "bombB") || (state.entities.some((item)=>item.kind==="hostage")&&state.zones.some((zone)=>zone.kind==="rescue")))
      && (environmentFor().groundEnabled || state.rooms.length === 1 || state.doors.length > 0 || state.props.some((item)=>item.kind==="floorHole"));
  }

  async function companionRequest(path, options = {}) {
    const { allowUnpaired = false, ...fetchOptions } = options;
    if (HOSTED_MODE && !allowUnpaired && !companionPairingCode) {
      const error = new Error("Pair the Windows companion before using local build features.");
      error.pairingRequired = true;
      throw error;
    }
    const headers = { "Content-Type": "application/json", ...(fetchOptions.headers || {}) };
    if (HOSTED_MODE && companionPairingCode) headers["X-Blockout-Pairing"] = companionPairingCode;
    const requestOptions = { ...fetchOptions, headers };
    const request = HOSTED_MODE
      ? new Request(`${COMPANION_API}${path}`, { ...requestOptions, targetAddressSpace: "loopback" })
      : new Request(`${COMPANION_API}${path}`, requestOptions);
    const response = await fetch(request);
    const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    if (!response.ok) {
      const error = new Error(data.error || `HTTP ${response.status}`);
      error.log = data.log || "";
      error.diagnostics = Array.isArray(data.diagnostics) ? data.diagnostics : [];
      error.status = response.status;
      error.pairingRequired = !!data.pairingRequired;
      throw error;
    }
    return data;
  }

  function versionAtLeast(version, minimum) {
    const current = String(version || "0").split(".").map(Number);
    const required = minimum.split(".").map(Number);
    for (let index = 0; index < Math.max(current.length, required.length); index++) {
      if ((current[index] || 0) > (required[index] || 0)) return true;
      if ((current[index] || 0) < (required[index] || 0)) return false;
    }
    return true;
  }

  function formatPairingCode(value) {
    const compact = String(value || "").replace(/[^A-F0-9]/gi, "").toUpperCase().slice(0, 8);
    return compact.length > 4 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact;
  }

  function updateTextureImportAvailability() {
    if (!HOSTED_MODE) return;
    const dropZone = $("#textureDropZone");
    const available = !!companionStatus?.connected && versionAtLeast(companionStatus.version, MIN_COMPANION_VERSION);
    dropZone.disabled = !available;
    dropZone.innerHTML = available
      ? '<span class="texture-drop-icon">+</span><span><strong>Drop a photo into Texture Alchemist</strong><small>Seamless processing happens locally; your companion builds the WAD</small></span><em>Choose image</em>'
      : '<span class="texture-drop-icon">↧</span><span><strong>Pair the Windows companion to install textures</strong><small>Open Build & Test, start Start Blockout.cmd, and enter its rotating code.</small></span><em>Pair first</em>';
  }

  async function pairHostedCompanion() {
    const input = $("#companionPairingCode");
    const code = String(input.value || "").replace(/[^A-F0-9]/gi, "").toUpperCase();
    if (code.length !== 8) {
      showToast("Enter the complete 8-character pairing code");
      input.focus();
      return;
    }
    const button = $("#connectCompanionButton");
    button.disabled = true;
    button.textContent = "Pairing…";
    $("#buildLog").textContent = "Requesting permission to connect this online editor to Blockout on your computer…";
    try {
      companionPairingCode = code;
      companionStatus = await companionRequest("/api/pair", {
        method: "POST",
        allowUnpaired: true,
        body: JSON.stringify({ code })
      });
      localStorage.setItem(PAIRING_STORAGE_KEY, code);
      await refreshTextureCatalog();
      $("#buildLog").textContent = "Secure pairing complete. Build, install, launch, and custom texture tools are ready from the online editor.";
      showToast("Windows companion paired securely");
    } catch (error) {
      companionStatus = null;
      companionPairingCode = "";
      localStorage.removeItem(PAIRING_STORAGE_KEY);
      $("#buildLog").textContent = `Pairing stopped:\n${error.message}\n\nKeep Start Blockout.cmd open and allow the browser's loopback-network permission when asked.`;
      showToast("Could not pair the companion");
    } finally {
      button.disabled = false;
      updateBuildDialog();
    }
  }

  function forgetHostedCompanion() {
    companionStatus = null;
    companionPairingCode = "";
    localStorage.removeItem(PAIRING_STORAGE_KEY);
    $("#companionPairingCode").value = "";
    $("#buildLog").textContent = "This browser is no longer paired. Restarting Start Blockout.cmd also rotates the pairing code.";
    updateBuildDialog();
    showToast("Windows companion forgotten");
  }

  function renderBuildDiagnostics(diagnostics = []) {
    const host = $("#buildDiagnostics");
    if (!diagnostics.length) { buildDiagnosticMarker=null; drawEditor(); }
    host.classList.toggle("hidden", !diagnostics.length);
    host.innerHTML = diagnostics.map((diagnostic, index) => {
      const world = diagnostic.world;
      const location = world ? `${Math.round(world.x)}, ${Math.round(world.y)}, ${Math.round(world.z)}` : "Open log";
      return `<button class="build-diagnostic ${diagnostic.severity === "warning" ? "warning" : ""}" data-build-diagnostic="${index}" type="button"><i></i><span><strong>${html(diagnostic.title || "Compiler issue")}</strong><small>${html(diagnostic.message || "")}</small></span><em>${html(location)}</em></button>`;
    }).join("");
    host._diagnostics = diagnostics;
  }

  function focusBuildDiagnostic(diagnostic) {
    if (!diagnostic?.world) {
      showToast("This compiler message has no map coordinate");
      return;
    }
    const x = Number(diagnostic.world.x) / GRID, y = Number(diagnostic.world.y) / GRID;
    const points = (diagnostic.points || []).map((point) => ({x:Number(point.x)/GRID,y:Number(point.y)/GRID}));
    buildDiagnosticMarker = { x, y, points };
    const candidates = [];
    ["room","door","window","zone","prop","entity"].forEach((type) => itemListFor(type).forEach((item) => {
      const ref={type,id:item.id}, bounds=itemBoundsForRef(ref);
      if(bounds)candidates.push({ref,distance:Math.hypot(bounds.x+bounds.w/2-x,bounds.y+bounds.d/2-y)});
    }));
    candidates.sort((a,b)=>a.distance-b.distance);
    if(candidates[0] && candidates[0].distance < 6) {
      selection=[{...candidates[0].ref}]; selected={...candidates[0].ref};
    } else { selection=[]; selected=null; }
    const rect=editor.getBoundingClientRect();
    viewOffset={x:rect.width/2-x*cellSize,y:rect.height/2-y*cellSize};
    setTool("select");
    $("#buildDialog").close();
    refresh();
    showToast(`Focused compiler issue at ${Math.round(diagnostic.world.x)}, ${Math.round(diagnostic.world.y)}, ${Math.round(diagnostic.world.z)}`);
  }

  async function installVerifiedCompiler() {
    const button=$("#installCompilerButton");
    button.disabled=true; button.textContent="Downloading & verifying...";
    $("#buildLog").textContent="Downloading the pinned SDHLT v1.2.0 archive and verifying every executable...\nNo file is installed unless all hashes match.";
    try {
      companionStatus=await companionRequest("/api/setup/compiler",{method:"POST",body:"{}"});
      $("#buildLog").textContent=companionStatus.setupLog || "Verified compiler installed.";
      localStorage.removeItem("blockout-setup-dismissed-1.1");
      showToast("Verified GoldSrc compiler installed");
    } catch(error) {
      $("#buildLog").textContent=`Compiler setup stopped:\n${error.message}`;
      showToast("Compiler setup failed");
    } finally {
      button.disabled=false; button.textContent="Install verified SDHLT"; updateBuildDialog();
    }
  }

  async function pollBuildProgress() {
    try {
      const status=await companionRequest("/api/build/status");
      if (!buildRunning) return;
      const progress=$("#buildProgress");
      progress.classList.toggle("running",!!status.running);
      progress.querySelector("strong").textContent=status.stageLabel || (status.running?"Building...":"Idle");
      progress.querySelector("small").textContent=status.running
        ? `${String(status.profile||"playtest").toUpperCase()} · ${Number(status.elapsed||0).toFixed(1)} seconds`
        : "Choose a quality profile, then build.";
    } catch(_){}
  }

  async function cancelCurrentBuild() {
    $("#cancelBuildButton").disabled=true;
    try {
      await companionRequest("/api/build/cancel",{method:"POST",body:"{}"});
      $("#buildProgress").querySelector("strong").textContent="Stopping compiler...";
    } catch(error) {
      showToast(`Could not cancel: ${error.message}`);
    }
  }

  function updateBuildDialog() {
    const connected = !!companionStatus?.connected;
    const currentCompanion = connected && versionAtLeast(companionStatus.version, MIN_COMPANION_VERSION);
    const gameFound = !!companionStatus?.gameFound;
    const compilersFound = !!companionStatus?.compilersFound;
    const stockWadsFound = !!companionStatus?.stockWadsFound;
    const mapsWritable = !!companionStatus?.mapsWritable;
    const preflight=calculatePreflight();
    const ready = mapIsReady() && preflight.errors===0;
    const setupDismissed=localStorage.getItem("blockout-setup-dismissed-1.1")==="yes";
    const banner = $("#connectionBanner");
    banner.classList.toggle("connected", currentCompanion);
    banner.classList.toggle("error", !currentCompanion);
    $(".build-status-dot").classList.toggle("connected", currentCompanion);
    $("#connectionTitle").textContent = HOSTED_MODE
      ? currentCompanion ? "Online editor paired securely" : companionPairingCode ? "Companion pairing expired" : "Pair the Windows companion"
      : !connected ? "Companion is not running" : currentCompanion ? "Companion connected" : "Companion restart required";
    $("#connectionText").textContent = HOSTED_MODE
      ? currentCompanion
        ? `Blockout ${companionStatus.version || ""} is connected through an origin-locked loopback session.`
        : "Start Start Blockout.cmd, enter the rotating code below, and approve loopback access if your browser asks."
      : !connected
      ? "Double-click Start Blockout.cmd in the project folder, then reopen this panel."
      : currentCompanion
        ? `Blockout build service ${companionStatus.version || ""} is ready on this computer.`
        : `Close the old companion console (${companionStatus.version || "unknown"}) and reopen Start Blockout.cmd to load ${MIN_COMPANION_VERSION}.`;
    $("#companionPairing").classList.toggle("hidden", !HOSTED_MODE);
    if (HOSTED_MODE && document.activeElement !== $("#companionPairingCode")) {
      $("#companionPairingCode").value = formatPairingCode(companionPairingCode);
    }
    $("#connectCompanionButton").textContent = currentCompanion ? "Reconnect" : "Pair companion";
    $("#forgetCompanionButton").classList.toggle("hidden", !companionPairingCode);
    if (connected && document.activeElement !== $("#gamePathInput")) $("#gamePathInput").value = companionStatus.gamePath || "";
    if (connected && document.activeElement !== $("#compilerPathInput")) $("#compilerPathInput").value = companionStatus.compilerPath || "";

    const setCheck = (selector, good, goodText, badText) => {
      const element = $(selector);
      element.textContent = good ? goodText : badText;
      element.classList.toggle("good", good);
      element.classList.toggle("bad", !good);
    };
    const offlineText = HOSTED_MODE ? "Pair companion" : "Companion offline";
    setCheck("#gameCheck", gameFound, "CS 1.6 found", connected ? "Select folder" : offlineText);
    setCheck("#compilerCheck", compilersFound, "4 tools found", connected ? (companionStatus?.missingTools?.length ? `Missing ${companionStatus.missingTools.join(", ")}` : "Select folder") : offlineText);
    setCheck("#wadCheck", stockWadsFound, "Stock WADs found", connected ? (companionStatus?.missingWads?.length ? `Missing ${companionStatus.missingWads.join(", ")}` : "Select Half-Life") : offlineText);
    setCheck("#installCheck", mapsWritable, "Maps folder ready", connected ? "Folder not writable" : offlineText);
    setCheck("#mapCheck", ready, "Ready", preflight.errors?`${preflight.errors} preflight error${preflight.errors===1?"":"s"}`:"Checklist incomplete");
    const setupVisible=currentCompanion && !compilersFound && !setupDismissed;
    $("#firstRunSetup").classList.toggle("hidden",!setupVisible);
    $("#setupGameStep").classList.toggle("complete",gameFound);
    $("#setupCompilerStep").classList.toggle("complete",compilersFound);
    $("#setupReadyStep").classList.toggle("complete",gameFound&&compilersFound&&stockWadsFound&&mapsWritable);
    $("#setupWizardText").textContent=!gameFound
      ? "Select the Half-Life folder containing hl.exe, then save paths."
      : "CS 1.6 is ready. Install the pinned, hash-verified SDHLT compiler in one click.";
    $("#installCompilerButton").disabled=buildRunning || !currentCompanion;
    $("#savePathsButton").disabled = !connected;
    $("#runBuildButton").disabled = buildRunning || !(currentCompanion && gameFound && compilersFound && stockWadsFound && mapsWritable && ready);
    $("#cancelBuildButton").classList.toggle("hidden",!buildRunning);
    $("#cancelBuildButton").disabled=!buildRunning;
    $("#buildProfile").disabled=buildRunning;
    $("#buildHelp").textContent = !connected ? (HOSTED_MODE ? "Pair the companion to enable real compilation and one-click playtesting." : "Start the companion to enable compilation.")
      : !currentCompanion ? "Restart Start Blockout.cmd to enable safe locked-map builds."
      : !gameFound ? "Choose the folder containing hl.exe."
      : !compilersFound ? "Choose a VHLT/ZHLT compiler folder."
      : !stockWadsFound ? `Restore ${companionStatus?.missingWads?.join(" and ") || "the stock texture WADs"}.`
      : !mapsWritable ? "The cstrike/maps folder is not writable. Check folder permissions."
      : !ready ? (preflight.errors?"Open Preflight and fix blocking errors.":"Complete all five map checks first.")
      : $("#launchAfterBuild").checked ? "The BSP will be installed and launched locally." : "The BSP will be compiled and installed without launching the game.";
    $("#runBuildButton").textContent = buildRunning ? "Building..." : $("#launchAfterBuild").checked ? "Build & launch CS 1.6" : "Build without launch";
    updateTextureImportAvailability();
  }

  async function refreshCompanionStatus() {
    if (HOSTED_MODE && !companionPairingCode) {
      companionStatus = null;
      updateBuildDialog();
      return;
    }
    try {
      companionStatus = await companionRequest("/api/status");
    } catch (error) {
      companionStatus = null;
      if (HOSTED_MODE && error.pairingRequired) {
        companionPairingCode = "";
        localStorage.removeItem(PAIRING_STORAGE_KEY);
      }
    }
    updateBuildDialog();
    if (companionStatus?.connected && !companionStatus.compilersFound
      && localStorage.getItem("blockout-setup-dismissed-1.1") !== "yes"
      && !$("#buildDialog").open) {
      $("#buildDialog").showModal();
    }
  }

  async function saveCompanionPaths() {
    $("#buildLog").textContent = "Checking the selected folders…";
    try {
      companionStatus = await companionRequest("/api/config", {
        method: "POST",
        body: JSON.stringify({ gamePath: $("#gamePathInput").value.trim(), compilerPath: $("#compilerPathInput").value.trim() })
      });
      const notes=[];
      notes.push(companionStatus.compilersFound ? "All four compiler tools were found." : `Missing compiler tools: ${(companionStatus.missingTools||[]).join(", ") || "hlcsg, hlbsp, hlvis or hlrad"}.`);
      notes.push(companionStatus.stockWadsFound ? "cstrike.wad and halflife.wad were found." : `Missing texture WADs: ${(companionStatus.missingWads||[]).join(", ")}.`);
      notes.push(companionStatus.mapsWritable ? `BSP installation is ready: ${companionStatus.mapsPath}.` : `The maps destination is not writable: ${companionStatus.mapsPath || "unknown"}.`);
      $("#buildLog").textContent = `Configuration saved.\n${notes.join("\n")}`;
    } catch (error) {
      $("#buildLog").textContent = `Could not save configuration:\n${error.message}`;
    }
    updateBuildDialog();
  }

  async function runBuildAndTest() {
    const preflight=calculatePreflight();
    if(preflight.errors){renderPreflight();$("#buildDialog").close();$("#preflightDialog").showModal();showToast("Build blocked — fix the preflight errors first");return;}
    const mapText = generateMapText();
    if (!mapText) return;
    const button = $("#runBuildButton");
    const launch = $("#launchAfterBuild").checked;
    const profile = $("#buildProfile").value;
    buildRunning = true;
    renderBuildDiagnostics([]);
    button.disabled = true;
    button.textContent = "Building…";
    $("#buildLog").textContent = `Sending map to the local compiler...\nProfile: ${profile}\n`;
    $("#buildProgress").classList.add("running");
    $("#buildProgress").querySelector("strong").textContent = "Preparing map...";
    clearInterval(buildProgressTimer);
    buildProgressTimer = setInterval(pollBuildProgress, 500);
    pollBuildProgress();
    updateBuildDialog();
    try {
      const result = await companionRequest("/api/build", {
        method: "POST",
        body: JSON.stringify({ mapName: safeName(state.name), mapText, launch, profile })
      });
      $("#buildLog").textContent = result.log || "Build finished.";
      const seconds=(result.stages||[]).reduce((sum,stage)=>sum+Number(stage.seconds||0),0);
      $("#buildProgress").querySelector("strong").textContent="Build complete";
      $("#buildProgress").querySelector("small").textContent=`${String(result.profile||profile).toUpperCase()} · ${seconds.toFixed(1)} seconds · ${(result.stages||[]).length} stages`;
      showToast(result.launched ? "Map built — launching CS 1.6" : "Map built successfully");
    } catch (error) {
      renderBuildDiagnostics(error.diagnostics || []);
      $("#buildProgress").querySelector("strong").textContent=String(error.message).toLowerCase().includes("cancel")?"Build cancelled":"Build failed";
      $("#buildProgress").querySelector("small").textContent=error.diagnostics?.length?`${error.diagnostics.length} compiler issue${error.diagnostics.length===1?"":"s"} can be focused on the plan.`:"Review the compiler log.";
      $("#buildLog").textContent = `Build stopped:\n${error.message}${error.log?`\n\nCOMPILER LOG\n${error.log}`:""}`;
      showToast("Build failed — see the build log");
    } finally {
      buildRunning = false;
      clearInterval(buildProgressTimer);
      buildProgressTimer = null;
      $("#buildProgress").classList.remove("running");
      updateBuildDialog();
    }
  }

  editor.addEventListener("pointerdown", (event) => {
    editor.setPointerCapture(event.pointerId);
    const point = canvasPoint(event, editor);
    const cell = screenToCell(point);
    const world = screenToWorld(point);
    const snapped = snapWorldPoint(world, selection);
    const gridPoint = [snapped.x, snapped.y];
    if (activeTool === "pan" || event.button === 1) {
      event.preventDefault();
      panning = { start: point, offset: { ...viewOffset } };
      $("#canvasWrap").style.cursor = "grabbing";
    } else if (["polygon", "polyPlatform", "polyFloor", "polyWall"].includes(activeTool)) {
      event.preventDefault();
      const first = polygonDraft[0];
      if (first && polygonDraft.length >= 3 && Math.hypot(gridPoint[0] - first[0], gridPoint[1] - first[1]) < .5) {
        finishPolygonDraft();
      } else if (!polygonDraft.length || polygonDraft.at(-1)[0] !== gridPoint[0] || polygonDraft.at(-1)[1] !== gridPoint[1]) {
        if (polygonDraft.length >= 16) showToast("Maximum 16 corners—click the first corner or press Enter");
        else { polygonDraft.push(gridPoint); selected = null; drawEditor(); }
      }
    } else if (["room", "triangle", "octagon", "corridor", "vent", "wall", "diagonal", "platform", "floor", "floorHole", "stairs", "stairPrefab", "ramp", "buyCt", "buyT", "rescue", "triggerHurt", "teleport", "water", "breakable", "cylinder", "wedge", "arch", "slopeRoof", "elevator", "rotatingDoor", "train"].includes(activeTool)) {
      drawing = { start: snapped, end: snapped };
    } else if (activeTool === "ruler") {
      measurement = { start:snapped, end:snapped, active:true }; drawEditor();
    } else if (activeTool === "door") {
      placeDoor(screenToWorld(point));
    } else if (activeTool === "wideDoor") {
      placeDoor(screenToWorld(point), 2);
    } else if (activeTool === "window") {
      placeWindow(screenToWorld(point));
    } else if (activeTool === "crate") {
      placeCrate(placementAnchor(world));
    } else if (activeTool === "ladder") {
      placeLadder(placementAnchor(world));
    } else if (activeTool === "column") {
      placeColumn(placementAnchor(world));
    } else if (activeTool === "prefab") {
      placePrefab(world);
    } else if (["eyedropper","paint"].includes(activeTool)) {
      const hit = hitTest(world), item = itemForRef(hit);
      if (!item || !["room","prop"].includes(hit.type)) { showToast("Choose a room or structure surface"); return; }
      if (activeTool === "eyedropper") {
        sampledMaterial = surfaceTextureFor(item,hit.type);
        applySelectionHit(hit,false); setTool("paint"); refresh(); showToast(`${MATERIAL_INFO[sampledMaterial] || sampledMaterial} sampled — click surfaces to paint`);
      } else if (!sampledMaterial) { showToast("Use the eyedropper first"); setTool("eyedropper"); }
      else if (isItemLocked(item)) showToast("Unlock this object or its layer before painting it");
      else { const before=snapshot(); setSurfaceTexture(item,hit.type,sampledMaterial); applySelectionHit(hit,false); commit(before); showToast(`${MATERIAL_INFO[sampledMaterial] || sampledMaterial} applied`); }
    } else if (activeTool === "select") {
      if (event.altKey) {
        if (!event.shiftKey) { selection=[]; selected=null; }
        marquee={start:snapped,end:snapped,additive:event.shiftKey}; moving=null; refresh(); return;
      }
      const transformHandle=transformHandleHit(point);
      if(transformHandle){
        const entry=selectedEntries()[0];
        if(isItemLocked(entry.item)){showToast("Unlock the object or its layer before transforming");return;}
        transformDrag={...transformHandle,before:snapshot(),ref:{...entry.ref},original:structuredClone(entry.item),startPoint:{...point}};
        moving=null;return;
      }
      const vertexItem = editingVertices && ["room", "prop"].includes(selected?.type) ? selectedItem() : null;
      if (vertexItem?.points?.length) {
        const handleIndex = vertexItem.points.findIndex(([x, y]) => {
          const handle = cellToScreen(x, y);
          return Math.hypot(handle.x - point.x, handle.y - point.y) <= 11;
        });
        if (handleIndex >= 0) {
          selectedVertexIndex = handleIndex;
          selectedEdgeIndex = -1;
          movingVertex = { before:snapshot(), index:handleIndex, points:vertexItem.points.map((corner) => [...corner]) };
          movingEdge = null;
          moving = null;
          refresh();
          return;
        }
        const edgeIndex = vertexItem.points.findIndex((corner,index) => {
          const next=vertexItem.points[(index+1)%vertexItem.points.length],handle=cellToScreen((corner[0]+next[0])/2,(corner[1]+next[1])/2);
          return Math.hypot(handle.x-point.x,handle.y-point.y)<=10;
        });
        if(edgeIndex>=0){
          const a=vertexItem.points[edgeIndex],b=vertexItem.points[(edgeIndex+1)%vertexItem.points.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.max(.001,Math.hypot(dx,dy));
          selectedEdgeIndex=edgeIndex;selectedVertexIndex=-1;movingVertex=null;moving=null;
          movingEdge={before:snapshot(),index:edgeIndex,points:vertexItem.points.map((corner)=>[...corner]),midpoint:[(a[0]+b[0])/2,(a[1]+b[1])/2],normal:[-dy/length,dx/length]};
          refresh();return;
        }
      }
      const hit = cyclingHitTest(world);
      if (!hit) {
        if (!event.shiftKey) { selection=[]; selected=null; }
        marquee = { start:snapped, end:snapped, additive:event.shiftKey };
        moving = null; refresh(); return;
      }
      applySelectionHit(hit,event.shiftKey);
      const movable = selectedEntries().filter((entry) => !isItemLocked(entry.item) && !["door","window"].includes(entry.ref.type));
      moving = !event.shiftKey && movable.length ? {
        before:snapshot(), start:snapped,
        entries:movable.map(({ref,item}) => ({ ref:{...ref}, original:{ x:item.x, y:item.y, points:item.points?.map((corner)=>[...corner]), planPoints:item.planPoints?.map((corner)=>[...corner]), textureUV:structuredClone(item.textureUV||null), floorUV:structuredClone(item.floorUV||null), ceilingUV:structuredClone(item.ceilingUV||null), wallUV:structuredClone(item.wallUV||null), edgeUV:structuredClone(item.edgeUV||null) } }))
      } : null;
      refresh();
    } else {
      placeEntity(placementAnchor(world), activeTool);
    }
  });

  editor.addEventListener("pointermove", (event) => {
    const point = canvasPoint(event, editor);
    const world = screenToWorld(point);
    const snapped = snapWorldPoint(world, moving?.entries?.map((entry)=>entry.ref) || selection);
    hoverWorld = { ...snapped };
    if (panning) {
      viewOffset.x = panning.offset.x + point.x - panning.start.x;
      viewOffset.y = panning.offset.y + point.y - panning.start.y;
      hoverCell = null;
      drawEditor();
      return;
    }
    const cell = screenToCell(point);
    hoverCell = cell;
    $("#coordinates").innerHTML = `X ${Math.round(snapped.x * GRID)} &nbsp; Y ${Math.round(snapped.y * GRID)} &nbsp; SNAP ${Math.round((snapped.step||snapStep(world))*GRID)}${adaptiveGridEnabled?" AUTO":""}`;
    if (drawing) drawing.end = snapped;
    if (measurement?.active) { measurement.end = snapped; drawEditor(); return; }
    if (marquee) { marquee.end = snapped; drawEditor(); return; }
    if(transformDrag){
      const item=itemForRef(transformDrag.ref),original=transformDrag.original;if(!item)return;
      if(transformDrag.mode==="height"){
        const delta=(transformDrag.startPoint.y-point.y)/cellSize,next=Math.max(.25,baseSnap((original.height||1)+delta));
        if(["floor","floorPolygon"].includes(item.kind))item.elevation=(Number(original.elevation)||0)+delta;else item.height=next;
      }else if(transformDrag.mode==="resize"){
        const bounds={x:original.x,y:original.y,w:original.w||1,d:original.d||1},cursor=snapped,corner=transformDrag.corner;
        let left=bounds.x,right=bounds.x+bounds.w,top=bounds.y,bottom=bounds.y+bounds.d;
        if(corner.includes("w"))left=Math.min(cursor.x,right-snapStep());else right=Math.max(cursor.x,left+snapStep());
        if(corner.includes("n"))top=Math.min(cursor.y,bottom-snapStep());else bottom=Math.max(cursor.y,top+snapStep());
        item.x=left;item.y=top;item.w=right-left;item.d=bottom-top;
        if(original.points?.length)item.points=original.points.map(([x,y])=>[left+(x-bounds.x)/Math.max(.001,bounds.w)*(right-left),top+(y-bounds.y)/Math.max(.001,bounds.d)*(bottom-top)]);
      }
      drawEditor();drawPreview();if($("#elevationDialog").open)drawElevationEditor();return;
    }
    if (movingVertex && ["room", "prop"].includes(selected?.type)) {
      const item = selectedItem();
      if (item?.points) {
        item.points[movingVertex.index] = [hoverWorld.x, hoverWorld.y];
        updatePolygonBounds(item);
      }
      drawEditor(); drawPreview();
      return;
    }
    if(movingEdge&&["room","prop"].includes(selected?.type)){
      const item=selectedItem();
      if(item?.points){
        const dx=hoverWorld.x-movingEdge.midpoint[0],dy=hoverWorld.y-movingEdge.midpoint[1],amount=dx*movingEdge.normal[0]+dy*movingEdge.normal[1];
        const next=(movingEdge.index+1)%item.points.length;
        item.points[movingEdge.index]=[movingEdge.points[movingEdge.index][0]+movingEdge.normal[0]*amount,movingEdge.points[movingEdge.index][1]+movingEdge.normal[1]*amount];
        item.points[next]=[movingEdge.points[next][0]+movingEdge.normal[0]*amount,movingEdge.points[next][1]+movingEdge.normal[1]*amount];
        updatePolygonBounds(item);
      }
      drawEditor();drawPreview();return;
    }
    if (moving?.entries?.length) {
      const dx = snapped.x - moving.start.x, dy = snapped.y - moving.start.y;
      moving.entries.forEach((entry) => {
        const item=itemForRef(entry.ref); if (!item) return;
        item.x=entry.original.x+dx; item.y=entry.original.y+dy;
        if (entry.original.points) item.points=entry.original.points.map(([x,y])=>[x+dx,y+dy]);
        if (entry.original.planPoints) item.planPoints=entry.original.planPoints.map(([x,y])=>[x+dx,y+dy]);
        if(!textureLock){const shifted=(uv)=>uv?{...uv,shiftX:(Number(uv.shiftX)||0)+dx*GRID,shiftY:(Number(uv.shiftY)||0)+dy*GRID}:uv,shiftCollection=(collection)=>collection?Object.fromEntries(Object.entries(collection).map(([key,uv])=>[key,shifted(uv)])):collection;item.textureUV=shifted(entry.original.textureUV);item.floorUV=shifted(entry.original.floorUV);item.ceilingUV=shifted(entry.original.ceilingUV);item.wallUV=shiftCollection(entry.original.wallUV);item.edgeUV=shiftCollection(entry.original.edgeUV);}
      });
    }
    drawEditor(); drawPreview();
  });

  editor.addEventListener("pointerup", (event) => {
    if (panning) {
      panning = null;
      $("#canvasWrap").style.cursor = activeTool === "pan" ? "grab" : activeTool === "select" ? "default" : "crosshair";
      return;
    }
    if (marquee) { finishMarqueeSelection(); return; }
    if (measurement?.active) { measurement.active=false; drawEditor(); showToast("Measurement pinned — drag again to replace it"); return; }
    if(transformDrag){
      const drag=transformDrag;transformDrag=null;
      if(drag.mode==="rotate"){
        const clockwise=(event?.clientX||drag.startPoint.x)>=drag.startPoint.x,item=itemForRef(drag.ref);
        if(drag.ref.type==="prop")rotateSelected(clockwise);
        else if(item){const cx=item.x+(item.w||1)/2,cy=item.y+(item.d||1)/2,oldW=item.w||1;item.w=item.d||1;item.d=oldW;item.x=cx-item.w/2;item.y=cy-item.d/2;if(item.points)item.points=item.points.map(([x,y])=>clockwise?[cx-(y-cy),cy+(x-cx)]:[cx+(y-cy),cy-(x-cx)]);commit(drag.before);showToast("Shape rotated 90°");}
      }
      else {
        const item=itemForRef(drag.ref);
        const smartOpenings=drag.mode==="resize"&&drag.ref.type==="room"&&item?smartConnectRoom(item):[];
        commit(drag.before);
        showToast(smartOpenings.length?`Shape resized with ${smartOpenings.length} smart opening${smartOpenings.length===1?"":"s"}`:drag.mode==="height"?"Height updated":"Shape resized");
      }
      return;
    }
    if (movingVertex || movingEdge) {
      const item = selectedItem();
      const editMove=movingVertex||movingEdge;
      const error = item?.points ? polygonValidation(item.points) : "The polygon no longer exists";
      const editedPlatform = selected?.type === "prop";
      const orphaned = !error && (editedPlatform ? !polygonIsInsideSpace(item.points) : (
        state.entities.some((entity) => !isPointInSpace(entity.x + .5,entity.y + .5))
        || state.props.some((prop) => ["platformPolygon", "floorPolygon", "wallPolygon"].includes(prop.kind) ? !polygonIsInsideSpace(prop.points || []) : !rectIsInsideSpace(prop))
        || state.zones.some((zone) => !rectIsInsideSpace(zone))
      ));
      if (error || orphaned) {
        if (item) { item.points = editMove.points; updatePolygonBounds(item); }
        showToast(error || (editedPlatform ? "Keep the polygon platform on a buildable surface" : "That corner would leave an existing object outside the map"));
        refresh();
      } else {
        commit(editMove.before);
        showToast(movingEdge ? "Polygon edge updated" : "Polygon corner updated");
      }
      movingVertex = null; movingEdge=null;
      return;
    }
    if (drawing) {
      if (["buyCt","buyT","rescue","triggerHurt","teleport"].includes(activeTool)) {
        const before = snapshot();
        const box = normalizeSnappedRect(drawing.start, drawing.end);
        drawing = null;
        if (!rectIsInsideSpace(box)) { showToast("Keep the whole buy zone on a room floor or map ground"); refresh(); }
        else {
          const zone = { id: crypto.randomUUID(), kind: activeTool, damage:25, target:"tele_dest_1", floorLevel:floorLevelAt(box.x+box.w/2,box.y+box.d/2), ...box };
          state.zones.push(zone);
          selected = { type: "zone", id: zone.id };
          commit(before);
          showToast({buyCt:"CT buy zone created",buyT:"T buy zone created",rescue:"Hostage rescue zone created",triggerHurt:"Damage trigger created",teleport:"Teleport trigger created"}[activeTool]);
        }
      } else if (["wall","diagonal","platform","floor","floorHole","stairs","stairPrefab","ramp","water","breakable","cylinder","wedge","arch","slopeRoof","elevator","rotatingDoor","train"].includes(activeTool)) {
        placeDrawnStructure(activeTool === "stairPrefab" ? "stairs" : activeTool, drawing.start, drawing.end);
        drawing = null;
      } else {
        const before = snapshot();
        const box = normalizeSnappedRect(drawing.start, drawing.end);
        const presetPoints = presetRoomPoints(activeTool, box);
        if (presetPoints && (box.w < 3 || box.d < 3)) {
          drawing = null; showToast("Drag at least 3 by 3 grid cells for this shape"); refresh(); return;
        }
        const room = presetPoints ? roomFromPoints(presetPoints, activeTool === "triangle" ? "TRIANGLE ROOM" : "OCTAGON ROOM") : {
          id: crypto.randomUUID(), ...box,
          kind: ["corridor", "vent"].includes(activeTool) ? "corridor" : "room",
          label: activeTool === "vent" ? "VENT PASSAGE" : undefined,
          floorLevel: planLevel ?? 0,
          height: activeTool === "vent" ? 1 : activeTool === "corridor" ? 3 : 4,
          texture: "C1A0_LABW3", floorTexture: "CSTRIKE_FP2DARK",
          ceilingTexture: "C1A0_LABW3", ceilingMode: environmentFor().openSkyDefault ? "sky" : "ceiling"
        };
        state.rooms.push(room);
        const smartOpenings=smartConnectRoom(room);
        selected = { type: "room", id: room.id };
        drawing = null;
        commit(before);
        showToast(smartOpenings.length
          ? `${room.kind==="corridor"?"Corridor":"Room"} created with ${smartOpenings.length} smart opening${smartOpenings.length===1?"":"s"}`
          : room.kind === "corridor" ? "Corridor created — touch another room to connect it automatically" : presetPoints ? `${room.label} created—use Edit corners to reshape it` : "Room created — add another or place team spawns");
      }
    }
    if (moving?.entries?.length) {
      const movedEntries = moving.entries.map((entry)=>({ref:entry.ref,item:itemForRef(entry.ref)})).filter((entry)=>entry.item);
      const roomMoveInvalid = movedEntries.some((entry)=>entry.ref.type === "room") && (
        state.entities.some((entity) => !isPointInSpace(entity.x + .5,entity.y + .5))
        || state.props.some((prop) => ["platformPolygon", "floorPolygon", "wallPolygon"].includes(prop.kind) ? !polygonIsInsideSpace(prop.points || []) : !rectIsInsideSpace(prop))
        || state.zones.some((zone) => !rectIsInsideSpace(zone))
        || state.doors.some((door) => !doorIsConnected(door)) || state.windows.some((window) => !doorIsConnected(window))
      );
      if (roomMoveInvalid) {
        state = JSON.parse(moving.before);
        showToast("Move blocked because connected objects would be left behind");
        refresh();
      } else if (movedEntries.some(({ref,item}) => ref.type === "prop" && !(["platformPolygon", "floorPolygon", "wallPolygon"].includes(item.kind) ? polygonIsInsideSpace(item.points || []) : rectIsInsideSpace(item)))) {
        state = JSON.parse(moving.before);
        showToast("Keep structures on a room floor or map ground");
        refresh();
      } else if (movedEntries.some(({ref,item}) => ref.type === "entity" && !isPointInSpace(item.x + .5,item.y + .5))) {
        state = JSON.parse(moving.before);
        showToast("Keep markers and lights on a room floor or map ground");
        refresh();
      } else if (movedEntries.some(({ref,item}) => ref.type === "zone" && !rectIsInsideSpace(item))) {
        state = JSON.parse(moving.before);
        showToast("Keep buy zones on a room floor or map ground");
        refresh();
      } else {
        movedEntries.filter(({ref,item})=>ref.type === "entity" && item.kind === "light").forEach(({item}) => {
          const lightRoom = state.rooms.find((room) => pointInRoom(item.x + .5, item.y + .5, room));
          item.z = Math.min(item.z || 2.5, Math.max(.5, (lightRoom?.height || 4) - .25));
        });
        const smartOpenings=movedEntries.filter(({ref})=>ref.type==="room").flatMap(({item})=>smartConnectRoom(item));
        commit(moving.before);
        if(smartOpenings.length)showToast(`Move completed with ${smartOpenings.length} smart opening${smartOpenings.length===1?"":"s"}`);
      }
      moving = null;
    }
  });

  editor.addEventListener("pointercancel", () => {
    if(transformDrag){state=JSON.parse(transformDrag.before);transformDrag=null;refresh();}
    if (movingVertex || movingEdge) {
      const room = selectedItem();
      const editMove=movingVertex||movingEdge;
      if (room) { room.points = editMove.points; updatePolygonBounds(room); }
      movingVertex = null; movingEdge=null;
    }
    panning = null;
    $("#canvasWrap").style.cursor = activeTool === "pan" ? "grab" : activeTool === "select" ? "default" : "crosshair";
  });

  editor.addEventListener("pointerleave", () => { hoverCell = null; hoverWorld = null; if (!drawing && !moving && !movingVertex) drawEditor(); });
  editor.addEventListener("wheel", (event) => {
    event.preventDefault();
    const point = canvasPoint(event, editor);
    const old = cellSize;
    cellSize = Math.max(10, Math.min(55, cellSize * (event.deltaY < 0 ? 1.1 : .9)));
    viewOffset.x = point.x - (point.x - viewOffset.x) * (cellSize / old);
    viewOffset.y = point.y - (point.y - viewOffset.y) * (cellSize / old);
    drawEditor();
  }, { passive: false });
  preview.addEventListener("pointerdown", (event) => {
    preview.focus();
    if (previewMode !== "orbit" || ![0, 1, 2].includes(event.button)) return;
    event.preventDefault();
    preview.setPointerCapture(event.pointerId);
    const local=canvasPoint(event,preview);
    if(event.button===0&&previewTransformHandle&&Math.hypot(local.x-previewTransformHandle.x,local.y-previewTransformHandle.y)<=12){
      const item=itemForRef(previewTransformHandle.ref);previewDrag={mode:"height",x:event.clientX,y:event.clientY,moved:false,before:snapshot(),ref:{...previewTransformHandle.ref},startHeight:Number(item?.height)||1,startElevation:Number(item?.elevation)||0};return;
    }
    const panGesture = previewPanMode || event.shiftKey || event.button === 1 || event.button === 2;
    previewDrag = {
      mode: panGesture ? "pan" : "rotate",
      x: event.clientX, y: event.clientY,
      moved: false,
      angle: previewAngle,
      pan: { ...previewPan }
    };
    $("#previewWrap").classList.toggle("panning", panGesture);
  });
  preview.addEventListener("pointermove", (event) => {
    if (!previewDrag) return;
    previewDrag.moved ||= Math.hypot(event.clientX-previewDrag.x,event.clientY-previewDrag.y) > 4;
    if(previewDrag.mode==="height"){
      const item=itemForRef(previewDrag.ref),delta=baseSnap((previewDrag.y-event.clientY)/28);
      if(item){if(["floor","floorPolygon"].includes(item.kind))item.elevation=previewDrag.startElevation+delta;else item.height=Math.max(.25,previewDrag.startHeight+delta);}
    } else if (previewDrag.mode === "pan") {
      previewPan.x = previewDrag.pan.x + event.clientX - previewDrag.x;
      previewPan.y = previewDrag.pan.y + event.clientY - previewDrag.y;
    } else {
      previewAngle = previewDrag.angle + (event.clientX - previewDrag.x) * .012;
    }
    drawPreview();
  });
  const finishPreviewDrag = (event) => {
    if(previewDrag?.mode==="height"){
      const before=previewDrag.before;previewDrag=null;commit(before);showToast("Height updated from 3D");return;
    }
    const clickSelect = previewDrag?.mode === "rotate" && !previewDrag.moved && event?.type === "pointerup";
    previewDrag = null;
    $("#previewWrap").classList.remove("panning");
    if (clickSelect) {
      const point=canvasPoint(event,preview);
      const region=[...previewPickRegions].reverse().find((candidate)=>pointInScreenPolygon(point,candidate.points));
      applySelectionHit(region?.ref || null,event.shiftKey);
      if (region?.ref?.type === "room" && region.surface) surfaceTarget = region.surface;
      if (region) setTool("select");
      refresh();
      if (region) showToast("Selected from 3D — edit it in the inspector or plan");
    }
  };
  preview.addEventListener("pointerup", finishPreviewDrag);
  preview.addEventListener("pointercancel", finishPreviewDrag);
  preview.addEventListener("contextmenu", (event) => { if (previewMode === "orbit") event.preventDefault(); });
  preview.addEventListener("wheel", (event) => {
    if (previewMode !== "orbit") return;
    event.preventDefault();
    const rect = preview.getBoundingClientRect();
    setPreviewZoom(previewZoom * (event.deltaY < 0 ? 1.14 : 1 / 1.14), { x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, { passive: false });
  preview.addEventListener("keydown", (event) => {
    if (previewMode !== "orbit") return;
    if (["+", "="].includes(event.key)) { event.preventDefault(); event.stopPropagation(); setPreviewZoom(previewZoom * 1.2); }
    else if (event.key === "-") { event.preventDefault(); event.stopPropagation(); setPreviewZoom(previewZoom / 1.2); }
    else if (event.key === "0") { event.preventDefault(); event.stopPropagation(); fitPreview(); }
  });

  $$(".tool[data-tool]").forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
  $("#toolWorkspaces").addEventListener("click",(event)=>{const button=event.target.closest("[data-tool-workspace]");if(button)setToolWorkspace(button.dataset.toolWorkspace);});
  $("#toolModeButton").addEventListener("click",()=>{beginnerToolMode=!beginnerToolMode;localStorage.setItem("blockout-tool-mode",beginnerToolMode?"beginner":"advanced");filterSidebarTools();});
  $("#recentToolList").addEventListener("click",(event)=>{const button=event.target.closest("[data-recent-tool]");if(button)setTool(button.dataset.recentTool);});
  $("#rightPanelTabs").addEventListener("click",(event)=>{const button=event.target.closest("[data-right-panel]");if(button)setRightPanel(button.dataset.rightPanel);});
  $("#openMaterialLibrarySidebar").addEventListener("click",()=>openTextureLibrary(["room","prop"].includes(selected?.type)?"material":"ground"));
  $("#openLayoutsSidebar").addEventListener("click",()=>$("#layoutsButton").click());
  $("#openEnvironmentSidebar").addEventListener("click",()=>$("#environmentButton").click());
  $("#topMoreMenu").addEventListener("click",(event)=>{if(event.target.closest(".menu-action"))$("#topMoreMenu").open=false;});
  $("#projectFileMenu").addEventListener("toggle",()=>{if($("#projectFileMenu").open)$("#topMoreMenu").open=false;});
  $("#topMoreMenu").addEventListener("toggle",()=>{if($("#topMoreMenu").open)$("#projectFileMenu").open=false;});
  $("#projectFileMenu").addEventListener("click",(event)=>{if(event.target.closest("button.menu-action"))$("#projectFileMenu").open=false;});
  $("#saveProjectNow").addEventListener("click",()=>saveProjectNow());
  $("#saveNamedVersion").addEventListener("click",()=>createNamedSnapshot());
  $("#manageProjectVersions").addEventListener("click",()=>{productionTab="project";$("#productionDialog").showModal();renderProduction();});
  $("#downloadProjectJson").addEventListener("click",downloadProjectFile);
  $("#projectFileInput").addEventListener("change",async(event)=>{await importProjectFile(event.target.files?.[0]);event.target.value="";$("#projectFileMenu").open=false;});
  $("#exportMapFromProject").addEventListener("click",exportMap);
  $("#downloadProjectPackage").addEventListener("click",exportProductionPackage);
  $("#undoButton").addEventListener("click", undo);
  $("#redoButton").addEventListener("click", redo);
  $("#deleteButton").addEventListener("click", deleteSelected);
  $("#rotateLeftSelection").addEventListener("click", () => rotateSelected(false));
  $("#rotateRightSelection").addEventListener("click", () => rotateSelected(true));
  $("#brushStudioButton").addEventListener("click",openBrushStudio);
  $("#openBrushStudioSelection").addEventListener("click",openBrushStudio);
  $("#closeBrushStudioDialog").addEventListener("click",()=>$("#brushStudioDialog").close());
  $("#applyBrushPreset").addEventListener("click",applyBrushPreset);
  $("#bevelBrush").addEventListener("click",bevelSelectedBrush);
  $("#splitBrush").addEventListener("click",splitSelectedBrush);
  $("#extrudeBrush").addEventListener("click",extrudeBrushSide);
  $("#mirrorBrushX").addEventListener("click",()=>mirrorBrushSelection("x"));
  $("#mirrorBrushY").addEventListener("click",()=>mirrorBrushSelection("y"));
  $("#createBrushArray").addEventListener("click",createBrushArray);
  $("#applyWallThickness").addEventListener("click",applyBrushWallThickness);
  $("#editBrushCorners").addEventListener("click",()=>{$("#brushStudioDialog").close();toggleVertexEditing();});
  $("#saveSelectionPrefab").addEventListener("click",()=>openCustomPrefabStudio());
  $("#reverseSelection").addEventListener("click", reverseSelected);
  $("#editVerticesButton").addEventListener("click", toggleVertexEditing);
  $("#removeVertexButton").addEventListener("click", removeSelectedVertex);
  $("#clipVertexButton").addEventListener("click",clipSelectedVertex);
  $("#extrudeEdgeButton").addEventListener("click",extrudeSelectedEdge);
  $("#insetPolygonButton").addEventListener("click",()=>offsetSelectedPolygon(1));
  $("#outsetPolygonButton").addEventListener("click",()=>offsetSelectedPolygon(-1));
  $("#duplicateSelection").addEventListener("click", duplicateSelected);
  $("#levelDownSelection").addEventListener("click", () => shiftSelectedLevel(-1));
  $("#levelUpSelection").addEventListener("click", () => shiftSelectedLevel(1));
  $("#copySelection").addEventListener("click", () => copySelected());
  $("#pasteSelection").addEventListener("click", pasteCopied);
  $("#groupSelection").addEventListener("click", groupSelected);
  $("#ungroupSelection").addEventListener("click", ungroupSelected);
  $("#lockSelection").addEventListener("click", toggleLockSelected);
  $("#hideSelection").addEventListener("click", hideSelected);
  $("#unhideAll").addEventListener("click", unhideAll);
  [["precisionX","x"],["precisionY","y"],["precisionZ","z"],["precisionWidth","width"],["precisionDepth","depth"],["precisionHeight","height"]].forEach(([id,field])=>{
    $(`#${id}`).addEventListener("change",(event)=>applyPrecisionField(field,event.target.value));
  });
  $("#precisionActions").addEventListener("click",(event)=>{
    const align=event.target.closest("[data-align]"),distribute=event.target.closest("[data-distribute]"),equal=event.target.closest("[data-equal-size]");
    if(align)alignSelected(align.dataset.align);
    else if(distribute)distributeSelected(distribute.dataset.distribute);
    else if(equal)equalizeSelected(equal.dataset.equalSize);
  });
  $("#centerSelectionOrigin").addEventListener("click",centerSelectionOnOrigin);
  $("#selectionLayer").addEventListener("change",(event)=>{
    if(!event.target.value)return;
    const entries=selectedEntries(),before=snapshot();
    entries.forEach(({item})=>{item.layerId=event.target.value===DEFAULT_LAYER_ID?undefined:event.target.value;});
    commit(before);showToast(`${entries.length} object${entries.length===1?"":"s"} moved to ${layerForItem(entries[0]?.item).name}`);
  });
  $("#exportButton").addEventListener("click", exportMap);
  $("#buildButton").addEventListener("click", () => { $("#buildDialog").showModal(); refreshCompanionStatus(); });
  $("#closeBuildDialog").addEventListener("click", () => $("#buildDialog").close());
  $("#connectCompanionButton").addEventListener("click", pairHostedCompanion);
  $("#forgetCompanionButton").addEventListener("click", forgetHostedCompanion);
  $("#companionPairingCode").addEventListener("input", (event) => {
    const compact = String(event.target.value || "").replace(/[^A-F0-9]/gi, "").toUpperCase().slice(0, 8);
    event.target.value = formatPairingCode(compact);
  });
  $("#companionPairingCode").addEventListener("keydown", (event) => {
    if (event.key === "Enter") pairHostedCompanion();
  });
  $("#savePathsButton").addEventListener("click", saveCompanionPaths);
  $("#installCompilerButton").addEventListener("click", installVerifiedCompiler);
  $("#dismissSetupButton").addEventListener("click",()=>{localStorage.setItem("blockout-setup-dismissed-1.1","yes");updateBuildDialog();});
  $("#runBuildButton").addEventListener("click", runBuildAndTest);
  $("#cancelBuildButton").addEventListener("click", cancelCurrentBuild);
  $("#buildDiagnostics").addEventListener("click",(event)=>{const button=event.target.closest("[data-build-diagnostic]");if(!button)return;focusBuildDiagnostic($("#buildDiagnostics")._diagnostics?.[Number(button.dataset.buildDiagnostic)]);});
  $("#launchAfterBuild").addEventListener("change", updateBuildDialog);
  $("#fitButton").addEventListener("click", fitView);
  $("#levelSelect").addEventListener("change", (event) => {
    planLevel = event.target.value === "all" ? null : Number(event.target.value);
    if (selected && !onPlanLevel(selected.type, selectedItem())) selected = null;
    refresh();
  });
  $("#ghostLevels").addEventListener("change", (event) => { ghostLevels = event.target.checked; drawEditor(); });
  $("#snapUnits").addEventListener("change", (event) => { snapUnits = Number(event.target.value) || 64; showToast(adaptiveGridEnabled?`Preferred snap ${snapUnits} · Adaptive may refine it near geometry`:`Snap set to ${snapUnits} GoldSrc units`); drawEditor(); });
  $("#objectSnap").addEventListener("change", (event) => { objectSnapEnabled = event.target.checked; showToast(objectSnapEnabled ? "Object edge and center snapping enabled" : "Object snapping disabled"); });
  $("#adaptiveGrid").checked=adaptiveGridEnabled;
  $("#adaptiveGrid").addEventListener("change",(event)=>{
    adaptiveGridEnabled=event.target.checked;
    localStorage.setItem("blockout-adaptive-grid",adaptiveGridEnabled?"on":"off");
    drawEditor();
    showToast(adaptiveGridEnabled?`Adaptive grid enabled · current snap ${Math.round(snapStep()*GRID)} units`:`Fixed ${snapUnits}-unit grid enabled`);
  });
  $("#smartConnections").checked=smartConnectionsEnabled;
  $("#smartConnections").addEventListener("change", (event) => {
    smartConnectionsEnabled=event.target.checked;
    localStorage.setItem("blockout-smart-connections",smartConnectionsEnabled?"on":"off");
    showToast(smartConnectionsEnabled?"Smart openings and vertical assists enabled":"Smart links disabled — connections stay manual");
  });
  $("#previewLevelButton").addEventListener("click", () => {
    if (planLevel == null) { showToast("Choose a plan level first"); return; }
    previewLevelOnly = !previewLevelOnly; updateLevelControls(); drawPreview();
  });
  $("#rotateButton").addEventListener("click", () => { previewAngle += Math.PI / 2; drawPreview(); });
  $("#previewModeButton").addEventListener("click", () => setPreviewMode(previewMode === "orbit" ? "walk" : "orbit"));
  $("#previewZoomOut").addEventListener("click", () => setPreviewZoom(previewZoom / 1.2));
  $("#previewZoomIn").addEventListener("click", () => setPreviewZoom(previewZoom * 1.2));
  $("#previewPanButton").addEventListener("click", () => { previewPanMode = !previewPanMode; updatePreviewNavigation(); preview.focus(); });
  $("#previewFitButton").addEventListener("click", fitPreview);
  $("#gridButton").addEventListener("click", () => showToast(`Major grid 64 · active snap ${Math.round(snapStep()*GRID)} units${adaptiveGridEnabled?" · adaptive":""}`));
  $("#analyzeButton").addEventListener("click", () => { runCompetitiveAnalysis(); $("#analysisDialog").showModal(); });
  $("#closeAnalysisDialog").addEventListener("click", () => $("#analysisDialog").close());
  $("#refreshAnalysis").addEventListener("click", runCompetitiveAnalysis);
  $("#showAnalysisOverlay").addEventListener("change", drawEditor);
  $("#elevationButton").addEventListener("click",()=>{$("#elevationDialog").showModal();requestAnimationFrame(drawElevationEditor);});
  $("#closeElevationDialog").addEventListener("click",()=>$("#elevationDialog").close());
  $("#elevationAxis").addEventListener("change",(event)=>{elevationAxis=event.target.value;drawElevationEditor();});
  $("#elevationSlice").addEventListener("input",drawElevationEditor);
  $("#elevationBase").addEventListener("change",(event)=>applyElevationField("base",event.target.value));
  $("#elevationTop").addEventListener("change",(event)=>applyElevationField("top",event.target.value));
  elevationCanvas.addEventListener("click",(event)=>{const point=canvasPoint(event,elevationCanvas),hit=[...elevationHitRegions].reverse().find((region)=>point.x>=region.x1&&point.x<=region.x2&&point.y>=region.y1&&point.y<=region.y2);if(hit){selection=[{...hit.ref}];selected={...hit.ref};refresh();drawElevationEditor();}});
  $("#preflightButton").addEventListener("click",()=>{renderPreflight();$("#preflightDialog").showModal();});
  $("#closePreflightDialog").addEventListener("click",()=>$("#preflightDialog").close());
  $("#refreshPreflight").addEventListener("click",renderPreflight);
  $("#preflightList").addEventListener("click",(event)=>{const button=event.target.closest("[data-preflight-index]");if(!button)return;const issue=lastPreflight?.issues[Number(button.dataset.preflightIndex)];if(issue?.ref){selection=[{...issue.ref}];selected={...issue.ref};setTool("select");$("#preflightDialog").close();refresh();showToast(`Selected issue: ${issue.title}`);}});
  $("#productionButton").addEventListener("click",()=>{$("#productionDialog").showModal();renderProduction();});
  $("#closeProductionDialog").addEventListener("click",()=>$("#productionDialog").close());
  $("#productionDialog").addEventListener("close",()=>{lightingOverlay=false;drawEditor();});
  $$("[data-production-tab]").forEach((button)=>button.addEventListener("click",()=>{productionTab=button.dataset.productionTab;renderProduction();}));
  $("#outlinerSearch").addEventListener("input",renderOutliner);$("#outlinerType").addEventListener("change",renderOutliner);$("#outlinerLayer").addEventListener("change",renderOutliner);
  $("#addLayer").addEventListener("click",()=>{
    const before=snapshot(),layers=ensureLayers(),layer={id:crypto.randomUUID(),name:`Layer ${layers.length}`,color:LAYER_COLORS[layers.length%LAYER_COLORS.length],visible:true,locked:false};
    layers.push(layer);commit(before);renderOutliner();requestAnimationFrame(()=>$("#layerList").querySelector(`[data-layer-name="${CSS.escape(layer.id)}"]`)?.select());showToast("Layer created — rename it in the Outliner");
  });
  $("#layerList").addEventListener("change",(event)=>{
    const name=event.target.closest("[data-layer-name]"),color=event.target.closest("[data-layer-color]"),id=name?.dataset.layerName||color?.dataset.layerColor,layer=ensureLayers().find((item)=>item.id===id);
    if(!layer)return;
    const before=snapshot();
    if(name)layer.name=name.value.trim().slice(0,32)||"Untitled layer";
    if(color)layer.color=color.value;
    commit(before);
  });
  $("#layerList").addEventListener("click",(event)=>{
    const visibility=event.target.closest("[data-layer-visible]"),lock=event.target.closest("[data-layer-lock]"),remove=event.target.closest("[data-layer-delete]");
    const id=visibility?.dataset.layerVisible||lock?.dataset.layerLock||remove?.dataset.layerDelete,layer=ensureLayers().find((item)=>item.id===id);
    if(!layer)return;
    const before=snapshot();
    if(visibility){
      layer.visible=!layer.visible;
      if(!layer.visible){selection=selection.filter((ref)=>layerForItem(itemForRef(ref)).id!==layer.id);selected=selection[0]||null;}
      commit(before);showToast(layer.visible?`${layer.name} shown`:`${layer.name} hidden`);
    }else if(lock){
      layer.locked=!layer.locked;commit(before);showToast(layer.locked?`${layer.name} locked`:`${layer.name} unlocked`);
    }else if(remove&&layer.id!==DEFAULT_LAYER_ID){
      productionObjects().forEach(({item})=>{if(layerForItem(item).id===layer.id)delete item.layerId;});
      state.layers=state.layers.filter((item)=>item.id!==layer.id);commit(before);showToast(`${layer.name} removed; its objects moved to Default`);
    }
  });
  $("#outlinerList").addEventListener("click",(event)=>{
    const action=event.target.closest("[data-outline-lock],[data-outline-hide]");
    if(action){const token=action.dataset.outlineLock||action.dataset.outlineHide,[type,id]=token.split(":"),item=itemForRef({type,id});if(!item)return;const before=snapshot();if(action.dataset.outlineLock)item.locked=!item.locked;else item.hidden=!item.hidden;commit(before);return;}
    const row=event.target.closest("[data-outline-select]");if(!row)return;const [type,id]=row.dataset.outlineSelect.split(":");selection=[{type,id}];selected={type,id};setTool("select");refresh();
  });
  $("#addStory").addEventListener("click",()=>{const before=snapshot(),elevation=(Number($("#storyElevation").value)||0)/GRID,name=$("#storyName").value.trim()||`Level ${Math.round(elevation*GRID)}`;state.stories||=[];if(state.stories.some((story)=>Math.abs(Number(story.elevation)-elevation)<.01)){showToast("A level already uses that elevation");return;}state.stories.push({id:crypto.randomUUID(),name,elevation});planLevel=elevation;commit(before);renderProduction();});
  $("#storyList").addEventListener("click",(event)=>{const view=event.target.closest("[data-story-view]"),copy=event.target.closest("[data-story-copy]"),remove=event.target.closest("[data-story-remove]"),id=view?.dataset.storyView||copy?.dataset.storyCopy||remove?.dataset.storyRemove,story=state.stories?.find((item)=>item.id===id);if(!story)return;if(view){planLevel=Number(story.elevation)||0;ghostLevels=true;refresh();}else if(copy)duplicateStory(story);else{const count=state.rooms.filter((room)=>Math.abs(roomFloor(room)-Number(story.elevation))<.13).length;if(count)return showToast("Delete or move this level's rooms first");const before=snapshot();state.stories=state.stories.filter((item)=>item.id!==id);commit(before);}});
  $("#lightingList").addEventListener("click",(event)=>{const row=event.target.closest("[data-light-room]");if(!row)return;selection=[{type:"room",id:row.dataset.lightRoom}];selected=selection[0];refresh();});
  $("#selectDarkRoom").addEventListener("click",()=>{const room=darkestRoom();if(!room)return;selection=[{type:"room",id:room.id}];selected=selection[0];refresh();});
  $("#addLightToDarkRoom").addEventListener("click",()=>{const room=darkestRoom();if(!room)return showToast("Draw a room first");const before=snapshot(),entity={id:crypto.randomUUID(),kind:"light",x:Math.floor(room.x+room.w/2),y:Math.floor(room.y+room.d/2),floorLevel:roomFloor(room),z:Math.max(.5,room.height-.75),brightness:350,radius:Math.max(256,Math.round(Math.max(room.w,room.d)*GRID*.75)),style:"0",target:"",color:"#fff0d0"};state.entities.push(entity);selection=[{type:"entity",id:entity.id}];selected=selection[0];commit(before);showToast("Light added to the darkest room");});
  $("#walkFromCt").addEventListener("click",()=>startWalkAt(state.entities.find((item)=>item.kind==="ct")));$("#walkFromT").addEventListener("click",()=>startWalkAt(state.entities.find((item)=>item.kind==="t")));$("#walkFromSelected").addEventListener("click",()=>{const item=selectedItem();startWalkAt(selected?.type==="entity"&&["ct","t"].includes(item?.kind)?item:null);});
  $("#toggleRouteRecording").addEventListener("click",()=>{routeRecording=!routeRecording;if(routeRecording){recordedRoute=[];routeStartedAt=performance.now();lastRouteSampleAt=0;if(previewMode!=="walk")startWalkAt(state.entities.find((item)=>["ct","t"].includes(item.kind)));}$("#toggleRouteRecording").textContent=routeRecording?"Stop recording":"Record route";renderProduction();showToast(routeRecording?"Route recording started":"Route recording stopped");});
  $("#clearRecordedRoute").addEventListener("click",()=>{routeRecording=false;recordedRoute=[];$("#toggleRouteRecording").textContent="Record route";renderProduction();});
  $("#placeTargetFromProduction").addEventListener("click",()=>{$("#productionDialog").close();setTool("targetDummy");showToast("Click a floor to place the playtest target");});
  $("#createSnapshot").addEventListener("click",()=>createNamedSnapshot($("#snapshotName").value));
  $("#snapshotList").addEventListener("click",(event)=>{const restore=event.target.closest("[data-snapshot-restore]"),remove=event.target.closest("[data-snapshot-delete]"),id=restore?.dataset.snapshotRestore||remove?.dataset.snapshotDelete,entry=projectSnapshots.find((item)=>item.id===id);if(!entry)return;if(restore){if(!confirm(`Restore ${entry.name}? The current state remains available through Undo.`))return;const before=snapshot();state=JSON.parse(entry.project);environmentFor(state);selected=null;selection=[];commit(before);showToast("Named version restored");}else{projectSnapshots=projectSnapshots.filter((item)=>item.id!==id);localStorage.setItem("blockout-project-snapshots-v1",JSON.stringify(projectSnapshots));renderSnapshots();}});
  $("#exportProjectJson").addEventListener("click",downloadProjectFile);
  $("#importProjectJson").addEventListener("change",async(event)=>{await importProjectFile(event.target.files?.[0]);event.target.value="";});
  $("#exportPackage").addEventListener("click",exportProductionPackage);
  $("#openTextureBrowser").addEventListener("click", () => openTextureLibrary("material"));
  $$(".material-miniature[data-texture-target]").forEach((image) => image.addEventListener("click", () => {
    if (image.dataset.textureTarget === "ground" && $("#environmentDialog").open) $("#environmentDialog").close();
    openTextureLibrary(image.dataset.textureTarget);
  }));
  $("#closeTextureDialog").addEventListener("click", () => $("#textureDialog").close());
  $("#textureSearch").addEventListener("input", renderTextureBrowser);
  $("#textureCategory").addEventListener("change", renderTextureBrowser);
  $("#textureUseFilter").addEventListener("change", renderTextureBrowser);
  $("#textureWadFilter").addEventListener("change", renderTextureBrowser);
  $("#textureTarget").addEventListener("change", renderTextureBrowser);
  $("#textureImportCategory").addEventListener("change",(event)=>suggestImportedTextureUses(event.target.value,$("#textureImportLabel").value));
  $("#textureDropZone").addEventListener("click", () => $("#textureFileInput").click());
  $("#textureFileInput").addEventListener("change", (event) => prepareTextureImport(event.target.files?.[0]));
  ["dragenter", "dragover"].forEach((type) => $("#textureDropZone").addEventListener(type, (event) => {
    event.preventDefault(); event.stopPropagation();
    $("#textureDropZone").classList.add("drag-over");
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }));
  ["dragleave", "drop"].forEach((type) => $("#textureDropZone").addEventListener(type, (event) => {
    event.preventDefault(); event.stopPropagation();
    $("#textureDropZone").classList.remove("drag-over");
  }));
  $("#textureDropZone").addEventListener("drop", (event) => prepareTextureImport(event.dataTransfer?.files?.[0]));
  updateTextureImportAvailability();
  $("#cancelTextureImport").addEventListener("click", resetTextureImport);
  $("#resetTextureAlchemy").addEventListener("click",()=>resetTextureAlchemyControls(true));
  ["textureCropMode","textureRotation","textureZoom","textureOffsetX","textureOffsetY","textureSeamWidth","textureBrightness","textureContrast","textureSaturation","textureMakeSeamless","textureGoldSrcPalette"].forEach((id)=>{
    $(`#${id}`).addEventListener(id.startsWith("textureMake")||id==="textureGoldSrcPalette"||id==="textureCropMode"||id==="textureRotation"?"change":"input",renderTextureAlchemy);
  });
  $("#installTextureImport").addEventListener("click", installImportedTexture);
  $("#textureImportName").addEventListener("input", (event) => {
    const selectionStart=event.target.selectionStart;
    event.target.value=event.target.value.toUpperCase().replace(/[^A-Z0-9_]+/g,"_").slice(0,15);
    event.target.setSelectionRange(Math.min(selectionStart,event.target.value.length),Math.min(selectionStart,event.target.value.length));
  });
  $("#textureGrid").addEventListener("click", async (event) => {
    const remove = event.target.closest("[data-delete-texture]");
    if(remove){event.preventDefault();event.stopPropagation();await deleteImportedTexture(remove.dataset.deleteTexture);return;}
    const favorite = event.target.closest("[data-favorite]");
    if (favorite) {
      event.preventDefault(); event.stopPropagation();
      const texture = favorite.dataset.favorite;
      textureFavorites.has(texture) ? textureFavorites.delete(texture) : textureFavorites.add(texture);
      localStorage.setItem("blockout-texture-favorites", JSON.stringify([...textureFavorites])); renderTextureBrowser(); return;
    }
    const card = event.target.closest("[data-texture]");
    if (card) applyBrowserTexture(card.dataset.texture);
  });
  $("#openPrefabLibrary").addEventListener("click", () => {
    $("#prefabSearch").value = ""; $("#prefabCategory").value = "all"; renderPrefabLibrary(); $("#prefabDialog").showModal();
  });
  $("#closePrefabDialog").addEventListener("click", () => $("#prefabDialog").close());
  $("#prefabSearch").addEventListener("input", renderPrefabLibrary);
  $("#prefabCategory").addEventListener("change", renderPrefabLibrary);
  $("#prefabGrid").addEventListener("click", (event) => {
    const edit=event.target.closest("[data-edit-custom-prefab]");
    if(edit){const prefab=customPrefabs.find((item)=>item.id===edit.dataset.editCustomPrefab);if(prefab)openCustomPrefabStudio(prefab);return;}
    const remove=event.target.closest("[data-delete-custom-prefab]");
    if(remove){
      const prefab=customPrefabs.find((item)=>item.id===remove.dataset.deleteCustomPrefab);
      if(prefab&&confirm(`Delete "${prefab.name}" from My prefabs?`)){
        customPrefabs=customPrefabs.filter((item)=>item.id!==prefab.id);
        if(activePrefabId===`custom:${prefab.id}`)activePrefabId="halfCover";
        persistCustomPrefabs();renderPrefabLibrary();showToast(`${prefab.name} deleted`);
      }
      return;
    }
    const card = event.target.closest("[data-prefab]");
    if (card) choosePrefab(card.dataset.prefab);
  });
  $("#createPrefabFromSelection").addEventListener("click",()=>openCustomPrefabStudio());
  $("#closeCustomPrefabDialog").addEventListener("click",()=>$("#customPrefabDialog").close());
  $("#cancelCustomPrefab").addEventListener("click",()=>$("#customPrefabDialog").close());
  $("#customPrefabForm").addEventListener("submit",(event)=>{event.preventDefault();saveCustomPrefabFromStudio();});
  $("#customPrefabPivot").addEventListener("change",()=>{if(customPrefabDraft){customPrefabDraft.pivot=$("#customPrefabPivot").value;$("#customPrefabPreview").innerHTML=customPrefabThumbnail(customPrefabDraft);}});
  $("#prefabRotateLeft").addEventListener("click",()=>{customPrefabRotation=(customPrefabRotation+270)%360;renderPrefabTransformSummary();});
  $("#prefabRotateRight").addEventListener("click",()=>{customPrefabRotation=(customPrefabRotation+90)%360;renderPrefabTransformSummary();});
  $("#prefabMirror").addEventListener("click",()=>{customPrefabMirrored=!customPrefabMirrored;renderPrefabTransformSummary();});
  $("#exportCustomPrefabs").addEventListener("click",()=>{
    if(!customPrefabs.length)return showToast("Your personal prefab library is empty");
    const document=JSON.stringify({format:"blockout-custom-prefabs",version:1,exportedAt:new Date().toISOString(),prefabs:customPrefabs},null,2);
    downloadBlob(document,"application/json","blockout-custom-prefabs.json");showToast(`${customPrefabs.length} custom prefabs exported`);
  });
  $("#importCustomPrefabs").addEventListener("change",async(event)=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      const document=JSON.parse(await file.text()),incoming=Array.isArray(document)?document:document.format==="blockout-custom-prefabs"?document.prefabs:null;
      if(!Array.isArray(incoming))throw new Error("Not a Blockout prefab library");
      const valid=incoming.filter(isValidCustomPrefab).slice(0,200).map((prefab)=>({...structuredClone(prefab),id:crypto.randomUUID(),createdAt:Date.now(),updatedAt:Date.now()}));
      if(!valid.length)throw new Error("No valid prefabs found");
      customPrefabs=[...valid,...customPrefabs];persistCustomPrefabs();renderPrefabLibrary();showToast(`${valid.length} custom prefab${valid.length===1?"":"s"} imported`);
    }catch(error){showToast(`Prefab import failed: ${error.message}`);}
    event.target.value="";
  });
  $("#toolSearch").addEventListener("input", filterSidebarTools);
  $("#toolSearch").addEventListener("keydown",(event)=>{if(event.key==="Escape"){event.preventDefault();event.target.value="";filterSidebarTools();event.target.blur();}});
  $("#environmentButton").addEventListener("click", () => { syncEnvironmentDialog(); $("#environmentDialog").showModal(); });
  $("#closeEnvironmentDialog").addEventListener("click", () => $("#environmentDialog").close());
  $("#finishEnvironment").addEventListener("click", () => $("#environmentDialog").close());
  $("#browseGroundTextures").addEventListener("click", () => { $("#environmentDialog").close(); openTextureLibrary("ground"); });
  $("#groundEnabled").addEventListener("change", (event) => changeEnvironment((environment) => { environment.groundEnabled = event.target.checked; }, event.target.checked ? "Map-wide ground enabled" : "Map-wide ground disabled"));
  $("#groundSize").addEventListener("change", (event) => changeEnvironment((environment) => { environment.groundSize = Math.max(16, Math.min(128, Number(event.target.value) || 32)); }));
  $("#groundPadding").addEventListener("change", (event) => changeEnvironment((environment) => { environment.groundPadding = Math.max(2, Math.min(32, Number(event.target.value) || 4)); }));
  $("#environmentGroundMaterialSelect").addEventListener("change", (event) => changeEnvironment((environment) => { environment.groundMaterial = event.target.value; }, `${MATERIAL_INFO[event.target.value]} ground applied`));
  $("#openSkyDefault").addEventListener("change", (event) => changeEnvironment((environment) => { environment.openSkyDefault = event.target.checked; }, event.target.checked ? "New rooms will use open sky" : "New rooms will use solid ceilings"));
  $("#skyNameSelect").addEventListener("change", (event) => changeEnvironment((environment) => { environment.skyName = event.target.value; }, `${SKY_THEMES[event.target.value]?.label || event.target.value} selected`));
  $("#makeAllOpenSky").addEventListener("click", () => {
    const before = snapshot();
    environmentFor().openSkyDefault = true;
    state.rooms.forEach((room) => { room.ceilingMode = "sky"; });
    commit(before); syncEnvironmentDialog(); showToast("Every room now opens to the selected sky");
  });
  $("#blueprintButton").addEventListener("click",()=>{$("#blueprintDialog").showModal();});
  $("#closeBlueprintDialog").addEventListener("click",()=>$("#blueprintDialog").close());
  $("#chooseBlueprintImage").addEventListener("click",(event)=>{event.stopPropagation();$("#blueprintFileInput").click();});
  $("#replaceBlueprintImage").addEventListener("click",()=>$("#blueprintFileInput").click());
  $("#blueprintDropZone").addEventListener("click",(event)=>{if(!event.target.closest("button"))$("#blueprintFileInput").click();});
  $("#blueprintDropZone").addEventListener("keydown",(event)=>{if(["Enter"," "].includes(event.key)){event.preventDefault();$("#blueprintFileInput").click();}});
  $("#blueprintFileInput").addEventListener("change",async(event)=>{await prepareBlueprintImport(event.target.files?.[0]);event.target.value="";});
  ["dragenter","dragover"].forEach((type)=>$("#blueprintDropZone").addEventListener(type,(event)=>{event.preventDefault();event.stopPropagation();$("#blueprintDropZone").classList.add("drag-over");if(event.dataTransfer)event.dataTransfer.dropEffect="copy";}));
  ["dragleave","drop"].forEach((type)=>$("#blueprintDropZone").addEventListener(type,(event)=>{event.preventDefault();event.stopPropagation();$("#blueprintDropZone").classList.remove("drag-over");}));
  $("#blueprintDropZone").addEventListener("drop",(event)=>prepareBlueprintImport(event.dataTransfer?.files?.[0]));
  ["blueprintWidthMeters","blueprintDetail","blueprintWallSensitivity","blueprintGameplay","blueprintCover","blueprintLevels","blueprintOpenSky","blueprintTextures"].forEach((id)=>{
    const input=$(`#${id}`);input.addEventListener(id==="blueprintWallSensitivity"?"input":"change",()=>scheduleBlueprintAnalysis());
  });
  $("#reanalyzeBlueprint").addEventListener("click",()=>scheduleBlueprintAnalysis(10));
  $("#createBlueprintMap").addEventListener("click",createMapFromBlueprint);
  $("#layoutsButton").addEventListener("click", () => {
    $("#layoutSearch").value = ""; $("#layoutCategory").value = "all"; renderLayoutLibrary(); $("#layoutDialog").showModal();
  });
  $("#closeLayoutDialog").addEventListener("click", () => $("#layoutDialog").close());
  $("#layoutSearch").addEventListener("input", renderLayoutLibrary);
  $("#layoutCategory").addEventListener("change", renderLayoutLibrary);
  $("#layoutGrid").addEventListener("click", (event) => {
    const card = event.target.closest("[data-layout]");
    if (!card) return;
    $("#layoutDialog").close();
    loadLayoutProject(card.dataset.layout);
  });
  $("#newButton").addEventListener("click", () => {
    if (state.rooms.length && !confirm("Start a new map? Your current map is saved in this browser.")) return;
    history.push(snapshot()); future = []; state = freshProject(); selected = null; fitView(); commit();
  });
  $("#projectName").addEventListener("input", (event) => { state.name = event.target.value; scheduleSave(); });

  function shiftSelectedLevel(delta) {
    const entries=selectedEntries().filter((entry)=>["room","prop"].includes(entry.ref.type)&&!isItemLocked(entry.item));
    if(entries.length>1){
      const before=snapshot(),selectedRoomIds=new Set(entries.filter((entry)=>entry.ref.type==="room").map((entry)=>entry.item.id));
      entries.forEach(({ref,item})=>{
        if(ref.type==="room") item.floorLevel=Math.max(-8,Math.min(16,roomFloor(item)+delta));
        else {
          const host=state.rooms.find((room)=>pointInRoom(item.x+(item.w||1)/2,item.y+(item.d||1)/2,room));
          if(host&&selectedRoomIds.has(host.id)) return;
          if(["floor","floorPolygon"].includes(item.kind)) item.elevation=(Number(item.elevation)||0)+delta;
          else item.floorLevel=(Number(item.floorLevel)||0)+delta;
        }
      });
      commit(before);showToast(`${entries.length} objects moved ${delta>0?"up":"down"} ${Math.abs(delta*GRID)} units`);return;
    }
    const item = selectedItem();
    if (!item || !["room", "prop"].includes(selected?.type)) return;
    if (isItemLocked(item)) { showToast("Unlock the object or its layer before changing elevation"); return; }
    const before = snapshot();
    if (selected.type === "room") {
      const oldLevel = roomFloor(item), nextLevel = Math.max(-8, Math.min(16, oldLevel + delta));
      const actualDelta = nextLevel - oldLevel;
      item.floorLevel = nextLevel;
      item.elevation = Math.round(nextLevel / .75);
      state.props.forEach((prop) => {
        if (!pointInRoom(prop.x + prop.w / 2, prop.y + prop.d / 2, item)) return;
        if (["floor", "floorPolygon"].includes(prop.kind)) prop.elevation = (Number(prop.elevation) || 0) + actualDelta;
        else prop.floorLevel = (prop.floorLevel == null ? oldLevel : Number(prop.floorLevel)) + actualDelta;
      });
      planLevel = nextLevel;
    } else if (["floor", "floorPolygon"].includes(item.kind)) {
      item.elevation = Math.max(-8, Math.min(16, (Number(item.elevation) || 0) + delta));
      planLevel = item.elevation;
    } else {
      item.floorLevel = Math.max(-8, Math.min(16, (Number(item.floorLevel) || floorLevelAt(item.x + item.w / 2, item.y + item.d / 2)) + delta));
      planLevel = item.floorLevel;
    }
    commit(before);
    showToast(`Moved to Z ${Math.round(itemLevel(selected.type, item) * GRID)}`);
  }

  ["roomWidth", "roomDepth", "roomHeight"].forEach((id) => {
    $(`#${id}`).addEventListener("change", (event) => {
      const item = selectedItem();
      if (!item || !["room", "prop", "zone"].includes(selected.type)) return;
      if (isItemLocked(item)) { showToast("Unlock the object or its layer before resizing"); refresh(); return; }
      const before = snapshot();
      const parsed = Number(event.target.value);
      const value = Math.max(Number(event.target.min), Math.min(Number(event.target.max), Number.isFinite(parsed) ? parsed : 1));
      if (id === "roomWidth") {
        const oldWidth = Math.max(.001, item.w);
        if (item.points) item.points = item.points.map(([x, y]) => [item.x + (x - item.x) * value / oldWidth, y]);
        if (item.planPoints) item.planPoints = item.planPoints.map(([x, y]) => [item.x + (x - item.x) * value / oldWidth, y]);
        item.w = value;
      }
      if (id === "roomDepth") {
        const oldDepth = Math.max(.001, item.d);
        if (item.points) item.points = item.points.map(([x, y]) => [x, item.y + (y - item.y) * value / oldDepth]);
        if (item.planPoints) item.planPoints = item.planPoints.map(([x, y]) => [x, item.y + (y - item.y) * value / oldDepth]);
        item.d = value;
      }
      if (id === "roomHeight" && selected.type !== "zone") {
        if (selected.type === "prop" && ["floor", "floorPolygon"].includes(item.kind)) item.elevation = value;
        else item.height = value;
      }
      if (selected.type === "prop" && !(["platformPolygon", "floorPolygon", "wallPolygon"].includes(item.kind) ? polygonIsInsideSpace(item.points || []) : rectIsInsideSpace(item))) {
        state = JSON.parse(before);
        showToast("That size would extend outside the room");
        refresh();
        return;
      }
      if (selected.type === "zone" && !rectIsInsideSpace(item)) {
        state = JSON.parse(before);
        showToast("That size would extend outside the room");
        refresh();
        return;
      }
      commit(before);
    });
  });

  $("#materialSelect").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || !["room", "prop"].includes(selected.type)) return;
    const before = snapshot();
    setSurfaceTexture(item,selected.type,event.target.value);
    commit(before);
  });

  $("#surfaceTargetSelect").addEventListener("change", (event) => { surfaceTarget=event.target.value; updateInspector(); drawPreview(); });
  $("#textureMappingMode").addEventListener("change",(event)=>{
    const item=selectedItem();if(!item||!["room","prop"].includes(selected?.type))return;
    const before=snapshot(),uv=surfaceUvFor(item,selected.type,surfaceTarget,true);uv.mode=event.target.value==="fit"?"fit":"tile";
    if(uv.mode==="tile")uv.scaleX=uv.scaleY=1;
    setSurfaceUv(item,selected.type,surfaceTarget,uv);previewPatterns.clear();commit(before);
    showToast(uv.mode==="fit"?"Image fitted once across the complete face":"Texture repetition enabled");
  });
  ["textureShiftX","textureShiftY","textureRotation","textureScaleX","textureScaleY"].forEach((id) => {
    $(`#${id}`).addEventListener("change", (event) => {
      const item=selectedItem(); if(!item||!["room","prop"].includes(selected?.type)) return;
      const before=snapshot(),uv=surfaceUvFor(item,selected.type,surfaceTarget,true);
      const key={textureShiftX:"shiftX",textureShiftY:"shiftY",textureRotation:"rotation",textureScaleX:"scaleX",textureScaleY:"scaleY"}[id];
      uv[key]=key.startsWith("scale")?Math.max(.05,Number(event.target.value)||1):Number(event.target.value)||0;
      if(key.startsWith("scale"))uv.mode="tile";
      setSurfaceUv(item,selected.type,surfaceTarget,uv);
      previewPatterns.clear(); commit(before);
    });
  });
  $("#resetTextureAlignment").addEventListener("click",()=>{
    const item=selectedItem(); if(!item||!["room","prop"].includes(selected?.type)) return; const before=snapshot();
    const uv=normalizedUv();
    setSurfaceUv(item,selected.type,surfaceTarget,uv);
    previewPatterns.clear(); commit(before); showToast("Texture alignment reset");
  });
  $("#fitTextureSurface").addEventListener("click",()=>{const item=selectedItem();if(!item||!["room","prop"].includes(selected?.type))return;const before=snapshot(),uv=surfaceUvFor(item,selected.type,surfaceTarget,true);uv.mode="fit";setSurfaceUv(item,selected.type,surfaceTarget,uv);previewPatterns.clear();commit(before);showToast("Image fitted once to the complete face");});
  $("#textureLock").checked=textureLock;$("#textureLock").addEventListener("change",(event)=>{textureLock=event.target.checked;localStorage.setItem("blockout-texture-lock",textureLock?"on":"off");showToast(textureLock?"Texture world lock enabled":"Textures now move with geometry");});
  $("#sampleMaterialButton").addEventListener("click",()=>setTool("eyedropper"));
  $("#paintMaterialButton").addEventListener("click",()=>{if(!sampledMaterial){showToast("Use the eyedropper first");setTool("eyedropper");}else setTool("paint");});

  $("#floorMaterialSelect").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "room") return;
    const before = snapshot();
    setSurfaceTexture(item,"room",event.target.value,"floor");
    commit(before);
    updateMaterialPreview(item.floorTexture);
  });

  $("#roomFloorElevation").addEventListener("change", (event) => {
    const room = selectedItem();
    if (!room || selected.type !== "room") return;
    const before = snapshot();
    const oldLevel = roomFloor(room);
    const nextLevel = Math.max(-8, Math.min(16, Number(event.target.value) || 0));
    const delta = nextLevel - oldLevel;
    room.floorLevel = nextLevel;
    room.elevation = Math.round(nextLevel / .75);
    state.props.forEach((prop) => {
      const centerX = prop.x + prop.w / 2, centerY = prop.y + prop.d / 2;
      if (!pointInRoom(centerX, centerY, room)) return;
      if (["floor", "floorPolygon"].includes(prop.kind)) prop.elevation = (Number(prop.elevation) || 0) + delta;
      else prop.floorLevel = (prop.floorLevel == null ? oldLevel : Number(prop.floorLevel)) + delta;
    });
    commit(before);
    showToast(`Room floor moved to Z ${Math.round(nextLevel * GRID)}`);
  });

  $("#floorThickness").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "prop" || !["floor", "floorPolygon"].includes(item.kind)) return;
    const before = snapshot();
    item.thickness = Math.max(.125, Math.min(2, Number(event.target.value) || .25));
    commit(before);
  });

  $("#ceilingMaterialSelect").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "room") return;
    const before = snapshot();
    setSurfaceTexture(item,"room",event.target.value,"ceiling");
    commit(before);
    updateMaterialPreview(item.ceilingTexture);
  });

  $("#ceilingModeSelect").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "room") return;
    const before = snapshot();
    item.ceilingMode = event.target.value;
    commit(before);
    showToast(item.ceilingMode === "sky" ? "Open sky enabled — export remains safely sealed" : "Solid ceiling enabled");
  });

  $("#roomRoofEnabled").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "room") return;
    const before = snapshot();
    item.ceilingMode = event.target.checked ? "ceiling" : "sky";
    $("#ceilingModeSelect").value = item.ceilingMode;
    commit(before);
    showToast(event.target.checked ? "Solid roof enabled" : "Roof removed · room opens to the selected sky");
  });

  $("#rampSteepnessSelect").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "prop" || item.kind !== "ramp" || event.target.value === "custom") return;
    const before = snapshot();
    item.height = Math.max(.25, Math.round(structureRun(item) * Number(event.target.value) * 4) / 4);
    commit(before);
    showToast(`Ramp set to ${event.target.selectedOptions[0].textContent}`);
  });

  $("#stairSteps").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "prop" || item.kind !== "stairs") return;
    const before = snapshot();
    item.steps = Math.max(1, Math.min(32, Math.round(Number(event.target.value) || recommendedStairSteps(item))));
    commit(before);
  });

  $("#directionSelect").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "prop" || !["stairs", "ramp", "ladder"].includes(item.kind)) return;
    const before = snapshot();
    item.direction = event.target.value;
    commit(before);
  });

  $("#spawnAngleSelect").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "entity" || !["ct", "t"].includes(item.kind)) return;
    const before = snapshot();
    item.angle = Number(event.target.value) || 0;
    commit(before);
    showToast("Spawn facing updated");
  });

  $("#lightHeight").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "entity" || !["light","spotlight"].includes(item.kind)) return;
    const before = snapshot();
    item.z = Math.max(Number(event.target.min), Math.min(Number(event.target.max), Number(event.target.value) || 2.5));
    commit(before);
  });

  $("#lightBrightness").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "entity" || !["light","spotlight"].includes(item.kind)) return;
    const before = snapshot();
    item.brightness = Math.max(50, Math.min(1000, Math.round(Number(event.target.value) || 300)));
    commit(before);
  });

  $("#lightColor").addEventListener("focus", () => { lightColorBefore = snapshot(); });
  $("#lightColor").addEventListener("input", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "entity" || !["light","spotlight"].includes(item.kind)) return;
    item.color = event.target.value;
    drawEditor(); drawPreview();
  });
  $("#lightColor").addEventListener("change", () => {
    if (lightColorBefore) commit(lightColorBefore);
    lightColorBefore = null;
  });
  $("#lightRadius").addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="entity"||!["light","spotlight"].includes(item.kind))return;const before=snapshot();item.radius=Math.max(64,Math.min(2048,Number(event.target.value)||512));commit(before);});
  $("#lightStyle").addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="entity"||!["light","spotlight"].includes(item.kind))return;const before=snapshot();item.style=event.target.value;commit(before);});
  $("#lightTarget").addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="entity"||!["light","spotlight"].includes(item.kind))return;const before=snapshot();item.target=event.target.value.trim();commit(before);});
  [["spotlightAngle","angle"],["spotlightCone","cone"],["spotlightPitch","pitch"]].forEach(([id,key])=>$("#"+id).addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="entity"||item.kind!=="spotlight")return;const before=snapshot();item[key]=Number(event.target.value)||0;commit(before);}));
  [["logicName","targetName"],["logicTarget","target"],["logicSpeed","speed"],["logicWait","wait"]].forEach(([id,key])=>$("#"+id).addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="prop"||!["elevator","rotatingDoor","train"].includes(item.kind))return;const before=snapshot();item[key]=["speed","wait"].includes(key)?Number(event.target.value):event.target.value.trim();commit(before);}));

  $("#doorModeSelect").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "door") return;
    const before = snapshot();
    item.mode = event.target.value;
    openWalkDoors.delete(item.id);
    commit(before);
    showToast(item.mode === "sliding" ? "Sliding door enabled — press E in Walkthrough" : "Changed to an open passage");
  });

  $("#doorWidth").addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="door")return;const before=snapshot();resizeOpening(item,Math.max(.5,Math.min(8,Number(event.target.value)||1)));commit(before);});
  $("#doorHeight").addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="door")return;const before=snapshot(),rooms=adjacentRoomsForOpening(item),max=rooms.length?Math.min(...rooms.map((room)=>room.height))-.25:8;item.height=Math.max(1,Math.min(max,Number(event.target.value)||2));commit(before);});

  $("#doorSpeed").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "door") return;
    const before = snapshot();
    item.speed = Math.max(25, Math.min(500, Math.round(Number(event.target.value) || 100)));
    commit(before);
  });

  $("#doorMaterialSelect").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "door") return;
    const before = snapshot();
    item.texture = event.target.value;
    commit(before);
    updateMaterialPreview(item.texture);
  });

  $("#windowModeSelect").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "window") return;
    const before = snapshot();
    item.mode = event.target.value;
    brokenWalkWindows.delete(item.id);
    commit(before);
    showToast(item.mode === "breakable" ? "Breakable glass enabled" : item.mode === "glass" ? "Unbreakable glass enabled" : "Open window frame enabled");
  });

  $("#windowWidth").addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="window")return;const before=snapshot();resizeOpening(item,Math.max(.5,Math.min(8,Number(event.target.value)||1)));commit(before);});

  [["entityTarget","target"],["entitySound","sound"],["entityDecal","decal"]].forEach(([id,key])=>$("#"+id).addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="entity")return;const before=snapshot();if(id==="entityTarget"&&item.kind==="pathCorner")item.targetName=event.target.value.trim();else item[key]=event.target.value.trim();commit(before);}));
  $("#entityNext").addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="entity"||item.kind!=="pathCorner")return;const before=snapshot();item.target=event.target.value.trim();commit(before);});
  $("#entityVolume").addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="entity"||item.kind!=="ambient")return;const before=snapshot();item.volume=Math.max(0,Math.min(10,Number(event.target.value)||0));commit(before);});
  $("#zoneDamage").addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="zone"||item.kind!=="triggerHurt")return;const before=snapshot();item.damage=Math.max(1,Math.min(1000,Number(event.target.value)||25));commit(before);});
  $("#zoneTarget").addEventListener("change",(event)=>{const item=selectedItem();if(!item||selected?.type!=="zone"||item.kind!=="teleport")return;const before=snapshot();item.target=event.target.value.trim()||"tele_dest_1";commit(before);});

  ["windowSill", "windowHeight"].forEach((id) => {
    $(`#${id}`).addEventListener("change", (event) => {
      const item = selectedItem();
      if (!item || selected.type !== "window") return;
      const before = snapshot();
      if (id === "windowSill") item.sill = Number(event.target.value) || .75;
      else item.height = Number(event.target.value) || 1.5;
      clampWindowDimensions(item);
      commit(before);
    });
  });

  $("#windowHealth").addEventListener("change", (event) => {
    const item = selectedItem();
    if (!item || selected.type !== "window") return;
    const before = snapshot();
    item.health = Math.max(1, Math.min(500, Math.round(Number(event.target.value) || 20)));
    commit(before);
  });

  window.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();$("#toolSearch").focus();$("#toolSearch").select();return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();event.shiftKey?downloadProjectFile():saveProjectNow();return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault(); event.shiftKey ? redo() : undo(); return;
    }
    if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault(); duplicateSelected(); return;
    }
    if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
      event.preventDefault(); copySelected(); return;
    }
    if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
      event.preventDefault(); pasteCopied(); return;
    }
    if (!typing && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
      event.preventDefault(); event.shiftKey ? ungroupSelected() : groupSelected(); return;
    }
    if (typing) return;
    if (["polygon", "polyPlatform", "polyFloor", "polyWall"].includes(activeTool)) {
      if (event.key === "Enter") { event.preventDefault(); finishPolygonDraft(); return; }
      if (event.key === "Backspace") { event.preventDefault(); polygonDraft.pop(); drawEditor(); return; }
      if (event.key === "Escape") { event.preventDefault(); cancelPolygonDraft(); return; }
    }
    if (editingVertices && event.key === "Escape") {
      event.preventDefault(); editingVertices = false; selectedVertexIndex = -1; refresh(); return;
    }
    if (event.code === "Space" && previewMode !== "walk") {
      event.preventDefault();
      if (!event.repeat && toolBeforeSpace === null) {
        toolBeforeSpace = activeTool;
        setTool("pan");
      }
      return;
    }
    if (previewMode === "walk" && event.key.toLowerCase() === "e") {
      event.preventDefault(); toggleNearestWalkDoor(); return;
    }
    if (previewMode === "walk" && ["w", "a", "s", "d", "arrowleft", "arrowright", "control", "c"].includes(event.key.toLowerCase())) {
      pressedKeys.add(event.key.toLowerCase()); event.preventDefault(); return;
    }
    if (event.key.toLowerCase() === "r") setTool("room");
    if (event.key.toLowerCase() === "n") setTool("polygon");
    if (event.key.toLowerCase() === "o") setTool("octagon");
    if (event.key.toLowerCase() === "c") setTool("corridor");
    if (event.key.toLowerCase() === "d") setTool("door");
    if (event.key.toLowerCase() === "x") setTool("window");
    if (event.key.toLowerCase() === "v") setTool("select");
    if (event.key.toLowerCase() === "u") setTool("ruler");
    if (event.key.toLowerCase() === "w") setTool("wall");
    if (event.key.toLowerCase() === "h") setTool("platform");
    if (event.key.toLowerCase() === "j") setTool("polyPlatform");
    if (event.key.toLowerCase() === "b") setTool("floor");
    if (event.key.toLowerCase() === "m") setTool("polyFloor");
    if (event.key.toLowerCase() === "g") setTool("ladder");
    if (event.key.toLowerCase() === "k") setTool("crate");
    if (event.key.toLowerCase() === "s") setTool("stairs");
    if (event.key.toLowerCase() === "p") setTool("ramp");
    if (event.key.toLowerCase() === "l") setTool("light");
    if (event.key.toLowerCase() === "q") rotateSelected(false);
    if (event.key.toLowerCase() === "e") rotateSelected(true);
    if (event.key.toLowerCase() === "f") reverseSelected();
    if (event.key === "Delete" || event.key === "Backspace") deleteSelected();
    if (event.key === "Escape") { drawing = null; moving = null; panning = null; marquee=null; measurement=null; selected = null; selection=[]; refresh(); }
  });

  window.addEventListener("keyup", (event) => {
    pressedKeys.delete(event.key.toLowerCase());
    if (event.code === "Space" && toolBeforeSpace !== null) {
      const previousTool = toolBeforeSpace;
      toolBeforeSpace = null;
      panning = null;
      setTool(previousTool);
    }
  });
  window.addEventListener("blur", () => {
    pressedKeys.clear();
    if (toolBeforeSpace !== null) {
      const previousTool = toolBeforeSpace;
      toolBeforeSpace = null;
      panning = null;
      setTool(previousTool);
    }
  });

  function animate(time) {
    const delta = Math.min(.05, (time - lastFrame) / 1000);
    lastFrame = time;
    if (previewMode === "walk") {
      const turn = (pressedKeys.has("arrowright") ? 1 : 0) - (pressedKeys.has("arrowleft") ? 1 : 0);
      player.angle += turn * delta * 2.1;
      const forward = (pressedKeys.has("w") ? 1 : 0) - (pressedKeys.has("s") ? 1 : 0);
      const strafe = (pressedKeys.has("d") ? 1 : 0) - (pressedKeys.has("a") ? 1 : 0);
      const speed = delta * 2.5;
      const move = {
        x: (Math.cos(player.angle) * forward + Math.cos(player.angle + Math.PI / 2) * strafe) * speed,
        y: (Math.sin(player.angle) * forward + Math.sin(player.angle + Math.PI / 2) * strafe) * speed
      };
      if (move.x || move.y) {
        const nextX = { x: player.x + move.x, y: player.y };
        if (!moveIsBlocked(player, nextX)) player.x = nextX.x;
        const nextY = { x: player.x, y: player.y + move.y };
        if (!moveIsBlocked(player, nextY)) player.y = nextY.y;
        player.z = walkSurfaceHeightAt(player.x, player.y);
      }
      if(routeRecording&&time-lastRouteSampleAt>=150){const previous=recordedRoute.at(-1);if(!previous||Math.hypot(player.x-previous.x,player.y-previous.y)>.04||Math.abs(player.z-previous.z)>.04)recordedRoute.push({x:player.x,y:player.y,z:player.z,time:time-routeStartedAt});lastRouteSampleAt=time;}
      drawPreview();
    }
    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", () => { drawEditor(); drawPreview(); });
  $("#welcomeDialog").addEventListener("close", () => {
    if ($("#dontShowAgain").checked) localStorage.setItem("blockout-welcome-seen", "yes");
  });

  renderRecentTools();
  filterSidebarTools();
  setRightPanel(rightPanel);
  requestAnimationFrame(() => {
    fitView(); refresh();
    refreshCompanionStatus();
    refreshTextureCatalog();
    if (starterLoaded) showToast("Starter map created — explore it in Walk mode");
    if (!localStorage.getItem("blockout-welcome-seen") && !state.rooms.length) $("#welcomeDialog").showModal();
  });
  window.Blockout = Object.freeze({
    getProject: () => structuredClone(state),
    getProjectDocument: () => JSON.parse(projectDocument()),
    importProjectDocument: (document) => importProjectDocument(document),
    saveProjectNow: () => saveProjectNow({announce:false}),
    createProjectVersion: (name) => structuredClone(createNamedSnapshot(name)),
    getProjectVersions: () => projectSnapshots.map((entry)=>({id:entry.id,name:entry.name,createdAt:entry.createdAt,size:entry.project?.length||0})),
    getViewState: () => ({ cellSize, viewOffset: { ...viewOffset }, activeTool }),
    getPreviewView: () => ({ angle: previewAngle, zoom: previewZoom, pan: { ...previewPan }, panMode: previewPanMode, mode: previewMode }),
    getSelectionState: () => ({ primary:selected ? {...selected}:null, refs:selection.map((ref)=>({...ref})), entries:selectedEntries().map(({ref,item})=>({ref:{...ref},locked:isItemLocked(item),hidden:isItemHidden(item),groupId:item.groupId||null,layerId:layerForItem(item).id})) }),
    getLayers: () => structuredClone(ensureLayers()),
    getEditorSettings: () => ({ snapUnits, effectiveSnapUnits:Math.round(snapStep()*GRID), adaptiveGridEnabled, objectSnapEnabled, smartConnectionsEnabled, measurement:measurement ? structuredClone(measurement):null, sampledMaterial, surfaceTarget }),
    getPreviewPickRegions: () => previewPickRegions.map((region)=>({ref:{...region.ref},points:region.points.map((point)=>({...point}))})),
    getTransformState: () => ({ plan:transformHandlesForSelection().map((handle)=>({...handle})), preview:previewTransformHandle?structuredClone(previewTransformHandle):null }),
    getElevationState: () => ({ axis:elevationAxis, hitRegions:elevationHitRegions.map((region)=>structuredClone(region)) }),
    getPreflight: () => structuredClone(calculatePreflight()),
    getOpeningSegment: (id) => { const opening=[...state.doors,...state.windows].find((item)=>item.id===id);return opening?openingSegment(opening):null; },
    getWalkPlayer: () => ({ ...player }),
    getWalkSurfaceHeight: (x, y) => walkSurfaceHeightAt(x, y),
    getOpenWalkDoors: () => [...openWalkDoors],
    getBrokenWalkWindows: () => [...brokenWalkWindows],
    getCustomPrefabs: () => structuredClone(customPrefabs),
    getPrefabPlacement: () => ({activePrefabId,rotation:customPrefabRotation,mirrored:customPrefabMirrored}),
    prepareBlueprintImage: (file) => prepareBlueprintImport(file),
    analyzeBlueprint: () => {analyzeBlueprintImage();return window.Blockout.getBlueprintState();},
    getBlueprintState: () => pendingBlueprint ? {
      fileName:pendingBlueprint.fileName,
      imageWidth:pendingBlueprint.image?.naturalWidth||0,
      imageHeight:pendingBlueprint.image?.naturalHeight||0,
      analysis:pendingBlueprint.analysis ? {
        gridWidth:pendingBlueprint.analysis.gridWidth,gridHeight:pendingBlueprint.analysis.gridHeight,
        widthMeters:pendingBlueprint.analysis.widthMeters,rooms:pendingBlueprint.analysis.rooms.length,
        connectors:pendingBlueprint.analysis.connectorCount,openings:pendingBlueprint.analysis.openings.length,
        props:pendingBlueprint.analysis.props.length,entities:pendingBlueprint.analysis.entities.length,
        zones:pendingBlueprint.analysis.zones.length,levels:pendingBlueprint.analysis.levelCount,
        confidence:pendingBlueprint.analysis.confidence,coverage:pendingBlueprint.analysis.coverage,
        materials:pendingBlueprint.analysis.materials.map((material)=>({role:material.role,code:material.code,label:material.label,category:material.category,uses:[...material.uses],imageBytes:material.imageData.length}))
      } : null
    } : null,
    createMapFromBlueprint: () => createMapFromBlueprint(),
    prepareTextureImage: (file) => prepareTextureImport(file),
    getTextureAlchemyState: () => ({
      active:!!pendingTextureImport,
      fileName:pendingTextureImport?.fileName||"",
      edgeMismatch:pendingTextureImport?.edgeMismatch??null,
      imageDataBytes:pendingTextureImport?.imageData?.length||0,
      category:$("#textureImportCategory")?.value||"",
      uses:selectedImportedTextureUses(),
      code:$("#textureImportName")?.value||"",
      variants:[
        {kind:"base",code:$("#textureImportName")?.value||"",enabled:!!pendingTextureImport},
        {kind:"dark",code:textureFamilyCode($("#textureImportName")?.value||"","_D"),enabled:!!$("#textureVariantDark")?.checked},
        {kind:"light",code:textureFamilyCode($("#textureImportName")?.value||"","_L"),enabled:!!$("#textureVariantLight")?.checked},
        {kind:"weathered",code:textureFamilyCode($("#textureImportName")?.value||"","_W"),enabled:!!$("#textureVariantWorn")?.checked}
      ]
    }),
    getTextureCatalog: () => Object.keys(MATERIAL_INFO).map((texture)=>({texture,label:MATERIAL_INFO[texture],category:textureCategory(texture),uses:textureSurfaceUses(texture),official:officialTextureSources.get(texture)||null})),
    installOfficialTextureCatalog: (catalog) => installOfficialTextureCatalog(catalog),
    installMapTextureCatalog: (catalog) => installMapTextureCatalog(catalog),
    generateMapText
  });
  requestAnimationFrame(animate);
})();
