export interface AgeCarePackage {
  cohortId: 'CHILD' | 'YOUTH' | 'ADULT' | 'ELDERLY' | 'MATERNAL';
  titleFa: string;
  titleEn: string;
  ageRange: string;
  mandatoryExamsFa: string[];
  screeningProtocolsFa: string[];
  preventiveVaccinesFa: string[];
  routineLabsFa: string[];
  redFlagSymptomsFa: string[];
}

export interface EmergencyProtocol {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string;
  triggerCriteriaFa: string;
  urgencyLevel: 'CRITICAL_IMMEDIATE' | 'HIGH_115_DISPATCH';
  firstLineDrugsFa: string[];
  stabilizationStepsFa: string[];
  dispatchRequirementsFa: string[];
  contraindicationsFa: string[];
}

export interface ClinicalPresentation {
  id: string;
  chiefComplaintFa: string;
  chiefComplaintEn: string;
  category: 'CARDIOVASCULAR' | 'RESPIRATORY' | 'NEUROLOGY' | 'ENDOCRINE' | 'GASTROINTESTINAL' | 'MATERNAL';
  differentials: Array<{
    diagnosisFa: string;
    diagnosisEn: string;
    icd10: string;
    probability: 'HIGH' | 'MODERATE' | 'RULE_OUT';
    clinicalCluesFa: string;
  }>;
  essentialPrimaryWorkupFa: string[];
  referralDestination: {
    specialtyFa: string;
    urgency: 'IMMEDIATE' | 'URGENT_24_TO_48H' | 'ROUTINE';
    mandatoryDocumentsFa: string[];
    referralIndicationsFa: string;
  };
}

export const AGE_CARE_PACKAGES: AgeCarePackage[] = [
  {
    cohortId: 'CHILD',
    titleFa: 'بسته مراقبت و معاینات دوره‌ای کودک و نوزاد (۰ تا ۵ سال)',
    titleEn: 'Infant & Child Health Maintenance (0-5 yr)',
    ageRange: '۰ تا ۵۹ ماهگی',
    mandatoryExamsFa: [
      'پایش رشد فیزیکی: وزن، قد و دور سر بر روی منحنی استاندارد WHO',
      'معاینه تکاملی کودکان بر اساس پرسشنامه ASQ (حرکتی، ارتباطی، شناختی)',
      'معاینه بینایی و انحراف چشم (تست غربالگری رفلکس قرمز و چارت E در سن ۳-۵ سال)',
      'معاینه شنوایی‌سنجی اولیه و واکنش به صدا',
      'معاینه لثه و اولین دندان‌های شیری و وارنیش فلوراید از ۲ سالگی',
    ],
    screeningProtocolsFa: [
      'غربالگری هیپوتیروئیدی نوزادی و فنیل‌کتونوری (روز ۳ تا ۵ تولد)',
      'پایش کم‌خونی فقر آهن در پایان ۶ ماهگی',
    ],
    preventiveVaccinesFa: [
      'واکسیناسیون کشوری: BCG، هپاتیت B، پنج‌گانه (پنتاوالان)، فلج اطفال (خوراکی/تزریقی)، MMR در ۱۲ و ۱۸ ماهگی',
    ],
    routineLabsFa: ['هموگلوبین و هماتوکریت در ۱۲ ماهگی', 'تست ادرار در صورت تب بدون منبع'],
    redFlagSymptomsFa: [
      'عدم توانایی نوشیدن یا شیر خوردن',
      'استفراغ مکرر و جهنده',
      'تشنج یا خواب‌آلودگی غیرعادی',
      'تنفس تند (بیش از ۵۰ بار در دقیقه در سن ۲-۱۱ ماه) و فرورفتگی قفسه سینه',
    ],
  },
  {
    cohortId: 'YOUTH',
    titleFa: 'بسته مراقبت سلامت نوجوانان و جوانان (۶ تا ۲۹ سال)',
    titleEn: 'Adolescent & Young Adult Health Package (6-29 yr)',
    ageRange: '۶ تا ۲۹ سالگی',
    mandatoryExamsFa: [
      'ارزیابی وضعیت بدنی و انحرافات ستون فقرات (اسکولیوز و کایفوز)',
      'محاسبه نمایه توده بدنی (BMI) و غربالگری چاقی یا سوءتغذیه',
      'سنجش فشار خون در تمامی مراجعات بالای ۱۸ سال',
      'سنجش سلامت بینایی و شنوایی دانش‌آموزی و معاینه پوست و مو (پدیکولوز)',
      'ارزیابی بلوغ و سلامت باروری در نوجوانان',
    ],
    screeningProtocolsFa: [
      'غربالگری سلامت روان و مصرف دخانیات و رفتارهای پرخطر',
      'ارزیابی کمبود آهن در دختران سنین بلوغ',
    ],
    preventiveVaccinesFa: ['واکسن توأم دیفتری-کزاز (Td) در سن ۱۴-۱۶ سالگی و هر ۱۰ سال یک‌بار'],
    routineLabsFa: ['CBC و فریتین در دختران با خونریزی شدید قاعدگی', 'قند و چربی در صورت چاقی شکمی'],
    redFlagSymptomsFa: ['کاهش وزن شدید و بدون توجیه', 'افکار خودکشی یا انزوای ناگهانی شدید', 'تپش قلب همراه با تنگی نفس'],
  },
  {
    cohortId: 'ADULT',
    titleFa: 'بسته مراقبت جامع میانسالان (۳۰ تا ۵۹ سال)',
    titleEn: 'Adult Comprehensive NCD Maintenance (30-59 yr)',
    ageRange: '۳۰ تا ۵۹ سالگی',
    mandatoryExamsFa: [
      'اندازه‌گیری فشار خون با مانومتر کالیبره استاندارد هر ۱ سال',
      'محاسبه BMI، دور کمر (هدف < ۸۸cm در زنان و < ۱۰۲cm در مردان)',
      'معاینه بالینی پستان‌ها (CBE) سالیانه در زنان ۳۰ تا ۵۹ سال',
      'ارزیابی خطر ۱۰ ساله بیماری‌های قلبی عروقی ایراپن (IraPEN)',
      'ارزیابی تغذیه، فعالیت بدنی و ترک دخانیات',
    ],
    screeningProtocolsFa: [
      'غربالگری دیابت (قند خون ناشتا FBS) هر ۳ سال (یا سالیانه در افراد پرخطر)',
      'پروفایل چربی خون (کلسترول تام، HDL, LDL, TG) هر ۵ سال',
      'غربالگری سرطان دهانه رحم (تست HPV و پاپ اسمیر) از ۳۰ تا ۵۹ سال هر ۵ سال',
      'غربالگری سرطان روده بزرگ با تست FIT هر ۲ سال در سنین ۵۰ تا ۵۹ سال',
      'ماموگرافی در زنان ۴۰ تا ۵۹ سال هر ۲ سال',
    ],
    preventiveVaccinesFa: ['واکسن سالیانه آنفلوآنزا در پاییز برای گروه‌های در معرض خطر', 'یادآور کزاز هر ۱۰ سال'],
    routineLabsFa: ['FBS, Lipid Profile, Serum Creatinine, eGFR, Urine Microalbumin'],
    redFlagSymptomsFa: [
      'درد رترواسترنال فشاری با انتشار به فک یا بازوی چپ',
      'فشار خون سیستولی ≥ ۱۸۰ یا دیاستولی ≥ ۱۲۰',
      'تغییر پایدار در اجابت مزاج یا خونریزی گوارشی',
      'توده بدون درد پستان با لمس سفت و چسبیده',
    ],
  },
  {
    cohortId: 'ELDERLY',
    titleFa: 'بسته مراقبت و معاینات تخصصی سالمندان (۶۰ سال و بالاتر)',
    titleEn: 'Elderly Geriatric Assessment Package (≥60 yr)',
    ageRange: '۶۰ سال به بالا',
    mandatoryExamsFa: [
      'تست غربالگری تعادل و ارزیابی خطر سقوط (Timed Up and Go - TUG)',
      'ارزیابی عملکرد شناختی و حافظه (تست رسم ساعت یا AMT)',
      'غربالگری افسردگی سالمندی (پرسشنامه GDS)',
      'سنجش وضعیت شنوایی (پرزبیاکوزیس) و بینایی (کاتاراکت و دژنراسیون ماکولا)',
      'پایش فشار خون ارتوستاتیک (خوابیده و ایستاده برای بررسی افت وضعیتی)',
      'معاینه پای سالمندان دیابتی (حس با مونوفیلامنت و نبض‌های محیطی)',
    ],
    screeningProtocolsFa: [
      'غربالگری استئوپروز (پوکی استخوان) با شاخص FRAX و دانسیتومتری DEXA',
      'غربالگری سرطان کولورکتال تا سن ۶۹ سالگی با تست FIT',
      'ارزیابی بی‌اختیاری ادراری و مشکلات پروستات در آقایان',
    ],
    preventiveVaccinesFa: ['واکسن پنوموکوک (پنوموواکس)', 'واکسن سالیانه آنفلوانزا', 'یادآور کزاز'],
    routineLabsFa: ['FBS, Lipid, BUN, Creatinine, Electrolytes (Na, K), CBC, TSH, Vitamin D, Urine Analysis'],
    redFlagSymptomsFa: [
      'سقوط مکرر و ناتوانی در ایستادن',
      'گیجی و کاهش هوشیاری حاد (دلیریوم)',
      'کاهش وزن ناخواسته بیش از ۵٪ وزن بدن در ۶ ماه',
      'تنگی نفس در حالت استراحت یا اورتوپنه شدید',
    ],
  },
  {
    cohortId: 'MATERNAL',
    titleFa: 'بسته مراقبت‌های ادغام‌یافته سلامت مادران باردار و پس از زایمان',
    titleEn: 'Integrated Maternal & Antenatal Care Package',
    ageRange: 'دوران بارداری تا ۴۲ روز پس از زایمان',
    mandatoryExamsFa: [
      'اندازه‌گیری دقیق وزن‌گیری مادر و فشار خون در هر ویزیت',
      'اندازه‌گیری ارتفاع قله رحم (سنفونیز-فوندال به سانتی‌متر از هفته ۲۰)',
      'شنیدن صدای قلب جنین (FHR) با داپلر از هفته ۱۲',
      'معاینه تیروئید، ریه‌ها و بررسی ادم اندام‌های تحتانی و صورت',
      'بررسی حرکات جنین توسط مادر از هفته ۲۸ به بعد',
    ],
    screeningProtocolsFa: [
      'تست غربالگری ناهنجاری‌های جنینی ترایمستر اول (هفته ۱۱-۱۳) و آنومالی اسکن (هفته ۱۸-۲۰)',
      'غربالگری دیابت بارداری (تست چالش گلوکز GDM با OGTT 75g در هفته ۲۴-۲۸)',
      'تست کومبس غیرمستقیم در مادران با گروه خونی Rh منفی و تزریق روگام در هفته ۲۸',
    ],
    preventiveVaccinesFa: ['واکسن کزاز در صورت نیاز', 'واکسن غیرفعال آنفلوانزا در فصول سرد'],
    routineLabsFa: ['CBC, Blood Group & Rh, Fasting Blood Sugar, TSH, Urine Analysis & Culture, HBsAg, HIV, VDRL'],
    redFlagSymptomsFa: [
      'خونریزی واژینال یا لکه‌بینی',
      'سردرد شدید مداوم همراه با تاری دید، دوبینی یا درد اپی‌گاستر (هشدار پره‌اکلامپسی)',
      'آب‌ریزش ناگهانی از واژن (پارگی کیسه آب)',
      'کاهش بارز یا توقف حرکات جنین',
      'تب و لرز و سوزش شدید ادرار',
    ],
  },
];

export const EMERGENCY_PROTOCOLS: EmergencyProtocol[] = [
  {
    id: 'emg-acs',
    code: 'EMG-CARDIO-ACS',
    nameFa: 'سندرم حاد کرونری و درد حاد قفسه سینه (ACS / STEMI Alert)',
    nameEn: 'Acute Coronary Syndrome & Myocardial Infarction',
    triggerCriteriaFa: 'درد رترواسترنال فشارنده/خفه‌کننده بیش از ۲۰ دقیقه، انتشار به بازو یا فک، همراه با تعریق سرد و تنگی نفس.',
    urgencyLevel: 'CRITICAL_IMMEDIATE',
    firstLineDrugsFa: [
      'قرص آسپیرین ۳۰۰-۳۲۵ میلی‌گرم جویدنی (Chewable ASA) بلافاصله',
      'قرص زیرزبانی نیتروگلیسیرین ۰.۴ میلی‌گرم (TNG Pearl) هر ۵ دقیقه تا ۳ دوز (در صورت فشار سیستولی > ۹۰)',
      'قرص کلوپیدوگرل ۳۰۰ میلی‌گرم (با هماهنگی اورژانس)',
    ],
    stabilizationStepsFa: [
      'استراحت مطلق در وضعیت نیمه‌نشسته (Fowler Position)',
      'اکسیژن‌تراپی با ماسک در صورت SpO2 < ۹۰٪',
      'ثبت فوری نوار قلب ۱۲ لید (ECG) ظرف ۱۰ دقیقه اول',
      'تعبیه راه وریدی مطمئن (آنژیوکت شماره ۱۸ یا ۲۰)',
    ],
    dispatchRequirementsFa: [
      'تماس فوری با اورژانس ۱۱۵ با ذکر کد اعلام STEMI یا خط ۲۴۷ کشوری',
      'ارسال عکس نوار قلب به مرکز پیام اورژانس برای انتقال مستقیم به کت‌لب',
    ],
    contraindicationsFa: ['مصرف داروهای مهارکننده فسفودی‌استراز-۵ (مانند سیلدنافیل در ۲۴-۴۸ ساعت اخیر) منع قطعی TNG است.'],
  },
  {
    id: 'emg-htn-crisis',
    code: 'EMG-HTN-CRISIS',
    nameFa: 'بحران و اورژانس پرفشاری خون (Hypertensive Emergency)',
    nameEn: 'Hypertensive Emergency with Target Organ Damage',
    triggerCriteriaFa: 'فشار خون سیستولی ≥ ۱۸۰ یا دیاستولی ≥ ۱۲۰ همراه با علائم درگیری اندام هدف (سردرد شدید، تاری دید، تنگی نفس، ادم ریه یا درد قفسه سینه).',
    urgencyLevel: 'CRITICAL_IMMEDIATE',
    firstLineDrugsFa: [
      'لابتالول وریدی یا قرص کاپتوپریل ۲۵-۵۰ میلی‌گرم جویدنی/زیرزبانی در محیط کنترل‌شده',
      'آمپول فوروزماید ۲۰-۴۰ میلی‌گرم وریدی در صورت بروز ادم حاد ریه',
    ],
    stabilizationStepsFa: [
      'پرهیز اکید از افت سریع و شدید فشار خون (هدف: کاهش حداکثر ۲۰ تا ۲۵ درصد در ساعت اول)',
      'ثبت فشار خون هر ۵ تا ۱۰ دقیقه از هر دو دست',
      'ارزیابی فوندوسکوپی جهت پایش ادم پاپی و معاینه سیستم عصبی',
    ],
    dispatchRequirementsFa: ['اعزام فوری با آمبولانس کددار به بخش مراقبت‌های ویژه (CCU/ICU)'],
    contraindicationsFa: ['قرص نیفدیپین زیرزبانی به دلیل خطر افت ناگهانی فشار و ایسکمی مغزی مطلقاً ممنوع است.'],
  },
  {
    id: 'emg-hypo',
    code: 'EMG-METAB-HYPO',
    nameFa: 'کما و افت شدید قند خون (Severe Hypoglycemia)',
    nameEn: 'Severe Hypoglycemia Coma & Shock',
    triggerCriteriaFa: 'قند خون تصادفی کمتر از ۵۴ mg/dL با اختلال هوشیاری، تعریق شدید، لرزش، گیجی یا تشنج.',
    urgencyLevel: 'CRITICAL_IMMEDIATE',
    firstLineDrugsFa: [
      'آمپول دکستروز ۵۰٪ به میزان ۵۰ میلی‌لیتر (۲۵ گرم گلوکز) وریدی مستقیم طی ۳ تا ۵ دقیقه',
      'سرم دکستروز ۱۰٪ جهت انفوزیون نگهدارنده',
      'آمپول گلوکاگون ۱ میلی‌گرم زیرجلدی/عضلانی در صورت عدم دسترسی به رگ وریدی',
    ],
    stabilizationStepsFa: [
      'حفظ راه هوایی و وضعیت ریکاوری به پهلو برای پیشگیری از آسپیراسیون',
      'تست مکرر گلوکومتری هر ۱۵ دقیقه تا رسیدن قند به بالای ۱۰۰ mg/dL',
      'ارائه کربوهیدرات کمپلکس خوراکی پس از هوشیاری کامل بیمار',
    ],
    dispatchRequirementsFa: ['در صورت مصرف داروهای سولفونیل‌اوره طولانی‌اثر (مانند گلی‌بن‌کلامید) بستری بیمار در بیمارستان الزامی است.'],
    contraindicationsFa: ['خوراندن مایعات یا مواد شیرین در بیمار نیمه‌هوشیار یا بیهوش مطلقاً ممنوع است.'],
  },
  {
    id: 'emg-resp-asthma',
    code: 'EMG-RESP-ASTHMA',
    nameFa: 'حمله حاد شدید آسم یا تشدید شدید COPD',
    nameEn: 'Acute Severe Asthma & COPD Exacerbation',
    triggerCriteriaFa: 'تنگی نفس شدید، ناتوانی در تکلم حتی به صورت جملات کوتاه، اکسیژن خون SpO2 < ۹۰٪، تاکی‌پنه > ۳۰ و ریدکتورها.',
    urgencyLevel: 'CRITICAL_IMMEDIATE',
    firstLineDrugsFa: [
      'اسپری سالبوتامول ۴ تا ۱۰ پاف با آسان‌نفس (دم‌یار) هر ۲۰ دقیقه در ساعت اول یا نبولایزر',
      'اسپری ایپراتروپیوم بروماید (آتروونت) همراه با سالبوتامول',
      'آمپول هیدروکورتیزون ۱۰۰ تا ۲۰۰ میلی‌گرم وریدی یا پردنیزولون خوراکی ۵۰ میلی‌گرم',
    ],
    stabilizationStepsFa: [
      'وضعیت نشسته کامل رو به جلو',
      'اکسیژن کمکی برای حفظ اشباع ۹۳-۹۵٪ در آسم و ۸۸-۹۲٪ در COPD',
      'پایش حرکات متناقض دیافراگم و قفسه سینه (سکوت ریه / Silent Chest)',
    ],
    dispatchRequirementsFa: ['اعزام فوری با اکسیژن سیار به بخش اورژانس تنفسی'],
    contraindicationsFa: ['اکسیژن‌تراپی با جریان بالا در بیماران مستعد احتباس CO2 در COPD پرهیز شود.'],
  },
  {
    id: 'emg-preeclampsia',
    code: 'EMG-OB-ECLAMPSIA',
    nameFa: 'پره‌اکلامپسی شدید و اکلامپسی مادر باردار (Maternal Code Red)',
    nameEn: 'Severe Pre-eclampsia & Eclamptic Seizure',
    triggerCriteriaFa: 'فشار خون ≥ ۱۶۰/۱۱۰ در زن باردار بالای ۲۰ هفته به همراه سردرد شدید مقاوم، تاری دید، درد اپی‌گاستر یا تشنج.',
    urgencyLevel: 'CRITICAL_IMMEDIATE',
    firstLineDrugsFa: [
      'سولفات منیزیم ۲۰٪ (MgSO4) دوز بارگیری ۴ تا ۵ گرم عضلانی/وریدی برای کنترل تشنج',
      'آمپول هیدرالازین ۵ میلی‌گرم وریدی یا لابتالول وریدی برای کاهش فشار خون',
    ],
    stabilizationStepsFa: [
      'قرار دادن مادر به پهلوی چپ (Left Lateral Tilt) برای بهبود خون‌رسانی جفت',
      'حفظ راه هوایی و کنترل تنفس و رفلکس‌های تاندونی عمقی (DTR)',
      'سوند فولی برای پایش دقیق خروجی ادرار',
    ],
    dispatchRequirementsFa: ['اعزام فوق‌العاده با همراهی ماما و پزشک به مرکز تخصصی زنان و زایمان'],
    contraindicationsFa: ['در صورت کاهش تعداد تنفس به کمتر از ۱۲ بار در دقیقه یا فقدان رفلکس پاتلار، سولفات منیزیم قطع و کلسیم گلوکونات آماده شود.'],
  },
];

export const CLINICAL_PRESENTATIONS: ClinicalPresentation[] = [
  {
    id: 'pres-chest-pain',
    chiefComplaintFa: 'درد یا احساس سنگینی در قفسه سینه',
    chiefComplaintEn: 'Chest Pain or Discomfort',
    category: 'CARDIOVASCULAR',
    differentials: [
      {
        diagnosisFa: 'سندرم حاد کرونری (آنژین ناپایدار / سکته قلبی)',
        diagnosisEn: 'Acute Coronary Syndrome (ACS / NSTEMI / STEMI)',
        icd10: 'I21.9',
        probability: 'HIGH',
        clinicalCluesFa: 'درد رترواسترنال فشارنده، انتشار به شانه چپ/فک، تعریق سرد، شروع در استراحت یا فعالیت، همراه با عوامل خطرساز قلبی.',
      },
      {
        diagnosisFa: 'آمبولی حاد ریه (PTE)',
        diagnosisEn: 'Pulmonary Thromboembolism',
        icd10: 'I26.9',
        probability: 'RULE_OUT',
        clinicalCluesFa: 'شروع ناگهانی درد پلورتیک قفسه سینه، تنگی نفس شدید، سابقه بی‌حرکتی طولانی یا DVT، تاکی‌کاردی.',
      },
      {
        diagnosisFa: 'ریفلاکس و اسپاسم مری (GERD)',
        diagnosisEn: 'Gastroesophageal Reflux Disease',
        icd10: 'K21.9',
        probability: 'MODERATE',
        clinicalCluesFa: 'سوزش سردل، ارتباط با غذا خوردن یا خوابیدن، تسکین با آنتی‌اسید، نوار قلب طبیعی.',
      },
      {
        diagnosisFa: 'کوستوکندریت و درد جدار قفسه سینه',
        diagnosisEn: 'Costochondritis / Musculoskeletal Pain',
        icd10: 'M94.0',
        probability: 'MODERATE',
        clinicalCluesFa: 'حساسیت موضعی شدید در لمس مفاصل دنده‌ای-غضروفی، تشدید با تنفس عمیق و حرکت تنه.',
      },
    ],
    essentialPrimaryWorkupFa: [
      'نوار قلب ۱۲ لید استاندارد (ECG) ظرف ۱۰ دقیقه اول و مقایسه با نوار قبلی',
      'تست بیومارکر ترپونین (Troponin I / T)',
      'سنجش فشار خون و ضربان قلب و اکسیژن خون',
      'رادیوگرافی ساده قفسه سینه (CXR) در صورت ثبات همودینامیک',
    ],
    referralDestination: {
      specialtyFa: 'متخصص بیماری‌های قلب و عروق / اورژانس بیمارستان',
      urgency: 'IMMEDIATE',
      mandatoryDocumentsFa: ['برگه نوار قلب همراه با تاریخ و ساعت', 'علائم حیاتی کامل', 'سابقه داروهای ضدپلاکتی'],
      referralIndicationsFa: 'تغییرات ایسکمیک در ECG، افزایش ترپونین، یا علائم هشداردهنده بالینی.',
    },
  },
  {
    id: 'pres-chronic-cough',
    chiefComplaintFa: 'سرفه مزمن (بیش از ۸ هفته) و تنگی نفس',
    chiefComplaintEn: 'Chronic Cough & Dyspnea (>8 Weeks)',
    category: 'RESPIRATORY',
    differentials: [
      {
        diagnosisFa: 'بیماری مزمن انسدادی ریه (COPD)',
        diagnosisEn: 'Chronic Obstructive Pulmonary Disease',
        icd10: 'J44.9',
        probability: 'HIGH',
        clinicalCluesFa: 'سابقه مصرف دخانیات یا تماس با دود هیزم در روستا، تنگی نفس پیش‌رونده، خلط صبحگاهی.',
      },
      {
        diagnosisFa: 'آسم برونشیال',
        diagnosisEn: 'Bronchial Asthma',
        icd10: 'J45.9',
        probability: 'HIGH',
        clinicalCluesFa: 'سرفه‌های حمله‌ای شبانه، صدای خس‌خس (ویزینگ)، پاسخ مثبت به برونکودیلاتور، سابقه آلرژی یا اگزیما.',
      },
      {
        diagnosisFa: 'سندرم سرفه راه هوایی فوقانی (UACS / ترشح پشت حلق)',
        diagnosisEn: 'Upper Airway Cough Syndrome (Post-Nasal Drip)',
        icd10: 'J30.9',
        probability: 'MODERATE',
        clinicalCluesFa: 'احساس پاک کردن مداوم گلو، ترشحات پشت حلقی در معاینه فارنکس، گرفتگی بینی.',
      },
      {
        diagnosisFa: 'سرفه ناشی از داروی مهارکننده ACE (مانند انالاپریل/کاپتوپریل)',
        diagnosisEn: 'Drug-Induced Cough (ACEi)',
        icd10: 'T88.7',
        probability: 'MODERATE',
        clinicalCluesFa: 'شروع سرفه خشک خارش‌دار چند هفته پس از شروع داروی مهارکننده آنزیم مبدل آنژیوتانسین.',
      },
    ],
    essentialPrimaryWorkupFa: [
      'اسپیرومتری و تست عملکرد ریوی (PFT) قبل و بعد از برونکودیلاتور',
      'گرافی ساده قفسه سینه (CXR دو طرفه)',
      'بررسی خلط از نظر اسمیر اسید-فست (سل ریوی BK) در صورت سرفه بالای ۲ هفته در مناطق پرخطر',
    ],
    referralDestination: {
      specialtyFa: 'فوق تخصص ریه و دستگاه تنفسی',
      urgency: 'ROUTINE',
      mandatoryDocumentsFa: ['نتیجه اسپیرومتری', 'گرافی سینه', 'سابقه دارویی و مواجهات شغلی'],
      referralIndicationsFa: 'اسپیرومتری غیرطبیعی با انسداد غیرقابل برگشت، عدم پاسخ به درمان تجربی یا وجود هموپتیزی.',
    },
  },
  {
    id: 'pres-polyuria',
    chiefComplaintFa: 'پرنوشی، پرادراری و کاهش وزن ناخواسته',
    chiefComplaintEn: 'Polyuria, Polydipsia & Weight Loss',
    category: 'ENDOCRINE',
    differentials: [
      {
        diagnosisFa: 'دیابت ملیتوس نوع ۲ با عدم کنترل شدید',
        diagnosisEn: 'Type 2 Diabetes Mellitus Uncontrolled',
        icd10: 'E11.9',
        probability: 'HIGH',
        clinicalCluesFa: 'قند خون ناشتا بالای ۱۲۶ mg/dL یا تصادفی بالای ۲۰۰ mg/dL همراه با تاری دید و خستگی مفرط.',
      },
      {
        diagnosisFa: 'دیابت بی‌مزه (سنترال یا نفروژنیک)',
        diagnosisEn: 'Diabetes Insipidus',
        icd10: 'E23.2',
        probability: 'RULE_OUT',
        clinicalCluesFa: 'حجم ادرار بسیار زیاد و بسیار رقیق، تشنگی سیری‌ناپذیر مخصوص آب یخ، قند خون نرمال.',
      },
      {
        diagnosisFa: 'بیماری مزمن کلیه (CKD) با اختلال تغلیظ ادرار',
        diagnosisEn: 'Chronic Kidney Disease',
        icd10: 'N18.9',
        probability: 'MODERATE',
        clinicalCluesFa: 'نوکتوری (ادرار شبانه)، پرفشاری خون، کم‌خونی نورموکرومیک، ادم صبحگاهی پلک‌ها.',
      },
    ],
    essentialPrimaryWorkupFa: [
      'قند خون ناشتا (FBS) و هموگلوبین گلیکوزیله (HbA1c)',
      'آنالیز ادرار کامل (از نظر گلوکزوری، کتونوری، پروتئینوری و وزن مخصوص)',
      'کراتینین سرم و محاسبه eGFR و الکترولیت‌ها',
    ],
    referralDestination: {
      specialtyFa: 'متخصص داخلی / فوق تخصص غدد درون‌ریز و متابولیسم',
      urgency: 'URGENT_24_TO_48H',
      mandatoryDocumentsFa: ['برگه نتایج قند و کتون ادرار', 'سوابق دارویی', 'کراتینین و آزمایش ادرار'],
      referralIndicationsFa: 'کتونوری مثبت (خطر DKA)، قند خون پایدار بالای ۳۰۰ با علائم دی‌هیدراسیون، یا نیاز به شروع انسولین.',
    },
  },
];
