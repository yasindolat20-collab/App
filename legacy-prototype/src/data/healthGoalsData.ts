export interface HealthGoal {
  id: string;
  code: string;
  titleFa: string;
  titleEn: string;
  category: 'NCD' | 'DIABETES' | 'HYPERTENSION' | 'MATERNAL' | 'SCREENING';
  currentValue: number;
  targetValue: number;
  unit: string;
  status: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL';
  deadline: string;
  authority: string;
  descriptionFa: string;
  actionRequiredFa: string;
}

export interface InternetHealthStatistic {
  id: string;
  source: string;
  year: number;
  indicatorFa: string;
  indicatorEn: string;
  value: string;
  changeTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
  referenceUrl: string;
  relevanceFa: string;
}

export const INITIAL_HEALTH_GOALS: HealthGoal[] = [
  {
    id: 'goal-who-80',
    code: 'WHO-DIAB-80',
    titleFa: 'شاخص سه‌گانه ۸۰-۸۰-۸۰ دیابت (WHO 2030 Global Target)',
    titleEn: 'WHO Global Diabetes Target 80-80-80',
    category: 'DIABETES',
    currentValue: 64,
    targetValue: 80,
    unit: '%',
    status: 'AT_RISK',
    deadline: '2030 (۱۴۰۹)',
    authority: 'سازمان جهانی بهداشت و اداره بیماری‌های غیرواگیر وزارت بهداشت',
    descriptionFa: '۸۰٪ افراد دیابتی شناسایی شوند، ۸۰٪ هموگلوبین A1c زیر ۷٪ داشته باشند و ۸۰٪ فشار خون زیر ۱۳۰/۸۰ را تجربه کنند.',
    actionRequiredFa: 'افزایش ویزیت‌های فصلی و تشدید غربالگری در افراد بالای ۳۰ سال تحت پوشش مراکز جامع سلامت.',
  },
  {
    id: 'goal-ncd-30',
    code: 'IR-NCD-30',
    titleFa: 'سند ملی کاهش ۳۰ درصدی مرگ‌های زودرس ناشی از NCD',
    titleEn: 'National 30% Premature NCD Mortality Reduction',
    category: 'NCD',
    currentValue: 18,
    targetValue: 30,
    unit: '% کاهش',
    status: 'ON_TRACK',
    deadline: '2030 (۱۴۰۹)',
    authority: 'سند ملی پیشگیری و کنترل بیماری‌های غیرواگیر ایران',
    descriptionFa: 'کاهش نسبی ۳۰ درصدی احتمال مرگ زودرس ناشی از بیماری‌های قلبی عروقی، دیابت و تنفسی در سنین ۳۰ تا ۷۰ سالگی.',
    actionRequiredFa: 'گسترش پوشش خطرسنجی ۱۰ ساله ایراپن به ۱۰۰٪ جمعیت میانسال و سالمند.',
  },
  {
    id: 'goal-htn-control',
    code: 'HTN-CTRL-85',
    titleFa: 'هدف کشوری شناسایی و کنترل بهینه فشار خون بالا',
    titleEn: 'National Hypertension Control & Target Coverage',
    category: 'HYPERTENSION',
    currentValue: 56,
    targetValue: 85,
    unit: '%',
    status: 'AT_RISK',
    deadline: '2027 (۱۴۰۶)',
    authority: 'پروژه بسیج ملی کنترل فشار خون وزارت بهداشت',
    descriptionFa: 'پوشش حداقل ۸۵٪ مبتلایان به فشار خون بالای ۱۴۰/۹۰ تحت درمان دارویی استاندارد و تثبیت در محدوده نرمال.',
    actionRequiredFa: 'پایش ماهیانه بهورز و فراخوان فعال بیماران با داروی نامنظم.',
  },
  {
    id: 'goal-irapen-cover',
    code: 'IRAPEN-COV-100',
    titleFa: 'پوشش کامل خطرسنجی قلبی عروقی در پایگاه‌ها و خانه‌های بهداشت',
    titleEn: 'IraPEN CVD 10-Yr Risk Assessment Universal Coverage',
    category: 'NCD',
    currentValue: 78,
    targetValue: 100,
    unit: '%',
    status: 'ON_TRACK',
    deadline: '2026 (۱۴۰۵)',
    authority: 'دستورالعمل ادغام ایراپن در نظام شبکه بهداشت کشور',
    descriptionFa: 'ارزیابی ۱۰ ساله خطر حوادث کشنده و غیرکشنده قلبی عروقی برای تمامی افراد ۴۰ تا ۶۹ سال.',
    actionRequiredFa: 'تکمیل فرم‌های خطرسنجی دیجیتال در سامانه سیب و ارجاع موارد نارنجی و قرمز.',
  },
  {
    id: 'goal-fit-screen',
    code: 'CANCER-FIT-70',
    titleFa: 'غربالگری زودهنگام سرطان روده بزرگ با تست FIT',
    titleEn: 'Colorectal Cancer Screening with FIT Coverage',
    category: 'SCREENING',
    currentValue: 42,
    targetValue: 70,
    unit: '%',
    status: 'CRITICAL',
    deadline: '2027 (۱۴۰۶)',
    authority: 'اداره سرطان وزارت بهداشت، درمان و آموزش پزشکی',
    descriptionFa: 'انجام تست ایمونوکمیکال خون مخفی مدفوع (FIT) هر دو سال یک‌بار برای افراد ۵۰ تا ۶۹ ساله.',
    actionRequiredFa: 'توزیع کیت‌های استاندارد فیت در خانه‌های بهداشت و ثبت فوری نتایج در سیب.',
  },
];

export const LIVE_INTERNET_STATISTICS: InternetHealthStatistic[] = [
  {
    id: 'stat-01',
    source: 'Iran STEPs Survey 2021 (National NCD Surveillance)',
    year: 2021,
    indicatorFa: 'شیوع کشوری دیابت در بزرگسالان بالای ۲۵ سال ایران',
    indicatorEn: 'National Diabetes Prevalence in Adults ≥25yo',
    value: '۱۴.۱۵٪ (۲ برابر شدن از سال ۲۰۰۷)',
    changeTrend: 'INCREASING',
    referenceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8945621/',
    relevanceFa: 'بالاترین شیوع در گروه سنی ۶۵ تا ۷۴ سال؛ مناطق شهری ۱۵.۲٪ در برابر مناطق روستایی ۱۱.۰٪.',
  },
  {
    id: 'stat-02',
    source: 'Iran STEPs Survey 2021 & WHO Regional Report',
    year: 2021,
    indicatorFa: 'شیوع پرفشاری خون در بزرگسالان کشور',
    indicatorEn: 'National Adult Hypertension Prevalence',
    value: '۳۲.۰٪ از جمعیت بالغ',
    changeTrend: 'STABLE',
    referenceUrl: 'https://www.who.int/news-room/fact-sheets/detail/hypertension',
    relevanceFa: 'در ۲۵.۳٪ افراد مبتلا به فشار خون، دیابت همزمان و در ۲۹.۷٪ پیش‌دیابت وجود دارد.',
  },
  {
    id: 'stat-03',
    source: 'Global Burden of Disease (GBD) & MoH Iran Registry',
    year: 2021,
    indicatorFa: 'سهم بیماری‌های غیرواگیر (NCD) از کل مرگ‌ومیرها در ایران',
    indicatorEn: 'NCD Proportion of Total Mortality in Iran',
    value: '۶۴.۷۹٪ کل مرگ‌های کشور',
    changeTrend: 'INCREASING',
    referenceUrl: 'https://www.tandfonline.com/doi/full/10.1080/10408398.2023.2217983',
    relevanceFa: 'بیماری‌های قلبی عروقی نخستین علت مرگ و دیابت عامل ۵۹.۸۸٪ از کل سال‌های عمر از دست رفته تعدیل‌شده با ناتوانی (DALYs).',
  },
  {
    id: 'stat-04',
    source: 'World Health Organization (WHO) Global Observatory',
    year: 2023,
    indicatorFa: 'نسبت مرگ‌ومیر مادران باردار در ۱۰۰ هزار تولد زنده (MMR)',
    indicatorEn: 'Maternal Mortality Ratio (MMR) in Iran',
    value: '۱۶.۰ در ۱۰۰,۰۰۰ تولد زنده',
    changeTrend: 'DECREASING',
    referenceUrl: 'https://data.who.int/countries/364',
    relevanceFa: 'شاخص موفق نظام شبکه بهداشت و مراقبت‌های ادغام‌یافته مامایی و بهورزی در روستاهای ایران.',
  },
];
