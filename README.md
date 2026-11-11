# VisionSeek Web – Django + React

واجهة الويب الكاملة لمشروع **VisionSeek AI**: باك إند **Django (REST)** + فرونت إند **React (Vite)**، مربوطة بـ API الذكاء الاصطناعي (FastAPI) الموصوف في `API.md`.

```
React (5173)  ──/api──►  Django (8000)  ──X-API-Key──►  VisionSeek AI API (رابط cloudflare)
   │                         │
   │                         ├─ حسابات المستخدمين (Token)
   │                         ├─ سجل الفيديوهات المرفوعة + سجل البحث
   │                         └─ القضايا (Cases) + الأدلة + القرارات + التقرير
```

Django هو الوسيط: المتصفح مش بيكلّم سيرفر الذكاء الاصطناعي مباشرة، فمفتاح الـ API بيفضل على السيرفر، وكل الأخطاء بترجع بشكل موحّد `{"detail": "..."}`.

## المميزات

| الصفحة | الوظيفة | الـ AI endpoint |
|---|---|---|
| الرئيسية | حالة سيرفر الـ AI، أعداد، آخر الفيديوهات وعمليات البحث | `GET /health` |
| البحث | بحث بالعربي/الإنجليزي + فلاتر (كاميرا، شارع، نوع، وقت، حد أدنى للتطابق)، صور المسار، نسبة التطابق، حالة "مفيش تطابق جيد"، الكلمات غير المفهومة | `GET /api/v1/search` |
| الفيديوهات | رفع فيديو مع شريط تقدّم، متابعة المراحل لحظياً (تحديث كل 3 ثواني)، عرض المسارات وصورها | `POST /api/v1/videos`, `GET /videos/{code}`, `/tracks`, `/crops` |
| الأحداث | دخول/خروج منطقة، وقوف طويل، تجمّع، عبور خط + فلاتر | `GET /api/v1/events` |
| القضايا | تجميع نتائج البحث والمسارات والأحداث في قضية، خط زمني، تأكيد/رفض كل دليل، ملاحظات المحقق | (Django) |
| التقرير | تقرير قابل للطباعة/PDF: ملخص، خط زمني بالصور، وتنبيهات (عناصر لم تُراجع، تطابق ضعيف، فجوات زمنية، تعارض كاميرات) | (Django) |
| الكاميرات | إضافة/تعديل كاميرا وموقعها (الشارع) | `GET/POST /api/v1/cameras` |

- الواجهة **عربي (RTL) وإنجليزي** بزر واحد، و**وضع فاتح/داكن**، وتشتغل على الموبايل.
- **لوحة أوامر** بـ `Ctrl+K`: بحث سريع في التسجيلات، فتح فيديو بالكود، أو قضية، أو أي صفحة.
- **رسوم بيانية** في لوحة التحكم والأحداث (الأحداث عبر الوقت، حسب النوع، حسب الكاميرا، عمليات البحث، تقدّم مراجعة الأدلة).
- **خط زمني للمسارات** في كل فيديو، و**عرض عبر الكاميرات** في كل قضية وفي التقرير.
- زرار **"مزامنة من سيرفر الذكاء الاصطناعي"** في صفحة الفيديوهات بيجيب الفيديوهات اللي اتعالجت على السيرفر بالـ batch (الـ AI API مافيهوش endpoint لعرض الفيديوهات، فـ Django بيدوّر على VID-0001 لحد VID-0080).
- كل الأوقات بتظهر بتوقيت **القاهرة**؛ والأوقات اللي بتتكتب في الفورم بتتبعت من غير offset (فسيرفر الـ AI بيقرأها بتوقيت القاهرة زي ما في `API.md`).
- النتائج بتتعرض كـ **مرشّحين** مع دليلهم (كاميرا، فيديو، فريم، صورة)، ومفيش أي تعرّف على الوجوه.

## التشغيل لأول مرة (Windows)

المتطلبات: Python 3.10+ و Node.js 18+.

```bash
setup.bat
```

بعدها اعمل حساب أدمن (اختياري، للوحة `/admin`):

```bash
backend\.venv\Scripts\python backend\manage.py createsuperuser
```

ثم شغّل الاتنين مع بعض:

```bash
start.bat
```

أو كل واحد لوحده: `run_backend.bat` (Django على `http://127.0.0.1:8000`، نفس `python manage.py runserver`) و `run_frontend.bat` (React على `http://localhost:5173`).
افتح `http://localhost:5173` واعمل حساب من شاشة الدخول.

## الربط بسيرفر الذكاء الاصطناعي ⚠️

الإعدادات في `backend\.env`:

```ini
# رابط سيرفر الـ AI من غير /docs ومن غير / في الآخر
VISIONSEEK_BASE_URL=https://xxxx-xxxx.trycloudflare.com
# لو سيرفر الـ AI فيه api_key.txt حط نفس المفتاح هنا، غير كده سيبه فاضي
VISIONSEEK_API_KEY=
# 0 = استخدم السيرفر الحقيقي
VISIONSEEK_MOCK=0
```

وبعدين أعد تشغيل `run_backend.bat`. النقطة الخضرا/الحمرا أعلى الصفحة بتوضح إذا كان سيرفر الـ AI متصل.

> **ملاحظة:** الرابط اللي اتبعت (`senate-cordless-pants-charts.trycloudflare.com`) **مش شغّال دلوقتي**: الـ DNS بتاعه مش موجود.
> روابط `trycloudflare.com` المؤقتة بتتغيّر كل مرة `cloudflared` يتقفل ويتفتح. اطلب الرابط الجديد من اللي مشغّل سيرفر الـ AI وحطه في `VISIONSEEK_BASE_URL`.
> كمان Cloudflare بيرفض الطلبات اللي أكبر من حوالي **100 ميجا**، فالفيديوهات الكبيرة ارفعها على سيرفر محلي أو استخدم `batch.bat` على جهاز الـ AI.

### الوضع التجريبي (Mock)

لحد ما يبقى فيه رابط شغّال، `.env` الافتراضي فيه `VISIONSEEK_MOCK=1` و `VISIONSEEK_BASE_URL=http://127.0.0.1:8000/mock`.

> لو شغّلت Django على بورت تاني (مثلاً لو سيرفر الـ AI شغال على نفس الجهاز على 8000): غيّر البورت في `VISIONSEEK_BASE_URL` بتاع الـ mock، وشغّل الفرونت بـ `set BACKEND_URL=http://127.0.0.1:8001 && npm run dev`.
ده سيرفر وهمي جوه Django بيرجّع **نفس شكل الـ JSON** الموجود في `API.md` (كاميرتين وفيديوهين جاهزين، ورفع فيديو بيعدّي على المراحل في حوالي 12 ثانية، والبحث بالألوان، والأحداث).
بياناته في الذاكرة بس، فبتتمسح لما Django يعيد التشغيل. **اقفله (`VISIONSEEK_MOCK=0`) لما تربط بالسيرفر الحقيقي.**

## المناطق والخطوط (عشان الأحداث تظهر)

الأحداث (دخول/خروج منطقة، تواجد مطوّل، تجمّع، عبور خط) **بيحسبها سيرفر الذكاء الاصطناعي** من ملف `my_zones.yaml` اللي على جهازه، والـ AI API مافيهوش endpoint للمناطق. عشان كده:

1. من صفحة **المناطق والخطوط** في المنصة ارسم المناطق والخطوط لكل كاميرا (ممكن تحمّل لقطة شاشة من الكاميرا وترسم عليها) واحفظ.
2. نزّل `my_zones.yaml` (أو انسخه) وحطه في فولدر `visionseek-ai` على جهاز الذكاء الاصطناعي.
3. في `configs\default.yaml` على جهاز الـ AI اكتب `events: { zones_file: my_zones.yaml }` وأعد تشغيل `api.bat`.
4. أعد تشغيل نفس أمر `process.bat` / `batch.bat` للفيديوهات، ومرحلة الأحداث بس هي اللي هتتعاد.
5. (اختياري) راجع الرسم على فريم حقيقي: `zones.bat "C:\videos\gate.mp4" --camera CAM-01 --zones my_zones.yaml`.

## الـ API بتاع Django (للفرونت أو لأي عميل)

كل الطلبات (ما عدا login/register/health) محتاجة الهيدر `Authorization: Token <token>`.

| Method | Path | الوصف |
|---|---|---|
| POST | `/api/auth/register` · `/api/auth/login` | ترجع `{token, user}` |
| GET | `/api/auth/me` · POST `/api/auth/logout` | |
| GET | `/api/health` | حالة Django + سيرفر الـ AI |
| GET | `/api/dashboard` | أعداد وآخر النشاط |
| GET | `/api/analytics` | بيانات الرسوم البيانية (الأحداث حسب النوع/الكاميرا/الوقت، البحث، المراجعة) |
| POST | `/api/videos/sync` | اكتشاف الفيديوهات الموجودة على سيرفر الـ AI |
| GET | `/api/zones` · GET/PUT `/api/zones/{camera}` | قواعد المناطق والخطوط لكل كاميرا |
| GET | `/api/zones/export.yaml` | تنزيل `my_zones.yaml` بصيغة سيرفر الـ AI |
| GET/POST | `/api/cameras` | ← AI |
| GET/POST | `/api/videos` | GET = الفيديوهات المرفوعة من المنصة · POST multipart ← AI |
| GET | `/api/videos/{code}` · `/api/videos/{code}/tracks` | ← AI |
| GET | `/api/crops/{track_id}/{rank}` | صورة (← AI) |
| GET | `/api/search?q=...&camera=&site=&cls=&start=&end=&limit=&min_prob=` | ← AI + بتتسجل في سجل البحث |
| GET | `/api/search/history` | آخر عمليات بحث المستخدم |
| GET | `/api/events?type=&camera=&site=&name=&start=&end=&limit=` | ← AI |
| CRUD | `/api/cases` · `/api/cases/{id}` | القضايا (`?status=open`) |
| GET/POST | `/api/cases/{id}/items` | أدلة القضية (track / event / note) |
| PATCH/DELETE | `/api/case-items/{id}` | `decision`: pending / confirmed / rejected، `note` |
| GET | `/api/cases/{id}/report` | التقرير: ملخص + خط زمني + تنبيهات |

الأخطاء اللي جاية من سيرفر الـ AI بترجع بنفس الكود (`404`, `422`, `503`) ومعاها `"source": "ai"`. لو السيرفر مش متاح بترجع `502`/`504`، ولو المفتاح غلط بترجع `502` برسالة واضحة.

## هيكل المشروع

```
backend/
  config/            settings, urls
  core/              visionseek.py (عميل الـ AI API) · views (proxy + auth) · VideoRecord, SearchLog
  cases/             Case, CaseItem · report.py (الخط الزمني والتنبيهات)
  mockapi/           سيرفر وهمي للـ AI API (للتطوير فقط)
  .env.example
frontend/
  src/api.js         axios + Token
  src/i18n.jsx       عربي / English
  src/pages/         Dashboard, Search, Videos, VideoDetail, Events, Cases, CaseDetail, CaseReport, Cameras, Login
  src/components/    ui.jsx (صور بالتوكن، عارض الصور، شريط التطابق…) · AddToCase.jsx
```

## للنشر (Production)

- `DJANGO_DEBUG=0`، `DJANGO_SECRET_KEY` عشوائي، و `DJANGO_ALLOWED_HOSTS` بالدومين.
- `npm run build` داخل `frontend` وارفع `dist/` على أي static host. لو الـ API على دومين تاني ابني بـ `VITE_API_URL=https://your-backend/api` وضيف الدومين في `CORS_ALLOWED_ORIGINS`.
- شغّل Django بـ gunicorn/waitress بدل `runserver`. ومن الأفضل `DATABASE` يبقى PostgreSQL.
