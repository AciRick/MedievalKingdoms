import Phaser from "phaser";
import type { Character } from "../api/types";

const TILE_SIZE = 32;
const MAP_WIDTH = 216;
const MAP_HEIGHT = 108;

const ZONE_GRID: { zone: string; x: number; y: number; w: number; h: number }[] = [
  { zone: "Abbey", x: 70, y: 0, w: 76, h: 14 },
  { zone: "VillageA", x: 0, y: 14, w: 55, h: 41 },
  { zone: "VillageB", x: 161, y: 14, w: 55, h: 41 },
  { zone: "NoMansLand", x: 55, y: 14, w: 106, h: 41 },
  { zone: "Forest", x: 0, y: 55, w: 100, h: 25 },
  { zone: "Lake", x: 100, y: 55, w: 30, h: 25 },
  { zone: "Coast", x: 130, y: 55, w: 86, h: 25 },
  { zone: "DeepForest", x: 0, y: 80, w: 100, h: 28 },
  { zone: "Mountains", x: 100, y: 80, w: 80, h: 28 },
];

const ZONE_FLOOR_TILE: Record<string, string> = {
  Abbey: "dung_0000", VillageA: "town_0000", VillageB: "town_0000",
  NoMansLand: "town_0012", Forest: "town_0002", Coast: "rpg_0198",
  Lake: "rpg_0198", DeepForest: "town_0002", Mountains: "dung_0000",
};

const ZONE_LABELS: Record<string, string> = {
  Abbey: "Abbazia", VillageA: "Villaggio del Nord", VillageB: "Villaggio del Sud",
  NoMansLand: "Terra di Nessuno", Forest: "Foresta", Coast: "Costa Marina",
  Lake: "Lago", DeepForest: "Foresta Profonda", Mountains: "Montagne",
};

interface NpcDef { x: number; y: number; color: number; label: string; dialog: string; questBuildingName?: string; shop?: { buys: string; buyLabel: string; sellPrice: number }; }
interface EnemyDef { id: string; x: number; y: number; label: string; kingdom: string; strength: number; agility: number; wanderRange: number; }

const NPC_DATA: NpcDef[] = [
  { x: 400, y: 600, color: 0x22cc22, label: "Mercante", dialog: "\"Benvenuto! Ho merci rare.\"", questBuildingName: "Capanna Foresta" },
  { x: 200, y: 700, color: 0x8888ff, label: "Guardia", dialog: "\"Fermo! Ah, sei tu. Attento nella Terra di Nessuno.\"", questBuildingName: "Castello Nord" },
  { x: 180, y: 550, color: 0xcc8844, label: "Fabbro", dialog: "\"Le mie lame sono le migliori!\"", questBuildingName: "Palazzo Sud" },
  { x: 500, y: 650, color: 0x44cc44, label: "Oste", dialog: "\"Birra fresca! Vuoi vendermi legna?\"", shop: { buys: "wood", buyLabel: "Legna", sellPrice: 2 } },
  { x: 350, y: 580, color: 0xcc44cc, label: "Giullare", dialog: "\"Ahah! Il re è così grasso...\"" },
  { x: 300, y: 720, color: 0x44dd44, label: "Contadina", dialog: "\"Il raccolto è stato buono quest'anno.\"", questBuildingName: "Fattoria Nord" },
  { x: 5200, y: 700, color: 0x44aadd, label: "Commerciante", dialog: "\"Merci del sud!\"", questBuildingName: "Tempio" },
  { x: 5150, y: 620, color: 0xaaaaff, label: "Sacerdotessa", dialog: "\"Che la luce ti guidi.\"" },
  { x: 5400, y: 750, color: 0x8888ff, label: "Capitano", dialog: "\"Proteggo queste mura.\"", questBuildingName: "Miniera" },
  { x: 5800, y: 900, color: 0x44aadd, label: "Pescatore", dialog: "\"Pesce fresco!\"", questBuildingName: "Porto Comm.le", shop: { buys: "fish", buyLabel: "Pesce", sellPrice: 2 } },
  { x: 5250, y: 850, color: 0x88cc88, label: "Contadino Sud", dialog: "\"I campi del sud sono fertili.\"", questBuildingName: "Fattoria Sud" },
];

const ENEMY_DATA: EnemyDef[] = [
  { id: "bandit_1", x: 2000, y: 700, label: "Bandito", kingdom: "HOSTILE", strength: 4, agility: 3, wanderRange: 200 },
  { id: "bandit_2", x: 2600, y: 900, label: "Bandito", kingdom: "HOSTILE", strength: 3, agility: 4, wanderRange: 180 },
  { id: "bandit_3", x: 3200, y: 650, label: "Bandito", kingdom: "HOSTILE", strength: 5, agility: 2, wanderRange: 220 },
  { id: "bandit_4", x: 2200, y: 1100, label: "Bandito", kingdom: "HOSTILE", strength: 4, agility: 3, wanderRange: 190 },
  { id: "raider_north", x: 1800, y: 500, label: "Predone Nord", kingdom: "VILLAGE_A", strength: 6, agility: 3, wanderRange: 250 },
  { id: "raider_south_1", x: 4000, y: 800, label: "Predone Sud", kingdom: "VILLAGE_B", strength: 5, agility: 4, wanderRange: 240 },
  { id: "raider_south_2", x: 4500, y: 600, label: "Predone Sud", kingdom: "VILLAGE_B", strength: 4, agility: 5, wanderRange: 260 },
  { id: "skeleton_1", x: 2400, y: 1200, label: "Scheletro", kingdom: "HOSTILE", strength: 7, agility: 2, wanderRange: 150 },
  { id: "wolf_1", x: 1200, y: 2000, label: "Lupo", kingdom: "HOSTILE", strength: 5, agility: 6, wanderRange: 300 },
  { id: "wolf_2", x: 1800, y: 2200, label: "Lupo", kingdom: "HOSTILE", strength: 5, agility: 5, wanderRange: 280 },
  { id: "bear_1", x: 2800, y: 2700, label: "Orso", kingdom: "HOSTILE", strength: 8, agility: 3, wanderRange: 200 },
  { id: "bear_2", x: 3500, y: 2900, label: "Orso", kingdom: "HOSTILE", strength: 9, agility: 2, wanderRange: 180 },
];

const INTERACT_DISTANCE = 60, INTERACT_COOLDOWN = 500, GATHER_DISTANCE = 50, ITEM_DISTANCE = 40;
const ENEMY_CHASE_DISTANCE = 150, ENEMY_ATTACK_DISTANCE = 25, ENEMY_INTERACT_DISTANCE = 55, ENEMY_SPEED = 80;

interface EnemySprite { sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text; def: EnemyDef; originX: number; originY: number; wanderTarget: { x: number; y: number }; wanderTimer: number; chasing: boolean; }
interface BuildingDef { x: number; y: number; w: number; h: number; label: string; rest?: boolean; free?: boolean; }
interface ResourceNode { x: number; y: number; resourceName: string; resourceLabel: string; gatherTime: number; gatherYield: number; }

const BUILDING_DATA: BuildingDef[] = [
  { x: 300, y: 640, w: 3, h: 3, label: "Castello Nord" }, { x: 160, y: 550, w: 2, h: 2, label: "Caserma", rest: true },
  { x: 500, y: 700, w: 2, h: 1, label: "Taverna" }, { x: 200, y: 500, w: 2, h: 1, label: "Fucina" },
  { x: 500, y: 550, w: 2, h: 2, label: "Capanna Foresta" }, { x: 250, y: 780, w: 2, h: 2, label: "Fattoria Nord" },
  { x: 2100, y: 220, w: 3, h: 2, label: "Abbazia", rest: true, free: true },
  { x: 5400, y: 700, w: 3, h: 3, label: "Palazzo Sud" }, { x: 5180, y: 580, w: 2, h: 2, label: "Tempio", rest: true },
  { x: 6200, y: 900, w: 3, h: 2, label: "Porto Comm.le" }, { x: 6300, y: 750, w: 2, h: 2, label: "Miniera" },
  { x: 5200, y: 850, w: 2, h: 1, label: "Bottega Pesce" }, { x: 5250, y: 880, w: 2, h: 2, label: "Fattoria Sud" },
  { x: 6200, y: 2000, w: 3, h: 1, label: "Molo del Porto" }, { x: 4000, y: 1800, w: 2, h: 1, label: "Capanna Lago" },
  { x: 3400, y: 2700, w: 2, h: 2, label: "Rovine" }, { x: 4500, y: 2800, w: 2, h: 1, label: "Miniera Montagna" },
  { x: 5632, y: 3328, w: 2, h: 2, label: "CaveEntrance" },
];

const RESOURCE_NODES: ResourceNode[] = [
  { x: 100, y: 1850, resourceName: "wood", resourceLabel: "Legna", gatherTime: 4, gatherYield: 3 },
  { x: 300, y: 1900, resourceName: "wood", resourceLabel: "Legna", gatherTime: 4, gatherYield: 3 },
  { x: 500, y: 1820, resourceName: "wood", resourceLabel: "Legna", gatherTime: 4, gatherYield: 3 },
  { x: 700, y: 1950, resourceName: "wood", resourceLabel: "Legna", gatherTime: 4, gatherYield: 3 },
  { x: 900, y: 1880, resourceName: "wood", resourceLabel: "Legna", gatherTime: 4, gatherYield: 3 },
  { x: 1100, y: 1920, resourceName: "wood", resourceLabel: "Legna", gatherTime: 4, gatherYield: 3 },
  { x: 1300, y: 1850, resourceName: "wood", resourceLabel: "Legna", gatherTime: 4, gatherYield: 3 },
  { x: 1500, y: 1900, resourceName: "wood", resourceLabel: "Legna", gatherTime: 4, gatherYield: 3 },
  { x: 3600, y: 2650, resourceName: "iron", resourceLabel: "Ferro", gatherTime: 6, gatherYield: 2 },
  { x: 3800, y: 2750, resourceName: "iron", resourceLabel: "Ferro", gatherTime: 6, gatherYield: 2 },
  { x: 3400, y: 2850, resourceName: "stone", resourceLabel: "Pietra", gatherTime: 5, gatherYield: 3 },
  { x: 3700, y: 2800, resourceName: "stone", resourceLabel: "Pietra", gatherTime: 5, gatherYield: 3 },
  { x: 3300, y: 1900, resourceName: "fish", resourceLabel: "Pesce", gatherTime: 3, gatherYield: 2 },
  { x: 3500, y: 1950, resourceName: "fish", resourceLabel: "Pesce", gatherTime: 3, gatherYield: 2 },
  { x: 4300, y: 1900, resourceName: "fish", resourceLabel: "Pesce", gatherTime: 3, gatherYield: 3 },
  { x: 5200, y: 1920, resourceName: "fish", resourceLabel: "Pesce", gatherTime: 3, gatherYield: 3 },
  { x: 200, y: 2650, resourceName: "wood", resourceLabel: "Legna", gatherTime: 4, gatherYield: 4 },
  { x: 500, y: 2700, resourceName: "wood", resourceLabel: "Legna", gatherTime: 4, gatherYield: 4 },
  { x: 300, y: 2700, resourceName: "herbs", resourceLabel: "Erbe", gatherTime: 4, gatherYield: 2 },
  { x: 600, y: 2650, resourceName: "herbs", resourceLabel: "Erbe", gatherTime: 4, gatherYield: 2 },
  { x: 1000, y: 2680, resourceName: "herbs", resourceLabel: "Erbe", gatherTime: 4, gatherYield: 2 },
  { x: 200, y: 2900, resourceName: "herbs", resourceLabel: "Erbe", gatherTime: 4, gatherYield: 3 },
];

interface WorldItemDef { id: number; posX: number; posY: number; name: string; type: string; }

export class WorldScene extends Phaser.Scene {
  private playerSprite!: Phaser.GameObjects.Sprite;
  private otherPlayers: Map<number, { sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }> = new Map();
  private npcSprites: { sprite: Phaser.GameObjects.Sprite; def: NpcDef }[] = [];
  private enemySprites: EnemySprite[] = [];
  private playerCharacter: Character | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private moveTimer = 0;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private inventoryKey!: Phaser.Input.Keyboard.Key;
  private lastInteractTime = 0;
  private zoneLabelText!: Phaser.GameObjects.Text;
  private movementDisabled = false;
  private resourceMarkers: Phaser.GameObjects.Sprite[] = [];
  private gatheringActive = false;
  private combatActive = false;
  private playerNameLabel!: Phaser.GameObjects.Text;
  private worldItemSprites: Map<number, Phaser.GameObjects.Sprite> = new Map();
  private customTileSprites: Phaser.GameObjects.Image[] = [];
  private earthquakeSpeed = false;

  constructor() { super({ key: "WorldScene" }); }

  preload(): void {
    for (let i = 0; i <= 131; i++) {
      const n = String(i).padStart(4, "0");
      this.load.image(`town_${n}`, `/assets/tiles/kenney-tiny-town/tile_${n}.png`);
      this.load.image(`dung_${n}`, `/assets/tiles/kenney-tiny-dungeon/tile_${n}.png`);
    }
    this.load.image("rpg_0198", "/assets/tiles/kenney-rpg-urban/tile_0198.png");
  }

  create(): void {
    this.drawMap();
    this.generateCharacterTextures();
    this.generateItemTextures();

    const startX = this.playerCharacter?.posX ?? 400;
    const startY = this.playerCharacter?.posY ?? 600;

    this.playerSprite = this.add.sprite(startX, startY, "player_char").setDepth(10);
    this.playerNameLabel = this.add.text(startX, startY - 18, this.playerCharacter?.name || "???", {
      fontFamily: '"Press Start 2P"', fontSize: "5px", color: "#ffd700",
      backgroundColor: "rgba(0,0,0,0.7)", padding: { x: 2, y: 1 },
    }).setOrigin(0.5).setDepth(11);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = { W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W), A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A), S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S), D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D) };
    this.interactKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.inventoryKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.I);

    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

    this.drawNpcs(); this.drawEnemies(); this.drawResourceMarkers();

    this.zoneLabelText = this.add.text(4, 4, "???", {
      fontFamily: '"Press Start 2P"', fontSize: "8px", color: "#ffffff",
      backgroundColor: "rgba(0,0,0,0.7)", padding: { x: 4, y: 2 },
    }).setScrollFactor(0).setDepth(100);

    window.addEventListener("phaser:disable-movement", () => { this.movementDisabled = true; });
    window.addEventListener("phaser:enable-movement", () => { this.movementDisabled = false; });
    window.addEventListener("phaser:gathering-cancel", () => { this.gatheringActive = false; this.movementDisabled = false; });
  }

  update(_time: number, delta: number): void {
    if (!this.playerSprite) return;
    (window as any).__playerPos = { x: this.playerSprite.x, y: this.playerSprite.y };
    this.updateEnemies(delta);

    const speed = this.earthquakeSpeed ? 80 : 160;
    let dx = 0; let dy = 0;
    if (!this.movementDisabled) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      const n = new Phaser.Math.Vector2(dx, dy).normalize();
      const newX = this.playerSprite.x + n.x * speed * (delta / 1000);
      const newY = this.playerSprite.y + n.y * speed * (delta / 1000);
      if (!this.isWallTile(Math.floor(newX / TILE_SIZE), Math.floor(this.playerSprite.y / TILE_SIZE))) this.playerSprite.x = newX;
      if (!this.isWallTile(Math.floor(this.playerSprite.x / TILE_SIZE), Math.floor(newY / TILE_SIZE))) this.playerSprite.y = newY;
      this.playerSprite.x = Phaser.Math.Clamp(this.playerSprite.x, 10, MAP_WIDTH * TILE_SIZE - 10);
      this.playerSprite.y = Phaser.Math.Clamp(this.playerSprite.y, 10, MAP_HEIGHT * TILE_SIZE - 10);
      this.playerNameLabel.x = this.playerSprite.x; this.playerNameLabel.y = this.playerSprite.y - 18;
      const zone = this.getZoneAt(this.playerSprite.x, this.playerSprite.y);
      if (this.zoneLabelText) this.zoneLabelText.setText(zone);
      this.moveTimer += delta;
      if (this.moveTimer >= 100) {
        this.moveTimer = 0;
        const sm = (window as any).__gameSocket;
        if (sm?.getSocket()?.connected) sm.getSocket().emit("move", { characterId: this.playerCharacter?.id, posX: this.playerSprite.x, posY: this.playerSprite.y, zone });
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.tryInteract();
    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) window.dispatchEvent(new CustomEvent("phaser:toggle-inventory"));
  }

  setEventState(_et: string | null, eq: boolean): void { this.earthquakeSpeed = eq; }
  setPlayerCharacter(character: Character): void { this.playerCharacter = character; if (this.playerNameLabel) this.playerNameLabel.setText(character.name); }

  addOtherPlayer(characterId: number, name: string, x: number, y: number): void {
    if (this.otherPlayers.has(characterId)) return;
    const sprite = this.add.sprite(x, y, "other_char").setDepth(9);
    const label = this.add.text(x, y - 18, name, { fontFamily: '"Press Start 2P"', fontSize: "5px", color: "#ffffff", backgroundColor: "rgba(0,0,0,0.7)", padding: { x: 2, y: 1 } }).setOrigin(0.5).setDepth(11);
    this.otherPlayers.set(characterId, { sprite, label });
  }
  moveOtherPlayer(characterId: number, x: number, y: number): void { const e = this.otherPlayers.get(characterId); if (e) { e.sprite.x = x; e.sprite.y = y; e.label.x = x; e.label.y = y - 18; } }
  removeOtherPlayer(characterId: number): void { const e = this.otherPlayers.get(characterId); if (e) { e.sprite.destroy(); e.label.destroy(); this.otherPlayers.delete(characterId); } }

  spawnWorldItem(item: WorldItemDef): void {
    if (this.worldItemSprites.has(item.id)) return;
    const texKey = `item_${(item.type || "consumable").toLowerCase()}`;
    const key = this.textures.exists(texKey) ? texKey : "npc_char";
    const sprite = this.add.sprite(item.posX, item.posY, key).setDepth(7).setScale(0.8);
    if (key === "npc_char") sprite.setTint(0xffaa00);
    this.tweens.add({ targets: sprite, alpha: { from: 1, to: 0.4 }, duration: 600, yoyo: true, repeat: -1 });
    this.worldItemSprites.set(item.id, sprite);
    window.dispatchEvent(new CustomEvent("minimap:item-spawned", { detail: item }));
  }
  removeWorldItem(itemId: number): void {
    const s = this.worldItemSprites.get(itemId);
    if (s) { s.destroy(); this.worldItemSprites.delete(itemId); }
    window.dispatchEvent(new CustomEvent("minimap:item-collected", { detail: { itemId } }));
  }
  clearWorldItems(): void { for (const [, s] of this.worldItemSprites) s.destroy(); this.worldItemSprites.clear(); }

  drawCustomTiles(tiles: { col: number; row: number; key: string }[]): void {
    console.log("drawCustomTiles called:", tiles.length, "tiles");
    let needLoad = false;
    for (const t of tiles) {
      if (!this.textures.exists(t.key)) {
        const parts = t.key.split("_");
        const num = parts[1] || "";
        let path = "";
        if (t.key.startsWith("town_")) path = `/assets/tiles/kenney-tiny-town/tile_${num}.png`;
        else if (t.key.startsWith("dung_")) path = `/assets/tiles/kenney-tiny-dungeon/tile_${num}.png`;
        else if (t.key.startsWith("rpg_")) path = `/assets/tiles/kenney-rpg-urban/tile_${num}.png`;
        if (path) { this.load.image(t.key, path); needLoad = true; }
      }
    }
    if (needLoad) {
      this.load.once("complete", () => this._renderCustomTiles(tiles));
      this.load.start();
    } else {
      this._renderCustomTiles(tiles);
    }
  }

  private _renderCustomTiles(tiles: { col: number; row: number; key: string }[]): void {
    for (const s of this.customTileSprites) s.destroy();
    this.customTileSprites = [];
    let rendered = 0;
    for (const t of tiles) {
      if (this.textures.exists(t.key)) {
        const bg = this.add.rectangle(t.col * TILE_SIZE + TILE_SIZE / 2, t.row * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 0x000000);
        bg.setDepth(5.5);
        this.customTileSprites.push(bg as any);
        const img = this.add.image(t.col * TILE_SIZE + TILE_SIZE / 2, t.row * TILE_SIZE + TILE_SIZE / 2, t.key);
        img.setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(6);
        this.customTileSprites.push(img as any);
        rendered++;
      }
    }
    console.log("drawCustomTiles rendered:", rendered, "sprites");
  }

  playCombatAnimation(ex: number, ey: number, playerWon: boolean): void {
    this.cameras.main.shake(150, 0.005);
    const flash = this.add.rectangle(ex, ey, 20, 20, playerWon ? 0x33ff33 : 0xff3333, 0.8).setDepth(50);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 2, scaleY: 2, duration: 400, onComplete: () => flash.destroy() });
    this.playerSprite.setTint(playerWon ? 0x88ff88 : 0xff8888);
    this.time.delayedCall(300, () => this.playerSprite.clearTint());
    const dmgText = this.add.text(ex, ey - 30, playerWon ? "VINTO!" : "PERSO!", {
      fontFamily: '"Press Start 2P"', fontSize: "8px", color: playerWon ? "#33ff33" : "#ff3333",
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: dmgText, y: dmgText.y - 25, alpha: 0, duration: 800, onComplete: () => dmgText.destroy() });
  }

  defeatEnemySprite(enemyId: string): void {
    const e = this.enemySprites.find(es => es.def.id === enemyId);
    if (e) { this.tweens.add({ targets: [e.sprite, e.label], alpha: 0, duration: 500, onComplete: () => { e.sprite.destroy(); e.label.destroy(); } }); this.enemySprites = this.enemySprites.filter(es => es.def.id !== enemyId); }
  }

  endCombat(): void { this.combatActive = false; this.movementDisabled = false; }

  private drawMap(): void {
    const mw = MAP_WIDTH * TILE_SIZE, mh = MAP_HEIGHT * TILE_SIZE;
    this.add.rectangle(mw / 2, mh / 2, mw, mh, 0x1a1a2e).setDepth(0);
    const bg = this.add.tileSprite(mw / 2, mh / 2, mw, mh, "town_0001").setDepth(1);
    bg.setDisplaySize(mw, mh);
    for (const z of ZONE_GRID) {
      const t = ZONE_FLOOR_TILE[z.zone]; if (!t) continue;
      const zx = z.x * TILE_SIZE, zy = z.y * TILE_SIZE, zw = z.w * TILE_SIZE, zh = z.h * TILE_SIZE;
      const ts = this.add.tileSprite(zx + zw / 2, zy + zh / 2, zw, zh, t).setDepth(2);
      ts.setDisplaySize(zw, zh);
    }
    this.drawWall(); this.drawBuildings(); this.drawTrees(); this.drawWater(); this.drawVillageWater(); this.drawZoneLabels(); this.drawTerrainVariety();
  }

  private drawWall(): void {
    const wallKey = "dung_0040"; const depth = 12;
    const va_l = 0, va_r = 55, va_t = 14, va_b = 55;
    for (let c = va_l; c < va_r; c++) this.add.image(c * TILE_SIZE + TILE_SIZE / 2, va_t * TILE_SIZE + TILE_SIZE / 2, wallKey).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(depth);
    for (let c = va_l; c < va_r; c++) this.add.image(c * TILE_SIZE + TILE_SIZE / 2, va_b * TILE_SIZE + TILE_SIZE / 2, wallKey).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(depth);
    for (let r = va_t; r < va_b; r++) { if (r !== 34 && r !== 35) this.add.image(va_r * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, wallKey).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(depth); }
    this.add.image(va_r * TILE_SIZE + TILE_SIZE / 2, 34 * TILE_SIZE + TILE_SIZE / 2, "town_0113").setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(depth);
    this.add.image(va_r * TILE_SIZE + TILE_SIZE / 2, 35 * TILE_SIZE + TILE_SIZE / 2, "town_0114").setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(depth);

    const vb_l = 161, vb_r = 216, vb_t = 14, vb_b = 55;
    for (let c = vb_l; c < vb_r; c++) this.add.image(c * TILE_SIZE + TILE_SIZE / 2, vb_t * TILE_SIZE + TILE_SIZE / 2, wallKey).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(depth);
    for (let c = vb_l; c < vb_r; c++) this.add.image(c * TILE_SIZE + TILE_SIZE / 2, vb_b * TILE_SIZE + TILE_SIZE / 2, wallKey).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(depth);
    for (let r = vb_t; r < vb_b; r++) { if (r !== 34 && r !== 35) this.add.image(vb_l * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, wallKey).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(depth); }
    this.add.image(vb_l * TILE_SIZE + TILE_SIZE / 2, 34 * TILE_SIZE + TILE_SIZE / 2, "town_0113").setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(depth);
    this.add.image(vb_l * TILE_SIZE + TILE_SIZE / 2, 35 * TILE_SIZE + TILE_SIZE / 2, "town_0114").setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(depth);
  }

  private drawBuildings(): void {
    for (const b of BUILDING_DATA) {
      let tk = "town_0048";
      if (b.label.includes("Castello") || b.label.includes("Palazzo")) tk = "town_0052";
      else if (b.label.includes("Miniera") || b.label.includes("Molo")) tk = "dung_0040";
      else if (b.label.includes("Caserma")) tk = "dung_0040";
      else if (b.label.includes("Tempio")) tk = "dung_0019";
      else if (b.label.includes("Abbazia")) {
        this.drawBuildingTiled(b.x, b.y, b.w, b.h, "dung_0040", b.label);
        this.add.image(b.x + 0 * TILE_SIZE + TILE_SIZE / 2, b.y + TILE_SIZE / 2, "dung_0029").setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(4);
        this.add.image(b.x + 1 * TILE_SIZE + TILE_SIZE / 2, b.y + TILE_SIZE / 2, "dung_0028").setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(4);
        this.add.image(b.x + 2 * TILE_SIZE + TILE_SIZE / 2, b.y + TILE_SIZE / 2, "dung_0002").setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(4);
        continue;
      }
      this.drawBuildingTiled(b.x, b.y, b.w, b.h, tk, b.label);
    }
  }

  private drawBuildingTiled(px: number, py: number, tw: number, th: number, tileKey: string, label: string): void {
    const key = this.textures.exists(tileKey) ? tileKey : "town_0048";
    for (let r = 0; r < th; r++) for (let c = 0; c < tw; c++) this.add.image(px + c * TILE_SIZE + TILE_SIZE / 2, py + r * TILE_SIZE + TILE_SIZE / 2, key).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(4);
    const cx = px + (tw * TILE_SIZE) / 2, cy = py + th * TILE_SIZE + 6;
    this.add.text(cx, cy, label, { fontFamily: '"Press Start 2P"', fontSize: "5px", color: "#cccccc", backgroundColor: "rgba(0,0,0,0.5)", padding: { x: 2, y: 1 } }).setOrigin(0.5, 0).setDepth(15);
  }

  private drawTrees(): void {
    const pos = [
      { x: 1, y: 23 }, { x: 3, y: 24 }, { x: 5, y: 22 }, { x: 8, y: 25 }, { x: 10, y: 23 }, { x: 12, y: 26 }, { x: 15, y: 24 },
      { x: 18, y: 22 }, { x: 20, y: 27 }, { x: 2, y: 28 }, { x: 6, y: 29 }, { x: 9, y: 27 }, { x: 13, y: 30 }, { x: 16, y: 28 },
      { x: 21, y: 25 }, { x: 25, y: 23 }, { x: 28, y: 26 }, { x: 31, y: 24 }, { x: 34, y: 22 }, { x: 26, y: 28 }, { x: 4, y: 31 },
      { x: 11, y: 32 }, { x: 17, y: 30 }, { x: 23, y: 29 }, { x: 30, y: 27 }, { x: 33, y: 25 }, { x: 7, y: 34 }, { x: 19, y: 33 },
      { x: 24, y: 31 }, { x: 29, y: 32 },
    ];
    for (const p of pos) {
      const key = (p.x + p.y) % 2 === 0 ? "town_0003" : "town_0004";
      if (this.textures.exists(key)) this.add.image(p.x * TILE_SIZE + TILE_SIZE / 2, p.y * TILE_SIZE + TILE_SIZE / 2, key).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(5);
    }
    const bushes = [
      { x: 1, y: 7 }, { x: 5, y: 8 }, { x: 10, y: 7 }, { x: 14, y: 9 }, { x: 20, y: 8 }, { x: 52, y: 8 }, { x: 58, y: 9 },
      { x: 65, y: 7 }, { x: 70, y: 10 }, { x: 3, y: 23 }, { x: 7, y: 25 }, { x: 14, y: 22 }, { x: 22, y: 24 },
      { x: 27, y: 23 }, { x: 32, y: 25 }, { x: 16, y: 10 }, { x: 60, y: 12 }, { x: 55, y: 15 }, { x: 8, y: 14 }, { x: 68, y: 14 },
    ];
    for (const b of bushes) if (this.textures.exists("town_0005")) this.add.image(b.x * TILE_SIZE + TILE_SIZE / 2, b.y * TILE_SIZE + TILE_SIZE / 2, "town_0005").setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(5);
  }

  private drawWater(): void {
    for (let c = 130; c < 216; c++)
      for (let r = 55; r < 58; r++)
        this.add.image(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, "dung_0048").setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(3);
  }

  private drawVillageWater(): void {
    const wt = (col: number, row: number) => this.add.image(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, "rpg_0198").setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(4);
    const vw = (tlCol: number, tlRow: number, w: number, h: number) => { for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) wt(tlCol + c, tlRow + r); };
    vw(8, 30, 4, 3); vw(14, 36, 2, 2); vw(175, 30, 4, 4); vw(195, 34, 3, 2);
  }

  private drawTerrainVariety(): void {
    const tile = (key: string, col: number, row: number) => {
      if (this.textures.exists(key)) this.add.image(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, key).setDisplaySize(TILE_SIZE, TILE_SIZE).setDepth(3);
    };
    const scatter = (zone: { x: number; y: number; w: number; h: number }, keys: string[], count: number) => {
      for (let i = 0; i < count; i++) { const cx = zone.x + Math.floor(Math.random() * zone.w); const cy = zone.y + Math.floor(Math.random() * zone.h); tile(keys[Math.floor(Math.random() * keys.length)], cx, cy); }
    };
    scatter(ZONE_GRID[0], ["town_0001", "town_0002", "town_0005"], 35);
    scatter(ZONE_GRID[1], ["town_0001", "town_0002", "town_0005"], 35);
    scatter(ZONE_GRID[2], ["town_0024", "town_0005"], 25);
    scatter(ZONE_GRID[3], ["dung_0000", "dung_0012", "dung_0024"], 25);
    scatter(ZONE_GRID[4], ["town_0000", "town_0001", "town_0005", "town_0003"], 30);
    scatter(ZONE_GRID[5], ["dung_0048"], 20);
  }

  private drawZoneLabels(): void {
    const s: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: '"Press Start 2P"', fontSize: "8px", color: "#ffffff", backgroundColor: "rgba(0,0,0,0.5)", padding: { x: 4, y: 2 } };
    for (const z of ZONE_GRID) { const cx = (z.x + z.w / 2) * TILE_SIZE, cy = (z.y + z.h / 2) * TILE_SIZE; this.add.text(cx, cy, ZONE_LABELS[z.zone] || z.zone, s).setOrigin(0.5).setDepth(20); }
  }

  private drawNpcs(): void {
    for (const npc of NPC_DATA) {
      const tint = npc.shop ? 0xffcc00 : npc.questBuildingName ? 0x44cc44 : npc.color;
      const sprite = this.add.sprite(npc.x, npc.y, "npc_char").setTint(tint).setDepth(8);
      let lt = npc.label; if (npc.shop) lt += " $"; if (npc.questBuildingName) lt += " !";
      this.add.text(npc.x, npc.y - 16, lt, { fontFamily: '"Press Start 2P"', fontSize: "4px", color: "#cccccc", backgroundColor: "rgba(0,0,0,0.6)", padding: { x: 2, y: 1 } }).setOrigin(0.5).setDepth(9);
      this.npcSprites.push({ sprite, def: npc });
    }
  }

  private drawEnemies(): void {
    for (const def of ENEMY_DATA) {
      const sprite = this.add.sprite(def.x, def.y, "npc_char").setTint(0xff3333).setDepth(8);
      const label = this.add.text(def.x, def.y - 16, def.label, { fontFamily: '"Press Start 2P"', fontSize: "4px", color: "#ff6666", backgroundColor: "rgba(0,0,0,0.6)", padding: { x: 2, y: 1 } }).setOrigin(0.5).setDepth(9);
      this.enemySprites.push({ sprite, label, def, originX: def.x, originY: def.y, wanderTarget: { x: def.x, y: def.y }, wanderTimer: 0, chasing: false });
    }
  }

  private updateEnemies(delta: number): void {
    if (!this.playerCharacter || !this.playerSprite) return;
    const pk = this.playerCharacter.kingdom; const px = this.playerSprite.x, py = this.playerSprite.y;
    for (const e of this.enemySprites) {
      const distToPlayer = Phaser.Math.Distance.Between(px, py, e.sprite.x, e.sprite.y);
      const isEnemy = e.def.kingdom === "HOSTILE" || (e.def.kingdom !== "NEUTRAL" && e.def.kingdom !== pk && pk !== "NEUTRAL");
      if (isEnemy && distToPlayer < ENEMY_CHASE_DISTANCE) {
        const enemyZone = this.getZoneAt(e.sprite.x, e.sprite.y);
        if (enemyZone === "VillageA" || enemyZone === "VillageB") { e.chasing = false; e.wanderTarget = { x: e.originX, y: e.originY }; }
        else {
          e.chasing = true;
          const angle = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, px, py);
          e.sprite.x += Math.cos(angle) * ENEMY_SPEED * (delta / 1000); e.sprite.y += Math.sin(angle) * ENEMY_SPEED * (delta / 1000);
          if (distToPlayer < ENEMY_ATTACK_DISTANCE && !this.combatActive && !this.movementDisabled && !this.gatheringActive) {
            this.combatActive = true; this.movementDisabled = true; e.sprite.setTint(0xff0000);
            window.dispatchEvent(new CustomEvent("phaser:pve-attack", { detail: { enemyId: e.def.id, enemyName: e.def.label, enemyX: e.sprite.x, enemyY: e.sprite.y } }));
          }
        }
      } else {
        e.chasing = false; e.wanderTimer += delta;
        if (e.wanderTimer > 2000 + Math.random() * 2000) { e.wanderTimer = 0; const r = e.def.wanderRange; e.wanderTarget = { x: e.originX + (Math.random() - 0.5) * r * 2, y: e.originY + (Math.random() - 0.5) * r * 2 }; }
        const wdist = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, e.wanderTarget.x, e.wanderTarget.y);
        if (wdist > 3) { const angle = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, e.wanderTarget.x, e.wanderTarget.y); e.sprite.x += Math.cos(angle) * 30 * (delta / 1000); e.sprite.y += Math.sin(angle) * 30 * (delta / 1000); }
      }
      e.label.x = e.sprite.x; e.label.y = e.sprite.y - 16;
    }
  }

  private drawResourceMarkers(): void {
    const rc: Record<string, number> = { wood: 0x33aa33, stone: 0x888888, iron: 0xcc8844, herbs: 0x44cc44, fish: 0x44aadd };
    for (const n of RESOURCE_NODES) this.resourceMarkers.push(this.add.sprite(n.x, n.y, "npc_char").setTint(rc[n.resourceName] || 0xffffff).setScale(0.6).setDepth(6).setAlpha(0.7));
  }

  private tryInteract(): void {
    const now = this.time.now; if (now - this.lastInteractTime < INTERACT_COOLDOWN) return; if (!this.playerSprite || this.gatheringActive) return;
    const px = this.playerSprite.x, py = this.playerSprite.y;
    for (const entry of this.npcSprites) {
      if (Phaser.Math.Distance.Between(px, py, entry.def.x, entry.def.y) <= INTERACT_DISTANCE) {
        this.lastInteractTime = now;
        window.dispatchEvent(new CustomEvent("phaser:interact-npc", { detail: { name: entry.def.label, dialog: entry.def.dialog, questBuildingName: entry.def.questBuildingName, shop: entry.def.shop || null } }));
        return;
      }
    }
    for (const bld of BUILDING_DATA) {
      const cx = bld.x + (bld.w * TILE_SIZE) / 2, cy = bld.y + (bld.h * TILE_SIZE) / 2;
      if (Phaser.Math.Distance.Between(px, py, cx, cy) <= INTERACT_DISTANCE + Math.max(bld.w, bld.h) * TILE_SIZE / 2) {
        this.lastInteractTime = now;
        if (bld.label === "CaveEntrance") { window.dispatchEvent(new CustomEvent("phaser:interact-cave")); }
        else if (bld.rest) { window.dispatchEvent(new CustomEvent("phaser:interact-rest", { detail: { label: bld.label, free: bld.free || false } })); }
        else { window.dispatchEvent(new CustomEvent("phaser:interact-building", { detail: { label: bld.label } })); }
        return;
      }
    }
    for (const e of this.enemySprites) {
      if (Phaser.Math.Distance.Between(px, py, e.sprite.x, e.sprite.y) <= ENEMY_INTERACT_DISTANCE) {
        this.lastInteractTime = now;
        window.dispatchEvent(new CustomEvent("phaser:pve-attack", { detail: { enemyId: e.def.id, enemyName: e.def.label, enemyX: e.sprite.x, enemyY: e.sprite.y } }));
        return;
      }
    }
    for (const [itemId, sprite] of this.worldItemSprites) {
      if (Phaser.Math.Distance.Between(px, py, sprite.x, sprite.y) <= ITEM_DISTANCE) { this.lastInteractTime = now; window.dispatchEvent(new CustomEvent("phaser:collect-item", { detail: { itemId } })); return; }
    }
    for (const node of RESOURCE_NODES) {
      if (Phaser.Math.Distance.Between(px, py, node.x, node.y) <= GATHER_DISTANCE) { this.lastInteractTime = now; this.startGathering(node); return; }
    }
  }

  private startGathering(node: ResourceNode): void {
    this.gatheringActive = true; this.movementDisabled = true;
    window.dispatchEvent(new CustomEvent("phaser:gathering-start", { detail: { resourceLabel: node.resourceLabel, gatherTime: node.gatherTime } }));
    this.time.delayedCall(node.gatherTime * 1000, () => {
      this.gatheringActive = false; this.movementDisabled = false;
      window.dispatchEvent(new CustomEvent("phaser:gathering-complete", { detail: { resourceName: node.resourceName, resourceLabel: node.resourceLabel, amount: node.gatherYield } }));
    });
  }

  getZoneAt(x: number, y: number): string {
    const col = Math.floor(x / TILE_SIZE), row = Math.floor(y / TILE_SIZE);
    for (const z of ZONE_GRID) if (col >= z.x && col < z.x + z.w && row >= z.y && row < z.y + z.h) return z.zone;
    return "NoMansLand";
  }

  isWallTile(col: number, row: number): boolean {
    if (col === 55 && row >= 14 && row <= 54) return row !== 34 && row !== 35;
    if (col === 161 && row >= 14 && row <= 54) return row !== 34 && row !== 35;
    if (row === 14 && col >= 0 && col <= 54) return true;
    if (row === 55 && col >= 0 && col <= 54) return true;
    if (row === 14 && col >= 161 && col <= 215) return true;
    if (row === 55 && col >= 161 && col <= 215) return true;
    return false;
  }

  private generateCharacterTextures(): void {
    if (this.textures.exists("player_char")) return;
    const draw = (g: Phaser.GameObjects.Graphics, bc: number, hc: number) => { g.fillStyle(bc); g.fillRect(7, 12, 14, 14); g.fillStyle(hc); g.fillCircle(14, 8, 6); g.fillStyle(0x000000); g.fillRect(10, 7, 2, 2); g.fillRect(16, 7, 2, 2); };
    const mk = (key: string, bc: number, hc: number) => { const g = this.add.graphics(); g.setVisible(false); draw(g, bc, hc); g.generateTexture(key, 28, 28); g.destroy(); };
    mk("player_char", 0x8b6914, 0xffd700); mk("other_char", 0x335577, 0x4488ff); mk("npc_char", 0x555555, 0x888888);
  }

  private generateItemTextures(): void {
    if (this.textures.exists("item_weapon")) return;
    const mk = (key: string, fn: (g: Phaser.GameObjects.Graphics) => void) => { const g = this.add.graphics(); g.setVisible(false); fn(g); g.generateTexture(key, 24, 24); g.destroy(); };
    mk("item_weapon", (g) => { g.fillStyle(0xcccccc); g.fillRect(4, 2, 3, 18); g.fillRect(1, 4, 9, 3); });
    mk("item_armor", (g) => { g.fillStyle(0x6688aa); g.fillRect(2, 4, 20, 16); });
    mk("item_talisman", (g) => { g.fillStyle(0xffcc00); g.fillCircle(12, 12, 8); g.fillStyle(0x000000); g.fillCircle(12, 12, 4); });
    mk("item_consumable", (g) => { g.fillStyle(0xcc3333); g.fillCircle(12, 14, 7); g.fillRect(9, 2, 6, 5); g.fillStyle(0x88ff88); g.fillRect(10, 3, 4, 3); });
    mk("item_staff", (g) => { g.fillStyle(0x8b6914); g.fillRect(9, 2, 6, 16); g.fillStyle(0x44aaff); g.fillCircle(12, 5, 5); });
    mk("item_ranged", (g) => { g.fillStyle(0x446644); g.lineStyle(2, 0x664422); g.beginPath(); g.arc(6, 14, 10, -1.5, 0.5); g.strokePath(); g.fillRect(4, 4, 4, 12); });
  }
}
