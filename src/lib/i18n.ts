import type { Language } from '@/lib/db';
import { daysBetween } from '@/lib/srs';

const ar = {
  appName: 'مذاكرة',
  fallbackName: 'بطل',
  iAm: 'أنا',
  male: 'طالب',
  female: 'طالبة',
  tagline: 'قليل كل يوم… يبقى معك للأبد',

  // onboarding
  welcomeTitle: 'أهلاً بك في مذاكرة',
  welcomeBody:
    'ادرس صفحات قليلة كل يوم في جلسة قصيرة، وسيذكّرك التطبيق بمراجعتها بعد 1 ثم 3 ثم 7 ثم 14 ثم 30 يوماً حتى تثبت في ذاكرتك.',
  askName: 'وش اسمك؟',
  namePlaceholder: 'اكتب اسمك',
  chooseLanguage: 'اللغة',
  start: 'يلّا نبدأ',

  // greetings
  goodMorning: 'صباح الخير',
  goodEvening: 'مساء الخير',

  // home
  todayGoal: 'هدف اليوم',
  minutesOf: (done: number, goal: number) => `${done} من ${goal} دقيقة`,
  streakDays: (n: number) => (n === 0 ? 'ابدأ سلسلتك اليوم' : n === 1 ? 'يوم متتالي 🔥' : `${n} أيام متتالية 🔥`),
  reviewsDue: 'مراجعات اليوم',
  newToday: 'دراسة جديدة',
  pagesCount: (n: number) => (n === 0 ? 'لا شيء' : n === 1 ? 'صفحة واحدة' : n === 2 ? 'صفحتان' : n <= 10 ? `${n} صفحات` : `${n} صفحة`),
  startReview: 'ابدأ المراجعة',
  startStudy: 'ابدأ الدراسة',
  allDone: 'خلّصت كل شيء لليوم 🎉',
  mySubjects: 'موادي',
  newSubject: 'مادة جديدة',
  noSubjects: 'ما عندك مواد بعد. أضف مادة ثم صوّر صفحاتها أو ارفع ملف PDF.',
  upcoming: 'المراجعات القادمة',
  noUpcoming: 'لا توجد مراجعات قادمة بعد.',
  settings: 'الإعدادات',
  subjectStats: (total: number, fresh: number, due: number) =>
    `${total} صفحة · ${fresh} جديدة · ${due} للمراجعة`,

  // subject
  subjectTitle: 'اسم المادة',
  subjectPlaceholder: 'مثلاً: أحياء - الفصل الثالث',
  create: 'إنشاء',
  save: 'حفظ',
  cancel: 'إلغاء',
  addPages: 'أضف صفحات',
  camera: 'الكاميرا',
  gallery: 'الصور',
  pdf: 'ملف PDF',
  pdfPagesTitle: 'كم صفحة تبي تدرس من الملف؟',
  pdfPagesHint: 'كل صفحة تصير بطاقة مستقلة تدرسها وتراجعها.',
  fromPage: 'من صفحة',
  toPage: 'إلى صفحة',
  add: 'إضافة',
  pageN: (n: number) => `صفحة ${n}`,
  imageN: (n: number) => `صورة ${n}`,
  noPages: 'ما فيه صفحات بعد. أضف صوراً من الكاميرا أو المعرض أو ملف PDF.',
  studyThis: 'ادرس هذه المادة',
  reviewThis: 'راجع هذه المادة',
  deleteSubject: 'حذف المادة',
  deleteSubjectConfirm: 'سيتم حذف المادة وكل صفحاتها. متأكد؟',
  delete: 'حذف',
  statusNew: 'جديدة',
  statusDue: 'للمراجعة',
  cameraDenied: 'نحتاج إذن الكاميرا لتصوير الصفحات.',
  rename: 'تغيير الاسم',

  // study
  studySession: 'جلسة دراسة',
  timeLeft: 'الوقت المتبقي',
  overtime: 'تجاوزت هدفك 👏',
  of: (i: number, n: number) => `${i} من ${n}`,
  keywords: 'كلمات مفتاحية / ملخص',
  keywordsPlaceholder: 'اكتب أهم الكلمات أو الفكرة بأسلوبك',
  question: 'سؤال لنفسك',
  questionPlaceholder: 'مثلاً: ما وظيفة الميتوكوندريا؟',
  studyHint: 'اقرأ الصفحة بتركيز، ثم اكتب كلماتك وسؤالاً تختبر به نفسك في المراجعة.',
  doneWithPage: 'فهمت الصفحة ✓',
  openFile: 'افتح الملف',
  openFileHint: (label: string) => `افتح الملف وانتقل إلى ${label}`,
  sessionDone: 'أحسنت! انتهت الجلسة',
  studiedPages: (n: number) => `درست ${n === 1 ? 'صفحة واحدة' : n === 2 ? 'صفحتين' : `${n} صفحات`} اليوم، وأول مراجعة لها غداً.`,
  nothingToStudy: 'ما فيه صفحات جديدة للدراسة الآن.',
  dailyLimitReached: 'وصلت حد الصفحات الجديدة لليوم. الراحة جزء من التعلم!',
  studyMore: 'أدرس صفحة إضافية',
  backHome: 'رجوع للرئيسية',

  // review
  reviewSession: 'جلسة مراجعة',
  recallPrompt: 'حاول تتذكر محتوى الصفحة قبل ما تكشفها',
  noNotes: 'ما كتبت ملاحظات لهذه الصفحة. حاول تتذكر أهم ما فيها.',
  reveal: 'اكشف الصفحة',
  howWell: 'كيف كان تذكّرك؟',
  again: 'نسيت',
  hard: 'بصعوبة',
  good: 'تذكرت',
  nextIn: (s: string) => `القادمة ${s}`,
  reviewDone: 'خلّصت مراجعات اليوم',
  reviewSummary: (good: number, hard: number, again: number) =>
    `تذكرت ${good} · بصعوبة ${hard} · نسيت ${again}`,
  nothingToReview: 'ما عندك مراجعات اليوم. ارجع بكرة!',

  // page
  pageDetails: 'تفاصيل الصفحة',
  nextReview: 'المراجعة القادمة',
  notStudied: 'لم تُدرس بعد',
  reviewsCount: (n: number) => `عدد المراجعات: ${n}`,
  resetProgress: 'ابدأ من جديد',
  deletePage: 'حذف الصفحة',
  deletePageConfirm: 'حذف هذه الصفحة؟',
  saved: 'تم الحفظ',

  // settings
  yourName: 'اسمك',
  dailyMinutes: 'دقائق الدراسة اليومية',
  newPerDay: 'صفحات جديدة كل يوم',
  reminder: 'تذكير يومي',
  reminderTime: 'وقت التذكير',
  reminderTitle: (name: string) => (name ? `يلّا يا ${name} 📚` : 'وقت المذاكرة 📚'),
  reminderBody: 'جلستك اليومية تنتظرك، ربع ساعة تكفي.',
  notifDenied: 'لم يُسمح بالإشعارات. فعّلها من إعدادات الجوال.',
  howItWorks: 'كيف يعمل التطبيق؟',
  howItWorksBody:
    'كل صفحة تدرسها تُجدول لمراجعتها بعد 1 ثم 3 ثم 7 ثم 14 ثم 30 ثم 60 يوماً. إذا قلت "نسيت" ترجع الصفحة لأول الجدول، وإذا قلت "بصعوبة" تبقى في مكانها بمدة أقصر. كل بياناتك محفوظة على جوالك فقط.',
  minutesShort: (n: number) => `${n} د`,

  // relative days
  today: 'اليوم',
  tomorrow: 'غداً',
  inDays: (n: number) => (n === 2 ? 'بعد يومين' : n <= 10 ? `بعد ${n} أيام` : `بعد ${n} يوماً`),
  overdue: (n: number) => (n === 1 ? 'متأخرة يوماً' : n === 2 ? 'متأخرة يومين' : n <= 10 ? `متأخرة ${n} أيام` : `متأخرة ${n} يوماً`),


  // games & points
  games: 'ألعاب التذكر',
  gamesHint: 'تلعب بكلماتك أنت، فتثبت المعلومة وأنت مستمتع.',
  clozeTitle: 'أكمل الفراغ',
  clozeDesc: 'كلمة مخفية من ملاحظاتك، اخترها صح',
  matchTitle: 'طابق الأزواج',
  matchDesc: 'صِل كل سؤال أو صورة بكلماتها',
  clozePrompt: 'اختر الكلمة الناقصة',
  matchPrompt: 'اختر من اليمين ثم ما يطابقه من اليسار',
  matchPromptLtr: 'اختر من اليسار ثم ما يطابقه من اليمين',
  needMoreNotes: 'تحتاج 3 صفحات مدروسة على الأقل فيها كلمات مفتاحية لتلعب. ادرس واكتب ملاحظاتك أولاً!',
  correct: 'صح!',
  wrong: 'خطأ',
  theAnswer: (a: string) => `الجواب: ${a}`,
  next: 'التالي',
  score: (c: number, n: number) => `${c} / ${n}`,
  gameOver: 'انتهت اللعبة',
  perfect: 'علامة كاملة! 🎯',
  playAgain: 'العب مرة ثانية',
  xp: 'نقطة',
  xpGained: (n: number) => `+${n} نقطة`,
  level: (n: number) => `المستوى ${n}`,
  toNextLevel: (n: number) => `${n} نقطة للمستوى التالي`,
  levelUp: (n: number) => `ارتقيت للمستوى ${n}! 🎉`,
  achievements: 'الإنجازات',
  newAchievement: 'إنجاز جديد!',
  achievementNames: {
    first_page: 'أول صفحة',
    ten_pages: '10 صفحات',
    fifty_pages: '50 صفحة',
    streak3: '3 أيام متتالية',
    streak7: 'أسبوع كامل',
    streak30: 'شهر كامل',
    reviews25: '25 مراجعة',
    reviews100: '100 مراجعة',
    first_game: 'أول لعبة',
    perfect_game: 'علامة كاملة',
    mastered10: 'أتقنت 10 صفحات',
    level5: 'المستوى 5',
  } as Record<string, string>,
  sound: 'أصوات التشجيع',
  combo: (n: number) => `${n} صح متتالية! 🔥`,

  encouragements: [
    'يا {name}، ربع ساعة اليوم أفضل من ساعتين بكرة.',
    'استمر يا {name}، كل مراجعة تثبّت المعلومة أكثر.',
    'ذاكرتك تقوى كل يوم يا {name} 💪',
    'خطوة صغيرة اليوم يا {name}، ونتيجة كبيرة في الاختبار.',
    'أنت قدها يا {name}! ابدأ بصفحة واحدة بس.',
    'يا {name}، الاستمرار يغلب الموهبة.',
    'فخورين فيك يا {name}، كمّل على نفس الوتيرة 🌟',
  ],
  praise: ['ممتاز يا {name}!', 'رائع يا {name} 👏', 'أحسنت يا {name}!', 'كفو يا {name} 🌟'],
};

type Dict = typeof ar;

const en: Dict = {
  appName: 'Muthakara',
  fallbackName: 'champ',
  iAm: 'I am',
  male: 'Male student',
  female: 'Female student',
  tagline: 'A little every day… stays with you for good',

  welcomeTitle: 'Welcome to Muthakara',
  welcomeBody:
    'Study a few pages a day in a short session, and the app will remind you to review them after 1, 3, 7, 14 and 30 days until they stick.',
  askName: "What's your name?",
  namePlaceholder: 'Your name',
  chooseLanguage: 'Language',
  start: "Let's start",

  goodMorning: 'Good morning',
  goodEvening: 'Good evening',

  todayGoal: "Today's goal",
  minutesOf: (done, goal) => `${done} of ${goal} min`,
  streakDays: (n) => (n === 0 ? 'Start your streak today' : n === 1 ? '1 day streak 🔥' : `${n} day streak 🔥`),
  reviewsDue: 'Reviews today',
  newToday: 'New study',
  pagesCount: (n) => (n === 0 ? 'None' : n === 1 ? '1 page' : `${n} pages`),
  startReview: 'Start review',
  startStudy: 'Start studying',
  allDone: "You're all done for today 🎉",
  mySubjects: 'My subjects',
  newSubject: 'New subject',
  noSubjects: 'No subjects yet. Add one, then snap its pages or upload a PDF.',
  upcoming: 'Upcoming reviews',
  noUpcoming: 'No upcoming reviews yet.',
  settings: 'Settings',
  subjectStats: (total, fresh, due) => `${total} pages · ${fresh} new · ${due} due`,

  subjectTitle: 'Subject name',
  subjectPlaceholder: 'e.g. Biology – Chapter 3',
  create: 'Create',
  save: 'Save',
  cancel: 'Cancel',
  addPages: 'Add pages',
  camera: 'Camera',
  gallery: 'Photos',
  pdf: 'PDF file',
  pdfPagesTitle: 'Which pages of the file do you want to study?',
  pdfPagesHint: 'Each page becomes its own card to study and review.',
  fromPage: 'From page',
  toPage: 'To page',
  add: 'Add',
  pageN: (n) => `Page ${n}`,
  imageN: (n) => `Photo ${n}`,
  noPages: 'No pages yet. Add photos from the camera or gallery, or a PDF file.',
  studyThis: 'Study this subject',
  reviewThis: 'Review this subject',
  deleteSubject: 'Delete subject',
  deleteSubjectConfirm: 'This deletes the subject and all its pages. Are you sure?',
  delete: 'Delete',
  statusNew: 'New',
  statusDue: 'Due',
  cameraDenied: 'Camera permission is needed to capture pages.',
  rename: 'Rename',

  studySession: 'Study session',
  timeLeft: 'Time left',
  overtime: 'Goal reached 👏',
  of: (i, n) => `${i} of ${n}`,
  keywords: 'Keywords / summary',
  keywordsPlaceholder: 'Write the key words or idea in your own words',
  question: 'A question for yourself',
  questionPlaceholder: 'e.g. What does the mitochondria do?',
  studyHint: 'Read the page carefully, then write your keywords and a question to test yourself later.',
  doneWithPage: 'Got it ✓',
  openFile: 'Open file',
  openFileHint: (label) => `Open the file and go to ${label}`,
  sessionDone: 'Well done! Session complete',
  studiedPages: (n) => `You studied ${n === 1 ? '1 page' : `${n} pages`} today. First review is tomorrow.`,
  nothingToStudy: 'No new pages to study right now.',
  dailyLimitReached: "You've reached today's new-page limit. Rest is part of learning!",
  studyMore: 'Study one more page',
  backHome: 'Back to home',

  reviewSession: 'Review session',
  recallPrompt: 'Try to recall the page before revealing it',
  noNotes: "You didn't write notes for this page. Try to recall its main points.",
  reveal: 'Reveal page',
  howWell: 'How well did you remember?',
  again: 'Forgot',
  hard: 'Hard',
  good: 'Remembered',
  nextIn: (s) => `Next ${s}`,
  reviewDone: "Today's reviews are done",
  reviewSummary: (good, hard, again) => `Remembered ${good} · Hard ${hard} · Forgot ${again}`,
  nothingToReview: 'No reviews today. Come back tomorrow!',

  pageDetails: 'Page details',
  nextReview: 'Next review',
  notStudied: 'Not studied yet',
  reviewsCount: (n) => `Reviews: ${n}`,
  resetProgress: 'Start over',
  deletePage: 'Delete page',
  deletePageConfirm: 'Delete this page?',
  saved: 'Saved',

  yourName: 'Your name',
  dailyMinutes: 'Daily study minutes',
  newPerDay: 'New pages per day',
  reminder: 'Daily reminder',
  reminderTime: 'Reminder time',
  reminderTitle: (name) => (name ? `Time to study, ${name} 📚` : 'Time to study 📚'),
  reminderBody: 'Your daily session is waiting. Fifteen minutes is enough.',
  notifDenied: 'Notifications are not allowed. Enable them in your phone settings.',
  howItWorks: 'How does it work?',
  howItWorksBody:
    'Every page you study is scheduled for review after 1, 3, 7, 14, 30 and 60 days. "Forgot" sends it back to the start, "Hard" keeps it at the same step with a shorter wait. All your data stays on your phone.',
  minutesShort: (n) => `${n} min`,

  today: 'today',
  tomorrow: 'tomorrow',
  inDays: (n) => `in ${n} days`,
  overdue: (n) => (n === 1 ? '1 day overdue' : `${n} days overdue`),


  games: 'Memory games',
  gamesHint: 'Play with your own words, so it sticks while you have fun.',
  clozeTitle: 'Fill the gap',
  clozeDesc: 'A word from your notes is hidden, pick it',
  matchTitle: 'Match the pairs',
  matchDesc: 'Link each question or photo to its keywords',
  clozePrompt: 'Pick the missing word',
  matchPrompt: 'Pick from the right, then its match on the left',
  matchPromptLtr: 'Pick from the left, then its match on the right',
  needMoreNotes: 'You need at least 3 studied pages with keywords to play. Study and write your notes first!',
  correct: 'Correct!',
  wrong: 'Wrong',
  theAnswer: (a) => `Answer: ${a}`,
  next: 'Next',
  score: (c, n) => `${c} / ${n}`,
  gameOver: 'Game over',
  perfect: 'Perfect score! 🎯',
  playAgain: 'Play again',
  xp: 'XP',
  xpGained: (n) => `+${n} XP`,
  level: (n) => `Level ${n}`,
  toNextLevel: (n) => `${n} XP to next level`,
  levelUp: (n) => `Level up! You're now level ${n} 🎉`,
  achievements: 'Achievements',
  newAchievement: 'New achievement!',
  achievementNames: {
    first_page: 'First page',
    ten_pages: '10 pages',
    fifty_pages: '50 pages',
    streak3: '3-day streak',
    streak7: 'Full week',
    streak30: 'Full month',
    reviews25: '25 reviews',
    reviews100: '100 reviews',
    first_game: 'First game',
    perfect_game: 'Perfect score',
    mastered10: 'Mastered 10 pages',
    level5: 'Level 5',
  },
  sound: 'Encouragement sounds',
  combo: (n) => `${n} in a row! 🔥`,

  encouragements: [
    '{name}, fifteen minutes today beats two hours tomorrow.',
    'Keep going, {name}. Every review makes it stick.',
    'Your memory gets stronger every day, {name} 💪',
    'A small step today, {name}, a big result on exam day.',
    "You've got this, {name}! Start with just one page.",
    '{name}, consistency beats talent.',
    "We're proud of you, {name}. Keep the pace 🌟",
  ],
  praise: ['Excellent, {name}!', 'Great job, {name} 👏', 'Well done, {name}!', 'Brilliant, {name} 🌟'],
};

/** Arabic addresses the reader by gender; these replace the masculine wording. */
const arFemale: Dict = {
  ...ar,
  fallbackName: 'بطلة',
  startReview: 'ابدئي المراجعة',
  startStudy: 'ابدئي الدراسة',
  addPages: 'أضيفي صفحات',
  streakDays: (n: number) => (n === 0 ? 'ابدئي سلسلتك اليوم' : ar.streakDays(n)),
  resetProgress: 'ابدئي من جديد',
  sessionDone: 'أحسنتِ! انتهت الجلسة',
  namePlaceholder: 'اكتبي اسمك',
  welcomeBody:
    'ادرسي صفحات قليلة كل يوم في جلسة قصيرة، وسيذكّرك التطبيق بمراجعتها بعد 1 ثم 3 ثم 7 ثم 14 ثم 30 يوماً حتى تثبت في ذاكرتك.',
  noSubjects: 'ما عندك مواد بعد. أضيفي مادة ثم صوّري صفحاتها أو ارفعي ملف PDF.',
  noPages: 'ما فيه صفحات بعد. أضيفي صوراً من الكاميرا أو المعرض أو ملف PDF.',
  pdfPagesTitle: 'كم صفحة تبين تدرسين من الملف؟',
  studyThis: 'ادرسي هذه المادة',
  reviewThis: 'راجعي هذه المادة',
  deleteSubjectConfirm: 'سيتم حذف المادة وكل صفحاتها. متأكدة؟',
  keywordsPlaceholder: 'اكتبي أهم الكلمات أو الفكرة بأسلوبك',
  studyHint: 'اقرئي الصفحة بتركيز، ثم اكتبي كلماتك وسؤالاً تختبرين به نفسك في المراجعة.',
  recallPrompt: 'حاولي تتذكرين محتوى الصفحة قبل ما تكشفينها',
  noNotes: 'ما كتبتِ ملاحظات لهذه الصفحة. حاولي تتذكرين أهم ما فيها.',
  reveal: 'اكشفي الصفحة',
  nothingToReview: 'ما عندك مراجعات اليوم. ارجعي بكرة!',
  notifDenied: 'لم يُسمح بالإشعارات. فعّليها من إعدادات الجوال.',
  howItWorksBody:
    'كل صفحة تدرسينها تُجدول لمراجعتها بعد 1 ثم 3 ثم 7 ثم 14 ثم 30 ثم 60 يوماً. إذا قلتِ "نسيت" ترجع الصفحة لأول الجدول، وإذا قلتِ "بصعوبة" تبقى في مكانها بمدة أقصر. كل بياناتك محفوظة على جوالك فقط.',
  gamesHint: 'تلعبين بكلماتك أنتِ، فتثبت المعلومة وأنتِ مستمتعة.',
  clozeDesc: 'كلمة مخفية من ملاحظاتك، اختاريها صح',
  matchDesc: 'صِلي كل سؤال أو صورة بكلماتها',
  clozePrompt: 'اختاري الكلمة الناقصة',
  matchPrompt: 'اختاري من اليمين ثم ما يطابقه من اليسار',
  matchPromptLtr: 'اختاري من اليسار ثم ما يطابقه من اليمين',
  needMoreNotes: 'تحتاجين 3 صفحات مدروسة على الأقل فيها كلمات مفتاحية لتلعبي. ادرسي واكتبي ملاحظاتك أولاً!',
  playAgain: 'العبي مرة ثانية',
  encouragements: [
    'يا {name}، ربع ساعة اليوم أفضل من ساعتين بكرة.',
    'استمري يا {name}، كل مراجعة تثبّت المعلومة أكثر.',
    'ذاكرتك تقوى كل يوم يا {name} 💪',
    'خطوة صغيرة اليوم يا {name}، ونتيجة كبيرة في الاختبار.',
    'أنتِ قدها يا {name}! ابدئي بصفحة واحدة بس.',
    'يا {name}، الاستمرار يغلب الموهبة.',
    'فخورين فيكِ يا {name}، كمّلي على نفس الوتيرة 🌟',
  ],
  praise: ['ممتازة يا {name}!', 'رائعة يا {name} 👏', 'أحسنتِ يا {name}!', 'كفو يا {name} 🌟'],
};

export type Gender = 'm' | 'f';

export function getStrings(lang: Language, gender: Gender): Dict {
  if (lang === 'en') return en;
  return gender === 'f' ? arFemale : ar;
}

export type Strings = Dict;

/** Fills {name}; uses a friendly fallback when the user has no name set. */
export function withName(template: string, name: string, s: Strings): string {
  return template.replaceAll('{name}', name.trim() || s.fallbackName);
}

/** Picks a stable item for the day so the message does not flicker on every render. */
export function pickForDay<T>(items: readonly T[], day: string, salt = 0): T {
  let h = salt;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return items[h % items.length];
}

export function relativeDay(date: string, today: string, s: Strings): string {
  const n = daysBetween(today, date);
  if (n < 0) return s.overdue(-n);
  if (n === 0) return s.today;
  if (n === 1) return s.tomorrow;
  return s.inDays(n);
}

export function formatDate(date: string, lang: Language): string {
  const [y, m, d] = date.split('-').map(Number);
  try {
    return new Date(y, m - 1, d, 12).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return date;
  }
}
