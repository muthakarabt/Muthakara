import type { GameType, Language, Profile } from '@/lib/db';
import { daysBetween } from '@/lib/srs';

export type Gender = 'm' | 'f';

/**
 * All user-facing text. Arabic is written in a light Gulf colloquial tone and
 * addresses the reader by gender (طالب / طالبة); English mirrors the same tone.
 * Wording is kept adult so it suits university students as well as school.
 */
function arabic(f: boolean, profile: Profile) {
  // m/f picker for the few words that change.
  const g = (m: string, fem: string) => (f ? fem : m);
  const subjectWord = profile === 'self' ? 'موضوع' : 'مادة';

  return {
    appName: 'مذاكرة',
    tagline: 'شوي كل يوم… ويثبت معك',

    // onboarding
    welcomeTitle: 'أهلاً في مذاكرة',
    welcomeBody: `${g('ذاكر', 'ذاكري')} على راحتك ولو نص صفحة، والتطبيق يرجّعها لك بعد 1 ثم 3 ثم 7 ثم 14 ثم 30 يوم لين تثبت.`,
    whoAreYou: 'وش يوصفك أكثر؟',
    profiles: {
      university: g('طالب جامعي', 'طالبة جامعية'),
      school: g('طالب مدرسة', 'طالبة مدرسة'),
      self: g('أتعلم لنفسي', 'أتعلم لنفسي'),
    } as Record<Profile, string>,
    profileHints: {
      university: 'محاضرات، ملخصات، مراجع',
      school: 'كتب ودروس ومراجعة اختبارات',
      self: 'كتب، لغات، أي شيء تبي تحفظه',
    } as Record<Profile, string>,
    iAm: 'أنا',
    male: 'طالب',
    female: 'طالبة',
    askName: 'اسمك',
    namePlaceholder: g('اكتب اسمك', 'اكتبي اسمك'),
    chooseLanguage: 'اللغة',
    start: 'يلّا نبدأ',

    // greetings
    goodMorning: 'صباح الخير',
    goodEvening: 'مساء الخير',

    // home
    todayGoal: 'هدف اليوم',
    minutesOf: (done: number, goal: number) => `${done} من ${goal} دقيقة`,
    streakDays: (n: number) =>
      n === 0 ? g('ابدأ سلسلتك اليوم', 'ابدئي سلسلتك اليوم') : n === 1 ? 'يوم واحد متتالي' : n === 2 ? 'يومين متتالية' : `${n} أيام متتالية`,
    reviewsDue: 'مراجعات اليوم',
    newToday: 'مقاطع جديدة',
    partsCount: (n: number) => (n === 0 ? 'ولا شيء' : n === 1 ? 'مقطع واحد' : n === 2 ? 'مقطعين' : n <= 10 ? `${n} مقاطع` : `${n} مقطع`),
    pagesCount: (n: number) => (n === 0 ? 'ولا شيء' : n === 1 ? 'صفحة وحدة' : n === 2 ? 'صفحتين' : n <= 10 ? `${n} صفحات` : `${n} صفحة`),
    study: g('ذاكر', 'ذاكري'),
    review: g('راجع', 'راجعي'),
    play: g('العب', 'العبي'),
    allDone: g('خلّصت كل شي اليوم. أهنيك!', 'خلّصتي كل شي اليوم. أهنيكِ!'),
    mySubjects: profile === 'self' ? 'مواضيعي' : 'موادي',
    newSubject: `${subjectWord} جديدة`.replace('موضوع جديدة', 'موضوع جديد'),
    noSubjects: `ما عندك ${profile === 'self' ? 'مواضيع' : 'مواد'} للحين. ${g('أضف', 'أضيفي')} ${subjectWord} و${g('صوّر', 'صوّري')} صفحاتها أو ${g('الصق', 'الصقي')} النص.`,
    upcoming: 'المراجعات الجاية',
    noUpcoming: 'ما فيه مراجعات جاية للحين.',
    settings: 'الإعدادات',
    subjectStats: (total: number, fresh: number, due: number) => `${total} مقطع · ${fresh} جديد · ${due} للمراجعة`,

    // subject
    subjectTitle: `اسم ال${subjectWord}`,
    subjectPlaceholder:
      profile === 'university'
        ? 'مثلاً: مبادئ الاقتصاد - المحاضرة 3'
        : profile === 'school'
          ? 'مثلاً: أحياء - الوحدة الثانية'
          : 'مثلاً: كتاب العادات الذرية',
    create: 'إنشاء',
    save: 'حفظ',
    cancel: 'إلغاء',
    addContent: 'إضافة محتوى',
    camera: 'تصوير',
    gallery: 'الصور',
    pdf: 'PDF',
    pasteText: 'نص',
    pdfPagesTitle: g('أي صفحات تبي تذاكر من الملف؟', 'أي صفحات تبين تذاكرين من الملف؟'),
    pdfPagesHint: 'كل صفحة تصير بطاقة. تقدر تضيف نصها بعدين من تفاصيلها.',
    fromPage: 'من صفحة',
    toPage: 'إلى صفحة',
    add: 'إضافة',
    pageN: (n: number) => `صفحة ${n}`,
    imageN: (n: number) => `صورة ${n}`,
    textN: (n: number) => `نص ${n}`,
    partOf: (label: string, i: number, n: number) => (n > 1 ? `${label} · ${i}/${n}` : label),
    noPages: `ما فيه محتوى للحين. ${g('صوّر', 'صوّري')} صفحة أو ${g('اختر', 'اختاري')} صوراً أو ${g('الصق', 'الصقي')} نصاً.`,
    deleteSubject: 'حذف',
    deleteSubjectConfirm: g('بينحذف كل المحتوى اللي فيها. متأكد؟', 'بينحذف كل المحتوى اللي فيها. متأكدة؟'),
    delete: 'حذف',
    statusNew: 'جديد',
    statusDue: 'للمراجعة',
    cameraDenied: 'نحتاج إذن الكاميرا عشان نصوّر الصفحات.',
    rename: 'تغيير الاسم',
    testStyle: 'طريقة الاختبار',
    testStyleHint: g('تقدر تغيّرها أي وقت', 'تقدرين تغيّرينها أي وقت'),

    // games
    games: {
      mix: 'منوّع',
      cloze: 'أكمل الفراغ',
      type: 'اكتب من ذاكرتك',
      order: 'رتّب الكلمات',
      match: 'طابق',
    } as Record<GameType, string>,
    gameDescs: {
      mix: 'كل سؤال بطريقة مختلفة',
      cloze: 'كلمة ناقصة واختيارات',
      type: g('تكتب الكلمات الناقصة بنفسك', 'تكتبين الكلمات الناقصة بنفسك'),
      order: 'الجملة مبعثرة ورتّبها',
      match: 'صِل بداية كل مقطع بنهايته',
    } as Record<GameType, string>,
    gamesTitle: 'العب وثبّت',
    gamesHint: 'الأسئلة من نصوصك أنت، فتثبت المعلومة وأنت تلعب.',
    clozePrompt: g('اختر الكلمة الناقصة', 'اختاري الكلمة الناقصة'),
    typePrompt: g('اكتب الناقص من ذاكرتك', 'اكتبي الناقص من ذاكرتك'),
    typePlaceholder: 'الكلمات الناقصة…',
    orderPrompt: g('رتّب الكلمات بالترتيب الصحيح', 'رتّبي الكلمات بالترتيب الصحيح'),
    matchPrompt: g('اختر بداية، بعدين نهايتها', 'اختاري بداية، بعدين نهايتها'),
    check: 'تحقق',
    clear: 'مسح',
    nothingToPlay: `${g('أضف', 'أضيفي')} محتوى فيه نص (صورة صفحة أو نص ملصوق) وتقدر تلعب على طول.`,
    needTwoForMatch: 'لعبة المطابقة تحتاج مقطعين على الأقل، فخليناها "أكمل الفراغ".',
    score: (c: number, n: number) => `${c} / ${n}`,
    gameOver: 'خلصت الجولة',
    perfect: 'العلامة كاملة',
    playAgain: 'جولة ثانية',
    next: 'التالي',

    // feedback
    correct: [g('صح عليك', 'صح عليكِ'), 'بالضبط', 'إجابة صحيحة', g('ثابتة معك', 'ثابتة معكِ')],
    close: g('قربت، باقي شوي', 'قربتِ، باقي شوي'),
    wrong: g('مو هذي، حاول مرة ثانية. عندك فرصة تصحّحها', 'مو هذي، حاولي مرة ثانية. عندك فرصة تصحّحينها'),
    wrongFinal: 'ولا يهمك، هذي الإجابة الصحيحة. بترجع لك بالمراجعة.',
    timeUp: 'خلص الوقت',
    theAnswer: 'الإجابة',
    memorized: g('حفظتها، كمّل', 'حفظتيها، كمّلي'),

    // study
    studySession: 'جلسة مذاكرة',
    timeLeft: 'الباقي من هدفك',
    overtime: 'تعديت هدف اليوم',
    of: (i: number, n: number) => `${i} من ${n}`,
    stepListen: 'اسمع',
    stepLook: 'آخر نظرة',
    stepTest: 'اختبار سريع',
    listenHint: g('ركّز وأنت تسمع، وردّدها معه لو تبي', 'ركّزي وأنتِ تسمعين، وردّديها معه لو تبين'),
    listenAgain: 'أعد',
    stopListening: 'إيقاف',
    skip: 'تخطّي',
    addTextHint: g('أضف نص الصفحة عشان التطبيق يقرأه لك ويختبرك', 'أضيفي نص الصفحة عشان التطبيق يقرأه لك ويختبرك'),
    addText: 'إضافة النص',
    lookHint: g('اقرأها مرة أخيرة، بعدها نختبرك', 'اقرئيها مرة أخيرة، بعدها نختبرك'),
    readyForTest: g('جاهز', 'جاهزة'),
    noVoice: 'ما لقينا صوت عربي في جهازك، فاقرأ النص بنفسك.',
    keywords: 'كلمات مفتاحية / ملخص',
    keywordsPlaceholder: g('اكتب أهم الكلمات بأسلوبك', 'اكتبي أهم الكلمات بأسلوبك'),
    question: g('سؤال لنفسك', 'سؤال لنفسكِ'),
    questionPlaceholder: 'مثلاً: وش وظيفة الميتوكوندريا؟',
    studyHint: g(
      'اقرأ الصفحة بتركيز، واكتب أهم كلماتها وسؤالاً تختبر فيه نفسك. أو أضف نصها من التفاصيل عشان التطبيق يقرأه لك ويختبرك.',
      'اقرئي الصفحة بتركيز، واكتبي أهم كلماتها وسؤالاً تختبرين فيه نفسك. أو أضيفي نصها من التفاصيل عشان التطبيق يقرأه لك ويختبرك.',
    ),
    doneWithPage: g('فهمتها', 'فهمتها'),
    openFile: 'افتح الملف',
    openFileHint: (label: string) => `افتح الملف وروح ${label}`,
    sessionDone: 'خلصت الجلسة',
    studiedParts: (n: number) => `${g('ذاكرت', 'ذاكرتي')} ${n === 1 ? 'مقطع واحد' : n === 2 ? 'مقطعين' : `${n} مقاطع`}، وأول مراجعة لها بكرة.`,
    nothingToStudy: g('ما فيه شي جديد تذاكره. أضف محتوى أو راجع.', 'ما فيه شي جديد تذاكرينه. أضيفي محتوى أو راجعي.'),
    stopHere: 'أكتفي هنا',
    backHome: 'الرئيسية',

    // review
    reviewSession: 'جلسة مراجعة',
    recallPrompt: g('تذكّر محتوى الصفحة قبل لا تكشفها', 'تذكّري محتوى الصفحة قبل لا تكشفينها'),
    noNotes: g('ما كتبت ملاحظات لهذي الصفحة. حاول تتذكر أهم ما فيها.', 'ما كتبتي ملاحظات لهذي الصفحة. حاولي تتذكرين أهم ما فيها.'),
    reveal: g('اكشف', 'اكشفي'),
    howWell: 'كيف كان تذكّرك؟',
    again: g('نسيت', 'نسيت'),
    hard: 'بصعوبة',
    good: g('تذكرت', 'تذكرت'),
    reviewDone: 'خلصت مراجعات اليوم',
    reviewSummary: (good: number, hard: number, again: number) => `صح ${good} · قريب ${hard} · يحتاج مراجعة ${again}`,
    nothingToReview: g('ما عندك مراجعات اليوم. ذاكر شي جديد أو العب جولة.', 'ما عندك مراجعات اليوم. ذاكري شي جديد أو العبي جولة.'),

    // import (photo → text)
    importTitle: 'نص الصفحة',
    reading: 'نقرأ النص من الصورة…',
    readingProgress: (p: number) => `نقرأ النص… ${p}%`,
    ocrFailed: g('ما قدرنا نقرأ النص. اكتبه أو الصقه بنفسك، أو احفظها كصورة بس.', 'ما قدرنا نقرأ النص. اكتبيه أو الصقيه بنفسك، أو احفظيها كصورة بس.'),
    ocrUnavailable: g(
      'قراءة النص من الصور متوفرة في نسخة الموقع. هنا الصق النص أو اكتبه، أو احفظها كصورة بس.',
      'قراءة النص من الصور متوفرة في نسخة الموقع. هنا الصقي النص أو اكتبيه، أو احفظيها كصورة بس.',
    ),
    checkText: g('راجع النص وصحّح أي غلط قبل الحفظ', 'راجعي النص وصحّحي أي غلط قبل الحفظ'),
    textPlaceholder: g('الصق النص هنا أو اكتبه…', 'الصقي النص هنا أو اكتبيه…'),
    partsPreview: (n: number) => `بينقسم إلى ${n === 1 ? 'مقطع واحد' : n === 2 ? 'مقطعين' : `${n} مقاطع`}`,
    saveText: 'حفظ النص',
    saveImageOnly: 'حفظ كصورة بس',
    imageXofY: (i: number, n: number) => `صورة ${i} من ${n}`,
    pasteTitle: 'إضافة نص',

    // page
    pageDetails: 'التفاصيل',
    passage: 'النص',
    nextReview: 'المراجعة الجاية',
    notStudied: 'ما تذاكرت للحين',
    reviewsCount: (n: number) => `عدد المراجعات: ${n}`,
    resetProgress: g('ابدأ من جديد', 'ابدئي من جديد'),
    deletePage: 'حذف المقطع',
    deletePageConfirm: 'نحذف هذا المقطع؟',
    saved: 'انحفظ',
    listen: 'استماع',

    // settings
    yourName: 'اسمك',
    dailyMinutes: 'دقائق المذاكرة اليومية',
    answerTime: 'وقت الإجابة على كل سؤال',
    seconds: (n: number) => `${n} ثانية`,
    listenRepeats: 'كم مرة يقرأ لك المقطع',
    times: (n: number): string => (n === 1 ? 'مرة' : 'مرتين'),
    reminder: 'تنبيه يومي',
    reminderTime: 'وقت التنبيه',
    reminderWebNote: 'التنبيهات تشتغل في تطبيق الجوال.',
    notifDenied: g('الإشعارات مقفلة. فعّلها من إعدادات الجوال.', 'الإشعارات مقفلة. فعّليها من إعدادات الجوال.'),
    sound: 'أصوات الطبيعة',
    howItWorks: 'كيف يشتغل التطبيق؟',
    howItWorksBody: g(
      'كل مقطع تذاكره يرجع لك بعد 1 ثم 3 ثم 7 ثم 14 ثم 30 ثم 60 يوم. لو جاوبت صح يتقدم خطوة، لو قربت يبقى مكانه بمدة أقصر، ولو غلطت يرجع للبداية. كل بياناتك محفوظة في جهازك بس.',
      'كل مقطع تذاكرينه يرجع لك بعد 1 ثم 3 ثم 7 ثم 14 ثم 30 ثم 60 يوم. لو جاوبتي صح يتقدم خطوة، لو قربتي يبقى مكانه بمدة أقصر، ولو غلطتي يرجع للبداية. كل بياناتك محفوظة في جهازك بس.',
    ),
    minutesShort: (n: number) => `${n} د`,

    // relative days
    today: 'اليوم',
    tomorrow: 'بكرة',
    inDays: (n: number) => (n === 2 ? 'بعد يومين' : n <= 10 ? `بعد ${n} أيام` : `بعد ${n} يوم`),
    overdue: (n: number) => (n === 1 ? 'متأخرة يوم' : n === 2 ? 'متأخرة يومين' : n <= 10 ? `متأخرة ${n} أيام` : `متأخرة ${n} يوم`),

    // points
    xp: 'نقطة',
    xpGained: (n: number) => `+${n} نقطة`,
    level: (n: number) => `المستوى ${n}`,
    toNextLevel: (n: number) => `${n} نقطة للمستوى الجاي`,
    levelUp: (n: number) => `وصلت المستوى ${n}`.replace('وصلت', g('وصلت', 'وصلتي')),
    achievements: 'الإنجازات',
    newAchievement: 'إنجاز جديد',
    achievementNames: {
      first_page: 'أول مقطع',
      ten_pages: '10 مقاطع',
      fifty_pages: '50 مقطع',
      streak3: '3 أيام ورا بعض',
      streak7: 'أسبوع كامل',
      streak30: 'شهر كامل',
      reviews25: '25 مراجعة',
      reviews100: '100 مراجعة',
      first_game: 'أول جولة',
      perfect_game: 'علامة كاملة',
      mastered10: 'ثبّت 10 مقاطع',
      level5: 'المستوى 5',
    } as Record<string, string>,
    combo: (n: number) => `${n} صح ورا بعض`,

    encouragements: [
      '{name}، ربع ساعة اليوم أحسن من ساعتين ليلة الاختبار.',
      `${g('استمر', 'استمري')} يا {name}، كل مراجعة تثبّت المعلومة أكثر.`,
      'الاستمرار يغلب الموهبة يا {name}.',
      'خطوة صغيرة كل يوم، ونتيجتها تبان في الاختبار.',
      `${g('ابدأ', 'ابدئي')} بمقطع واحد بس يا {name}، والباقي يجي.`,
      `${g('أهنيك', 'أهنيكِ')} يا {name}، ${g('ماشي', 'ماشية')} صح.`,
      profile === 'university'
        ? 'المحاضرة اللي تراجعها اليوم ما تحتاج تذاكرها من الصفر قبل الاختبار.'
        : profile === 'school'
          ? 'الدرس اللي تثبّته اليوم يريحك ليلة الاختبار.'
          : 'اللي تتعلمه شوي شوي يبقى معك أطول.',
    ],
    praise: [
      `${g('أهنيك', 'أهنيكِ')} على الإنجاز يا {name}`,
      'شغل نظيف يا {name}',
      'ممتاز يا {name}، كذا الثبات',
      `${g('ماشي', 'ماشية')} صح يا {name}`,
    ],
    reminderTitle: (name: string) => (name ? `${name}، وقت المذاكرة` : 'وقت المذاكرة'),
    reminders: [
      'ما بتاخذ وقت، 10 إلى 15 دقيقة بس وتكون خلّصت.',
      `مراجعتك اليوم جاهزة، ${g('افتح', 'افتحي')} التطبيق وبس.`,
      'شوي كل يوم أحسن من كثير مرة وحدة.',
      `${g('ثبّت', 'ثبّتي')} اللي ${g('ذاكرته', 'ذاكرتيه')} قبل لا يطير.`,
      'ربع ساعة اليوم توفّر عليك ساعات قبل الاختبار.',
      `مقطع واحد اليوم يكفي، المهم ما ${g('توقف', 'توقفين')}.`,
      `جلستك القصيرة تنتظرك، ${g('ذاكر', 'ذاكري')} أو ${g('راجع', 'راجعي')}.`,
    ],
  };
}

type Dict = ReturnType<typeof arabic>;

function english(profile: Profile): Dict {
  const subjectWord = profile === 'self' ? 'topic' : 'subject';
  return {
    appName: 'Muthakara',
    tagline: 'A little every day… and it sticks',

    welcomeTitle: 'Welcome to Muthakara',
    welcomeBody:
      'Study at your own pace, even half a page. The app brings it back after 1, 3, 7, 14 and 30 days until it sticks.',
    whoAreYou: 'What describes you best?',
    profiles: { university: 'University student', school: 'School student', self: 'Learning for myself' },
    profileHints: {
      university: 'Lectures, summaries, references',
      school: 'Books, lessons and exam prep',
      self: 'Books, languages, anything you want to remember',
    },
    iAm: 'I am',
    male: 'Male',
    female: 'Female',
    askName: 'Your name',
    namePlaceholder: 'Your name',
    chooseLanguage: 'Language',
    start: "Let's go",

    goodMorning: 'Good morning',
    goodEvening: 'Good evening',

    todayGoal: "Today's goal",
    minutesOf: (done, goal) => `${done} of ${goal} min`,
    streakDays: (n) => (n === 0 ? 'Start your streak today' : n === 1 ? '1 day in a row' : `${n} days in a row`),
    reviewsDue: 'Reviews today',
    newToday: 'New parts',
    partsCount: (n) => (n === 0 ? 'None' : n === 1 ? '1 part' : `${n} parts`),
    pagesCount: (n) => (n === 0 ? 'None' : n === 1 ? '1 page' : `${n} pages`),
    study: 'Study',
    review: 'Review',
    play: 'Play',
    allDone: "You're done for today. Well done!",
    mySubjects: profile === 'self' ? 'My topics' : 'My subjects',
    newSubject: `New ${subjectWord}`,
    noSubjects: `No ${subjectWord}s yet. Add one, then snap its pages or paste the text.`,
    upcoming: 'Coming up',
    noUpcoming: 'No reviews coming up yet.',
    settings: 'Settings',
    subjectStats: (total, fresh, due) => `${total} parts · ${fresh} new · ${due} due`,

    subjectTitle: `${subjectWord[0].toUpperCase()}${subjectWord.slice(1)} name`,
    subjectPlaceholder:
      profile === 'university'
        ? 'e.g. Principles of Economics – Lecture 3'
        : profile === 'school'
          ? 'e.g. Biology – Unit 2'
          : 'e.g. Atomic Habits',
    create: 'Create',
    save: 'Save',
    cancel: 'Cancel',
    addContent: 'Add content',
    camera: 'Camera',
    gallery: 'Photos',
    pdf: 'PDF',
    pasteText: 'Text',
    pdfPagesTitle: 'Which pages of the file do you want to study?',
    pdfPagesHint: 'Each page becomes a card. You can add its text later from its details.',
    fromPage: 'From page',
    toPage: 'To page',
    add: 'Add',
    pageN: (n) => `Page ${n}`,
    imageN: (n) => `Photo ${n}`,
    textN: (n) => `Text ${n}`,
    partOf: (label, i, n) => (n > 1 ? `${label} · ${i}/${n}` : label),
    noPages: 'Nothing here yet. Snap a page, pick photos or paste some text.',
    deleteSubject: 'Delete',
    deleteSubjectConfirm: 'Everything in it will be deleted. Are you sure?',
    delete: 'Delete',
    statusNew: 'New',
    statusDue: 'due',
    cameraDenied: 'Camera permission is needed to capture pages.',
    rename: 'Rename',
    testStyle: 'Test style',
    testStyleHint: 'You can change it any time',

    games: { mix: 'Mixed', cloze: 'Fill the gap', type: 'Write from memory', order: 'Order the words', match: 'Match' },
    gameDescs: {
      mix: 'A different style each question',
      cloze: 'A missing word and choices',
      type: 'Type the missing words yourself',
      order: 'Put the scrambled sentence back',
      match: 'Join each start to its ending',
    },
    gamesTitle: 'Play to remember',
    gamesHint: 'Questions come from your own text, so it sticks while you play.',
    clozePrompt: 'Pick the missing word',
    typePrompt: 'Type what is missing',
    typePlaceholder: 'Missing words…',
    orderPrompt: 'Put the words in the right order',
    matchPrompt: 'Pick a start, then its ending',
    check: 'Check',
    clear: 'Clear',
    nothingToPlay: 'Add something with text (a page photo or pasted text) and you can play right away.',
    needTwoForMatch: 'Match needs at least two parts, so this round is Fill the gap.',
    score: (c, n) => `${c} / ${n}`,
    gameOver: 'Round complete',
    perfect: 'Perfect score',
    playAgain: 'Another round',
    next: 'Next',

    correct: ['Spot on', 'Exactly', 'Correct', 'You know this one'],
    close: 'Close, almost there',
    wrong: "Not quite. Try again, you've got one more chance",
    wrongFinal: "No worries, here's the answer. It'll come back in your review.",
    timeUp: "Time's up",
    theAnswer: 'Answer',
    memorized: 'Got it, keep going',

    studySession: 'Study session',
    timeLeft: 'Left of your goal',
    overtime: "Past today's goal",
    of: (i, n) => `${i} of ${n}`,
    stepListen: 'Listen',
    stepLook: 'Last look',
    stepTest: 'Quick test',
    listenHint: 'Focus while you listen, and repeat along if you like',
    listenAgain: 'Again',
    stopListening: 'Stop',
    skip: 'Skip',
    addTextHint: 'Add the page text so the app can read it to you and test you',
    addText: 'Add text',
    lookHint: "Read it one last time, then we'll test you",
    readyForTest: "I'm ready",
    noVoice: "We couldn't find a voice for this language on your device, so read it yourself.",
    keywords: 'Keywords / summary',
    keywordsPlaceholder: 'The key words in your own words',
    question: 'A question for yourself',
    questionPlaceholder: 'e.g. What do mitochondria do?',
    studyHint:
      'Read the page carefully and write its key words and a question to test yourself. Or add its text from the details so the app can read it to you and test you.',
    doneWithPage: 'Got it',
    openFile: 'Open file',
    openFileHint: (label) => `Open the file and go to ${label}`,
    sessionDone: 'Session complete',
    studiedParts: (n) => `You studied ${n === 1 ? '1 part' : `${n} parts`}. First review is tomorrow.`,
    nothingToStudy: 'Nothing new to study. Add content or do a review.',
    stopHere: "That's enough for now",
    backHome: 'Home',

    reviewSession: 'Review session',
    recallPrompt: 'Recall the page before revealing it',
    noNotes: "You didn't write notes for this page. Try to recall its main points.",
    reveal: 'Reveal',
    howWell: 'How well did you remember?',
    again: 'Forgot',
    hard: 'Hard',
    good: 'Remembered',
    reviewDone: "Today's reviews are done",
    reviewSummary: (good, hard, again) => `Right ${good} · Close ${hard} · Needs work ${again}`,
    nothingToReview: 'No reviews today. Study something new or play a round.',

    importTitle: 'Page text',
    reading: 'Reading the text from the photo…',
    readingProgress: (p) => `Reading the text… ${p}%`,
    ocrFailed: "We couldn't read the text. Type or paste it yourself, or save it as a photo only.",
    ocrUnavailable: 'Reading text from photos is available in the web version. Here, paste or type the text, or save it as a photo only.',
    checkText: 'Check the text and fix any mistakes before saving',
    textPlaceholder: 'Paste or type the text here…',
    partsPreview: (n) => `Will be split into ${n === 1 ? '1 part' : `${n} parts`}`,
    saveText: 'Save text',
    saveImageOnly: 'Save as photo only',
    imageXofY: (i, n) => `Photo ${i} of ${n}`,
    pasteTitle: 'Add text',

    pageDetails: 'Details',
    passage: 'Text',
    nextReview: 'Next review',
    notStudied: 'Not studied yet',
    reviewsCount: (n) => `Reviews: ${n}`,
    resetProgress: 'Start over',
    deletePage: 'Delete part',
    deletePageConfirm: 'Delete this part?',
    saved: 'Saved',
    listen: 'Listen',

    yourName: 'Your name',
    dailyMinutes: 'Daily study minutes',
    answerTime: 'Time to answer each question',
    seconds: (n) => `${n} sec`,
    listenRepeats: 'How many times each part is read aloud',
    times: (n) => (n === 1 ? 'Once' : 'Twice'),
    reminder: 'Daily reminder',
    reminderTime: 'Reminder time',
    reminderWebNote: 'Reminders work in the phone app.',
    notifDenied: 'Notifications are off. Turn them on in your phone settings.',
    sound: 'Nature sounds',
    howItWorks: 'How does it work?',
    howItWorksBody:
      'Every part you study comes back after 1, 3, 7, 14, 30 and 60 days. Right moves it up a step, close keeps it with a shorter wait, wrong sends it back to the start. All your data stays on your device.',
    minutesShort: (n) => `${n} min`,

    today: 'today',
    tomorrow: 'tomorrow',
    inDays: (n) => `in ${n} days`,
    overdue: (n) => (n === 1 ? '1 day overdue' : `${n} days overdue`),

    xp: 'XP',
    xpGained: (n) => `+${n} XP`,
    level: (n) => `Level ${n}`,
    toNextLevel: (n) => `${n} XP to next level`,
    levelUp: (n) => `You reached level ${n}`,
    achievements: 'Achievements',
    newAchievement: 'New achievement',
    achievementNames: {
      first_page: 'First part',
      ten_pages: '10 parts',
      fifty_pages: '50 parts',
      streak3: '3 days in a row',
      streak7: 'Full week',
      streak30: 'Full month',
      reviews25: '25 reviews',
      reviews100: '100 reviews',
      first_game: 'First round',
      perfect_game: 'Perfect score',
      mastered10: 'Locked in 10 parts',
      level5: 'Level 5',
    },
    combo: (n) => `${n} right in a row`,

    encouragements: [
      '{name}, fifteen minutes today beats two hours the night before the exam.',
      'Keep going, {name}. Every review makes it stick.',
      'Consistency beats talent, {name}.',
      'A small step every day shows on exam day.',
      'Start with just one part, {name}. The rest follows.',
      "Nice work, {name}. You're on track.",
      profile === 'university'
        ? "The lecture you review today is one you won't have to relearn before the exam."
        : profile === 'school'
          ? 'The lesson you lock in today makes exam night easier.'
          : 'What you learn little by little stays longer.',
    ],
    praise: ['Well done on this, {name}', 'Clean work, {name}', "Excellent, {name}. That's how it sticks", "You're on track, {name}"],
    reminderTitle: (name) => (name ? `${name}, time to study` : 'Time to study'),
    reminders: [
      "It won't take long, just 10 to 15 minutes.",
      'Your review is ready. Just open the app.',
      'A little every day beats a lot at once.',
      'Lock in what you studied before it slips away.',
      'Fifteen minutes today saves hours before the exam.',
      "One part today is enough. Just don't stop.",
      'Your short session is waiting: study or review.',
    ],
  };
}

export type Strings = Dict;

export function getStrings(lang: Language, gender: Gender, profile: Profile): Strings {
  return lang === 'en' ? english(profile) : arabic(gender === 'f', profile);
}

/** Fills {name}; when the user gave no name, the phrase is reworded without it. */
export function withName(template: string, name: string): string {
  const n = name.trim();
  if (n) return template.replaceAll('{name}', n);
  return template
    .replace(/\s*يا \{name\}/g, '')
    .replace(/\{name\}[،,]\s*/g, '')
    .replace(/,\s*\{name\}/g, '')
    .replace(/\{name\}/g, '')
    .replace(/^\s*(\p{L})/u, (c) => c.toUpperCase())
    .trim();
}

/** Picks a stable item for the day so the message does not change on every render. */
export function pickForDay<T>(items: readonly T[], day: string, salt = 0): T {
  let h = salt;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return items[h % items.length];
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
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
    });
  } catch {
    return date;
  }
}
