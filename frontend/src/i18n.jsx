import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const en = {
  // shell
  tagline: 'CCTV analysis & search', sec_overview: 'Overview', sec_investigation: 'Investigation', sec_data: 'Data',
  nav_dashboard: 'Dashboard', nav_search: 'Smart search', nav_events: 'Events', nav_cases: 'Cases', nav_videos: 'Videos',
  nav_cameras: 'Cameras', report: 'Report', collapse: 'Collapse', logout: 'Log out', langToggle: 'العربية',
  darkMode: 'Dark mode', lightMode: 'Light mode', commandPalette: 'Command palette', admin: 'Admin',
  aiOnline: 'AI engine online', aiOffline: 'AI engine offline', mockMode: 'Demo data (mock)', connRestored: 'Connection restored', connBackendDown: 'Lost connection to the platform server (Django).', connBackendHint: 'Make sure the backend is running (F5 in VS Code or run_backend.bat). Retrying automatically…', connAiDown: 'The AI engine is not reachable right now.', connAiHint: 'Its Cloudflare tunnel or the AI machine dropped. Search, images and videos will come back by themselves when it returns. Retrying automatically…', aiDownHint: 'AI server or its tunnel is down', online: 'Online', offline: 'Offline',
  cmdkHint: 'Search footage, cases, pages…', cmdkPlaceholder: 'Type a description, VID-0001, a case or a page…',
  actions: 'Actions', pages: 'Pages', searchFootageFor: 'Search footage for', openVideo: 'Open video', navigate: 'navigate',
  noMatches: 'No matches',
  // common
  save: 'Save', saved: 'Saved', cancel: 'Cancel', add: 'Add', delete: 'Delete', deleted: 'Deleted', edit: 'Edit', back: 'Back',
  loading: 'Loading…', retry: 'Retry', apply: 'Apply', clear: 'Clear', open: 'Open', none: 'Nothing here yet', any: 'All',
  viewAll: 'View all', total: 'total', camera: 'Camera', site: 'Site / street', location: 'Location', name: 'Name', code: 'Code',
  video: 'Video', videos: 'Videos', time: 'Time', start: 'From', end: 'To', duration: 'Duration', status: 'Status',
  class: 'Object type', limit: 'Max results', type: 'Type', details: 'Details', evidence: 'Evidence', tracks: 'Tracks',
  frame: 'frame', frames: 'frames', score: 'Score', probability: 'Match', match: 'match', hits: 'hits', results: 'results',
  events: 'events', items: 'Items', minutes: 'min', hours: 'h', day: 'day', sites: 'sites', searches: 'Searches',
  allTimesCairo: 'All times are shown in Cairo time.',
  st_uploaded: 'Queued', st_processing: 'Processing', st_done: 'Done', st_failed: 'Failed', st_pending: 'Pending', st_running: 'Running',
  cls_person: 'Person', cls_car: 'Car', cls_truck: 'Truck', cls_bus: 'Bus', cls_motorcycle: 'Motorcycle', cls_bicycle: 'Bicycle',
  ev_zone_enter: 'Zone entry', ev_zone_exit: 'Zone exit', ev_loitering: 'Loitering', ev_crowding: 'Crowding', ev_line_cross: 'Line crossing',
  kind_track: 'Track', kind_event: 'Event', kind_note: 'Note',
  decision_pending: 'Pending', decision_confirmed: 'Confirmed', decision_rejected: 'Rejected',
  case_open: 'Open', case_closed: 'Closed',
  // dashboard
  goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening',
  heroText: 'Describe what you are looking for in Arabic or English – VisionSeek finds it across every camera, with the evidence to prove it.',
  newSearch: 'New search', uploadVideo: 'Upload video', newCase: 'New case', aiService: 'AI engine',
  eventsDetected: 'Events detected', openCases: 'Open cases', pendingReview: 'Pending review',
  eventsOverTime: 'Events over time', perBucket: 'One column = {n}', eventsByType: 'Events by type', eventsByCamera: 'Events by camera',
  searches7d: 'Searches · last 7 days', reviewProgress: 'Evidence review', reviewProgressSub: 'Share of case evidence reviewed by a person',
  noEvidenceYet: 'No evidence in cases yet.', recentVideos: 'Recent videos', recentSearches: 'Recent searches', latestEvents: 'Latest events',
  noSearches: 'No searches yet.', noEvents: 'No events. Zones and lines must be configured on the AI server.', noEventsTitle: 'No events',
  // search
  searchTitle: 'Natural-language search', searchLangs: 'Arabic · English',
  searchPlaceholder: 'e.g. شخص لابس قميص أحمر  ·  man wearing a blue jacket  ·  silver car',
  searchBtn: 'Search', filters: 'Filters', examples: 'Try', autoDetect: 'Detect from text', minProb: 'Min. match (0 = keep all)',
  minProbShort: 'Min. match', searchedAs: 'Searched as', candidates: 'tracks checked', weakLeftOut: 'weak matches hidden',
  untranslated: 'Words not understood', untranslatedHint: 'they were ignored; try another word or English.',
  noGoodMatch: 'No good match', noGoodMatchText: 'Nothing in the footage looks like this description. That is a valid answer, not an error.',
  showClosest: 'Show the closest anyway', noResultsTitle: 'No results', noResults: 'No tracks match these filters.',
  disclaimer: 'Results are candidates ranked by visual similarity – never identities. Always check the images and the original video.',
  history: 'Your recent searches', colourBackend: 'n/a (colour backend)', sortMatch: 'Best match', sortTime: 'Chronological',
  cropRank: 'View', bestView: 'best view', origSize: 'original', lowResNote: 'This crop is small in the original footage (the person is far from the camera), so enlarging it cannot add detail. Higher-resolution or closer cameras give sharper crops.',
  tip1Title: 'Describe what is visible', tip1Text: 'Colour + clothing works best: “red shirt”, “black backpack”, “blue jeans”.',
  tip2Title: 'Every result is evidence', tip2Text: 'Each hit links to its camera, video, frame and time – open the images to verify.',
  tip3Title: 'Narrow it down', tip3Text: 'Use filters for camera, street and time window, or write “camera 2” inside the query.',
  // videos
  videosSub: 'Upload recordings and follow the AI pipeline for each one.', syncFromAi: 'Sync from AI server',
  syncDone: 'Found {found} video(s) on the AI server · {added} new', filterVideos: 'Filter or type VID-0001…',
  firstFrame: 'First frame', fromAiServer: 'Processed on the AI server', noVideosTitle: 'No videos yet',
  noVideos: 'Upload a recording, or sync the videos already processed on the AI server.',
  uploadSub: 'Processing starts automatically after upload.', dropHere: 'Drop a video here or click to choose',
  bigFileWarn: 'Files over ~100 MB may be rejected by the Cloudflare tunnel. Use the batch script on the AI machine for large files.',
  startTime: 'Real time of the first frame', startHint: 'Cairo time. Every search and event time is computed from it.',
  uploading: 'Uploading…', sendingToAi: 'Handing over to the AI engine…', uploadBtn: 'Upload & analyse', uploadedProcessing: 'uploaded – processing started',
  oneAtATime: 'A CPU server processes one video at a time; long recordings are better handled by the batch script.',
  videoSub: 'Camera {cam} · first frame {time}', stages: 'AI pipeline', liveUpdating: 'Updating live every 3 seconds',
  stage_ingest: 'Read video', stage_motion: 'Motion', stage_detect_track: 'Detect & track', stage_crops: 'Best views',
  stage_embed: 'AI embedding', stage_events: 'Events', notRun: 'Not run', stageDetails: 'Technical details per stage',
  tracksFound: 'Tracks found', trackTimeline: 'Track timeline', trackTimelineSub: 'When each object was on screen – click a bar to see it',
  eventsInVideo: 'Events in this video', waitingTracks: 'Tracks appear as soon as processing is done.',
  obs: 'frames', conf: 'confidence', allClasses: 'All',
  // events
  eventsTitle: 'Events', eventsSub: 'Rule-based detections from the zones and lines of each camera.', eventLog: 'Event log',
  zoneName: 'Zone / line', capped: 'limit reached', dwell: 'stayed', peak: 'peak', alreadyInside: 'already inside', endedInside: 'track ended inside',
  // cases
  casesSub: 'Collect evidence from searches, videos and events into an investigation.', filterCases: 'Search cases…',
  noCasesTitle: 'No cases yet', noCases: 'Create a case, then add results from search, videos or events.', allReviewed: 'All reviewed',
  caseTitle: 'Title', caseTitlePh: 'e.g. Theft at the north gate', description: 'Description', caseDescPh: 'What happened, when and where…',
  createCase: 'Create case', caseCreated: 'Case created', addToCase: 'Add to case', existingCase: 'Existing case', chooseCase: 'Case',
  added: 'added to case', viewCase: 'Open case', investigatorNote: 'Investigator note', notePh: 'What does this show? Why is it relevant?',
  closeCase: 'Close case', reopenCase: 'Reopen', deleteCaseConfirm: 'Delete this case and all its evidence permanently?',
  deleteConfirm: 'Delete permanently?', camerasInvolved: 'Cameras', crossCamera: 'Across cameras',
  crossCameraSub: 'Each lane is a camera – see where the subject appeared and when', timeline: 'Timeline',
  timelineSub: 'Evidence in chronological order. Confirm or reject each item.', emptyCaseTitle: 'No evidence yet',
  emptyCase: 'Add results from Search, a video’s tracks or Events.', goSearch: 'Go to search', addNote: 'Add note',
  noteText: 'Note', noteTime: 'Time (optional)', noteTimeHint: 'Places the note on the timeline.', noteAdded: 'Note added',
  noTime: 'No time', confirm: 'Confirm', reject: 'Reject', markPending: 'Undo decision', fromQuery: 'from search',
  reviewHint: 'Matches are probabilistic. Confirm only what you verified in the images or original video; rejected items stay in the record.',
  // report
  reportTitle: 'Investigation report', print: 'Print / save as PDF', summary: 'Summary', period: 'Period', warnings: 'Needs attention',
  noWarnings: 'Nothing flagged.', createdBy: 'Created by', generated: 'Generated',
  w_pending: '{count} item(s) not reviewed yet', w_weak_match: '{count} item(s) with a weak match (< 30%)',
  w_no_image: '{count} track(s) without an image', w_gap: 'No evidence between {from} and {to}',
  w_conflict: 'Confirmed tracks overlap in time on different cameras ({cameras}) – they cannot be the same person',
  reportDisclaimer: 'Generated from automated video analysis. Matches are probabilistic and were reviewed by a person; they are not proof of identity or intent.',
  // cameras
  camerasSub: 'Cameras grouped by street / site.', addCamera: 'Add camera', editCamera: 'Edit camera',
  cameraCodeHint: 'Format CAM-01. Cannot be changed later.', cameraNamePh: 'e.g. North gate', noCameras: 'No cameras yet',
  noCamerasText: 'Add a camera, or upload a video – its camera is created automatically.', noSite: 'No site', videosHere: 'videos',
  searchThisCamera: 'Search this camera',
  // zones
  nav_zones: 'Zones & lines', zonesSub: 'Draw the areas and lines that turn tracks into events (entry, exit, loitering, crowding, line crossing).',
  copyYaml: 'Copy YAML', unsaved: 'Unsaved changes', discardChanges: 'Discard unsaved changes?', zonesSaved: 'Rules of {cam} saved',
  yamlCopied: 'YAML copied to clipboard', toolSelect: 'Select', toolZone: 'Draw zone', toolLine: 'Draw line',
  loadFrame: 'Load camera frame', starter: 'Starter template', noFrame: 'Load a screenshot of this camera to draw on it (optional)',
  hintZone: 'Click to add points · click the first point, double-click or press Enter to close · Esc cancels',
  hintLine: 'Click the start point, then the end point', hintSelect: 'Click a shape to edit it · drag the white handles to move points · Delete removes',
  zoneWord: 'Zone', lineWord: 'Line', zoneProps: 'Zone settings', lineProps: 'Line settings', rulesOf: 'Rules of {cam}',
  noRules: 'No zones or lines for this camera yet.', points: 'points', watchClasses: 'Object types to watch',
  loiterSec: 'Loitering after (seconds)', loiterHint: 'Staying longer than this inside the zone creates a loitering event. Empty = off.',
  off: 'Off', crowdDetect: 'Detect crowding', crowdCount: 'Objects at once (≥)', crowdSec: 'For at least (seconds)',
  sideA: 'Side A label', sideB: 'Side B label', swapSides: 'Swap directions',
  lineHint: 'Crossing events record the direction, e.g. “west → east”. A is the side marked on the drawing.',
  backToList: 'Back to list', tplEntrance: 'Entrance', tplGate: 'Gate', tplWest: 'west', tplEast: 'east',
  howToApply: 'Apply on the AI server', setupZones: 'Set up zones & lines',
  apply1: 'Draw the zones and lines for each camera here and save.',
  apply2: 'Download <code>my_zones.yaml</code> and copy it into the <code>visionseek-ai</code> folder on the AI machine.',
  apply3: 'In <code>configs\\default.yaml</code> set <code>events: { zones_file: my_zones.yaml }</code>, then restart <code>api.bat</code>.',
  apply4: 'Re-run the same <code>process.bat</code> / <code>batch.bat</code> command for the videos – only the events stage runs again (seconds).',
  apply5: 'Events then appear in the Events page, the dashboard and every video. Camera codes in the file must match (CAM-01…).',
  // login
  welcomeBack: 'Welcome back', signInSub: 'Sign in to continue to VisionSeek.', registerSub: 'Create an account for your team member.',
  signIn: 'Sign in', register: 'Create account', username: 'Username', password: 'Password', fullName: 'Full name',
  noAccountQ: 'No account?', haveAccountQ: 'Already have an account?',
  loginHeadline: 'Find anything in hours of CCTV – <em>just describe it.</em>',
  loginText: 'AI detection, tracking and natural-language search across all your cameras, with evidence for every result.',
  feat1: 'Search footage in Arabic or English', feat2: 'Every result traceable to camera, frame and time',
  feat3: 'Build investigation cases and printable reports', loginFoot: 'Graduation project · No face recognition · No sensitive attributes',
};

const ar = {
  tagline: 'تحليل كاميرات المراقبة والبحث فيها', sec_overview: 'نظرة عامة', sec_investigation: 'التحقيق', sec_data: 'البيانات',
  nav_dashboard: 'لوحة التحكم', nav_search: 'البحث الذكي', nav_events: 'الأحداث', nav_cases: 'القضايا', nav_videos: 'الفيديوهات',
  nav_cameras: 'الكاميرات', report: 'التقرير', collapse: 'تصغير', logout: 'تسجيل الخروج', langToggle: 'English',
  darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح', commandPalette: 'لوحة الأوامر', admin: 'مسؤول',
  aiOnline: 'محرك الذكاء الاصطناعي متصل', aiOffline: 'محرك الذكاء الاصطناعي غير متصل', mockMode: 'بيانات تجريبية', connRestored: 'رجع الاتصال', connBackendDown: 'انقطع الاتصال بسيرفر المنصة (Django).', connBackendHint: 'اتأكد إن الـ backend شغال (F5 في VS Code أو run_backend.bat). بنحاول تاني تلقائياً…', connAiDown: 'محرك الذكاء الاصطناعي مش متاح دلوقتي.', connAiHint: 'نفق Cloudflare أو جهاز الذكاء الاصطناعي فصل. البحث والصور والفيديوهات هترجع لوحدها أول ما يرجع. بنحاول تاني تلقائياً…', aiDownHint: 'سيرفر الذكاء الاصطناعي أو النفق واقع', online: 'متصل', offline: 'غير متصل',
  cmdkHint: 'ابحث في التسجيلات والقضايا والصفحات…', cmdkPlaceholder: 'اكتب وصف، أو VID-0001، أو اسم قضية أو صفحة…',
  actions: 'إجراءات', pages: 'الصفحات', searchFootageFor: 'ابحث في التسجيلات عن', openVideo: 'افتح الفيديو', navigate: 'للتنقل',
  noMatches: 'لا توجد نتائج',
  save: 'حفظ', saved: 'تم الحفظ', cancel: 'إلغاء', add: 'إضافة', delete: 'حذف', deleted: 'تم الحذف', edit: 'تعديل', back: 'رجوع',
  loading: 'جاري التحميل…', retry: 'إعادة المحاولة', apply: 'تطبيق', clear: 'مسح', open: 'فتح', none: 'لا يوجد شيء بعد', any: 'الكل',
  viewAll: 'عرض الكل', total: 'إجمالي', camera: 'الكاميرا', site: 'الموقع / الشارع', location: 'المكان', name: 'الاسم', code: 'الكود',
  video: 'الفيديو', videos: 'الفيديوهات', time: 'الوقت', start: 'من', end: 'إلى', duration: 'المدة', status: 'الحالة',
  class: 'نوع الجسم', limit: 'أقصى عدد نتائج', type: 'النوع', details: 'التفاصيل', evidence: 'الدليل', tracks: 'المسارات',
  frame: 'فريم', frames: 'فريمات', score: 'الدرجة', probability: 'التطابق', match: 'تطابق', hits: 'نتيجة', results: 'نتيجة',
  events: 'حدث', items: 'العناصر', minutes: 'دقيقة', hours: 'ساعة', day: 'يوم', sites: 'مواقع', searches: 'عمليات بحث',
  allTimesCairo: 'كل الأوقات معروضة بتوقيت القاهرة.',
  st_uploaded: 'في الانتظار', st_processing: 'قيد المعالجة', st_done: 'مكتمل', st_failed: 'فشل', st_pending: 'لم يبدأ', st_running: 'جاري',
  cls_person: 'شخص', cls_car: 'سيارة', cls_truck: 'شاحنة', cls_bus: 'أتوبيس', cls_motorcycle: 'موتوسيكل', cls_bicycle: 'دراجة',
  ev_zone_enter: 'دخول منطقة', ev_zone_exit: 'خروج من منطقة', ev_loitering: 'تواجد مطوّل', ev_crowding: 'تجمّع', ev_line_cross: 'عبور خط',
  kind_track: 'مسار', kind_event: 'حدث', kind_note: 'ملاحظة',
  decision_pending: 'بانتظار المراجعة', decision_confirmed: 'مؤكد', decision_rejected: 'مرفوض',
  case_open: 'مفتوحة', case_closed: 'مغلقة',
  goodMorning: 'صباح الخير', goodAfternoon: 'مساء الخير', goodEvening: 'مساء الخير',
  heroText: 'اوصف اللي بتدور عليه بالعربي أو الإنجليزي، وVisionSeek هيلاقيه في كل الكاميرات ومعاه الدليل.',
  newSearch: 'بحث جديد', uploadVideo: 'رفع فيديو', newCase: 'قضية جديدة', aiService: 'محرك الذكاء الاصطناعي',
  eventsDetected: 'الأحداث المكتشفة', openCases: 'القضايا المفتوحة', pendingReview: 'بانتظار المراجعة',
  eventsOverTime: 'الأحداث عبر الوقت', perBucket: 'كل عمود = {n}', eventsByType: 'الأحداث حسب النوع', eventsByCamera: 'الأحداث حسب الكاميرا',
  searches7d: 'عمليات البحث · آخر 7 أيام', reviewProgress: 'مراجعة الأدلة', reviewProgressSub: 'نسبة أدلة القضايا اللي راجعها شخص',
  noEvidenceYet: 'لا توجد أدلة في القضايا بعد.', recentVideos: 'آخر الفيديوهات', recentSearches: 'آخر عمليات البحث', latestEvents: 'أحدث الأحداث',
  noSearches: 'لا توجد عمليات بحث بعد.', noEvents: 'لا توجد أحداث. لازم المناطق والخطوط تكون متعرّفة على سيرفر الذكاء الاصطناعي.', noEventsTitle: 'لا توجد أحداث',
  searchTitle: 'البحث باللغة الطبيعية', searchLangs: 'عربي · English',
  searchPlaceholder: 'مثلاً: شخص لابس قميص أحمر  ·  راجل لابس جاكيت كحلي  ·  عربية فضي',
  searchBtn: 'بحث', filters: 'فلاتر', examples: 'جرّب', autoDetect: 'من النص', minProb: 'أقل نسبة تطابق (0 = الكل)',
  minProbShort: 'أقل تطابق', searchedAs: 'اتبحث كـ', candidates: 'مسار اتفحص', weakLeftOut: 'نتيجة ضعيفة مخفية',
  untranslated: 'كلمات مش مفهومة', untranslatedHint: 'اتجاهلت؛ جرّب كلمة تانية أو بالإنجليزي.',
  noGoodMatch: 'مفيش تطابق جيد', noGoodMatchText: 'مفيش حاجة في التسجيلات بتشبه الوصف ده. ده رد صحيح مش خطأ.',
  showClosest: 'اعرض الأقرب برضه', noResultsTitle: 'لا توجد نتائج', noResults: 'لا توجد مسارات مطابقة للفلاتر.',
  disclaimer: 'النتائج مرشّحين مرتّبين بالتشابه البصري، وليست هويات. راجع الصور والفيديو الأصلي دايماً.',
  history: 'آخر عمليات بحثك', colourBackend: 'غير متاح (وضع الألوان)', sortMatch: 'الأعلى تطابقاً', sortTime: 'ترتيب زمني',
  cropRank: 'لقطة', bestView: 'أوضح لقطة', origSize: 'المقاس الأصلي', lowResNote: 'اللقطة دي صغيرة في الفيديو الأصلي (الشخص بعيد عن الكاميرا)، فتكبيرها مش هيضيف تفاصيل. كاميرات بدقة أعلى أو أقرب بتدي لقطات أوضح.',
  tip1Title: 'اوصف اللي باين', tip1Text: 'اللون + نوع اللبس بيدي أحسن نتيجة: "قميص أحمر"، "شنطة ظهر سودا"، "جينز أزرق".',
  tip2Title: 'كل نتيجة دليل', tip2Text: 'كل نتيجة مربوطة بالكاميرا والفيديو والفريم والوقت، افتح الصور واتأكد.',
  tip3Title: 'ضيّق البحث', tip3Text: 'استخدم فلاتر الكاميرا والشارع والفترة الزمنية، أو اكتب "كاميرا 2" جوه الجملة.',
  videosSub: 'ارفع التسجيلات وتابع مراحل تحليل الذكاء الاصطناعي لكل واحد.', syncFromAi: 'مزامنة من سيرفر الذكاء الاصطناعي',
  syncDone: 'تم العثور على {found} فيديو على السيرفر · {added} جديد', filterVideos: 'فلترة أو اكتب VID-0001…',
  firstFrame: 'أول فريم', fromAiServer: 'اتعالج على سيرفر الذكاء الاصطناعي', noVideosTitle: 'لا توجد فيديوهات بعد',
  noVideos: 'ارفع تسجيل، أو اعمل مزامنة للفيديوهات اللي اتعالجت قبل كده على السيرفر.',
  uploadSub: 'التحليل بيبدأ تلقائياً بعد الرفع.', dropHere: 'اسحب الفيديو هنا أو اضغط للاختيار',
  bigFileWarn: 'الملفات الأكبر من حوالي 100 ميجا ممكن نفق Cloudflare يرفضها. استخدم سكربت الدفعات على جهاز الذكاء الاصطناعي.',
  startTime: 'الوقت الحقيقي لأول فريم', startHint: 'بتوقيت القاهرة. كل أوقات البحث والأحداث بتتحسب منه.',
  uploading: 'جاري الرفع…', sendingToAi: 'جاري التسليم لمحرك الذكاء الاصطناعي…', uploadBtn: 'رفع وتحليل', uploadedProcessing: 'اترفع وبدأ التحليل',
  oneAtATime: 'سيرفر الـ CPU بيعالج فيديو واحد في المرة؛ التسجيلات الطويلة أحسن بسكربت الدفعات.',
  videoSub: 'الكاميرا {cam} · أول فريم {time}', stages: 'مراحل التحليل', liveUpdating: 'بيتحدّث لحظياً كل 3 ثواني',
  stage_ingest: 'قراءة الفيديو', stage_motion: 'الحركة', stage_detect_track: 'كشف وتتبّع', stage_crops: 'أوضح اللقطات',
  stage_embed: 'تمثيل بالذكاء الاصطناعي', stage_events: 'الأحداث', notRun: 'لم تُنفّذ', stageDetails: 'التفاصيل التقنية لكل مرحلة',
  tracksFound: 'المسارات المكتشفة', trackTimeline: 'الخط الزمني للمسارات', trackTimelineSub: 'إمتى كل جسم كان ظاهر، اضغط على أي شريط تشوفه',
  eventsInVideo: 'أحداث الفيديو ده', waitingTracks: 'المسارات بتظهر أول ما التحليل يخلص.',
  obs: 'فريم', conf: 'ثقة', allClasses: 'الكل',
  eventsTitle: 'الأحداث', eventsSub: 'اكتشافات بالقواعد من المناطق والخطوط المحددة لكل كاميرا.', eventLog: 'سجل الأحداث',
  zoneName: 'المنطقة / الخط', capped: 'وصل للحد الأقصى', dwell: 'فضل', peak: 'أقصى عدد', alreadyInside: 'كان جوه من الأول', endedInside: 'المسار انتهى جوه',
  casesSub: 'جمّع أدلة من البحث والفيديوهات والأحداث في قضية تحقيق.', filterCases: 'ابحث في القضايا…',
  noCasesTitle: 'لا توجد قضايا بعد', noCases: 'أنشئ قضية، وبعدين ضيف نتائج من البحث أو الفيديوهات أو الأحداث.', allReviewed: 'كله اتراجع',
  caseTitle: 'العنوان', caseTitlePh: 'مثلاً: سرقة عند البوابة الشمالية', description: 'الوصف', caseDescPh: 'إيه اللي حصل، وإمتى، وفين…',
  createCase: 'إنشاء القضية', caseCreated: 'تم إنشاء القضية', addToCase: 'أضف لقضية', existingCase: 'قضية موجودة', chooseCase: 'القضية',
  added: 'اتضاف للقضية', viewCase: 'افتح القضية', investigatorNote: 'ملاحظة المحقق', notePh: 'ده بيوضّح إيه؟ وليه مهم؟',
  closeCase: 'إغلاق القضية', reopenCase: 'إعادة فتح', deleteCaseConfirm: 'حذف القضية دي وكل أدلتها نهائياً؟',
  deleteConfirm: 'حذف نهائي؟', camerasInvolved: 'الكاميرات', crossCamera: 'عبر الكاميرات',
  crossCameraSub: 'كل صف كاميرا، شوف الشخص ظهر فين وإمتى', timeline: 'الخط الزمني',
  timelineSub: 'الأدلة بالترتيب الزمني. أكّد أو ارفض كل عنصر.', emptyCaseTitle: 'لا توجد أدلة بعد',
  emptyCase: 'ضيف نتائج من البحث، أو مسارات فيديو، أو أحداث.', goSearch: 'روح للبحث', addNote: 'إضافة ملاحظة',
  noteText: 'الملاحظة', noteTime: 'الوقت (اختياري)', noteTimeHint: 'بيحط الملاحظة في مكانها على الخط الزمني.', noteAdded: 'اتضافت الملاحظة',
  noTime: 'بدون وقت', confirm: 'تأكيد', reject: 'رفض', markPending: 'تراجع عن القرار', fromQuery: 'من البحث',
  reviewHint: 'التطابقات احتمالية. أكّد بس اللي اتأكدت منه في الصور أو الفيديو الأصلي؛ العناصر المرفوضة بتفضل في السجل.',
  reportTitle: 'تقرير التحقيق', print: 'طباعة / حفظ PDF', summary: 'الملخص', period: 'الفترة', warnings: 'محتاج انتباه',
  noWarnings: 'لا يوجد ملاحظات.', createdBy: 'أنشأها', generated: 'تاريخ الإنشاء',
  w_pending: '{count} عنصر لم تتم مراجعته', w_weak_match: '{count} عنصر بتطابق ضعيف (أقل من 30%)',
  w_no_image: '{count} مسار بدون صورة', w_gap: 'لا توجد أدلة بين {from} و {to}',
  w_conflict: 'مسارات مؤكدة متداخلة زمنياً على كاميرات مختلفة ({cameras}) – مستحيل يكونوا نفس الشخص',
  reportDisclaimer: 'تم إنشاؤه من تحليل آلي للفيديو. التطابقات احتمالية وتمت مراجعتها بواسطة شخص؛ وليست دليلاً على الهوية أو النية.',
  camerasSub: 'الكاميرات مجمّعة حسب الشارع / الموقع.', addCamera: 'إضافة كاميرا', editCamera: 'تعديل كاميرا',
  cameraCodeHint: 'بالشكل CAM-01، ومينفعش يتغيّر بعدين.', cameraNamePh: 'مثلاً: البوابة الشمالية', noCameras: 'لا توجد كاميرات بعد',
  noCamerasText: 'ضيف كاميرا، أو ارفع فيديو والكاميرا بتتعمل تلقائياً.', noSite: 'بدون موقع', videosHere: 'فيديو',
  searchThisCamera: 'ابحث في الكاميرا دي',
  nav_zones: 'المناطق والخطوط', zonesSub: 'ارسم المناطق والخطوط اللي بتحوّل المسارات لأحداث (دخول، خروج، تواجد مطوّل، تجمّع، عبور خط).',
  copyYaml: 'نسخ YAML', unsaved: 'تعديلات مش محفوظة', discardChanges: 'تجاهل التعديلات اللي مش محفوظة؟', zonesSaved: 'اتحفظت قواعد {cam}',
  yamlCopied: 'اتنسخ الـ YAML', toolSelect: 'تحديد', toolZone: 'ارسم منطقة', toolLine: 'ارسم خط',
  loadFrame: 'حمّل صورة من الكاميرا', starter: 'قالب جاهز', noFrame: 'حمّل لقطة شاشة من الكاميرا دي عشان ترسم عليها (اختياري)',
  hintZone: 'اضغط لإضافة نقاط · اضغط على أول نقطة أو دبل كليك أو Enter للقفل · Esc للإلغاء',
  hintLine: 'اضغط على نقطة البداية وبعدين نقطة النهاية', hintSelect: 'اضغط على أي شكل لتعديله · اسحب النقط البيضا لتحريكها · Delete للحذف',
  zoneWord: 'منطقة', lineWord: 'خط', zoneProps: 'إعدادات المنطقة', lineProps: 'إعدادات الخط', rulesOf: 'قواعد {cam}',
  noRules: 'لا توجد مناطق أو خطوط للكاميرا دي بعد.', points: 'نقاط', watchClasses: 'أنواع الأجسام المراقبة',
  loiterSec: 'تواجد مطوّل بعد (ثانية)', loiterHint: 'أي حد يفضل جوه المنطقة أكتر من كده بيطلع حدث تواجد مطوّل. فاضي = مقفول.',
  off: 'مقفول', crowdDetect: 'اكتشاف التجمّع', crowdCount: 'عدد الأجسام مع بعض (≥)', crowdSec: 'لمدة لا تقل عن (ثانية)',
  sideA: 'اسم الجانب A', sideB: 'اسم الجانب B', swapSides: 'اعكس الاتجاهات',
  lineHint: 'أحداث العبور بتسجّل الاتجاه، مثلاً "غرب ← شرق". الجانب A متعلّم على الرسم.',
  backToList: 'رجوع للقائمة', tplEntrance: 'المدخل', tplGate: 'البوابة', tplWest: 'غرب', tplEast: 'شرق',
  howToApply: 'التطبيق على سيرفر الذكاء الاصطناعي', setupZones: 'اظبط المناطق والخطوط',
  apply1: 'ارسم المناطق والخطوط لكل كاميرا هنا واحفظ.',
  apply2: 'نزّل <code>my_zones.yaml</code> وانسخه في فولدر <code>visionseek-ai</code> على جهاز الذكاء الاصطناعي.',
  apply3: 'في <code>configs\\default.yaml</code> اكتب <code>events: { zones_file: my_zones.yaml }</code>، وبعدين أعد تشغيل <code>api.bat</code>.',
  apply4: 'أعد تشغيل نفس أمر <code>process.bat</code> أو <code>batch.bat</code> للفيديوهات، ومرحلة الأحداث بس هي اللي هتتعاد (ثواني).',
  apply5: 'بعدها الأحداث هتظهر في صفحة الأحداث ولوحة التحكم وكل فيديو. أكواد الكاميرات في الملف لازم تطابق (CAM-01…).',
  welcomeBack: 'أهلاً بيك تاني', signInSub: 'سجّل دخولك عشان تكمّل على VisionSeek.', registerSub: 'اعمل حساب لعضو في الفريق.',
  signIn: 'دخول', register: 'إنشاء حساب', username: 'اسم المستخدم', password: 'كلمة المرور', fullName: 'الاسم بالكامل',
  noAccountQ: 'معندكش حساب؟', haveAccountQ: 'عندك حساب؟',
  loginHeadline: 'لاقي أي حاجة في ساعات من تسجيلات المراقبة، <em>بس اوصفها.</em>',
  loginText: 'كشف وتتبّع وبحث باللغة الطبيعية بالذكاء الاصطناعي في كل الكاميرات، ومع كل نتيجة دليلها.',
  feat1: 'ابحث في التسجيلات بالعربي أو الإنجليزي', feat2: 'كل نتيجة مربوطة بالكاميرا والفريم والوقت',
  feat3: 'اعمل قضايا تحقيق وتقارير قابلة للطباعة', loginFoot: 'مشروع تخرج · بدون تعرّف على الوجوه · بدون سمات حساسة',
};

const DICTS = { en, ar };
const LangCtx = createContext(null);

function readLang() {
  try {
    return localStorage.getItem('vs_lang') || 'ar';
  } catch {
    return 'ar';
  }
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('vs_lang', lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      let s = DICTS[lang][key] ?? en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
      return s;
    },
    [lang]
  );

  const toggle = useCallback(() => setLang((l) => (l === 'ar' ? 'en' : 'ar')), []);
  return <LangCtx.Provider value={{ lang, t, toggle }}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);
