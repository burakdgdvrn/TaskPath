# TaskPath — Proje Durum Raporu & Faz 4-5 Görev Listesi

> **Bu dosya yenilenen oturumda bağlamı hızlıca anlamak içindir.**

---

## 📍 Proje Nedir?
**TaskPath** — Sen ve arkadaşların için organik büyüyen, canvas tabanlı görev haritası.
- Ortak projeler herkes görür, özel projeler sadece sahibi görür
- Trello/Jira alternatifi — node-based visual task management
- Kâr amacı yok, kişisel kullanım

## 📂 Proje Konumu
```
c:\Users\burak\Desktop\Kodlama\TaskPath\
├── frontend/          ← React + Vite (TAM ÇALIŞIYOR)
├── backend/           ← FastAPI (HENÜZ OLUŞTURULMADI)
└── Organic_Flow_Implementation_Plan.pdf  ← Orijinal plan
```

## 🛠 Tech Stack
| Katman | Teknoloji | Durum |
|--------|-----------|-------|
| Frontend | React 18 + Vite + React Flow + Zustand + Framer Motion | ✅ Hazır |
| Backend | FastAPI + SQLAlchemy + Alembic + PostgreSQL | ⏳ Yapılacak |
| Auth | JWT (bcrypt + PyJWT) | ⏳ Yapılacak |
| Realtime | WebSockets (FastAPI native) | ⏳ Yapılacak |
| Deployment | Vercel (frontend) + Render (backend) + Neon (DB) | ⏳ Yapılacak |

## ✅ Tamamlanan İşler (Faz 1-2-3 Frontend)

Şu an uygulama `cd frontend && npm run dev` ile `localhost:5173`'te çalışıyor.
Veriler **localStorage**'da tutuluyor (backend yokken çalışması için).

### Oluşturulan Dosyalar:
- `frontend/src/styles/index.css` — 700+ satır design system (dark theme, glassmorphism)
- `frontend/src/App.jsx` — React Router + auth guard
- `frontend/src/stores/authStore.js` — Zustand auth (localStorage, mock users)
- `frontend/src/stores/boardStore.js` — Board/Node/Edge CRUD (localStorage)
- `frontend/src/stores/uiStore.js` — Modal & sidebar state
- `frontend/src/pages/LoginPage.jsx` — Giriş (demo: burak/demo123)
- `frontend/src/pages/RegisterPage.jsx` — Kayıt
- `frontend/src/pages/DashboardPage.jsx` — Board kartları (ortak/özel)
- `frontend/src/pages/BoardPage.jsx` — React Flow canvas (271 satır, en karmaşık dosya)
- `frontend/src/components/layout/AppLayout.jsx` — Layout wrapper
- `frontend/src/components/layout/Sidebar.jsx` — Board navigasyonu
- `frontend/src/components/layout/TopBar.jsx` — Üst çubuk + breadcrumb
- `frontend/src/components/canvas/CustomNode.jsx` — Glassmorphism görev kartı
- `frontend/src/components/canvas/CanvasToolbar.jsx` — Floating toolbar (zoom, undo/redo)
- `frontend/src/components/canvas/NodeDetailPanel.jsx` — Sağ panel (görev düzenleme)
- `frontend/src/components/canvas/CreateNodeModal.jsx` — Yeni görev modalı
- `frontend/src/components/board/CreateBoardModal.jsx` — Yeni board modalı

### Çalışan Özellikler:
- ✅ Login / Register (localStorage mock)
- ✅ Dashboard (board grid, ortak/özel ayrımı)
- ✅ Board oluşturma (isim, açıklama, shared/private)
- ✅ Canvas (React Flow, zoom, pan, fit view, minimap)
- ✅ Custom Node (status bar, priority indicator, tags, avatar)
- ✅ Node ekleme (çift tıklama + N tuşu + toolbar)
- ✅ Node düzenleme (sağ panel: status, priority, tags, assignee)
- ✅ Edge oluşturma (sürükle-bırak)
- ✅ Undo / Redo (Ctrl+Z / Ctrl+Y)
- ✅ Animasyonlar (Framer Motion: spring, stagger, slide)
- ✅ Auto-save (500ms debounce → localStorage)
- ✅ Keyboard shortcuts (N, Ctrl+Z, Ctrl+Y, Esc, Delete)

---

## ⏳ Faz 4: Backend + Gerçek Zamanlı İşbirliği

### 4.1 — FastAPI Projesi Kurulumu
- [x] `backend/` klasörü oluştur
- [x] `backend/requirements.txt` — fastapi, uvicorn, sqlalchemy, alembic, pydantic, python-jose, bcrypt, psycopg2-binary
- [x] `backend/app/main.py` — FastAPI app, CORS, router mount
- [x] `backend/app/config.py` — Ayarlar (DB URL, JWT secret, vb.)
- [x] `backend/app/database.py` — SQLAlchemy engine + session

### 4.2 — Veritabanı Modelleri
- [x] `backend/app/models/user.py` — id, username, email, password_hash, display_name, avatar_color, created_at
- [x] `backend/app/models/board.py` — id, name, description, owner_id, visibility (private/shared), timestamps
- [x] `backend/app/models/board_member.py` — board_id, user_id, role (owner/editor/viewer)
- [x] `backend/app/models/node.py` — id, board_id, label, node_type, status, priority, description, position_x, position_y, tags, assigned_to, due_date, timestamps
- [x] `backend/app/models/edge.py` — id, board_id, source_id, target_id, edge_type, label, created_at
- [x] Alembic init + ilk migration

### 4.3 — Pydantic Şemaları
- [x] `backend/app/schemas/user.py` — UserCreate, UserLogin, UserResponse
- [x] `backend/app/schemas/board.py` — BoardCreate, BoardUpdate, BoardResponse
- [x] `backend/app/schemas/node.py` — NodeCreate, NodeUpdate, NodeResponse
- [x] `backend/app/schemas/edge.py` — EdgeCreate, EdgeResponse

### 4.4 — Auth Endpointleri
- [x] `POST /api/auth/register` — Kayıt (bcrypt hash)
- [x] `POST /api/auth/login` — JWT token dön
- [x] `GET /api/auth/me` — Token doğrula, kullanıcı bilgisi dön
- [x] JWT middleware (dependency injection)

### 4.5 — Board CRUD
- [x] `GET /api/boards` — Kullanıcının görebildiği boardlar
- [x] `POST /api/boards` — Yeni board
- [x] `PATCH /api/boards/:id` — Board güncelle
- [x] `DELETE /api/boards/:id` — Board sil
- [x] `POST /api/boards/:id/invite` — Kullanıcı davet et

### 4.6 — Node & Edge CRUD
- [x] `GET /api/boards/:id/nodes` — Board'daki tüm node'lar
- [x] `POST /api/boards/:id/nodes` — Node ekle
- [x] `PATCH /api/nodes/:id` — Node güncelle (label, status, position, priority, tags)
- [x] `DELETE /api/nodes/:id` — Node sil
- [x] `POST /api/boards/:id/edges` — Edge ekle
- [x] `DELETE /api/edges/:id` — Edge sil

### 4.7 — Frontend'i API'ye Bağla
- [x] `frontend/src/services/api.js` — Axios/fetch wrapper + JWT interceptor
- [x] `authStore.js`'i gerçek API'ye bağla (login/register → fetch)
- [x] `boardStore.js`'i gerçek API'ye bağla (CRUD → fetch)
- [x] localStorage fallback'i kaldır

### 4.8 — WebSocket Gerçek Zamanlı İşbirliği
- [x] `backend/app/websockets/board_ws.py` — WebSocket endpoint: `ws://api/ws/board/:id`
- [x] `backend/app/services/ws_manager.py` — Connection manager
- [x] Mesaj tipleri: `node:create`, `node:update`, `node:delete`, `node:move`, `edge:create`, `edge:delete`, `cursor:move`
- [x] `frontend/src/hooks/useWebSocket.js` — Board'a bağlanma, mesaj dinleme
- [x] Canlı cursor paylaşımı (Figma tarzı renkli cursor + kullanıcı adı)
- [x] Optimistic updates (lokalde anında güncelle, sunucudan onay bekle)
- [x] Pessimistic locking ("X düzenliyor" badge)

---

## ⏳ Faz 5: Akıllı Özellikler & Deployment

### 5.1 — Arama & Filtreleme
- [x] Backend: `GET /api/search?q=...&board_id=...`
- [x] Frontend: Command Palette (Ctrl+K) — global arama + hızlı aksiyonlar
- [ ] Filtreleme paneli: tag, priority, assignee, status bazlı

### 5.2 — Mini-Wiki Node Tipi
- [x] Node type "wiki" — çözüm notlarını yeşil glassmorphism kart olarak kaydet
- [ ] Zengin metin editörü (basit markdown veya contenteditable)

### 5.3 — Ek Özellikler
- [ ] Keyboard shortcuts genişlet: Ctrl+S (manuel kaydet)
- [ ] Board ayarları sayfası (isim, açıklama, üye yönetimi)
- [ ] Responsive tasarım iyileştirmeleri (tablet)

### 5.4 — Deployment
- [x] Docker Compose (backend + PostgreSQL dev ortamı)
- [x] Frontend → Vercel'e deploy
- [x] Backend → Render'a deploy (free tier)
- [ ] PostgreSQL → Neon veya Supabase (free tier)
- [ ] Ücretsiz domain bağlama
- [ ] `.env.example` dosyası
- [ ] `README.md` (kurulum + kullanım kılavuzu)

### 5.5 — Test
- [ ] Backend: pytest ile temel API testleri
- [ ] Frontend: Vitest ile store testleri

---

## 🔑 Önemli Mimari Notlar

1. **Frontend şu an localStorage ile çalışıyor.** Backend gelince `boardStore.js` ve `authStore.js` içindeki localStorage çağrıları gerçek API çağrılarıyla değiştirilecek.
2. **DB şeması** implementation_plan.md'deki ER diyagramında detaylı.
3. **Kullanıcı tercihleri:** Kişisel proje, kâr amacı yok, arkadaş grubu. Auth basit tutulmalı (OAuth gereksiz).
4. **Proje ismi:** TaskPath (Organic Flow değil).
5. **Deployment:** Ücretsiz hosting isteniyor (Vercel + Render + Neon).

## 📌 Öncelik Sırası
```
Faz 4.1-4.6 (Backend kurulum + CRUD)  →  EN ÖNCELİKLİ
Faz 4.7 (Frontend-API bağlantısı)     →  YÜKSEK
Faz 4.8 (WebSocket)                    →  ORTA
Faz 5.4 (Deployment)                   →  ORTA
Faz 5.1-5.3 (Arama, Wiki, Extra)      →  DÜŞÜK
Faz 5.5 (Test)                         →  DÜŞÜK
```
