import Phaser from "phaser";
import type { Character } from "../api/types";

const CTILE = 32;
const CW = 40;
const CH = 30;

const CAVE_ENEMIES = [
  { id: "cave_skeleton_1", x: 200, y: 400, label: "Scheletro", kingdom: "HOSTILE", strength: 5, agility: 2, wanderRange: 100 },
  { id: "cave_skeleton_2", x: 600, y: 300, label: "Scheletro", kingdom: "HOSTILE", strength: 5, agility: 3, wanderRange: 120 },
  { id: "cave_skeleton_3", x: 400, y: 700, label: "Scheletro", kingdom: "HOSTILE", strength: 6, agility: 2, wanderRange: 100 },
  { id: "cave_bat_1", x: 800, y: 500, label: "Pipistrello", kingdom: "HOSTILE", strength: 3, agility: 7, wanderRange: 150 },
  { id: "cave_bat_2", x: 1000, y: 200, label: "Pipistrello", kingdom: "HOSTILE", strength: 3, agility: 6, wanderRange: 140 },
  { id: "cave_bat_3", x: 300, y: 600, label: "Pipistrello", kingdom: "HOSTILE", strength: 3, agility: 6, wanderRange: 130 },
  { id: "cave_spider_1", x: 900, y: 700, label: "Ragno", kingdom: "HOSTILE", strength: 7, agility: 3, wanderRange: 80 },
  { id: "cave_spider_2", x: 500, y: 350, label: "Ragno", kingdom: "HOSTILE", strength: 6, agility: 4, wanderRange: 90 },
];

const CHASE_DIST = 150;
const ATTACK_DIST = 45;
const ENEMY_SPEED = 80;

interface CaveEnemySprite {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  def: typeof CAVE_ENEMIES[0];
  originX: number; originY: number;
  wanderTarget: { x: number; y: number };
  wanderTimer: number;
  chasing: boolean;
}

export class CaveScene extends Phaser.Scene {
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerNameLabel!: Phaser.GameObjects.Text;
  private playerCharacter: Character | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private interactKey!: Phaser.Input.Keyboard.Key;
  private enemySprites: CaveEnemySprite[] = [];
  private movementDisabled = false;
  private combatActive = false;
  private lastInteractTime = 0;

  constructor() { super({ key: "CaveScene" }); }

  create(): void {
    this.cameras.main.setBackgroundColor("#0d0d1a");

    for (let r = 0; r < CH; r++)
      for (let c = 0; c < CW; c++) {
        const px = c * CTILE + CTILE / 2;
        const py = r * CTILE + CTILE / 2;
        const tile = this.add.rectangle(px, py, CTILE, CTILE, 0x1a1a2e).setDepth(0);
        tile.setStrokeStyle(1, 0x222244);
      }

    for (let r = 0; r < CH; r++) {
      this.add.image(CTILE / 2, r * CTILE + CTILE / 2, "").setDisplaySize(CTILE, CTILE).setDepth(1);
      this.add.image((CW - 1) * CTILE + CTILE / 2, r * CTILE + CTILE / 2, "").setDisplaySize(CTILE, CTILE).setDepth(1);
    }
    for (let c = 0; c < CW; c++) {
      const img1 = this.add.rectangle(c * CTILE + CTILE / 2, CTILE / 2, CTILE, CTILE, 0x444466).setDepth(1);
      const img2 = this.add.rectangle(c * CTILE + CTILE / 2, (CH - 1) * CTILE + CTILE / 2, CTILE, CTILE, 0x444466).setDepth(1);
      if (c >= CW - 3 && c <= CW - 1) img2.setVisible(false);
    }

    for (let i = 0; i < 15; i++)
      this.add.rectangle(
        100 + Math.random() * (CW * CTILE - 200),
        100 + Math.random() * (CH * CTILE - 200),
        8, 8, 0x334455, 0.4
      ).setDepth(2);

    this.generateCaveTextures();

    const startX = 200;
    const startY = 400;

    this.playerSprite = this.add.sprite(startX, startY, "player_char").setDepth(10);
    this.playerNameLabel = this.add.text(startX, startY - 18, this.playerCharacter?.name || "???", {
      fontFamily: '"Press Start 2P"', fontSize: "5px", color: "#ffd700",
      backgroundColor: "rgba(0,0,0,0.7)", padding: { x: 2, y: 1 },
    }).setOrigin(0.5).setDepth(11);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = { W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W), A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A), S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S), D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D) };
    this.interactKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, CW * CTILE, CH * CTILE);

    this.drawCaveEnemies();

    const exitX = (CW - 1) * CTILE + CTILE / 2;
    const exitY = (CH - 1) * CTILE + CTILE / 2;
    this.add.text(exitX, exitY - 10, "USCITA", {
      fontFamily: '"Press Start 2P"', fontSize: "6px", color: "#ffcc00",
      backgroundColor: "rgba(0,0,0,0.7)", padding: { x: 2, y: 1 },
    }).setOrigin(0.5).setDepth(15);

    window.addEventListener("phaser:cave-disable-move", () => { this.movementDisabled = true; });
    window.addEventListener("phaser:cave-enable-move", () => { this.movementDisabled = false; });
  }

  setPlayerCharacter(character: Character): void {
    this.playerCharacter = character;
    if (this.playerNameLabel) this.playerNameLabel.setText(character.name);
  }

  endCombat(): void {
    this.combatActive = false;
    this.movementDisabled = false;
  }

  playCombatAnimation(ex: number, ey: number, won: boolean): void {
    this.cameras.main.shake(150, 0.005);
    const flash = this.add.rectangle(ex, ey, 20, 20, won ? 0x33ff33 : 0xff3333, 0.8).setDepth(50);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 2, scaleY: 2, duration: 400, onComplete: () => flash.destroy() });
    this.playerSprite.setTint(won ? 0x88ff88 : 0xff8888);
    this.time.delayedCall(300, () => this.playerSprite.clearTint());
  }

  defeatEnemySprite(enemyId: string): void {
    const e = this.enemySprites.find(es => es.def.id === enemyId);
    if (e) {
      this.tweens.add({ targets: [e.sprite, e.label], alpha: 0, duration: 500, onComplete: () => { e.sprite.destroy(); e.label.destroy(); } });
      this.enemySprites = this.enemySprites.filter(es => es.def.id !== enemyId);
    }
  }

  update(_time: number, delta: number): void {
    if (!this.playerSprite) return;
    (window as any).__playerPos = { x: this.playerSprite.x, y: this.playerSprite.y };
    this.updateCaveEnemies(delta);

    const speed = 160;
    let dx = 0, dy = 0;
    if (!this.movementDisabled) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) dx -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) dx += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) dy -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      const n = new Phaser.Math.Vector2(dx, dy).normalize();
      this.playerSprite.x += n.x * speed * (delta / 1000);
      this.playerSprite.y += n.y * speed * (delta / 1000);
      this.playerSprite.x = Phaser.Math.Clamp(this.playerSprite.x, 10, CW * CTILE - 10);
      this.playerSprite.y = Phaser.Math.Clamp(this.playerSprite.y, 10, CH * CTILE - 10);
      this.playerNameLabel.x = this.playerSprite.x;
      this.playerNameLabel.y = this.playerSprite.y - 18;
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.tryCaveInteract();
  }

  private drawCaveEnemies(): void {
    for (const def of CAVE_ENEMIES) {
      const hasSpr = this.textures.exists("spr_bandito");
      const sprite = hasSpr
        ? this.add.sprite(def.x, def.y, "spr_bandito").setDisplaySize(28, 28)
        : this.add.sprite(def.x, def.y, "npc_char").setDisplaySize(28, 28).setTint(0xff4444);
      sprite.setDepth(8);
      const label = this.add.text(def.x, def.y - 18, def.label, {
        fontFamily: '"Press Start 2P"', fontSize: "4px", color: "#ff6666",
        backgroundColor: "rgba(0,0,0,0.6)", padding: { x: 2, y: 1 },
      }).setOrigin(0.5).setDepth(9);
      this.enemySprites.push({ sprite, label, def, originX: def.x, originY: def.y, wanderTarget: { x: def.x, y: def.y }, wanderTimer: 0, chasing: false });
    }
  }

  private updateCaveEnemies(delta: number): void {
    if (!this.playerSprite) return;
    const px = this.playerSprite.x, py = this.playerSprite.y;
    for (const e of this.enemySprites) {
      const dist = Phaser.Math.Distance.Between(px, py, e.sprite.x, e.sprite.y);
      if (dist < CHASE_DIST) {
        e.chasing = true;
        const angle = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, px, py);
        e.sprite.x += Math.cos(angle) * ENEMY_SPEED * (delta / 1000);
        e.sprite.y += Math.sin(angle) * ENEMY_SPEED * (delta / 1000);
        if (dist < ATTACK_DIST && !this.combatActive && !this.movementDisabled) {
          this.combatActive = true;
          this.movementDisabled = true;
          e.sprite.setTint(0xff0000);
          window.dispatchEvent(new CustomEvent("phaser:cave-attack", {
            detail: { enemyId: e.def.id, enemyName: e.def.label, enemyX: e.sprite.x, enemyY: e.sprite.y },
          }));
        }
      } else {
        e.chasing = false;
        e.wanderTimer += delta;
        if (e.wanderTimer > 2000 + Math.random() * 2000) {
          e.wanderTimer = 0;
          const r = e.def.wanderRange;
          e.wanderTarget = { x: e.originX + (Math.random() - 0.5) * r * 2, y: e.originY + (Math.random() - 0.5) * r * 2 };
        }
        const wdist = Phaser.Math.Distance.Between(e.sprite.x, e.sprite.y, e.wanderTarget.x, e.wanderTarget.y);
        if (wdist > 3) {
          const angle = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, e.wanderTarget.x, e.wanderTarget.y);
          e.sprite.x += Math.cos(angle) * 30 * (delta / 1000);
          e.sprite.y += Math.sin(angle) * 30 * (delta / 1000);
        }
      }
      e.label.x = e.sprite.x;
      e.label.y = e.sprite.y - 16;
    }
  }

  private tryCaveInteract(): void {
    if (!this.playerSprite || this.combatActive) return;
    const px = this.playerSprite.x, py = this.playerSprite.y;

    for (const e of this.enemySprites) {
      const dist = Phaser.Math.Distance.Between(px, py, e.sprite.x, e.sprite.y);
      if (dist <= 55) {
        window.dispatchEvent(new CustomEvent("phaser:cave-attack", {
          detail: { enemyId: e.def.id, enemyName: e.def.label, enemyX: e.sprite.x, enemyY: e.sprite.y },
        }));
        return;
      }
    }

    const exitX = (CW - 1) * CTILE + CTILE / 2;
    const exitY = (CH - 1) * CTILE + CTILE / 2;
    if (Phaser.Math.Distance.Between(px, py, exitX, exitY) < 60) {
      window.dispatchEvent(new CustomEvent("phaser:cave-exit"));
    }
  }

  private generateCaveTextures(): void {
    if (this.textures.exists("player_char")) return;
    const draw = (g: Phaser.GameObjects.Graphics, bc: number, hc: number) => {
      g.fillStyle(bc); g.fillRect(7, 12, 14, 14);
      g.fillStyle(hc); g.fillCircle(14, 8, 6);
      g.fillStyle(0x000000); g.fillRect(10, 7, 2, 2); g.fillRect(16, 7, 2, 2);
    };
    const mk = (key: string, bc: number, hc: number) => { const g = this.add.graphics(); g.setVisible(false); draw(g, bc, hc); g.generateTexture(key, 28, 28); g.destroy(); };
    mk("player_char", 0x8b6914, 0xffd700);
    mk("npc_char", 0x555555, 0x888888);
  }
}
