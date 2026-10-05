export interface EmergencyProtocol {
  id: string;
  code: string;
  titleFa: string;
  titleEn: string;
  severity: 'CRITICAL_CODE_RED' | 'URGENT_CODE_ORANGE';
  triggerConditionFa: string;
  vitalThresholds: {
    minSysBP?: number;
    maxSysBP?: number;
    minDiaBP?: number;
    maxDiaBP?: number;
    minFBS?: number;
    maxHeartRate?: number;
  };
  immediateStabilizationStepsFa: string[];
  firstLineMedicationsFa: string[];
  dispatch115InstructionsFa: string;
  targetFacilityLevel: 'LEVEL_3_TERTIARY_HOSPITAL' | 'CORONARY_CARE_UNIT' | 'STROKE_CENTER';
}

export const EMERGENCY_PROTOCOLS: EmergencyProtocol[] = [
  {
    id: 'emg-acs',
    code: 'CODE-RED-ACS-01',
    titleFa: 'سندروم حاد کرونری و سکته قلبی (ACS / STEMI)',
    titleEn: 'Acute Coronary Syndrome & Suspected Myocardial Infarction',
    severity: 'CRITICAL_CODE_RED',
    triggerConditionFa: 'درد فشارنده پشت جناغ سینه با انتشار به فک چپ یا دست چپ، همراه با تعریق سرد، تنگی نفس یا تهوع بیش از ۲۰ دقیقه.',
    vitalThresholds: {
      maxHeartRate: 130,
    },
    immediateStabilizationStepsFa: [
      'تماس فوری با اورژانس پیش‌بیمارستانی ۱۱۵ (کد ۲۴۷ استقرار سریع قلبی) و گزارش وضعیت بیمار.',
      'استراحت مطلق در وضعیت نیمه‌نشسته (فولرز) و برقراری اکسیژن مکمل در صورت SpO2 زیر ۹۰٪.',
      'گرفتن نوار قلب ۱۲ لید (ECG) در کمتر از ۱۰ دقیقه بدون به تعویق انداختن اعزام.',
      'برقراری دسترسی وریدی با آنژیوکت شماره ۱۸ یا ۲۰ در ساعد.',
    ],
    firstLineMedicationsFa: [
      'قرص آسپرین ۳۰۰ میلی‌گرم جویدنی بلافاصله (در صورت عدم حساسیت یا خونریزی فعال).',
      'قرص زیرزبانی نیتروگلیسیرین ۰.۴ میلی‌گرم هر ۵ دقیقه تا ۳ نوبت (در صورتی که فشار سیستول بالاتر از ۹۰ باشد و داروی مهارکننده فسفودی‌استراز مثل سیلدنافیل مصرف نشده باشد).',
      'قرص کلوپیدوگرل (پلاویکس) ۳۰۰ میلی‌گرم در صورت تایید تغییرات ایسکمیک در ECG.',
    ],
    dispatch115InstructionsFa: 'اعزام بیمار با کد ۲۴۷ مستقیماً به نزدیک‌ترین بیمارستان دارای بخش آنژیوگرافی و کت‌لب فعال (PCI).',
    targetFacilityLevel: 'CORONARY_CARE_UNIT',
  },
  {
    id: 'emg-htn-crisis',
    code: 'CODE-RED-HTN-02',
    titleFa: 'بحران فشار خون (Hypertensive Emergency)',
    titleEn: 'Hypertensive Emergency with Acute Target Organ Damage',
    severity: 'CRITICAL_CODE_RED',
    triggerConditionFa: 'فشار خون سیستولیک مساوی یا بالای ۱۸۰ یا دیاستولیک بالای ۱۲۰ میلی‌متر جیوه همراه با علائم آسیب حاد ارگان هدف (سردرد انفجاری، تاری دید، تنگی نفس حاد، درد قفسه سینه یا گیجی).',
    vitalThresholds: {
      minSysBP: 180,
      minDiaBP: 120,
    },
    immediateStabilizationStepsFa: [
      'حفظ آرامش بیمار در وضعیت نشسته و اندازه‌گیری مجدد فشار خون پس از ۵ دقیقه از هر دو دست.',
      'تماس با ۱۱۵ جهت انتقال فوری به بخش مراقبت‌های ویژه.',
      'پرهیز جدی از کاهش سریع و ناگهانی فشار خون (هدف: کاهش فشار حداکثر ۲۰ تا ۲۵ درصد در ساعت اول).',
      'ارزیابی هوشیاری، نوار قلب و سمع ریه از نظر ادم حاد ریه.',
    ],
    firstLineMedicationsFa: [
      'از تجویز زیرزبانی کپسول نیفدیپین به دلیل خطر سکته مغزی و افت غیرقابل کنترل اکیداً خودداری شود.',
      'در مراکز مجهز: لابتالول وریدی یا هیدرالازین تحت پایش مداوم، یا قرص کاپتوپریل ۲۵ میلی‌گرم خوراکی در موارد فوریت بدون ادم ریه.',
    ],
    dispatch115InstructionsFa: 'اعزام فوری به بخش اورژانس بیمارستان جنرال با هشدار احتمال خونریزی مغزی یا نارسایی حاد قلبی.',
    targetFacilityLevel: 'LEVEL_3_TERTIARY_HOSPITAL',
  },
  {
    id: 'emg-stroke-fast',
    code: 'CODE-RED-STROKE-03',
    titleFa: 'سکته مغزی حاد (کد ۷۲۴ / Acute Ischemic Stroke)',
    titleEn: 'Acute Ischemic Stroke (FAST Protocol / Code 724)',
    severity: 'CRITICAL_CODE_RED',
    triggerConditionFa: 'افتادگی یک‌طرفه صورت (Face Droop)، ضعف یا فلج یک‌طرفه دست/پا (Arm Weakness)، یا اختلال در تکلم (Speech Difficulty) با شروع ناگهانی.',
    vitalThresholds: {},
    immediateStabilizationStepsFa: [
      'ثبت دقیق زمان آخرین وضعیتی که بیمار در سلامت کامل دیده شده (Last Known Well Time)؛ پنجره طلایی ۴.۵ ساعت برای ترومبولیز.',
      'برقراری تماس مستقیم با کد ۷۲۴ اورژانس ۱۱۵ جهت هماهنگی بخش استروک بیمارستان مرجع.',
      'کنترل قند خون با گلوکومتر برای رد قطعی هیپوگلیسمی به عنوان مقلد سکته مغزی.',
      'بیمار NPO کامل بماند (به دلیل خطر آسپیراسیون ریوی و اختلال بلع).',
    ],
    firstLineMedicationsFa: [
      'هیچ‌گونه داروی ضدپلاکتی یا ضدفشار خون به صورت تجربی تجویز نشود قبل از سی‌تی‌اسکن مغز.',
      'فشار خون تا سطح ۲۲۰/۱۲۰ mmHg در غیاب ترومبولیز نباید کاهش داده شود.',
    ],
    dispatch115InstructionsFa: 'انتقال سریع با آژیر فعال به نزدیک‌ترین مرکز دارای سی‌تی‌اسکن اورژانس و تیم ترومبولیز تزریقی (rtPA).',
    targetFacilityLevel: 'STROKE_CENTER',
  },
  {
    id: 'emg-hypoglycemia',
    code: 'CODE-ORANGE-HYPO-04',
    titleFa: 'افت شدید قند خون و کمای هیپوگلیسمیک',
    titleEn: 'Severe Hypoglycemia & Hypoglycemic Coma',
    severity: 'CRITICAL_CODE_RED',
    triggerConditionFa: 'قند خون مویرگی زیر ۵۰ میلی‌گرم در دسی‌لیتر همراه با تعریق شدید، لرزش، گیجی، بیهوشی یا تشنج.',
    vitalThresholds: {
      minFBS: 50,
    },
    immediateStabilizationStepsFa: [
      'در صورت هوشیاری بیمار و توانایی بلع: قانون ۱۵ (مصرف ۱۵ گرم قند ساده مثل نصف لیوان آبمیوه و سنجش مجدد بعد از ۱۵ دقیقه).',
      'در صورت اختلال سطح هوشیاری: فوراً بیمار را به پهلو بخوابانید (Recovery Position) و از ورود خوراکی خودداری کنید.',
      'تزریق وریدی ۵۰ میلی‌لیتر سرم دکستروز ۵۰ درصد (D50W) در مدت ۳ تا ۵ دقیقه.',
      'در صورت عدم دسترسی وریدی: تزریق عضلانی ۱ میلی‌گرم گلوکاگون.',
    ],
    firstLineMedicationsFa: [
      'سرم دکستروز ۵۰٪ وریدی (۵۰ سی‌سی) یا دکستروز ۱۰٪ (۱۵۰ تا ۲۰۰ سی‌سی).',
      'ادامه انفوزیون سرم قندی ۱۰ درصد تا زمان رسیدن قند به بالای ۱۰۰ mg/dL.',
    ],
    dispatch115InstructionsFa: 'در صورت عدم پاسخ به گلوکز وریدی یا ابتلای بیمار به نارسایی کلیه تحت درمان با سولفونیل‌اوره، اعزام به بیمارستان الزامی است.',
    targetFacilityLevel: 'LEVEL_3_TERTIARY_HOSPITAL',
  },
  {
    id: 'emg-preeclampsia',
    code: 'CODE-RED-PREECL-05',
    titleFa: 'پره‌اکلامپسی شدید و اکلامپسی در بارداری',
    titleEn: 'Severe Preeclampsia / Eclampsia & Imminent Convulsion',
    severity: 'CRITICAL_CODE_RED',
    triggerConditionFa: 'زن باردار بالای ۲۰ هفته با فشار خون سیستول بالای ۱۶۰ یا دیاستول بالای ۱۱۰ همراه با سردرد مقاوم، تاری دید، درد ربع فوقانی راست شکم یا تشنج.',
    vitalThresholds: {
      minSysBP: 160,
      minDiaBP: 110,
    },
    immediateStabilizationStepsFa: [
      'خواباندن مادر به پهلوی چپ جهت بهبود پرفیوژن جفتی و جلوگیری از فشار بر ورید اجوف تحتانی.',
      'تثبیت راه هوایی و پیشگیری از ترومای زبان در صورت بروز تشنج.',
      'تماس با ۱۱۵ با اعلام کد مادر پرخطر باردار.',
    ],
    firstLineMedicationsFa: [
      'سولفات منیزیم (دوز بارگیری): ۴ گرم از محلول ۲۰٪ وریدی طی ۱۵ دقیقه، همراه با ۱۰ گرم عضلانی (۵ گرم در هر باسن).',
      'داروی کاهنده فشار خون: لابتالول ۲۰ میلی‌گرم وریدی یا هیدرالازین ۵ میلی‌گرم وریدی.',
    ],
    dispatch115InstructionsFa: 'اعزام همراه با ماما به مرکز درمانی مجهز به بخش مراقبت‌های ویژه زنان و نوزادان (NICU).',
    targetFacilityLevel: 'LEVEL_3_TERTIARY_HOSPITAL',
  },
  {
    id: 'emg-anaphylaxis',
    code: 'CODE-RED-ANAPHYLAX-06',
    titleFa: 'شوک و واکنش آنافیلاکسی حاد',
    titleEn: 'Acute Severe Anaphylaxis & Airway Compromise',
    severity: 'CRITICAL_CODE_RED',
    triggerConditionFa: 'بروز ناگهانی کهیر پوستی یا آنژیوادم همراه با تنگی نفس و استریدور حنجره، یا افت فشار خون پس از تزریق دارو، نیش حشرات یا غذای آلرژن.',
    vitalThresholds: {},
    immediateStabilizationStepsFa: [
      'تزریق فوری اپی‌نفرین؛ هیچ دارویی جایگزین اپی‌نفرین در دقایق اولیه نیست.',
      'قرار دادن بیمار در وضعیت طاق‌باز با پاهای بالا برده شده (Trendelenburg).',
      'اکسیژن با ماسک جریان بالا (۱۰ تا ۱۵ لیتر در دقیقه).',
      'انفوزیون سریع ۱ تا ۲ لیتر سرم نرمال سالین وریدی جهت مقابله با شوک توزیعی.',
    ],
    firstLineMedicationsFa: [
      'اپی‌نفرین ۱:۱۰۰۰ به میزان ۰.۳ تا ۰.۵ میلی‌گرم (۰.۳ تا ۰.۵ سی‌سی) به صورت عضلانی در قسمت قدامی خارجی ران (تکرار هر ۵ تا ۱۵ دقیقه در صورت لزوم).',
      'هیدروکورتیزون ۱۰۰ تا ۲۰۰ میلی‌گرم وریدی و کلرفنیرامین ۱۰ میلی‌گرم عضلانی به عنوان درمان کمکی مرحله دوم.',
    ],
    dispatch115InstructionsFa: 'اعزام فوری به بیمارستان به دلیل احتمال بازگشت فاز تاخیری آنافیلاکسی پس از بهبود اولیه.',
    targetFacilityLevel: 'LEVEL_3_TERTIARY_HOSPITAL',
  },
];
