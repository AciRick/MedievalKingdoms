import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/store";
import Hud from "../components/Hud";
import MiniMap from "../components/MiniMap";
import WorldEventsFeed from "../components/WorldEventsFeed";
import InventoryPanel from "../components/InventoryPanel";
import Chat from "../components/Chat";
import QuestOffer from "../components/QuestOffer";
import GatheringBar from "../components/GatheringBar";
import CombatBar from "../components/CombatBar";
import ActiveQuestHud from "../components/ActiveQuestHud";
import { connectSocket, getSocket } from "../game/socket";
import { getToken, api } from "../api/client";

interface NpcDialog { name: string; dialog: string; questBuildingName?: string; shop?: { buys: string; buyLabel: string; sellPrice: number } | null; }
interface QuestTpl { id: number; buildingName: string; resourceName: string; resourceLabel: string; targetAmount: number; gatherTime: number; gatherYield: number; goldReward: number; itemRewardName: string; itemRewardType: string; description: string; }
interface ActiveQuest { id: number; templateId: number; progress: number; status: string; template: { buildingName: string; resourceLabel: string; targetAmount: number; goldReward: number; itemRewardName: string; } | null; }
interface GatheringState { resourceLabel: string; gatherTime: number; }
interface ShopDialog { npcName: string; dialog: string; resourceName: string; resourceLabel: string; sellPrice: number; }
interface RestDialog { label: string; free?: boolean; }

export default function Game() {
  const { user, selectedCharacter } = useAuthStore();
  const navigate = useNavigate();
  const gameRef = useRef<Phaser.Game | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [npcDialog, setNpcDialog] = useState<NpcDialog | null>(null);
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [questOffer, setQuestOffer] = useState<QuestTpl | null>(null);
  const [activeQuests, setActiveQuests] = useState<ActiveQuest[]>([]);
  const [gathering, setGathering] = useState<GatheringState | null>(null);
  const [questTemplates, setQuestTemplates] = useState<QuestTpl[]>([]);
  const [shopDialog, setShopDialog] = useState<ShopDialog | null>(null);
  const [restDialog, setRestDialog] = useState<RestDialog | null>(null);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [combat, setCombat] = useState<{ enemyId: string; enemyName: string; enemyX: number; enemyY: number } | null>(null);
  const questTemplatesRef = useRef<QuestTpl[]>([]);
  const activeQuestsRef = useRef<ActiveQuest[]>([]);
  const handleGatheringCompleteRef = useRef<(resourceName: string, amount: number) => Promise<void>>(async () => {});
  const combatRef = useRef<{ enemyId: string; enemyName: string; enemyX: number; enemyY: number } | null>(null);

  const closeAll = useCallback(() => { setNpcDialog(null); setShopDialog(null); setRestDialog(null); setQuestOffer(null); }, []);

  const closeNpcDialog = useCallback(() => setNpcDialog(null), []);
  const closeShopDialog = useCallback(() => setShopDialog(null), []);
  const closeRestDialog = useCallback(() => setRestDialog(null), []);

  const loadQuests = useCallback(async () => {
    if (!selectedCharacter) return;
    try {
      const [templates, myQuests] = await Promise.all([api.getAvailableQuests(), api.getMyQuests(selectedCharacter.id)]);
      setQuestTemplates(templates);
      setActiveQuests(myQuests.filter((q) => q.status === "active" || q.status === "completed"));
    } catch {}
  }, [selectedCharacter]);

  const loadInventory = useCallback(async () => {
    if (!selectedCharacter) return;
    try { const inv = await api.getInventory(selectedCharacter.id); const { characterId, ...res } = inv; setInventory(res); } catch {}
  }, [selectedCharacter]);

  const handleAcceptQuest = useCallback(async () => {
    if (!questOffer || !selectedCharacter) return;
    try { await api.acceptQuest(selectedCharacter.id, questOffer.id); setQuestOffer(null); await loadQuests(); } catch {}
  }, [questOffer, selectedCharacter, loadQuests]);

  const handleGatheringComplete = useCallback(async (resourceName: string, amount: number) => {
    if (!selectedCharacter) return;
    try { await api.gatherResource(selectedCharacter.id, resourceName as any, amount); setGathering(null); await Promise.all([loadQuests(), loadInventory()]); } catch { setGathering(null); }
  }, [selectedCharacter, loadQuests, loadInventory]);

  const handleClaimQuest = useCallback(async (questId: number) => {
    if (!selectedCharacter) return;
    try { const r = await api.claimQuestReward(selectedCharacter.id, questId); setOverlayMessage(r.message); if (overlayTimer.current) clearTimeout(overlayTimer.current); overlayTimer.current = setTimeout(() => setOverlayMessage(null), 4000); await loadQuests(); const updated = await api.getCharacter(selectedCharacter.id); useAuthStore.getState().setSelectedCharacter(updated); } catch {}
  }, [selectedCharacter, loadQuests]);

  const handleDeliverQuest = useCallback(async () => {
    if (!npcDialog?.questBuildingName || !selectedCharacter) return;
    const tpl = questTemplatesRef.current.find((q) => q.buildingName === npcDialog.questBuildingName);
    if (!tpl) return;
    const existing = activeQuestsRef.current.find((aq) => aq.templateId === tpl.id && aq.status === "active");
    if (!existing) return;
    try {
      await api.deliverQuest(selectedCharacter.id, existing.id);
      setOverlayMessage(`Hai consegnato ${tpl.targetAmount} ${tpl.resourceLabel}!`); if (overlayTimer.current) clearTimeout(overlayTimer.current);
      overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3000); setNpcDialog(null); await Promise.all([loadQuests(), loadInventory()]);
      const updated = await api.getCharacter(selectedCharacter.id);
      useAuthStore.getState().setSelectedCharacter(updated);
    } catch (err: unknown) {
      const m = (err as any)?.missing, o = (err as any)?.owned, n = (err as any)?.needed;
      setOverlayMessage(m ? `Ti mancano ${m} di ${tpl.resourceLabel}. Hai ${o}/${n}.` : (err as any)?.error || "Errore");
      if (overlayTimer.current) clearTimeout(overlayTimer.current); overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3000);
    }
  }, [npcDialog, selectedCharacter, loadQuests, loadInventory]);

  const handleAbandonQuest = useCallback(async () => {
    if (!npcDialog?.questBuildingName || !selectedCharacter) return;
    const tpl = questTemplatesRef.current.find((q) => q.buildingName === npcDialog.questBuildingName); if (!tpl) return;
    const existing = activeQuestsRef.current.find((aq) => aq.templateId === tpl.id && aq.status === "active"); if (!existing) return;
    try { await api.abandonQuest(selectedCharacter.id, existing.id); setOverlayMessage("Quest abbandonata."); if (overlayTimer.current) clearTimeout(overlayTimer.current); overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3000); setNpcDialog(null); await loadQuests(); } catch {}
  }, [npcDialog, selectedCharacter, loadQuests]);

  const handleSellResource = useCallback(async () => {
    if (!shopDialog || !selectedCharacter) return;
    const owned = inventory[shopDialog.resourceName] || 0;
    if (owned <= 0) { setOverlayMessage(`Non hai ${shopDialog.resourceLabel}.`); if (overlayTimer.current) clearTimeout(overlayTimer.current); overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3000); return; }
    try { const r = await api.sellResource(selectedCharacter.id, shopDialog.resourceName as any, owned, shopDialog.sellPrice); setOverlayMessage(r.message); if (overlayTimer.current) clearTimeout(overlayTimer.current); overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3000); setShopDialog(null); await loadInventory(); const updated = await api.getCharacter(selectedCharacter.id); useAuthStore.getState().setSelectedCharacter(updated); } catch {}
  }, [shopDialog, selectedCharacter, inventory, loadInventory]);

  const handleRest = useCallback(async () => {
    if (!selectedCharacter) return;
    try {
      const r = restDialog?.free ? await api.restFree(selectedCharacter.id) : await api.restHeal(selectedCharacter.id);
      setOverlayMessage(r.message); if (overlayTimer.current) clearTimeout(overlayTimer.current); overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3000); setRestDialog(null);
      const updated = await api.getCharacter(selectedCharacter.id); useAuthStore.getState().setSelectedCharacter(updated);
    } catch (err: unknown) { setOverlayMessage((err as any)?.error || "Errore"); if (overlayTimer.current) clearTimeout(overlayTimer.current); overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3000); }
  }, [selectedCharacter, restDialog]);

  const handleCombatComplete = useCallback(async (timingScore: number) => {
    const c = combatRef.current;
    if (!c || !selectedCharacter) { setCombat(null); return; }
    try {
      const r = await api.pveCombat(selectedCharacter.id, c.enemyId, timingScore);
      setOverlayMessage(`${r.message} (Precisione: ${timingScore}%)`); if (overlayTimer.current) clearTimeout(overlayTimer.current);
      overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3500);

      const ll = (r as any).loot;
      if (ll?.name) {
        setTimeout(() => {
          setOverlayMessage(`Hai ottenuto: ${ll.name}!`);
          if (overlayTimer.current) clearTimeout(overlayTimer.current);
          overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3000);
        }, 2000);
      }

      const scene = (gameRef.current?.scene?.getScene("WorldScene") as any);
      if (scene) scene.playCombatAnimation(c.enemyX, c.enemyY, r.playerWon);

      if (r.playerWon && scene) scene.defeatEnemySprite(c.enemyId);
      if (scene) scene.endCombat();
      if (r.playerDied && scene?.playerSprite) {
        scene.playerSprite.x = selectedCharacter.kingdom === "VILLAGE_A" ? 150 : 700;
        scene.playerSprite.y = 280;
      }

      const updated = await api.getCharacter(selectedCharacter.id);
      useAuthStore.getState().setSelectedCharacter(updated);
    } catch {}
    setCombat(null);
  }, [selectedCharacter]);

  const handleCollectItem = useCallback(async (itemId: number) => {
    const socket = getSocket(); if (!socket) return;
    socket.emit("item:collect", { itemId });
  }, []);

  useEffect(() => { combatRef.current = combat; }, [combat]);
  useEffect(() => { if (npcDialog || questOffer || shopDialog || restDialog || combat) { window.dispatchEvent(new CustomEvent("phaser:disable-movement")); } else if (!gathering) { window.dispatchEvent(new CustomEvent("phaser:enable-movement")); } }, [npcDialog, questOffer, shopDialog, restDialog, combat, gathering]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "i" || e.key === "I") {
        setShowInventory(p => !p); closeAll(); return;
      }
      if (e.key === "Escape") {
        if (combat) { setCombat(null); return; }
        if (shopDialog) { closeShopDialog(); return; }
        if (restDialog) { closeRestDialog(); return; }
        if (npcDialog) { closeNpcDialog(); return; }
        if (questOffer) { setQuestOffer(null); return; }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [npcDialog, questOffer, shopDialog, restDialog, combat, closeAll]);

  useEffect(() => { const s = getSocket(); if (!s) return; const h = (d: { message: string; duration: number }) => { setOverlayMessage(d.message); if (overlayTimer.current) clearTimeout(overlayTimer.current); overlayTimer.current = setTimeout(() => setOverlayMessage(null), d.duration || 6000); }; s.on("world:overlay", h); return () => { s.off("world:overlay", h); }; }, []);
  useEffect(() => { const s = getSocket(); if (!s || !selectedCharacter) return; const h = (d: { characterId: number; winnerName: string; position: { posX: number; posY: number } }) => { if (d.characterId === selectedCharacter.id) { setOverlayMessage(`Sei stato ucciso da ${d.winnerName}!`); const sc = (gameRef.current?.scene?.getScene("WorldScene") as any); if (sc?.playerSprite) { sc.playerSprite.x = d.position.posX; sc.playerSprite.y = d.position.posY; } loadQuests(); loadInventory(); api.getCharacter(selectedCharacter.id).then(c => useAuthStore.getState().setSelectedCharacter(c)); } }; s.on("character:died", h); return () => { s.off("character:died", h); }; }, [selectedCharacter, loadQuests, loadInventory]);
  useEffect(() => { loadQuests(); }, [loadQuests]);
  useEffect(() => { questTemplatesRef.current = questTemplates; }, [questTemplates]);
  useEffect(() => { activeQuestsRef.current = activeQuests; }, [activeQuests]);
  useEffect(() => { handleGatheringCompleteRef.current = handleGatheringComplete; }, [handleGatheringComplete]);

  useEffect(() => {
    if (!user && !getToken()) { navigate("/login"); return; }
    if (!selectedCharacter) { navigate("/characters"); return; }

    connectSocket(selectedCharacter.id);
    loadInventory();

    let game: Phaser.Game | null = null;

    import("../scenes/WorldScene").then(({ WorldScene }) => {
      import("../scenes/CaveScene").then(({ CaveScene }) => {
      import("phaser").then((Phaser) => {
        if (gameRef.current) return;
        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight,
          parent: "game-container", backgroundColor: "#1a1a2e", pixelArt: true,
          scene: [WorldScene, CaveScene], input: { keyboard: true },
          physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
          scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        };
        game = new Phaser.Game(config);
        gameRef.current = game;

        game.events.on("ready", () => {
          const scene = game!.scene.getScene("WorldScene") as any;
          if (scene?.setPlayerCharacter) scene.setPlayerCharacter(selectedCharacter);

          const socket = getSocket();
          if (socket) {
            socket.emit("world:items-sync");
            socket.emit("world:event-status");

            socket.on("world:items-list", (items: any[]) => { const s = game!.scene.getScene("WorldScene") as any; if (s) { s.clearWorldItems(); for (const i of items) s.spawnWorldItem(i); } });
            socket.on("world:item-spawned", (item: any) => { const s = game!.scene.getScene("WorldScene") as any; if (s) s.spawnWorldItem(item); });
            socket.on("world:item-collected", (data: { itemId: number }) => { const s = game!.scene.getScene("WorldScene") as any; if (s) s.removeWorldItem(data.itemId); });
            socket.on("item:collected", (data: { item?: { name: string } }) => { setOverlayMessage(`Hai raccolto: ${data.item?.name || "oggetto"}!`); if (overlayTimer.current) clearTimeout(overlayTimer.current); overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3000); });
            socket.on("world:event", (data: any) => { if (data.type === "earthquake") { const s = game!.scene.getScene("WorldScene") as any; if (s) s.setEventState("earthquake", true); } });
            socket.on("world:event-end", () => { const s = game!.scene.getScene("WorldScene") as any; if (s) s.setEventState(null, false); });

            socket.emit("world:tiles-request");
            socket.on("world:tiles-list", (tiles: any[]) => {
              const s = game!.scene.getScene("WorldScene") as any;
              if (s?.drawCustomTiles) s.drawCustomTiles(tiles || []);
            });
            socket.on("world:tiles-updated", (data: { tiles: any[] }) => {
              const s = game!.scene.getScene("WorldScene") as any;
              if (s?.drawCustomTiles) s.drawCustomTiles(data.tiles || []);
            });

            api.fetchCustomTiles().then(tiles => {
              console.log("REST tiles loaded:", Array.isArray(tiles) ? tiles.length : "invalid", "tiles");
              const s = game!.scene.getScene("WorldScene") as any;
              if (s?.drawCustomTiles && Array.isArray(tiles) && tiles.length > 0) s.drawCustomTiles(tiles);
            }).catch(err => console.error("REST tiles ERROR:", err));

          }
        });
      });
    });
  });

    const onInteractNpc = (e: Event) => {
      const detail = (e as CustomEvent).detail as NpcDialog;
      if (detail.shop) { setShopDialog({ npcName: detail.name, dialog: detail.dialog, resourceName: detail.shop.buys, resourceLabel: detail.shop.buyLabel, sellPrice: detail.shop.sellPrice }); return; }
      if (detail.questBuildingName) {
        const tpl = questTemplatesRef.current.find((q) => q.buildingName === detail.questBuildingName);
        if (tpl) {
          const existing = activeQuestsRef.current.find((aq) => aq.templateId === tpl.id && aq.status !== "abandoned" && aq.status !== "claimed");
          if (existing && existing.status === "active") { setNpcDialog(detail); } else if (!existing || existing.status === "abandoned") { setQuestOffer(tpl); }
          return;
        }
      }
      setNpcDialog(detail);
    };

    const onInteractBuilding = (e: Event) => {
      const d = (e as CustomEvent).detail as { label: string };
      const tpl = questTemplatesRef.current.find((q) => q.buildingName === d.label);
      if (tpl) { const a = activeQuestsRef.current.some((aq) => aq.templateId === tpl.id && (aq.status === "active" || aq.status === "completed")); if (a) { setOverlayMessage("Hai già questa quest!"); if (overlayTimer.current) clearTimeout(overlayTimer.current); overlayTimer.current = setTimeout(() => setOverlayMessage(null), 3000); } else { setQuestOffer(tpl); } }
    };

    const onInteractRest = (e: Event) => { setRestDialog((e as CustomEvent).detail as RestDialog); };

    const onPveAttack = (e: Event) => {
      const d = (e as CustomEvent).detail as { enemyId: string; enemyName: string; enemyX: number; enemyY: number };
      setCombat(d);
    };

    const onCaveAttack = (e: Event) => {
      const d = (e as CustomEvent).detail as { enemyId: string; enemyName: string; enemyX: number; enemyY: number };
      setCombat(d);
    };

    const onCaveExit = async () => {
      if (!selectedCharacter) return;
      try {
        const r = await api.caveExit(selectedCharacter.id);
        const ws = gameRef.current!.scene.getScene("WorldScene") as any;
        gameRef.current!.scene.stop("CaveScene");
        gameRef.current!.scene.start("WorldScene");
        if (ws?.playerSprite) { ws.playerSprite.x = r.posX; ws.playerSprite.y = r.posY; }
        const updated = await api.getCharacter(selectedCharacter.id);
        useAuthStore.getState().setSelectedCharacter(updated);
      } catch {}
    };

    const onInteractCave = async () => {
      if (!selectedCharacter) return;
      try {
        await api.caveEnter(selectedCharacter.id);
        gameRef.current!.scene.stop("WorldScene");
        gameRef.current!.scene.start("CaveScene");
        const cs = gameRef.current!.scene.getScene("CaveScene") as any;
        if (cs?.setPlayerCharacter) cs.setPlayerCharacter(selectedCharacter);
      } catch {}
    };

    const onGatheringStart = (e: Event) => { setGathering((e as CustomEvent).detail as GatheringState); };
    const onGatheringComplete = (e: Event) => { const d = (e as CustomEvent).detail as { resourceName: string; resourceLabel: string; amount: number }; handleGatheringCompleteRef.current(d.resourceName, d.amount); };
    const onCollectItem = (e: Event) => { handleCollectItem((e as CustomEvent).detail.itemId); };

    window.addEventListener("phaser:toggle-inventory", () => { setShowInventory(p => !p); closeAll(); });
    window.addEventListener("phaser:interact-npc", onInteractNpc);
    window.addEventListener("phaser:interact-building", onInteractBuilding);
    window.addEventListener("phaser:interact-rest", onInteractRest);
    window.addEventListener("phaser:pve-attack", onPveAttack);
    window.addEventListener("phaser:gathering-start", onGatheringStart);
    window.addEventListener("phaser:gathering-complete", onGatheringComplete);
    window.addEventListener("phaser:collect-item", onCollectItem);
    window.addEventListener("phaser:cave-attack", onCaveAttack);
    window.addEventListener("phaser:cave-exit", onCaveExit);
    window.addEventListener("phaser:interact-cave", onInteractCave);

    return () => {
      window.removeEventListener("phaser:toggle-inventory", () => {});
      window.removeEventListener("phaser:interact-npc", onInteractNpc);
      window.removeEventListener("phaser:interact-building", onInteractBuilding);
      window.removeEventListener("phaser:interact-rest", onInteractRest);
      window.removeEventListener("phaser:pve-attack", onPveAttack);
      window.removeEventListener("phaser:gathering-start", onGatheringStart);
      window.removeEventListener("phaser:gathering-complete", onGatheringComplete);
      window.removeEventListener("phaser:collect-item", onCollectItem);
      window.removeEventListener("phaser:cave-attack", onCaveAttack);
      window.removeEventListener("phaser:cave-exit", onCaveExit);
      window.removeEventListener("phaser:interact-cave", onInteractCave);
      if (game) { game.destroy(true); gameRef.current = null; }
    };
  }, [user, selectedCharacter, navigate, loadInventory, handleCombatComplete, handleCollectItem, closeAll]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div id="game-container" style={{ width: "100%", height: "100%" }} />
      <div id="hud">
        <div className="hud-top">
          <div className="hud-left"><Hud />
            {activeQuests.length > 0 && (<div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>{activeQuests.map((q) => (<ActiveQuestHud key={q.id} quest={q} onClaim={handleClaimQuest} />))}</div>)}
          </div>
          <div className="hud-right"><MiniMap /><WorldEventsFeed /></div>
        </div>
        <div className="hud-bottom-center"><div className="hud-panel" style={{ fontSize: 7, textAlign: "center" }}>
          <span style={{ color: "#c9a44b" }}>E</span> Interagisci &nbsp;<span style={{ color: "#c9a44b" }}>I</span> Inventario &nbsp;<span style={{ color: "#c9a44b" }}>'</span> Chat &nbsp;<span style={{ color: "#c9a44b" }}>WASD</span> Movimento
        </div></div>
      </div>
      <Chat /><InventoryPanel visible={showInventory} onClose={() => setShowInventory(false)} />

      {npcDialog && !npcDialog.shop && !npcDialog.questBuildingName && (
        <div className="modal-overlay" onClick={closeNpcDialog}><div className="npc-dialog-panel" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={closeNpcDialog}>X</button>
          <h2 className="panel-title" style={{ color: "#c9a44b", marginBottom: 8 }}>{npcDialog.name}</h2>
          <p style={{ fontSize: 8, lineHeight: 2, color: "#e0e0e0" }}>{npcDialog.dialog}</p>
        </div></div>
      )}

      {npcDialog && npcDialog.questBuildingName && !npcDialog.shop && (() => {
        const tpl = questTemplates.find((q) => q.buildingName === npcDialog.questBuildingName);
        const aq = tpl ? activeQuests.find((q) => q.templateId === tpl.id && q.status === "active") : null;
        return (
          <div className="modal-overlay" onClick={closeNpcDialog}><div className="npc-dialog-panel" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeNpcDialog}>X</button>
            <h2 className="panel-title" style={{ color: "#c9a44b", marginBottom: 8 }}>{npcDialog.name}</h2>
            {aq ? (<>
              <p style={{ fontSize: 8, lineHeight: 2, color: "#e0e0e0", marginBottom: 8 }}>Hai raccolto {aq.progress}/{tpl!.targetAmount} {tpl!.resourceLabel}. Ricompensa: {tpl!.goldReward} oro + {tpl!.itemRewardName}.</p>
              <div className="hp-bar" style={{ marginBottom: 8 }}><div className="hp-bar-fill" style={{ width: `${Math.min((aq.progress / tpl!.targetAmount) * 100, 100)}%`, background: "#c9a44b", height: 8 }} /></div>
              <div className="modal-actions" style={{ flexWrap: "wrap" }}>
                <button className="success" style={{ fontSize: 7 }} onClick={handleDeliverQuest}>CONSEGNA</button>
                <button className="danger" style={{ fontSize: 7 }} onClick={handleAbandonQuest}>ABBANDONA</button>
                <button onClick={closeNpcDialog} style={{ fontSize: 7 }}>CHIUDI</button>
              </div>
            </>) : (<p style={{ fontSize: 8, lineHeight: 2, color: "#e0e0e0" }}>{npcDialog.dialog}</p>)}
          </div></div>
        );
      })()}

      {overlayMessage && (<div className="admin-overlay"><div className="overlay-text">{overlayMessage}</div></div>)}
      {questOffer && (<QuestOffer quest={questOffer} onAccept={handleAcceptQuest} onRefuse={() => setQuestOffer(null)} />)}
      {gathering && (<GatheringBar resourceLabel={gathering.resourceLabel} gatherTime={gathering.gatherTime} onComplete={() => {}} onCancel={() => setGathering(null)} />)}
      {combat && (<CombatBar enemyName={combat.enemyName} onComplete={handleCombatComplete} onCancel={() => setCombat(null)} />)}

      {shopDialog && (
        <div className="modal-overlay" onClick={closeShopDialog}><div className="npc-dialog-panel" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={closeShopDialog}>X</button><h2 className="panel-title" style={{ color: "#c9a44b", marginBottom: 8 }}>{shopDialog.npcName}</h2>
          <p style={{ fontSize: 8, lineHeight: 2, color: "#e0e0e0", marginBottom: 8 }}>{shopDialog.dialog}</p>
          <div style={{ padding: "6px 8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", marginBottom: 8, fontSize: 7 }}><span>Hai {(inventory as any)[shopDialog.resourceName] || 0} {shopDialog.resourceLabel}. Prezzo: {shopDialog.sellPrice} oro l'uno</span></div>
          <div className="modal-actions"><button className="success" style={{ fontSize: 7 }} onClick={handleSellResource}>VENDI TUTTO</button><button onClick={closeShopDialog} style={{ fontSize: 7 }}>CHIUDI</button></div>
        </div></div>
      )}

      {restDialog && (
        <div className="modal-overlay" onClick={closeRestDialog}><div className="npc-dialog-panel" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={closeRestDialog}>X</button><h2 className="panel-title" style={{ color: "#c9a44b", marginBottom: 8 }}>{restDialog.label}</h2>
          <p style={{ fontSize: 8, lineHeight: 2, color: "#e0e0e0", marginBottom: 8 }}>Vuoi riposare per recuperare tutta la vita?</p>
          <div style={{ padding: "6px 8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", marginBottom: 8, fontSize: 7 }}><span style={{ color: "#c9a44b" }}>Costo: {restDialog.free ? "GRATIS" : "10 monete d'oro"}</span></div>
          <div className="modal-actions"><button className="success" style={{ fontSize: 7 }} onClick={handleRest}>RIPOSA{restDialog.free ? " (GRATIS)" : " (10 oro)"}</button><button onClick={closeRestDialog} style={{ fontSize: 7 }}>CHIUDI</button></div>
        </div></div>
      )}
    </div>
  );
}
