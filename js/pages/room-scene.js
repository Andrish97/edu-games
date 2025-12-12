// js/pages/room-scene.js
// Neon Room – scena pokoju 2D pseudo-3D + EDIT (drag, usuń) + focus

(function () {
  "use strict";

  let sceneEl = null;
  let wrapperEl = null;

  let btnEdit = null;
  let btnSave = null;
  let btnShop = null;

  let roomState = null;
  let editMode = false;

  const defsCache = new Map();

  const drag = {
    active: false,
    pointerId: null,
    instanceId: null,
    moved: false
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    sceneEl = document.getElementById("room-scene");
    wrapperEl = document.querySelector(".room2d-scene-wrapper");

    btnEdit = document.getElementById("room-btn-edit");
    btnSave = document.getElementById("room-btn-save");
    btnShop = document.getElementById("room-btn-open-shop");

    if (!sceneEl || !wrapperEl) {
      console.error("[RoomScene] Brak #room-scene lub .room2d-scene-wrapper");
      return;
    }

    btnEdit?.addEventListener("click", () => setEditMode(!editMode));
    btnSave?.addEventListener("click", saveRoom);
    btnShop?.addEventListener("click", () => (window.location.href = "room-shop.html"));

    if (window.ArcadeUI?.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({ backUrl: "arcade.html" });
    }

    await loadRoom();
    await applyRoomStyle();
    await prefetchDefs();
    renderInstances();

    const focusId = getQueryParam("focus");
    if (focusId) setTimeout(() => focusInstance(focusId), 30);

    window.addEventListener("resize", () => renderInstances());
  }

  function getQueryParam(name) {
    return new URL(window.location.href).searchParams.get(name);
  }

  function url(path) {
    return new URL(path, document.baseURI).toString();
  }

  async function fetchJson(path) {
    const res = await fetch(url(path), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url(path)}`);
    return await res.json();
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function clamp01(v) { return clamp(v, 0, 1); }

  async function loadRoom() {
    if (!window.ArcadeRoom?.loadRoomState) {
      console.error("[RoomScene] Brak ArcadeRoom.loadRoomState – sprawdź js/core/room-api.js");
      roomState = { instances: [], roomStyleId: null, unlockedItemTypes: {} };
      return;
    }
    roomState = await ArcadeRoom.loadRoomState();
    roomState.instances ||= [];
  }

  async function saveRoom() {
    if (!window.ArcadeRoom?.saveRoomState) return;
    await ArcadeRoom.saveRoomState(roomState);
  }

  async function getDef(itemId) {
    if (defsCache.has(itemId)) return defsCache.get(itemId);
    const def = await fetchJson(`data/items/${itemId}.json`);
    def.art ||= {};
    if (def.kind !== "room_style" && !def.art.svg) def.art.svg = `assets/room/${itemId}.svg`;
    defsCache.set(itemId, def);
    return def;
  }

  async function prefetchDefs() {
    const ids = new Set(roomState.instances.map(i => i.itemId));
    await Promise.allSettled([...ids].map(getDef));
  }

  async function applyRoomStyle() {
    // usuń stare room-style-*
    [...wrapperEl.classList].forEach(c => { if (c.startsWith("room-style-")) wrapperEl.classList.remove(c); });

    if (!roomState.roomStyleId) return;

    try {
      const styleDef = await getDef(roomState.roomStyleId);
      const cn = styleDef?.style?.className;
      if (cn) wrapperEl.classList.add(cn);
    } catch (e) {
      console.warn("[RoomScene] styl nie wczytany:", e);
    }
  }

  function setEditMode(on) {
    editMode = !!on;
    btnEdit?.classList.toggle("is-active", editMode);
    renderInstances();
  }

  function renderInstances() {
    sceneEl.innerHTML = "";

    const list = [...roomState.instances];

    // sort: floor/surface zależnie od y (pseudo 3D)
    list.sort((a, b) => zOrder(a) - zOrder(b));

    for (const inst of list) {
      const def = defsCache.get(inst.itemId);
      if (!def) continue;
      if (def.kind === "room_style") continue;

      const el = createEl(inst, def);
      sceneEl.appendChild(el);
    }
  }

  function zOrder(inst) {
    const a = inst.attachment || "floor";
    if (a === "ceiling") return 10;
    if (a === "wall") return 200 + Math.round((inst.x || 0.5) * 50);
    if (a === "surface") return 650 + Math.round((inst.y || 0.6) * 200);
    return 800 + Math.round((inst.y || 0.9) * 200);
  }

  function defaultY(att) {
    if (att === "ceiling") return 0.18;
    if (att === "wall") return 0.42;
    if (att === "surface") return 0.65;
    return 0.90;
  }

  function clampPos(x, y, att) {
    x = clamp01(x);
    y = clamp01(y);

    if (att === "ceiling") return { x: clamp(x, 0.12, 0.88), y: clamp(y, 0.08, 0.22) };
    if (att === "wall") return { x: clamp(x, 0.12, 0.88), y: clamp(y, 0.18, 0.58) };
    if (att === "surface") return { x: clamp(x, 0.10, 0.90), y: clamp(y, 0.52, 0.80) };
    return { x: clamp(x, 0.08, 0.92), y: clamp(y, 0.64, 0.96) };
  }

  function sizeRel(def, att) {
    const s = def.sizeRel || def.size;
    if (s && typeof s.w === "number" && typeof s.h === "number") {
      return { w: clamp(s.w, 0.06, 0.7), h: clamp(s.h, 0.06, 0.7) };
    }
    if (att === "wall") return { w: 0.14, h: 0.22 };
    if (att === "ceiling") return { w: 0.10, h: 0.18 };
    if (att === "surface") return { w: 0.14, h: 0.20 };
    return { w: 0.18, h: 0.24 };
  }

  function anchorTransform(att, rotationDeg) {
    // wall: kotwica bliżej środka (nie -100% wysokości)
    if (att === "wall") return `translate(-50%, -70%) rotate(${rotationDeg}deg)`;
    if (att === "ceiling") return `translate(-50%, -20%) rotate(${rotationDeg}deg)`;
    // floor/surface – klasycznie stoi na podłodze/blacie
    return `translate(-50%, -100%) rotate(${rotationDeg}deg)`;
  }

  function createEl(inst, def) {
    const att = inst.attachment || def?.art?.anchor?.attachment || "floor";
    const pos = clampPos(inst.x ?? 0.5, inst.y ?? defaultY(att), att);
    inst.x = pos.x;
    inst.y = pos.y;
    inst.attachment = att;

    const s = sizeRel(def, att);

    const el = document.createElement("div");
    el.className = `room2d-object room2d-object--${att}`;
    if (editMode) el.classList.add("room2d-object--editable");

    el.dataset.instanceId = inst.instanceId;

    el.style.width = `${s.w * 100}%`;
    el.style.height = `${s.h * 100}%`;

    el.style.left = `${pos.x * 100}%`;
    el.style.top = `${pos.y * 100}%`;
    el.style.transform = anchorTransform(att, inst.rotation || 0);
    el.style.zIndex = String(zOrder(inst));

    const img = document.createElement("img");
    img.className = "room2d-object-img";
    img.alt = def.name || def.id || inst.itemId;
    img.draggable = false;

    img.src = def.art?.svg || `assets/room/${inst.itemId}.svg`;

    // jeśli SVG nie istnieje / nie wczyta się -> placeholder
    img.onerror = () => {
      img.remove();
      const ph = document.createElement("div");
      ph.style.width = "100%";
      ph.style.height = "100%";
      ph.style.borderRadius = "0.6rem";
      ph.style.display = "flex";
      ph.style.alignItems = "center";
      ph.style.justifyContent = "center";
      ph.style.background = "rgba(2,6,23,0.6)";
      ph.style.border = "1px solid rgba(248,113,113,0.6)";
      ph.style.fontSize = "0.75rem";
      ph.style.padding = "0.35rem";
      ph.style.textAlign = "center";
      ph.textContent = `Brak SVG:\n${inst.itemId}`;
      el.appendChild(ph);
    };

    el.appendChild(img);

    // interakcje
    el.addEventListener("pointerdown", (ev) => onPointerDown(ev, inst.instanceId));
    el.addEventListener("click", (ev) => onClickInstance(ev, inst.instanceId));

    return el;
  }

  function onClickInstance(ev, instanceId) {
    if (drag.moved) return;
    if (!editMode) return;

    ev.preventDefault();
    ev.stopPropagation();

    const ok = confirm("Usunąć ten przedmiot z pokoju? (Będzie dalej kupiony w sklepie)");
    if (!ok) return;

    roomState.instances = roomState.instances.filter(i => i.instanceId !== instanceId);
    saveRoom();
    renderInstances();
  }

  function onPointerDown(ev, instanceId) {
    if (!editMode) return; // drag tylko w edycji

    ev.preventDefault();
    ev.stopPropagation();

    const el = ev.currentTarget;
    const inst = roomState.instances.find(i => i.instanceId === instanceId);
    if (!inst) return;

    drag.active = true;
    drag.pointerId = ev.pointerId;
    drag.instanceId = instanceId;
    drag.moved = false;

    el.setPointerCapture(ev.pointerId);

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(ev) {
    if (!drag.active || ev.pointerId !== drag.pointerId) return;

    const inst = roomState.instances.find(i => i.instanceId === drag.instanceId);
    if (!inst) return;

    const rect = sceneEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const nx = (ev.clientX - rect.left) / rect.width;
    const ny = (ev.clientY - rect.top) / rect.height;

    const pos = clampPos(nx, ny, inst.attachment || "floor");

    const dx = Math.abs((inst.x ?? 0) - pos.x);
    const dy = Math.abs((inst.y ?? 0) - pos.y);
    if (dx > 0.002 || dy > 0.002) drag.moved = true;

    inst.x = pos.x;
    inst.y = pos.y;

    const el = sceneEl.querySelector(`.room2d-object[data-instance-id="${CSS.escape(inst.instanceId)}"]`);
    if (el) {
      el.style.left = `${pos.x * 100}%`;
      el.style.top = `${pos.y * 100}%`;
      el.style.zIndex = String(zOrder(inst));
    }
  }

  function onPointerUp(ev) {
    if (!drag.active || ev.pointerId !== drag.pointerId) return;

    const el = ev.currentTarget;
    try { el.releasePointerCapture(ev.pointerId); } catch (_) {}

    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerUp);

    drag.active = false;

    if (drag.moved) {
      saveRoom();
      renderInstances();
    }

    setTimeout(() => {
      drag.moved = false;
      drag.pointerId = null;
      drag.instanceId = null;
    }, 0);
  }

  function focusInstance(instanceId) {
    const el = sceneEl.querySelector(`.room2d-object[data-instance-id="${CSS.escape(instanceId)}"]`);
    if (!el) return;

    el.classList.add("is-focus");
    const oldZ = el.style.zIndex;
    el.style.zIndex = "9999";

    setTimeout(() => {
      el.classList.remove("is-focus");
      el.style.zIndex = oldZ;
    }, 3000);
  }
})();
