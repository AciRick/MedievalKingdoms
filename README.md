# Regni Medievali — MMORPG Sandbox a 8-bit

Gioco di ruolo multiplayer locale (LAN) a tema dark fantasy medievale, sviluppato come progetto di classe.

## Prerequisiti

- **Node.js 20+** e **npm**
- Windows, macOS o Linux
- Firewall configurato per consentire il traffico sulle porte `3001` e `5173` (solo rete privata)

---

## Setup rapido

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Modifica .env se necessario (PORT, JWT_SECRET, ADMIN_PASSWORD, etc.)
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Il server parte su `http://0.0.0.0:3001`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run fetch:assets   # Scarica gli asset grafici (vedi sotto)
npm run dev
```

Vite si avvia su `http://0.0.0.0:5173`.

### 3. Giocare in LAN (Windows)

1. Apri il terminale e digita `ipconfig`. Prendi l'**indirizzo IPv4** (es. `192.168.1.42`).
2. **Windows Defender Firewall**: consenti a Node.js l'accesso sulla rete privata per le porte `3001` e `5173`.
   - Pannello di controllo → Windows Defender Firewall → Consenti app attraverso il firewall → Aggiungi `node.exe`.
3. Modifica `frontend/.env`:
   ```
   VITE_API_URL=http://192.168.1.42:3001
   VITE_WS_URL=http://192.168.1.42:3001
   ```
4. Riavvia il frontend con `npm run dev`.
5. I compagni aprono `http://192.168.1.42:5173` nel loro browser.

---

## Credenziali predefinite

| Ruolo | Username | Password |
|-------|----------|----------|
| Admin | `admin`  | `admin123` (personalizzabile in `.env` con `ADMIN_PASSWORD`) |

Personaggi NPC:
- **Papa**: personaggio speciale `isPope=true`
- **Re del Nord**: re del Villaggio del Nord
- **Re del Sud**: re del Villaggio del Sud
- ~6 PNG erranti (mercante, guardia, pescatore, druido, fabbro, giullare)

---

## Struttura del progetto

```
/
├── backend/          Server Express + Socket.IO + Prisma
├── frontend/         Client React + Vite + Phaser 3
├── uploads/          File caricati (volti, grida di battaglia)
├── README.md         Questo file
└── CREDITS.md        Crediti asset
```

---

## Asset grafici

### Scaricare gli asset

```bash
cd backend
npm run fetch:assets
```

Questo script scarica e decomprime automaticamente:
- **Kenney Tiny Dungeon** (CC0)
- **Kenney Tiny Town** (CC0)
- **LPC Base Characters** (CC-BY-SA 3.0 / GPL)
- **Game-Icons.net** SVG subset (CC-BY 3.0)
- **Lospec Oil-6 palette** (pubblico dominio)

Se gli asset non sono presenti, il gioco mostra una griglia colorata segnaposto con il messaggio "Esegui `npm run fetch:assets` per scaricare gli sprite".

---

## Pannello Admin

Accessibile alla rotta `/admin`. Richiede l'header `X-Admin-Password` con il valore di `ADMIN_PASSWORD`.
Funzionalità:
- Attivare eventi globali (terremoto, carestia, guerra, inverno rigido, bottino casuale)
- Scomunicare / perdonare personaggi
- Attivare/disattivare modalità "Genocidio" (richiede 3 conferme)
- Visualizzare log delle azioni
- Vedere i giocatori connessi

---

## Estendere il gioco

### Aggiungere un nuovo ruolo

1. Inserisci il ruolo nel seed (`backend/prisma/seed.ts`) nell'array `ROLES`.
2. Aggiungi modificatori statistici e ID equipaggiamento consentito nel campo JSON.
3. Il frontend lo carica automaticamente da `GET /api/world/roles`.

### Aggiungere un nuovo evento globale

1. Aggiungi il tipo evento in `backend/src/admin/routes.ts` nel case dello switch.
2. Implementa la logica di broadcast in `backend/src/sockets/world-events.ts`.
3. Aggiungi il listener nel frontend in `src/scenes/WorldScene.ts`.

### Aggiungere una nuova zona della mappa

1. Aggiungi la zona in `backend/src/world/seed-data.ts` nell'array `ZONES`.
2. Aggiungi i tile corrispondenti nel tilemap hard-coded di `frontend/src/scenes/WorldScene.ts`.
3. Aggiorna `MiniMap.tsx` per disegnare la nuova zona.

---

## English Quick Start

```bash
# Terminal 1 — Backend
cd backend && npm install && cp .env.example .env
npm run prisma:migrate && npm run prisma:seed && npm run dev

# Terminal 2 — Frontend
cd frontend && npm install && cp .env.example .env
npm run fetch:assets && npm run dev
```

Default LAN IP: find with `ipconfig` (Windows), set in `frontend/.env` as `VITE_API_URL` and `VITE_WS_URL`.

Default admin: `admin` / `admin123`.

---

## Licenza

Codice: MIT
Asset: vedi `CREDITS.md` per le licenze individuali.
