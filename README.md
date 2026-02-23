# Study Tracker

Tam donanımlı, güvenli çalışma takip uygulaması.

## Özellikler

| Katman | Detay |
|--------|-------|
| **Auth** | JWT (15 dk access + 7 gün refresh), token rotasyonu, oturum yönetimi, bcrypt şifreleme |
| **Kayıt** | Günlük saat, konu, notlar, ruh hali (1-5) |
| **Dashboard** | Haftalık bar grafik, donut ring hedef, seri sayacı, konu dağılımı |
| **Geçmiş** | Aylık ısı haritası + liste görünümü |
| **Hedefler** | Renk etiketli hedef kartları, ilerleme çubukları |
| **Ayarlar** | Profil, şifre değiştirme, aktif oturumlar, tüm cihazlardan çıkış |
| **DB** | SQLite (WAL, FK) — sıfır kurulum |
| **Responsive** | Mobil uyumlu sidebar + hamburger menü |

## Kurulum & Çalıştırma

```powershell
npm install
npm start
```

Ardından tarayıcıdan: `http://localhost:3000`

### Geliştirme (auto-reload)

```powershell
npm run dev
```

## Proje Yapısı

```
├── server.js          ← Express giriş noktası
├── server/
│   ├── db.js          ← SQLite schema & bağlantı
│   ├── auth.js        ← JWT yardımcıları
│   ├── middleware.js  ← authenticate / optionalAuth
│   ├── authRoutes.js  ← /auth/...
│   └── apiRoutes.js   ← /api/...
├── public/
│   ├── index.html
│   ├── css/app.css
│   └── js/
│       ├── api.js     ← Fetch + token yenileme
│       ├── charts.js  ← Canvas çizimler
│       └── app.js     ← Uygulama mantığı
└── .env               ← JWT_SECRET & PORT
```
