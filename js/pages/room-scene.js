// js/pages/room-scene.js
// Neon Room – render sceny pokoju 2D (pseudo-3D) + drag + edycja + focus highlight
// Wymaga: js/core/room-api.js (ArcadeRoom), js/core/progress.js, js/core/ui.js

(function () {
  "use strict";

  // DOM
  let sceneEl = null;                 // #room-scene (warstwa obiektów)
  let sceneWrapperEl = null;          // .room2d-scene-wrapper (dla klas stylu)
  let btnEdit = null;                 // #room-btn-edit
  let btnSave = null;                 // #room-btn-save
  let btnShop = null;                 // #room-btn-open-shop

  // Stan
  let roomState = null;               // { instances, roomStyleId, ... }
  let editMode = false;

  // Definicje itemów (cache)
  const itemDefs = new Map();         // itemId -> def

  // Drag
  let drag = {
    active: false,
    instanceId: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    startInstX: 0,
    startInstY: 0,
    moved: false
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    sceneEl = document.getElementById("room-scene");
    sceneWrapperEl = document.querySelector(".room2d-scene-wrapper");

    btnEdit = document.getElementById("room-btn-edit");
    btnSave = document.getElementById("room-btn-save");
    btnShop = document.getElementById("room-btn-open-shop");

    if (!sceneEl || !sceneWrapperEl) {
      console.error("[RoomScene] Brak #room-scene lub .room2d-scene-wrapper");
      return;
    }

    // Back button do arcade (jeśli chcesz)
    if (window.ArcadeUI && typeof ArcadeUI.addBackToArcadeButton === "function") {
      ArcadeUI.addBackToArcadeButton({ backUrl: "arcade.html" });
    }

    // Buttony
    btnEdit?.addEventListener("click", toggleEditMode);
    btnSave?.addEventListener("click", saveRoom);
    btnShop?.addEventListener("click", () => (window.location.href = "room-shop.html"));

    // Ładuj stan + render
    await loadRoom();
    await renderAll();

    // Focus highlight, jeśli przyszliśmy ze sklepu
    const focusId = getQueryParam("focus");
    if (focusId) {
      setTimeout(() => focusInstance(focusId), 30);
    }

    // Re-render przy zmianie rozmiaru (żeby trzymać pozycje)
    window.addEventListener("resize", () => {
      // nie przeliczamy stanu, tylko przerysowujemy
      renderInstances();
    });
  }

  // ------------------------------------
  // Helpers
  // ------------------------------------

  function getQueryParam(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function clamp01(v) {
    return clamp(v, 0, 1);
  }

  function url(path) {
    return new URL(path, document.baseURI).toString();
  }

  async function fetchJson(path) {
    const res = await fetch(url(path), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url(path)}`);
    return await res.json();
  }

  // ------------------------------------
  // Room state
  // ------------------------------------

  async function loadRoom() {
    if (!window.ArcadeRoom || typeof ArcadeRoom.loadRoomState !== "function") {
      console.error("[RoomScene] Brak ArcadeRoom.loadRoomState (sprawdź js/core/room-api.js)");
      roomState = { instances: [], roomStyleId: null, unlockedItemTypes: {} };
      return;
    }

    roomState = await ArcadeRoom.loadRoomState();
    roomState.instances = roomState.instances || [];
  }

  async function saveRoom() {
    if (!window.ArcadeRoom || typeof ArcadeRoom.saveRoomState !== "function") return;
    await ArcadeRoom.saveRoomState(roomState);
  }

  // ------------------------------------
  // Item defs
  // ------------------------------------

  async function getItemDef(itemId) {
    if (itemDefs.has(itemId)) return itemDefs.get(itemId);

    const def = await fetchJson(`data/items/${itemId}.json`);

    if (!def.art) def.art = {};

    // domyślny svg dla normalnych obiektów (nie dotyczy stylu)
    if (def.kind !== "room_style" && !def.art.svg) {
      def.art.svg = `assets/room/${itemId}.svg`;
    }

    itemDefs.set(itemId, def);
    return def;
  }

  // ------------------------------------
  // Render
  // ------------------------------------

  async function renderAll() {
    await applyRoomStyle();
    await prefetchDefsForInstances();
    renderInstances();
  }

  async function applyRoomStyle() {
    // zdejmij wszystkie klasy "room-style-*"
    const classes = [...sceneWrapperEl.classList];
    for (const c of classes) {
      if (c.startsWith("room-style-")) sceneWrapperEl.classList.remove(c);
    }

    if (!roomState.roomStyleId) return;

    try {
      const styleDef = await getItemDef(roomState.roomStyleId);
      const className = styleDef?.style?.className;

      if (className) {
        sceneWrapperEl.classList.add(className);
      }
    } catch (e) {
      console.warn("[RoomScene] Nie udało się załadować stylu pokoju:", e);
    }
  }

  async function prefetchDefsForInstances() {
    const ids = new Set();
    for (const inst of (roomState.instances || [])) ids.add(inst.itemId);

    // równolegle
    await Promise.allSettled([...ids].map((id) => getItemDef(id)));
  }

  function renderInstances() {
    sceneEl.innerHTML = "";

    // sortujemy dla pseudo-3D: floor/surface wg y (im niżej, tym wyżej na warstwie)
    const instances = [...(roomState.instances || [])];

    instances.sort((a, b) => {
      const za = zOrder(a);
      const zb = zOrder(b);
      return za - zb;
    });

    for (const inst of instances) {
      const def = itemDefs.get(inst.itemId);
      if (!def) continue;

      // nie renderujemy stylów jako obiekty
      if (def.kind === "room_style") continue;

      const el = createInstanceElement(inst, def);
      sceneEl.appendChild(el);
    }
  }

  function zOrder(inst) {
    const att = inst.attachment || "floor";
    if (att === "ceiling") return 10;          // zawsze "z tyłu"
    if (att === "wall") return 200;            // na ścianie (średnio)
    if (att === "surface") return 700 + Math.round((inst.y || 0.5) * 200);
    // floor
    return 800 + Math.round((inst.y || 0.5) * 200);
  }

  function createInstanceElement(inst, def) {
    const el = document.createElement("div");
    el.className = "room2d-object";

    const attachment = inst.attachment || def?.art?.anchor?.attachment || "floor";
    el.classList.add(`room2d-object--${attachment}`);

    // tryb edycji – outline
    if (editMode) el.classList.add("room2d-object--editable");

    // id instancji (dla focus i dla usuwania)
    el.dataset.instanceId = inst.instanceId;

    // rozmiar w % sceny
    const size = computeSize(def, attachment);
    el.style.width = `${size.w * 100}%`;
    el.style.height = `${size.h * 100}%`;

    // pozycja (x,y to 0..1)
    const pos = clampPos(inst.x ?? 0.5, inst.y ?? defaultYForAttachment(attachment), attachment);
    el.style.left = `${pos.x * 100}%`;
    el.style.top = `${pos.y * 100}%`;
    el.style.transform = `translate(-50%, -100%) rotate(${inst.rotation || 0}deg)`;

    // warstwa
    el.style.zIndex = String(zOrder(inst));

    // obrazek
    const img = document.createElement("img");
    img.className = "room2d-object-img";
    img.alt = def.name || def.id || inst.itemId;
    img.draggable = false;

    if (def.art && def.art.svg) {
      img.src = def.art.svg;
    } else {
      // awaryjnie
      img.src = `assets/room/${inst.itemId}.svg`;
    }

    el.appendChild(img);

    // interakcje
    el.addEventListener("pointerdown", (ev) => onPointerDown(ev, inst.instanceId));
    el.addEventListener("click", (ev) => onInstanceClick(ev, inst.instanceId));

    return el;
  }

  function computeSize(def, attachment) {
    // Jeśli item JSON ma sizeRel: { w:0.18, h:0.2 } to użyj.
    // Inaczej domyślne zależne od attachmentu.
    const sr = def.sizeRel || def.size || null;

    if (sr && typeof sr === "object" && typeof sr.w === "number" && typeof sr.h === "number") {
      return { w: clamp(sr.w, 0.05, 0.9), h: clamp(sr.h, 0.05, 0.9) };
    }

    if (attachment === "wall") return { w: 0.14, h: 0.22 };
    if (attachment === "ceiling") return { w: 0.10, h: 0.18 };
    if (attachment === "surface") return { w: 0.12, h: 0.18 };
    // floor
    return { w: 0.18, h: 0.22 };
  }

  function defaultYForAttachment(attachment) {
    if (attachment === "ceiling") return 0.18;
    if (attachment === "wall") return 0.42;
    if (attachment === "surface") return 0.62;
    return 0.90; // floor
  }

  function clampPos(x, y, attachment) {
    // zakresy dla "logiki pokoju"
    x = clamp01(x);
    y = clamp01(y);

    if (attachment === "ceiling") {
      return { x: clamp(x, 0.08, 0.92), y: clamp(y, 0.08, 0.22) };
    }
    if (attachment === "wall") {
      return { x: clamp(x, 0.10, 0.90), y: clamp(y, 0.18, 0.58) };
    }
    if (attachment === "surface") {
      return { x: clamp(x, 0.08, 0.92), y: clamp(y, 0.52, 0.78) };
    }
    // floor
    return { x: clamp(x, 0.06, 0.94), y: clamp(y, 0.62, 0.96) };
  }

  // ------------------------------------
  // Edit mode
  // ------------------------------------

  function toggleEditMode() {
    editMode = !editMode;
    if (btnEdit) btnEdit.classList.toggle("is-active", editMode);
    renderInstances();
  }

  async function onInstanceClick(ev, instanceId) {
    // click po drag'u ignorujemy
    if (drag.moved) return;

    if (!editMode) return;

    ev.preventDefault();
    ev.stopPropagation();

    const ok = confirm("Usunąć ten przedmiot z pokoju? (Będzie dalej dostępny jako kupiony w sklepie)");
    if (!ok) return;

    roomState.instances = (roomState.instances || []).filter((i) => i.instanceId !== instanceId);
    await saveRoom();
    renderInstances();
  }

  // ------------------------------------
  // Drag & Drop
  // ------------------------------------

  function onPointerDown(ev, instanceId) {
    ev.preventDefault();
    ev.stopPropagation();

    const el = ev.currentTarget;
    if (!el || !sceneEl) return;

    const inst = (roomState.instances || []).find((i) => i.instanceId === instanceId);
    if (!inst) return;

    drag.active = true;
    drag.instanceId = instanceId;
    drag.pointerId = ev.pointerId;
    drag.startX = ev.clientX;
    drag.startY = ev.clientY;
    drag.startInstX = inst.x ?? 0.5;
    drag.startInstY = inst.y ?? defaultYForAttachment(inst.attachment || "floor");
    drag.moved = false;

    el.setPointerCapture(ev.pointerId);

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(ev) {
    if (!drag.active || ev.pointerId !== drag.pointerId) return;

    const inst = (roomState.instances || []).find((i) => i.instanceId === drag.instanceId);
    if (!inst) return;

    const rect = sceneEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dx = ev.clientX - drag.startX;
    const dy = ev.clientY - drag.startY;

    // próg – żeby click nie traktował się jako drag
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;

    // przeliczamy na 0..1
    const nx = (ev.clientX - rect.left) / rect.width;
    const ny = (ev.clientY - rect.top) / rect.height;

    const attachment = inst.attachment || "floor";
    const pos = clampPos(nx, ny, attachment);

    inst.x = pos.x;
    inst.y = pos.y;

    // live update elementu
    const el = sceneEl.querySelector(`.room2d-object[data-instance-id="${CSS.escape(inst.instanceId)}"]`);
    if (el) {
      el.style.left = `${pos.x * 100}%`;
      el.style.top = `${pos.y * 100}%`;
      el.style.zIndex = String(zOrder(inst));
    }
  }

  async function onPointerUp(ev) {
    if (!drag.active || ev.pointerId !== drag.pointerId) return;

    const el = ev.currentTarget;
    try {
      el.releasePointerCapture(ev.pointerId);
    } catch (_) {}

    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerUp);

    drag.active = false;

    // zapis tylko jeśli rzeczywiście przesunęliśmy
    if (drag.moved) {
      await saveRoom();
      // po zapisie odśwież z-order sort (żeby elementy nie „wariowały”)
      renderInstances();
    }

    // reset moved po krótkiej chwili, żeby click po up nie usuwał
    setTimeout(() => {
      drag.moved = false;
      drag.instanceId = null;
      drag.pointerId = null;
    }, 0);
  }

  // ------------------------------------
  // Focus highlight (room.html?focus=...)
  // ------------------------------------

  function focusInstance(instanceId) {
    if (!instanceId) return;

    const el = sceneEl.querySelector(`.room2d-object[data-instance-id="${CSS.escape(instanceId)}"]`);
    if (!el) return;

    el.classList.add("is-focus");

    // delikatnie przenieś na wierzch na czas focus
    const oldZ = el.style.zIndex;
    el.style.zIndex = "9999";

    setTimeout(() => {
      el.classList.remove("is-focus");
      el.style.zIndex = oldZ;
    }, 3000);
  }
})();
