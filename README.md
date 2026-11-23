# مذاكرة · Muthakara

تطبيق للدراسة بالمراجعة المتباعدة: ادرس صفحات قليلة كل يوم في جلسة قصيرة (مثل 15 دقيقة)، والتطبيق يذكّرك بمراجعتها بعد 1 ثم 3 ثم 7 ثم 14 ثم 30 ثم 60 يوماً حتى تثبت في ذاكرتك.

A spaced-repetition study app: study a few pages a day in a short session, then review each page after 1, 3, 7, 14, 30 and 60 days.

## المزايا · Features

- **لكل المراحل:** أول شاشة تختار فيها: طالب جامعي، طالب مدرسة، أو تتعلم لنفسك.
- **قراءة النص من الصور:** تصوّر الصفحة والتطبيق يقرأ النص (عربي وإنجليزي) ويقسمه لمقاطع قصيرة. القراءة تشتغل في نسخة الموقع بدون أي خادم خارجي. في الجوال تلصق النص أو تكتبه.
- **ذاكر على راحتك:** ولو نص صفحة، بدون حد يومي.
- **طريقة الحفظ:** التطبيق يقرأ المقطع بصوت مرة أو مرتين، ثم نظرة أخيرة على النص، ثم اختبار سريع.
- **الاختبار:** وقت للإجابة (30 أو 60 أو 90 ثانية)، والتطبيق يقول: صح، أو "قربت"، أو "حاول مرة ثانية" مع فرصة ثانية.
- **ألعاب:** أكمل الفراغ، اكتب من ذاكرتك، رتّب الكلمات، طابق. تختار لعبة لكل مادة وتغيّرها من داخلها.
- **المراجعة المتباعدة:** 1، 3، 7، 14، 30، 60 يوم، والنتيجة تحدد موعد الرجوع.
- **تنبيه يومي** بعبارة تشجيعية مختلفة كل يوم (في تطبيق الجوال).
- **أصوات من الطبيعة** بدون موسيقى، ونقاط ومستويات وإنجازات.
- **لغتان:** العربية (طالب/طالبة) والإنجليزية.
- **خصوصية:** كل البيانات محفوظة على الجهاز فقط. لو استخدمت مساعد Claude، النص اللي تختار ترتيبه بس يُرسل لـ Claude.

## التشغيل · Running it

```bash
npm install
npx expo start          # scan the QR code with Expo Go on your phone
npx expo start --web    # run in the browser
```

## الاختبارات · Checks

```bash
npm test                # scheduling, games, answer checking
npx tsc --noEmit
npx expo lint
```

## نشر الموقع · Web deploy

`netlify.toml` builds the web version with `npx expo export --platform web` and sets the
cross-origin isolation headers that the in-browser SQLite database needs. Connect the
repository in Netlify and it deploys on every push to `main`.

## مساعد Claude · Claude helper

زر **«رتّب بـ Claude»** في شاشة إضافة النص يصحّح أخطاء قراءة الصور، ويقسّم النص لمقاطع، ويكتب لكل مقطع كلمات مفتاحية وسؤال مراجعة. وزر **«اقترح بـ Claude»** في تفاصيل المقطع يكتب الكلمات والسؤال لمقطع موجود.

مفتاح Anthropic **ما يدخل الكود ولا المتصفح أبداً**: التطبيق يكلّم دالة Netlify (`netlify/functions/claude.mts`) وهي اللي تحمل المفتاح.

1. في Netlify: **Site configuration → Environment variables** أضف:
   - `ANTHROPIC_API_KEY` = مفتاحك من console.anthropic.com (علّم عليه Secret).
   - `MUTHAKARA_ACCESS_CODE` = أي كلمة سر تختارها. بدونها الدالة ترفض كل الطلبات، عشان ما أحد يستهلك رصيدك من الموقع العام.
2. أعد النشر (Deploys → Trigger deploy).
3. في التطبيق: **الإعدادات → مساعد Claude** واكتب نفس كلمة السر. تنحفظ في جهازك بس.

The helper uses `claude-opus-5-5` through the official `@anthropic-ai/sdk`. The key stays in the Netlify
environment; the app only sends the access code. For a phone build, set `EXPO_PUBLIC_AI_URL` to
`https://<your-site>.netlify.app/.netlify/functions/claude`. Locally, run `npx netlify dev` so the
function is served next to the app.

## هيكل الكود · Code layout

| Path | What it holds |
| --- | --- |
| `src/app/` | Screens (Expo Router): home, welcome, study, review, subject, page, settings, games |
| `src/components/` | Shared UI, page viewer, points/achievement toasts |
| `src/lib/srs.ts` | Review scheduling (intervals, grades) |
| `src/lib/game.ts` | Points, levels, achievements, puzzle generators |
| `src/lib/db.ts` | SQLite schema and queries |
| `src/lib/i18n.ts` | Arabic (male/female) and English text |
| `src/lib/text.ts` | Splitting text into parts, checking typed answers |
| `src/lib/ai.ts` | Calls the Claude helper (split text, key words, questions) |
| `netlify/functions/claude.mts` | Server side of the Claude helper; holds the API key |
| `src/lib/ocr.web.ts` | Reading text from photos in the browser (Tesseract, self-hosted in `public/ocr`) |
| `src/lib/speech.ts` | Reading passages aloud |
| `scripts/copy-ocr-assets.js` | Copies the OCR engine into `public/ocr` after `npm install` |
| `scripts/make-sounds.py` | Generates the sound effects in `assets/sounds/` |
