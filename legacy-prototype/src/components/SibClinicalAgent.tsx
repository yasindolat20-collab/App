import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Share2,
  CornerDownLeft,
} from 'lucide-react';
import { Patient, CurrentVisitDraft } from '../types/sib';

interface AgentMessage {
  id: string;
  sender: 'AGENT' | 'DOCTOR';
  text: string;
  timestamp: string;
  structuredOutput?: {
    title: string;
    type: 'CLEANED_DATA' | 'REFERRAL_HANDOVER' | 'INTERACTION_ALERT' | 'VISIT_STRUCTURED';
    items: string[];
    formattedReport?: string;
  };
}

interface SibClinicalAgentProps {
  patient: Patient;
  draft: CurrentVisitDraft;
  onApplyDraftChanges: (updatedDraft: Partial<CurrentVisitDraft>) => void;
  isFarsi: boolean;
}

export const SibClinicalAgent: React.FC<SibClinicalAgentProps> = ({
  patient,
  draft,
  onApplyDraftChanges,
  isFarsi,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initial welcome and proactive findings from the agent
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'msg-init',
      sender: 'AGENT',
      text: isFarsi
        ? `سلام همکار گرامی، دکتر علوی عزیز. من دستیار هوشمند شما در سامانه سیب هستم. پرونده خانم ${patient.name} (${patient.persianName}) را بررسی کردم. داده‌ها در ماژول‌های بهورز و پزشک پراکنده و دارای تناقض است. در کنار شما هستم تا داده‌ها را پاک‌سازی، مرتب و برای ارجاع به مراتب بعدی آماده کنم.`
        : `Greetings Dr. Alavi. I am your clinical agent inside SIB. I audited the records of ${patient.name}. The data across Behvarz and clinic forms is noisy with conflicting vitals. I am here to clean, restructure, and prepare handover packages for next-level specialists.`,
      timestamp: 'هم‌اکنون',
      structuredOutput: {
        title: isFarsi ? 'گزارش ارزیابی اولیه کیفیت داده‌های این پرونده در سیب' : 'Initial SIB Data Audit',
        type: 'CLEANED_DATA',
        items: [
          isFarsi
            ? 'تناقض فشار خون: ثبت همزمان ۱۳۰/۸۰ و ۱۵۲/۹۴ در تاریخ ۱۴۰۵/۰۲/۲۰ در دو فرم مجزا شناسایی شد.'
            : 'Conflicting BP: Both 130/80 and 152/94 were registered on 1405/02/20 across separate forms.',
          isFarsi
            ? 'نقص آزمایش ضروری: نسبت آلبومین به کراتینین ادرار (UACR) در پرونده مفقود است.'
            : 'Missing mandatory test: UACR is absent from the diabetic file.',
          isFarsi
            ? 'عدم پایبندی دارویی: آتورواستاتین ۲۰ میلی‌گرم طی ۲ ماه گذشته دریافت یا مصرف نشده است.'
            : 'Adherence flag: Atorvastatin 20mg paused 2 months ago.',
        ],
      },
    },
  ]);

  const handleCopyReport = (reportText: string, id: string) => {
    navigator.clipboard.writeText(reportText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Agent Action 1: Clean & Reconcile SIB Messy Data
  const handleCleanData = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newMsg: AgentMessage = {
        id: `msg-${Date.now()}`,
        sender: 'AGENT',
        text: isFarsi
          ? 'داده‌های پرونده پالایش و پاک‌سازی شد. تناقض فشار خون بر اساس آخرین سنجش استاندارد مطب اصلاح گردید و فیلدهای مفقود آماده ثبت شدند.'
          : 'Data sanitized and harmonized. Conflicting entries resolved to current standard measurement.',
        timestamp: 'چند لحظه پیش',
        structuredOutput: {
          title: isFarsi ? 'پرونده پالایش‌شده و آماده مراتب بعدی' : 'Cleaned & Harmonized SIB Record',
          type: 'CLEANED_DATA',
          items: [
            isFarsi ? 'فشار خون مرجع تمیز شده: ۱۴۸/۹۲ میلی‌متر جیوه' : 'Harmonized Reference BP: 148/92 mmHg',
            isFarsi ? 'قند خون کنترل‌نشده: ۱۶۲ mg/dL (نیازمند تنظیم دوز متفورمین)' : 'Uncontrolled FBS: 162 mg/dL',
            isFarsi ? 'ثبت درخواست آزمایش مکمل: UACR ادراری + HbA1c سه ماهه' : 'Required Paraclinical: UACR + HbA1c',
          ],
        },
      };
      setMessages((prev) => [...prev, newMsg]);
      setIsProcessing(false);
    }, 700);
  };

  // Agent Action 2: Generate Clean Report for Level 2 Specialist Handover (مراتب بعدی)
  const handleGenerateReferralReport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const handoverText = isFarsi
        ? `خلاصه بالینی جهت ارجاع به متخصص محترم داخلی / چشم‌پزشکی (سطح ۲):
--------------------------------------------------------
بیمار: ${patient.name} (${patient.persianName}) | کد ملی: ${patient.nationalId} | سن: ${patient.age} سال
مرکز ارجاع‌دهنده: مرکز خدمات جامع سلامت ده‌نمک | پزشک خانواده: دکتر علوی (کد نظام: ۷۴۸۹۲)

۱. تشخیص‌های قطعی سطح یک:
- دیابت نوع ۲ (T2DM) کنترل‌نشده (آخرین قند ناشتا: ۱۶۲ mg/dL، هموگلوبین A1c: ۸.۴٪)
- پرفشاری خون اولیه (فشار جاری: ۱۴۸/۹۲ mmHg)

۲. سوابق دارویی فعال و میزان پایبندی:
- قرص Metformin 500mg روزی ۲ عدد (مصرف منظم)
- قرص Losartan 50mg روزی ۱ عدد (مصرف منظم)
- قرص Atorvastatin 20mg (مصرف نامنظم / قطع خودسرانه بیمار به دلیل درد عضلانی)

۳. علت ارجاع به مراتب بعدی:
- عدم دستیابی به هدف قند خون و فشار خون با درمان دو دارویی سطح ۱
- ارزیابی رتینوپاتی دیابتی (فوندوسکوپی سالیانه)
- بررسی عملکرد کلیوی و تنظیم مجدد دوز استاتین

۴. اقدامات انجام‌شده در سطح یک:
- اصلاح رژیم غذایی و آموزش سبک زندگی
- تجویز آزمایش‌های FBS, HbA1c, Cr, Na, K, UACR`
        : `Level 2 Clinical Handover Summary for Specialist:
Patient: ${patient.name} | National ID: ${patient.nationalId} | Age: ${patient.age}
Origin: Deh Namak Comprehensive Health Center | Family Physician: Dr. N. Alavi

Diagnoses: Uncontrolled T2DM (HbA1c 8.4%), Essential HTN (BP 148/92).
Medications: Metformin 500mg BID, Losartan 50mg QD, Paused Atorvastatin 20mg.
Reason for Level 2 Referral: Inadequate glycemic control, annual retinopathy screening, statin intolerance re-evaluation.`;

      const newMsg: AgentMessage = {
        id: `msg-${Date.now()}`,
        sender: 'AGENT',
        text: isFarsi
          ? 'گزارش خلاصه پرونده جهت ارجاع به مراتب بعدی (پزشک متخصص سطح ۲ یا کمیسیون) آماده شد. می‌توانید آن را کپی کرده یا مستقیماً به فرم ارجاع منتقل کنید.'
          : 'Clean handover report prepared for next-level specialist. Ready for export.',
        timestamp: 'هم‌اکنون',
        structuredOutput: {
          title: isFarsi ? 'گزارش ساختاریافته ارجاع به مراتب بعدی (سطح ۲)' : 'Official Level 2 Handover Report',
          type: 'REFERRAL_HANDOVER',
          items: [
            isFarsi ? 'خلاصه دقیق بیماری‌ها، داروها و آزمایش‌های سطح ۱' : 'Concise summary of diagnoses, vitals, and labs',
            isFarsi ? 'علت صریح ارجاع تخصصی مطابق فرمت استاندارد وزارت بهداشت' : 'Explicit reason for referral per MoH standard',
          ],
          formattedReport: handoverText,
        },
      };

      setMessages((prev) => [...prev, newMsg]);
      setIsProcessing(false);
    }, 800);
  };

  // Agent Action 3: Audit Drug-Lab Interactions
  const handleAuditSafety = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newMsg: AgentMessage = {
        id: `msg-${Date.now()}`,
        sender: 'AGENT',
        text: isFarsi
          ? 'بررسی ایمنی دارویی انجام شد: بیمار داروی لوزارتان مصرف می‌کند اما سطح پتاسیم و کراتینین طی ۶ ماه اخیر ثبت نشده است. همچنین قطع آتورواستاتین در یک بیمار دیابتی با ریسک CVD بالا نیاز به مداخله فوری دارد.'
          : 'Safety audit completed: Losartan requires Potassium/Cr surveillance. Paused statin increases 10-year CVD risk.',
        timestamp: 'هم‌اکنون',
        structuredOutput: {
          title: isFarsi ? 'هشدارهای ایمنی دارویی و پاراکلینیک' : 'Clinical Safety Flags',
          type: 'INTERACTION_ALERT',
          items: [
            isFarsi ? 'درخواست فوری پنل الکترولیت‌ها و کراتینین (Na, K, Cr)' : 'Order Electrolytes & Creatinine',
            isFarsi ? 'مشاوره عدم تحمل استاتین و جایگزینی با رزواستاتین یا دوز کمتر' : 'Address statin myalgia and resume therapy',
          ],
        },
      };
      setMessages((prev) => [...prev, newMsg]);
      setIsProcessing(false);
    }, 600);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isProcessing) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');

    const userMsg: AgentMessage = {
      id: `usr-${Date.now()}`,
      sender: 'DOCTOR',
      text: userText,
      timestamp: 'هم‌اکنون',
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    setTimeout(() => {
      let agentReplyText = isFarsi
        ? `درخواست شما پردازش شد: داده‌های مربوطه بررسی گردید و اصلاحات لازم در کارتابل بیمار آماده است.`
        : `Your instruction was processed and applied to the workspace.`;

      let reportSnippet: string | undefined = undefined;

      if (userText.includes('ارجاع') || userText.includes('متخصص') || userText.includes('گزارش')) {
        agentReplyText = isFarsi
          ? 'گزارش مرتب و تمیز بیمار برای ارسال به متخصص سطح ۲ آماده و در جدول زیر تنظیم گردید.'
          : 'Clean handover report synthesized for specialist referral.';
        reportSnippet = isFarsi
          ? `بیمار: ${patient.name} (${patient.persianName}) - کد ملی: ${patient.nationalId}\nتشخیص: دیابت نوع ۲ و فشار خون بالا\nداروها: متفورمین + لوزارتان\nآزمایش‌های درخواستی: HbA1c, Cr, UACR\nعلت ارجاع: کنترل بهینه سطح ۲ و معاینه فوندوسکوپی`
          : `Patient: ${patient.name} (ID: ${patient.nationalId})\nDiagnoses: T2DM, HTN\nOrders: HbA1c, Cr, UACR\nReferral reason: Level 2 optimization & fundoscopy.`;
      } else if (userText.includes('تمیز') || userText.includes('مرتب') || userText.includes('تناقض')) {
        agentReplyText = isFarsi
          ? 'داده‌های متناقض و تکراری حذف و برچسب‌های استاندارد سیب جایگزین گردید.'
          : 'Conflicting and redundant entries removed and mapped to standard SIB fields.';
      }

      const agentReply: AgentMessage = {
        id: `agt-${Date.now()}`,
        sender: 'AGENT',
        text: agentReplyText,
        timestamp: 'هم‌اکنون',
        structuredOutput: reportSnippet
          ? {
              title: isFarsi ? 'گزارش خروجی آماده برای مراتب بعدی' : 'Prepared Handover Document',
              type: 'REFERRAL_HANDOVER',
              items: [
                isFarsi ? 'خلاصه بالینی پاک‌سازی‌شده' : 'Sanitized clinical summary',
                isFarsi ? 'آماده چاپ یا رونوشت در سامانه ارجاع' : 'Ready for referral submission',
              ],
              formattedReport: reportSnippet,
            }
          : undefined,
      };

      setMessages((prev) => [...prev, agentReply]);
      setIsProcessing(false);
    }, 700);
  };

  return (
    <div className="bg-slate-900 border border-teal-500/50 rounded-2xl shadow-xl flex flex-col h-full overflow-hidden">
      {/* Agent Header */}
      <div className="p-3.5 bg-gradient-to-r from-teal-950 via-slate-900 to-slate-900 border-b border-teal-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-white">
                {isFarsi ? 'دستیار بالینی هوشمند پزشک (Ω-Agent)' : 'Ω-Clinical Copilot Agent'}
              </h3>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-teal-900/80 text-teal-300 border border-teal-500/40">
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-teal-300/80">
              {isFarsi
                ? 'پالایش داده‌های سیب و آماده‌سازی گزارش برای مراتب بعدی'
                : 'Sanitizing SIB data & structuring next-level handovers'}
            </p>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
          Dr. N. Alavi
        </div>
      </div>

      {/* Quick Agent Actions Bar */}
      <div className="p-2 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center gap-1.5 text-[11px]">
        <button
          onClick={handleCleanData}
          disabled={isProcessing}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-teal-500/30 text-teal-300 font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <Wand2 className="w-3.5 h-3.5 text-teal-400" />
          <span>{isFarsi ? '🧹 پالایش داده‌های متناقض سیب' : 'Clean & Harmonize'}</span>
        </button>

        <button
          onClick={handleGenerateReferralReport}
          disabled={isProcessing}
          className="px-2.5 py-1 rounded-lg bg-teal-950 hover:bg-teal-900 border border-teal-500/40 text-teal-200 font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
        >
          <FileText className="w-3.5 h-3.5 text-teal-400" />
          <span>{isFarsi ? '📑 تهیه گزارش تمیز برای مراتب بعدی (متخصص)' : 'Level 2 Handover Report'}</span>
        </button>

        <button
          onClick={handleAuditSafety}
          disabled={isProcessing}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-amber-500/30 text-amber-300 font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{isFarsi ? '⚠️ پایش خطرات و تداخل داروها' : 'Safety Audit'}</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((msg) => {
          const isAgent = msg.sender === 'AGENT';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAgent ? 'items-start' : 'items-end'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                <span>{isAgent ? (isFarsi ? 'دستیار بالینی سیب' : 'Ω-Agent') : isFarsi ? 'پزشک معالج' : 'You (Physician)'}</span>
                <span>·</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                className={`p-3 rounded-2xl max-w-[95%] leading-relaxed ${
                  isAgent
                    ? 'bg-slate-950 border border-slate-800 text-slate-200'
                    : 'bg-teal-700 text-white rounded-br-none'
                }`}
              >
                <p>{msg.text}</p>

                {/* Structured Agent Card / Report Output */}
                {msg.structuredOutput && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-teal-800/50 space-y-2">
                    <div className="font-bold text-teal-300 flex items-center justify-between text-xs">
                      <span>{msg.structuredOutput.title}</span>
                      <span className="text-[10px] font-mono text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/40">
                        VERIFIED
                      </span>
                    </div>

                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {msg.structuredOutput.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Preformatted Handover Document with Copy Action */}
                    {msg.structuredOutput.formattedReport && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono">
                            OFFICIAL HANDOVER TEXT:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyReport(msg.structuredOutput!.formattedReport!, msg.id)
                            }
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 text-[10px] font-medium flex items-center gap-1 transition-colors border border-slate-700"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>{isFarsi ? 'کپی شد ✓' : 'Copied!'}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{isFarsi ? 'رونوشت گزارش' : 'Copy Report'}</span>
                              </>
                            )}
                          </button>
                        </div>

                        <pre className="text-[10px] font-mono text-teal-100 bg-slate-950 p-2.5 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48">
                          {msg.structuredOutput.formattedReport}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
            <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
            <span>{isFarsi ? 'دستیار در حال تحلیل و پاک‌سازی داده‌های سیب است...' : 'Agent analyzing & organizing SIB records...'}</span>
          </div>
        )}
      </div>

      {/* Input Prompt Box */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={
              isFarsi
                ? 'به دستیار دستور دهید: «گزارش ارجاع برای متخصص بنویس»، «تداخلات دارو را چک کن»...'
                : 'Instruct agent: "Generate referral handover", "Clean conflicting vitals"...'
            }
            className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isProcessing}
            className="absolute left-2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </form>
    </div>
  );
};
