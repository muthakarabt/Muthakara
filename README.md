# مذاكرة · Muthakara

تطبيق للدراسة بالمراجعة المتباعدة: ادرس صفحات قليلة كل يوم في جلسة قصيرة (مثل 15 دقيقة)، والتطبيق يذكّرك بمراجعتها بعد 1 ثم 3 ثم 7 ثم 14 ثم 30 ثم 60 يوماً حتى تثبت في ذاكرتك.

A spaced-repetition study app: study a few pages a day in a short session, then review each page after 1, 3, 7, 14, 30 and 60 days.

## المزايا · Features

- **إضافة المحتوى:** تصوير الصفحات بالكاميرا، أو اختيار صور من المعرض، أو رفع ملف PDF وتحديد الصفحات.
- **جلسات يومية قصيرة:** مؤقت لهدف الدقائق اليومي، وعدد محدد من الصفحات الجديدة كل يوم.
- **التثبيت:** تحت كل صفحة تكتب كلمات مفتاحية وسؤالاً لنفسك.
- **المراجعة:** يظهر سؤالك أولاً لتتذكر، ثم تكشف الصفحة وتقيّم نفسك (تذكرت / بصعوبة / نسيت).
- **ألعاب التذكر:** "أكمل الفراغ" و"طابق الأزواج"، مبنية من ملاحظاتك أنت.
- **نقاط ومستويات وإنجازات** وسلسلة أيام متتالية.
- **أصوات تشجيع قصيرة** بدون موسيقى (يمكن إيقافها).
- **لغتان:** العربية والإنجليزية، مع صيغة طالب/طالبة في العربية، ورسائل تشجيع باسم المستخدم.
- **تذكير يومي** في الوقت الذي تختاره (في تطبيق الجوال).
- **خصوصية:** كل البيانات محفوظة على الجهاز فقط، بدون خادم أو اشتراك.

## التشغيل · Running it

```bash
npm install
npx expo start          # scan the QR code with Expo Go on your phone
npx expo start --web    # run in the browser
```

## الاختبارات · Checks

```bash
node --experimental-strip-types --test src/lib/*.test.ts   # scheduling + game logic
npx tsc --noEmit
npx expo lint
```

## نشر الموقع · Web deploy

`netlify.toml` builds the web version with `npx expo export --platform web` and sets the
cross-origin isolation headers that the in-browser SQLite database needs. Connect the
repository in Netlify and it deploys on every push to `main`.

## هيكل الكود · Code layout

| Path | What it holds |
| --- | --- |
| `src/app/` | Screens (Expo Router): home, welcome, study, review, subject, page, settings, games |
| `src/components/` | Shared UI, page viewer, points/achievement toasts |
| `src/lib/srs.ts` | Review scheduling (intervals, grades) |
| `src/lib/game.ts` | Points, levels, achievements, puzzle generators |
| `src/lib/db.ts` | SQLite schema and queries |
| `src/lib/i18n.ts` | Arabic (male/female) and English text |
| `scripts/make-sounds.py` | Generates the sound effects in `assets/sounds/` |
