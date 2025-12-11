// js/core/room-api.js
// Neon Room – API pokoju dla gier i sklepu
// --------------------------------------------------
// Zapisywany stan (ArcadeProgress, klucz "neon_room_v2") ma strukturę:
//
// {
//   version: 2,
//   unlockedItemTypes: {
//     [itemId]: { unlocked: true, fromGameId: string|null, meta: any }
//   },
//   instances: [
//     {
//       instanceId: string,
//       itemId: string,
//       level: number,
//       attachment: "floor"|"wall"|"ceiling"|"surface",
//       parentInstanceId: string|null,
//       x: number,   // 0..1
//       y: number,   // 0..1
//       offsetX?: number, // dla surface
//       offsetY?: number, // dla surface
//       rotation?: number,
//       meta?: any
//     }
//   ]
// }
//
// Ten plik NIE renderuje sceny – tylko manipuluje stanem.

(function () {
  "use strict";

  const ROOM_SAVE_KEY = "neon_room_v2";

  /**
   * Ładuje stan pokoju z ArcadeProgress.
   * Zwraca zawsze kompletne struktury (version/unlockedItemTypes/instances).
   */
  async function loadRoomState() {
    if (!window.ArcadeProgress || !ArcadeProgress.load) {
      console.warn("[ArcadeRoom] Brak ArcadeProgress – stan pokoju tylko w pamięci.");
      return {
        version: 2,
        unlockedItemTypes: {},
        instances: []
      };
    }

    try {
      const raw = (await ArcadeProgress.load(ROOM_SAVE_KEY)) || {};
      const state = {
        version: raw.version || 2,
        unlockedItemTypes: raw.unlockedItemTypes || {},
        instances: raw.instances || []
      };
      return state;
    } catch (e) {
      console.error("[ArcadeRoom] Błąd ładowania stanu pokoju:", e);
      return {
        version: 2,
        unlockedItemTypes: {},
        instances: []
      };
    }
  }

  /**
   * Zapisuje stan pokoju do ArcadeProgress.
   */
  async function saveRoomState(state) {
    if (!window.ArcadeProgress || !ArcadeProgress.save) {
      console.warn("[ArcadeRoom] Brak ArcadeProgress – nie zapisuję stanu.");
      return;
    }

    const safeState = {
      version: state.version || 2,
      unlockedItemTypes: state.unlockedItemTypes || {},
      instances: state.instances || []
    };

    try {
      await ArcadeProgress.save(ROOM_SAVE_KEY, safeState);
      console.log("[ArcadeRoom] Stan pokoju zapisany.");
    } catch (e) {
      console.error("[ArcadeRoom] Błąd zapisu stanu pokoju:", e);
    }
  }

  /**
   * Odblokowanie TYPU przedmiotu (np. gra lub sklep).
   *
   * Przykład z gry:
   * ArcadeRoom.unlockItemType("trophy_gold", {
   *   fromGameId: "2048",
   *   meta: { reason: "score_1000" }
   * });
   */
  async function unlockItemType(itemId, options = {}) {
    const { fromGameId = null, meta = null } = options;

    const state = await loadRoomState();
    state.version = state.version || 2;
    state.unlockedItemTypes = state.unlockedItemTypes || {};

    const prev = state.unlockedItemTypes[itemId] || {};

    state.unlockedItemTypes[itemId] = {
      unlocked: true,
      fromGameId: fromGameId || prev.fromGameId || null,
      meta: meta || prev.meta || null
    };

    await saveRoomState(state);

    console.log("[ArcadeRoom] Odblokowano typ przedmiotu:", itemId);
    return state.unlockedItemTypes[itemId];
  }

  /**
   * (Opcjonalne dla sklepu) – oznaczenie, że gracz kupił typ przedmiotu za 💎.
   * Technicznie to to samo co unlockItemType, ale z innym meta.
   */
  async function unlockItemTypeFromShop(itemId, options = {}) {
    const meta = Object.assign({}, options.meta, { source: "shop" });
    return unlockItemType(itemId, {
      fromGameId: options.fromGameId || null,
      meta
    });
  }

  // podłączamy do globalnego obiektu, nie nadpisując istniejącego
  const exported = window.ArcadeRoom || {};
  exported.loadRoomState = loadRoomState;
  exported.saveRoomState = saveRoomState;
  exported.unlockItemType = unlockItemType;
  exported.unlockItemTypeFromShop = unlockItemTypeFromShop;

  window.ArcadeRoom = exported;
})();
