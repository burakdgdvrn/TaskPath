# TaskPath — Walkthrough (Faz 1-2-3)

## Yapılanlar

Faz 1-2-3 kapsamında **tüm frontend** sıfırdan inşa edildi. Şu an uygulama `http://localhost:5173` adresinde çalışıyor.

### Oluşturulan Dosyalar

| Dosya | Açıklama |
|-------|----------|
| [index.css](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/styles/index.css) | Tam design system (700+ satır CSS) |
| [App.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/App.jsx) | Router + auth guard |
| [authStore.js](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/stores/authStore.js) | Zustand auth state |
| [boardStore.js](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/stores/boardStore.js) | Board/Node/Edge CRUD |
| [uiStore.js](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/stores/uiStore.js) | Modal & sidebar state |
| [LoginPage.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/pages/LoginPage.jsx) | Giriş sayfası |
| [RegisterPage.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/pages/RegisterPage.jsx) | Kayıt sayfası |
| [DashboardPage.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/pages/DashboardPage.jsx) | Board kartları + oluşturma |
| [BoardPage.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/pages/BoardPage.jsx) | React Flow canvas |
| [AppLayout.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/components/layout/AppLayout.jsx) | Ana layout |
| [Sidebar.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/components/layout/Sidebar.jsx) | Board navigasyonu |
| [TopBar.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/components/layout/TopBar.jsx) | Üst çubuk |
| [CustomNode.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/components/canvas/CustomNode.jsx) | Glassmorphism görev kartı |
| [CanvasToolbar.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/components/canvas/CanvasToolbar.jsx) | Floating toolbar |
| [NodeDetailPanel.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/components/canvas/NodeDetailPanel.jsx) | Sağ panel (düzenleme) |
| [CreateNodeModal.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/components/canvas/CreateNodeModal.jsx) | Yeni görev modalı |
| [CreateBoardModal.jsx](file:///c:/Users/burak/Desktop/Kodlama/TaskPath/frontend/src/components/board/CreateBoardModal.jsx) | Yeni board modalı |

---

## Ekran Görüntüleri

### Login Sayfası
Koyu tema, gradient arka plan, glassmorphism kart, demo bilgileri.

![Login Sayfası](C:\Users\burak\.gemini\antigravity-ide\brain\afd0c49c-7c38-4a73-8802-dae33b59a347\login_page_1787761086554.png)

### Dashboard
Ortak ve özel projeler ayrı ayrı listeleniyor. Kart hover efektleri ve stagger animasyonları.

![Dashboard](C:\Users\burak\.gemini\antigravity-ide\brain\afd0c49c-7c38-4a73-8802-dae33b59a347\dashboard_page_1787761116911.png)

### Canvas (Board Sayfası)
5 demo node + bağlantılar. Status renkleri (Tamamlandı=teal, Filiz=yeşil, Tohum=gri). Tag chip'leri, assignee avatarları, minimap.

![Canvas](C:\Users\burak\.gemini\antigravity-ide\brain\afd0c49c-7c38-4a73-8802-dae33b59a347\board_canvas_page_1787761141889.png)

### Görev Detay Paneli
Node'a tıklayınca sağdan slide-in. Başlık, açıklama, durum, öncelik, atanan kişi, etiketler düzenlenebilir.

![Detay Paneli](C:\Users\burak\.gemini\antigravity-ide\brain\afd0c49c-7c38-4a73-8802-dae33b59a347\priority_details_high_1787761851400.png)

---

## Çalışan Özellikler

| Özellik | Durum |
|---------|-------|
| ✅ Login / Register | Demo kullanıcılarla çalışıyor |
| ✅ Dashboard | Board kartları, ortak/özel ayrımı |
| ✅ Board oluşturma | Modal ile isim, açıklama, görünürlük |
| ✅ Canvas (React Flow) | Node render, zoom, pan, fit view |
| ✅ Custom Node | Glassmorphism, status bar, priority, tags, avatar |
| ✅ Node ekleme | Çift tıklama + N tuşu + toolbar butonu |
| ✅ Node düzenleme | Sağ panel (status, priority, tags, assignee) |
| ✅ Edge oluşturma | Sürükle-bırak bağlantı |
| ✅ Undo / Redo | Ctrl+Z / Ctrl+Y |
| ✅ Minimap | Sağ alt köşede |
| ✅ Animasyonlar | Node filizlenme (spring), kart hover, modal açılış, panel slide |
| ✅ Auto-save | 500ms debounce ile localStorage'a kayıt |
| ✅ Keyboard shortcuts | N (yeni), Ctrl+Z (undo), Ctrl+Y (redo), Esc (kapat), Delete (sil) |

---

## Kullanım

```bash
cd frontend
npm run dev
# → http://localhost:5173

# Demo giriş: burak / demo123
```

## Tamamlanan Sonraki Adımlar (Faz 4-5)
- ✅ FastAPI backend + PostgreSQL veritabanı altyapısı kuruldu (`backend` klasörü ve `.env` yapılandırması).
- ✅ WebSocket gerçek zamanlı işbirliği entegre edildi (`useWebSocket.js`).
- ✅ Command Palette arama özelliği eklendi (Frontend'de `Ctrl+K` ile global arama ekranı tasarlandı).
- ✅ Mini-Wiki Node tipi eklendi (`WikiNode.jsx`). Artık uzun notlar alınabilecek.
- ✅ Deployment dosyaları hazırlandı (`docker-compose.yml`, `render.yaml`, `vercel.json`).

Tüm sistem artık Vercel ve Render üzerinden canlıya çıkmaya veya `docker-compose up -d` ile yerelde backend + DB kaldırmaya hazırdır.
