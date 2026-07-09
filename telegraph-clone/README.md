# o'z-nashriyot — telegra.ph uslubidagi shaxsiy nashr sayti

Bu loyiha to'liq sizniki: kodni istalgan joyga (o'z serveringiz, VPS, Railway, Render va h.k.) joylashtira olasiz. Hech qanday tashqi xizmatga bog'liq emas — barcha maqolalar `data/articles.json` faylida saqlanadi.

## Kompyuteringizda ishga tushirish

1. [Node.js](https://nodejs.org) o'rnatilgan bo'lishi kerak (18+ versiya tavsiya etiladi).
2. Terminalda loyiha papkasiga kiring:
   ```
   cd telegraph-clone
   npm install
   npm start
   ```
3. Brauzerda oching: `http://localhost:3000`

## Qanday ishlaydi

- Bosh sahifada sarlavha va matn kiritib "Nashr qilish" bosasiz.
- Sizni avtomatik `/{slug}?edit_token={token}` sahifasiga yo'naltiradi — shu sahifa **sizga tegishli nusxa**, chunki `edit_token` faqat sizda.
- Shu havolani saqlab qo'ying (brauzer xatchalig'i/bookmark qiling) — token orqali istalgan payt tahrirlay olasiz.
- Boshqalar bilan ulashish uchun `edit_token`siz oddiy `/{slug}` havolasini yuboring — ular faqat o'qiy oladi, tahrirlay olmaydi.
- Ma'lumotlar faylga yoziladi, shuning uchun serverni qayta ishga tushirsangiz ham maqolalar yo'qolmaydi.

## Internetga chiqarish (o'zingizga tegishli domen bilan)

Eng oson yo'llar:

- **Railway.app** yoki **Render.com** — GitHub repo yuklab, "Deploy" bosish kifoya (ikkalasida ham bepul tarif bor).
- **O'z VPS** (masalan DigitalOcean, Timeweb) — kodni serverga yuklab, `npm install && npm start` qiling, keyin `pm2` yoki `systemd` bilan doim ishlab tursin qilib sozlang, `nginx` orqali domeningizga ulang.

Har qanday holatda ham bu — sizning kodingiz, xohlagan joyda, xohlagan nom bilan joylashtirasiz.

## Keyingi qadamlar (xohlasangiz qo'shsa bo'ladi)

- Rasm yuklash imkoniyati
- Markdown formatlash (qalin, kursiv, sarlavhalar)
- O'z profilingizdagi barcha maqolalar ro'yxati (hozircha har bir maqola alohida havola orqali ochiladi)
- Haqiqiy foydalanuvchi tizimi (login/parol) — hozir "token = kalit" tamoyili bilan ishlaydi, telegra.ph ham xuddi shunday ishlaydi

Savol yoki qo'shimcha funksiya kerak bo'lsa — ayting, qo'shib beraman.
