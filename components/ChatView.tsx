import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Trash2, 
  Printer, 
  Mic, 
  Scale, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  HelpCircle, 
  Briefcase, 
  AlertCircle, 
  Square, 
  Phone,
  Sliders,
  Database
} from 'lucide-react';
import { Message, CallTurn } from '../types';
import { chatWithLegalAI, chatWithLegalAIWithRag } from '../services/geminiService';
import { speakArabic, stopArabicSpeech, setSpeechRate } from '../services/speechService';
import { FAQS, MINISTERIAL_DECREES_HIGHLIGHTS } from '../constants';
import { LegalMessageRenderer } from './LegalMessageRenderer';
import { MinistryLogo } from './MinistryLogo';
import { VoiceCallModal } from './VoiceCallModal';
import { HybridRagInspector } from './HybridRagInspector';
import { HybridRagLabModal } from './HybridRagLabModal';

export const ChatView: React.FC = () => {
  // Chat starts completely clean and dynamic (not fixed)
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [speechRate, setSpeechRateState] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'faqs' | 'decrees'>('faqs');
  const [clearToast, setClearToast] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [isRagLabOpen, setIsRagLabOpen] = useState(false);
  const [labInitialQuery, setLabInitialQuery] = useState('');
  
  // Continuous Speech Recognition States & Refs
  const [isMicActive, setIsMicActive] = useState(false);
  const isMicActiveRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef('');
  const [micUnsupported, setMicUnsupported] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Clean up speech & microphone on component unmount
  useEffect(() => {
    return () => {
      stopArabicSpeech();
      isMicActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  // Handle closing of Voice Call and document it in chat
  const handleVoiceCallClose = (transcript: CallTurn[], duration: string) => {
    setIsVoiceCallOpen(false);
    if (!transcript || transcript.length === 0) return;

    let callSummary = `**محضر استشارة مكالمة صوتية مباشرة - وزارة العمل**\n**مدة المكالمة:** ${duration}\n\n`;
    
    transcript.forEach((turn) => {
      if (turn.role === 'user') {
        callSummary += `**سؤال المواطن (صوتياً):** ${turn.text}\n\n`;
      } else {
        callSummary += `**إفادة المستشار القانوني:**\n${turn.text}\n\n`;
      }
    });

    const callMessage: Message = {
      id: `call-${Date.now()}`,
      role: 'model',
      text: callSummary.trim(),
      timestamp: new Date().toISOString(),
      source: 'voice_call',
      callDuration: duration
    };

    setMessages(prev => [...prev, callMessage]);
  };

  // Clear chat completely without any blocking confirm dialogs
  const handleClearChat = () => {
    stopArabicSpeech();
    setCurrentlySpeakingId(null);
    setMessages([]);
    setClearToast(true);
    setTimeout(() => setClearToast(false), 3000);
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isLoading) return;

    // Stop microphone if currently listening
    if (isMicActiveRef.current) {
      isMicActiveRef.current = false;
      setIsMicActive(false);
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    }

    // Stop any ongoing speech
    stopArabicSpeech();
    setCurrentlySpeakingId(null);

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
      source: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const aiResult = await chatWithLegalAIWithRag(textToSend, history);

      const modelMessage: Message = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        text: aiResult.text || 'وفقاً لصريح نصوص قانون العمل رقم 14 لسنة 2025، يرجى التوجه لمكتب العمل المختص.',
        timestamp: new Date().toISOString(),
        source: 'text',
        ragResult: aiResult.ragResult
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-err`,
        role: 'model',
        text: `وفقاً لأحكام **قانون العمل المصري الجديد رقم 14 لسنة 2025**:

1. **حماية الحقوق العمالية:**
- نصوص القانون آمرة لحماية حقوق الأجور والعلاوة السنوية (3%) والإجازات وفترات الراحة والتسوية الودية، ويبطل كل شرط يخالفها.

2. **التسوية الودية بمديرية العمل:**
- يحق لكم التوجه إلى مقر مكتب العمل المختص وتقديم طلب تسوية ودية وفقاً للمادة (149) لسرعة إنهاء الشكوى خلال 21 يوماً.

**الإجراء العملي:**
يمكنكم إعادة إرسال الاستفسار الآن أو الاتصال مباشرة بالخط الساخن الموحد لوزارة العمل: **19468**.`,
        timestamp: new Date().toISOString(),
        source: 'text'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Text-to-speech toggle with authentic Arabic pronunciation
  const handleSpeakMessage = (id: string, text: string) => {
    if (currentlySpeakingId === id) {
      stopArabicSpeech();
      setCurrentlySpeakingId(null);
      return;
    }

    stopArabicSpeech();
    setCurrentlySpeakingId(id);

    speakArabic(text, {
      onStart: () => setCurrentlySpeakingId(id),
      onEnd: () => setCurrentlySpeakingId(null),
      onError: () => setCurrentlySpeakingId(null)
    }, {
      rate: speechRate
    });
  };

  // Change speech playback rate (1x, 1.5x, 2x) dynamically
  const handleRateChange = (rate: number) => {
    setSpeechRateState(rate);
    setSpeechRate(rate);
  };

  // Copy message text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2500);
  };

  /**
   * Continuous Dictation:
   * 1. Never stops automatically on pauses or silence.
   * 2. Auto-restarts if browser reaches idle threshold.
   * 3. Streams live words directly to input in real-time.
   * 4. ONLY stops when the user explicitly clicks the button.
   */
  const handleToggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicUnsupported(true);
      setTimeout(() => setMicUnsupported(false), 5000);
      return;
    }

    // If already active, turn it OFF
    if (isMicActiveRef.current) {
      isMicActiveRef.current = false;
      setIsMicActive(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      return;
    }

    // Start continuous dictation
    try {
      stopArabicSpeech();
      setCurrentlySpeakingId(null);

      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      accumulatedTranscriptRef.current = input ? input.trim() : '';
      isMicActiveRef.current = true;
      setIsMicActive(true);
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsMicActive(true);
        isMicActiveRef.current = true;
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let newFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            newFinalTranscript += ' ' + transcript;
          } else {
            interimTranscript += ' ' + transcript;
          }
        }

        if (newFinalTranscript.trim()) {
          const currentBase = accumulatedTranscriptRef.current;
          accumulatedTranscriptRef.current = (
            (currentBase ? currentBase + ' ' : '') + newFinalTranscript.trim()
          ).trim();
        }

        const currentBase = accumulatedTranscriptRef.current;
        const fullLiveText = (
          (currentBase ? currentBase + ' ' : '') + interimTranscript.trim()
        ).trim();

        setInput(fullLiveText);
      };

      recognition.onend = () => {
        // Crucial: Keep mic alive continuously if user has NOT clicked to stop!
        if (isMicActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            // Restarting
          }
        } else {
          setIsMicActive(false);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Recognition notice:', event.error);
        if (event.error === 'no-speech') {
          // Normal silence, keep listening!
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isMicActiveRef.current = false;
          setIsMicActive(false);
        }
      };

      recognition.start();
    } catch (e) {
      console.error('Speech recognition error:', e);
      isMicActiveRef.current = false;
      setIsMicActive(false);
    }
  };

  // Print consultation report
  const handlePrintConsultation = () => {
    window.print();
  };

  // Quick starter topics
  const starterTopics = [
    {
      title: 'العلاوة السنوية (المادة 12)',
      desc: 'نسبة الـ 3% من أجر الاشتراك التأميني وشروط الاستحقاق الإلزامي.',
      prompt: 'ما هي أحكام وشروط استحقاق العلاوة السنوية الدورية بنسبة 3% وفقاً للمادة 12 من قانون العمل الجديد رقم 14 لسنة 2025؟'
    },
    {
      title: 'دور الحضانة بالمنشآت (قرار 48 لسنة 2026)',
      desc: 'إلزام المنشآت (100 عاملة) ونسب الاشتراكات (4% و3% و2%).',
      prompt: 'ما هي ضوابط إنشاء دور الحضانة بمنشآت العمل ونسب اشتراك العاملات وفق القرار الوزاري رقم 48 لسنة 2026؟'
    },
    {
      title: 'الأعمال الخطرة والمناطق النائية (قرار 49)',
      desc: 'زيادة الإجازة السنوية 7 أيام وقائمة المحافظات النائية الـ 9.',
      prompt: 'ما هي الأعمال الخطرة وقائمة الـ 9 مناطق نائية المستحقة لزيادة الإجازة 7 أيام بالقرار الوزاري رقم 49 لسنة 2026؟'
    },
    {
      title: 'تشغيل الأطفال والوجبات (قرار 50)',
      desc: 'حظر التشغيل قبل 15 سنة، أوزان الحمل، والوجبة اليومية المجانية.',
      prompt: 'ما هي ضوابط تشغيل الأطفال والأوزان المسموحة والوجبة الغذائية الصحية اليومية الإلزامية بالقرار الوزاري 50 لسنة 2026؟'
    },
    {
      title: 'ضوابط التحقيق والخصم (قرار 162 لسنة 2026)',
      desc: 'البدء خلال 7 أيام، حد الخصم 5 أيام، والاستقالة الحكمية.',
      prompt: 'ما هي ضوابط التحقيق مع العامل والحد الأقصى لجزاء الخصم وشروط الاستقالة الحكمية بالقرار الوزاري 162 لسنة 2026؟'
    },
    {
      title: 'فترة الاختبار (المادة 90)',
      desc: 'الحد الأقصى 3 أشهر وحظر التكرار لدى نفس صاحب العمل.',
      prompt: 'ما هي ضوابط فترة الاختبار وفقاً للمادة 90 من قانون العمل رقم 14 لسنة 2025 وهل يجوز تجديدها؟'
    },
    {
      title: 'مكاتب المساعدة بالمحاكم (قرار العدل 4693)',
      desc: 'معاونة قضائية مجانية وإعفاء شامل من الرسوم القضائية والدمغة.',
      prompt: 'ما هي خدمات مكاتب المساعدة القانونية العمالية بالمحاكم بقرار وزير العدل 4693 لسنة 2025 وحالات الإعفاء القضائي؟'
    },
    {
      title: 'حق الامتياز وتصفية المنشآت (قرار 259)',
      desc: 'أسبقية ديون العمال على الضرائب وجدولة المستحقات بسنة.',
      prompt: 'ما هي مرتبة امتياز حقوق العمال وضوابط جدولة الأجور عند تصفية المنشأة بموجب القرار الوزاري رقم 259 لسنة 2025؟'
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Official Top Banner with Ministerial Branding */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#5a0202] via-[#3a0000] to-[#200000] text-white p-6 shadow-2xl border-2 border-[#C5A059]/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-red-600/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 text-center md:text-right">
            <div className="hidden sm:flex shrink-0 p-1.5 rounded-full bg-black/30 border-2 border-[#C5A059]/60 shadow-xl">
              <MinistryLogo className="w-20 h-20 md:w-22 md:h-22" withGlow />
            </div>

            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C5A059]/20 border border-[#C5A059]/40 text-[#FFE899] text-xs font-black mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFE899]" />
                <span>المنظومة الرقمية للاستشارات التشريعية - وزارة العمل</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                المستشار القانوني الذكي لقانون العمل رقم 14 لسنة 2025
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                استشارات قانونية فورية وموثقة بنصوص المواد الصريحة وقرارات الوقائع المصرية، مع إمكانية الاستماع الصوتي لكل رد والطباعة الرسمية.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsVoiceCallOpen(true)}
              className="bg-gradient-to-l from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black px-4 py-3 rounded-2xl border-2 border-emerald-400/80 shadow-lg flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer text-xs sm:text-sm"
              title="بدء مكالمة هاتفية تفاعلية مباشرة مع المستشار القانوني"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <Phone className="w-4 h-4" />
              <span>مكالمة صوتية مباشرة</span>
            </button>

            <div className="bg-black/30 backdrop-blur-md px-4 py-3 rounded-2xl border border-[#C5A059]/40 text-center">
              <span className="block text-xs font-bold text-[#E5C378]">الخط الساخن للوزارة</span>
              <span className="block text-lg font-black text-white font-mono">19468</span>
            </div>
          </div>
        </div>

        {/* Legal References Ribbon */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-black/25 rounded-xl p-2.5 border border-white/10">
            <span className="text-[#C5A059] font-bold block">التشريع المعتمد</span>
            <span className="text-white font-semibold">قانون العمل رقم 14 لسنة 2025</span>
          </div>
          <div className="bg-black/25 rounded-xl p-2.5 border border-white/10">
            <span className="text-[#C5A059] font-bold block">القرارات الوزارية</span>
            <span className="text-white font-semibold">قرارات 2025 و2026 الرسمية</span>
          </div>
          <div className="bg-black/25 rounded-xl p-2.5 border border-white/10">
            <span className="text-[#C5A059] font-bold block">الاستماع الصوتي</span>
            <span className="text-white font-semibold">نطق عربي فصيح لكل استشارة</span>
          </div>
          <div className="bg-black/25 rounded-xl p-2.5 border border-white/10">
            <span className="text-[#C5A059] font-bold block">الجهة المشرفة</span>
            <span className="text-white font-semibold">وزارة العمل - جمهورية مصر العربية</span>
          </div>
        </div>
      </div>

      {/* Clear Chat Toast Notification */}
      {clearToast && (
        <div className="flex items-center justify-between gap-3 p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-900 shadow-md animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold">تم مسح سجل الشات بالكامل، ويمكنك الآن طرح استفسار جديد.</p>
          </div>
          <button 
            onClick={() => setClearToast(false)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-3 py-1 bg-emerald-100 rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Main Grid: Legal Topics Sidebar + Enhanced Chat Transcript */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left/Sidebar: Legal Topics & FAQs */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Quick Tabs: FAQs vs Decrees */}
          <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex gap-1">
            <button
              onClick={() => setActiveTab('faqs')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'faqs' 
                  ? 'bg-[#700000] text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              الاستفسارات الشائعة
            </button>
            <button
              onClick={() => setActiveTab('decrees')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'decrees' 
                  ? 'bg-[#700000] text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              القرارات الوزارية (2025/2026)
            </button>
          </div>

          {activeTab === 'faqs' ? (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-[#700000] flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#C5A059]" />
                  <span>محاور قانونية سريعة</span>
                </h3>
                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                  اضغط للسؤال
                </span>
              </div>

              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {FAQS.map((faq, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(faq.question)}
                    disabled={isLoading}
                    className="w-full text-right p-3 rounded-xl bg-slate-50 hover:bg-[#C5A059]/10 border border-slate-200 hover:border-[#C5A059] transition-all group"
                  >
                    <p className="text-xs font-bold text-slate-800 group-hover:text-[#700000] transition-colors leading-relaxed">
                      {faq.question}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] text-slate-500 font-medium">{faq.category}</span>
                      <span className="text-[10px] bg-[#C5A059]/20 text-[#700000] px-2 py-0.5 rounded-md font-bold">
                        {faq.article}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-[#700000] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#C5A059]" />
                  <span>القرارات الوزارية التنفيذية</span>
                </h3>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  الوقائع المصرية
                </span>
              </div>

              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {MINISTERIAL_DECREES_HIGHLIGHTS.map((dec, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleSend(`ما هي تفاصيل وأحكام القرار الوزاري رقم ${dec.number} بشأن ${dec.title}؟`)}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-black text-[#700000] group-hover:underline">
                        قرار {dec.number}
                      </span>
                      <span className="text-[10px] text-slate-400">{dec.date}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mb-1 leading-snug">
                      {dec.title}
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                      {dec.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ministry Contact Card */}
          <div className="bg-gradient-to-br from-[#120000] to-[#250101] text-slate-200 rounded-2xl p-4 text-xs space-y-2 border border-[#C5A059]/30 shadow-sm">
            <div className="flex items-center gap-2 text-[#E5C378] font-bold">
              <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
              <span>قنوات الدعم والتفتيش العمالي</span>
            </div>
            <div className="flex justify-between text-slate-300 pt-1 border-t border-white/10">
              <span>الخط الساخن لوزارة العمل:</span>
              <span className="font-bold text-white font-mono text-sm">19468</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>لجان التسوية الودية:</span>
              <span className="text-[#C5A059] font-bold">البت خلال 21 يوماً</span>
            </div>
          </div>
        </div>

        {/* Right/Center: Main Transcript with Enhanced Legal Message Formatting */}
        <div className="lg:col-span-8 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[640px] max-h-[860px]">
          
          {/* Chat Window Header */}
          <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <div>
                <h3 className="text-sm font-black text-slate-900">جلسة الاستشارات القانونية</h3>
                <p className="text-[11px] text-slate-500">
                  {messages.length > 0 
                    ? `عدد المداخلات المسجلة: ${messages.length}` 
                    : 'ابدأ بطرح أي سؤال أو اختر من المقترحات أدناه'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Hybrid RAG Lab Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  setLabInitialQuery(input || 'ما هي شروط إنشاء دور الحضانة ونسب اشتراك العاملة بالقرار 48 لسنة 2026؟');
                  setIsRagLabOpen(true);
                }}
                className="px-3 py-2 text-indigo-900 hover:text-white hover:bg-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl transition-all text-xs flex items-center gap-1.5 font-black shadow-2xs cursor-pointer active:scale-95"
                title="فتح مختبر ومحلل محرك الاسترجاع الهجين RAG"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>مختبر RAG الهجين</span>
              </button>

              {/* Voice Call Button */}
              <button
                type="button"
                onClick={() => setIsVoiceCallOpen(true)}
                className="px-3 py-2 text-emerald-800 hover:text-white hover:bg-emerald-700 bg-emerald-50 border border-emerald-300 rounded-xl transition-all text-xs flex items-center gap-1.5 font-black shadow-2xs cursor-pointer active:scale-95"
                title="بدء مكالمة صوتية تفاعلية مباشرة"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>مكالمة صوتية</span>
              </button>

              {messages.length > 0 && (
                <button
                  onClick={handlePrintConsultation}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all text-xs flex items-center gap-1.5 font-bold border border-slate-200"
                  title="طباعة / تصدير التقرير الرسمي"
                >
                  <Printer className="w-4 h-4 text-[#C5A059]" />
                  <span className="hidden sm:inline">طباعة الاستشارة</span>
                </button>
              )}
              
              {/* Clear Chat Button - Direct, immediate, wipes all messages */}
              <button
                onClick={handleClearChat}
                className="px-3 py-2 text-red-600 hover:text-white hover:bg-red-600 bg-red-50 border border-red-200 rounded-xl transition-all text-xs flex items-center gap-1.5 font-black shadow-2xs cursor-pointer active:scale-95"
                title="مسح سجل الشات بالكامل"
              >
                <Trash2 className="w-4 h-4" />
                <span>مسح الشات</span>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth bg-[#fafbfc]">
            
            {/* Empty State / Welcome Screen when chat is cleared or fresh */}
            {messages.length === 0 && (
              <div className="py-6 px-2 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-6 animate-fade-in">
                <div className="p-4 rounded-full bg-[#700000]/10 border-2 border-[#C5A059]/40 shadow-inner">
                  <Scale className="w-12 h-12 text-[#700000]" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-[#700000]">
                    أهلاً بك في المستشار القانوني لوزارة العمل
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    الشات جاهز لاستقبال استفساراتك حول <strong>قانون العمل المصري الجديد رقم 14 لسنة 2025</strong> والقرارات الوزارية الصادرة بالوقائع المصرية. يمكنك كتابة أي سؤال أو النقر على أحد الموضوعات الشائعة أدناه:
                  </p>
                </div>

                {/* Quick Topic Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-right">
                  {starterTopics.map((topic, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(topic.prompt)}
                      className="p-3.5 rounded-2xl bg-white hover:bg-[#C5A059]/10 border border-slate-200 hover:border-[#C5A059] shadow-2xs hover:shadow-md transition-all text-right group cursor-pointer"
                    >
                      <h4 className="text-xs font-black text-[#700000] group-hover:text-[#500000] mb-1">
                        {topic.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {topic.desc}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Direct Voice Call Banner in Empty State */}
                <div className="w-full bg-gradient-to-r from-emerald-950/10 via-emerald-900/15 to-emerald-950/10 border-2 border-dashed border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        ترغب في استشارة هاتفية تفاعلية مباشرة بالصوت؟
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        تحدث بالصوت مع المستشار القانوني الذكي واستمع للرد الصوتي الفوري مع التوثيق التلقائي.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVoiceCallOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
                  >
                    <Phone className="w-4 h-4" />
                    <span>ابدأ المكالمة الصوتية الآن</span>
                  </button>
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isSpeakingThis = currentlySpeakingId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div className={`w-full max-w-[95%] md:max-w-[88%] rounded-3xl p-5 md:p-6 shadow-sm relative group ${
                    isUser
                      ? 'bg-gradient-to-br from-[#700000] to-[#4e0000] text-white rounded-br-none'
                      : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-none shadow-xs'
                  }`}>
                    
                    {/* Header Tag for Message */}
                    <div className={`flex items-center justify-between gap-2 mb-3 pb-2 border-b ${
                      isUser ? 'border-white/15' : 'border-slate-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        {!isUser && (
                          <div className="w-5 h-5 rounded-full overflow-hidden shrink-0">
                            <MinistryLogo className="w-full h-full" />
                          </div>
                        )}
                        <span className={`text-xs font-black ${isUser ? 'text-[#FFEAA7]' : 'text-[#700000]'}`}>
                          {isUser ? 'المستفسر' : 'المستشار القانوني - وزارة العمل'}
                        </span>
                        {msg.source === 'voice_call' && (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md text-[10px] font-black">
                            <Phone className="w-3 h-3 text-emerald-700" />
                            <span>مكالمة هاتفية موثقة ({msg.callDuration || 'مباشرة'})</span>
                          </span>
                        )}
                      </div>

                      {/* Message Action Controls */}
                      <div className="flex items-center gap-2">
                        {/* Guaranteed Arabic Sound / Voice playback button */}
                        {!isUser && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleSpeakMessage(msg.id, msg.text)}
                              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 text-xs font-black cursor-pointer shadow-2xs ${
                                isSpeakingThis 
                                  ? 'bg-[#700000] text-[#FFE899] border-2 border-[#C5A059] shadow-md ring-2 ring-[#C5A059]/50' 
                                  : 'bg-amber-50 text-[#700000] hover:bg-[#C5A059]/20 border border-[#C5A059]/40 hover:border-[#C5A059]'
                              }`}
                              title={isSpeakingThis ? 'إيقاف الاستماع' : 'استماع للرد بالصوت العربي الفصيح'}
                            >
                              {isSpeakingThis ? (
                                <>
                                  <span className="flex items-center gap-0.5" aria-hidden="true">
                                    <span className="w-1 h-3 bg-[#FFE899] rounded-full animate-bounce [animation-delay:0.1s]"></span>
                                    <span className="w-1 h-4 bg-[#FFE899] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1 h-2 bg-[#FFE899] rounded-full animate-bounce [animation-delay:0.3s]"></span>
                                  </span>
                                  <VolumeX className="w-4 h-4 text-rose-300 mr-0.5" />
                                  <span>إيقاف الصوت</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-4 h-4 text-[#700000]" />
                                  <span>استماع بالعربي</span>
                                </>
                              )}
                            </button>

                            {/* Speed selector: 1x, 1.5x, 2x */}
                            <div 
                              className="flex items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/90 shadow-2xs text-[11px] font-bold"
                              dir="ltr"
                              title="سرعة تشغيل الصوت"
                            >
                              {[1, 1.5, 2].map((rate) => {
                                const isCurrent = speechRate === rate;
                                return (
                                  <button
                                    key={rate}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRateChange(rate);
                                    }}
                                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer font-bold ${
                                      isCurrent
                                        ? 'bg-[#700000] text-[#FFEAA7] shadow-xs font-black ring-1 ring-[#C5A059]/50'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                                    }`}
                                    title={`سرعة الصوت ${rate}x`}
                                  >
                                    {rate}x
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Copy button */}
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className={`p-1.5 rounded-lg transition-all text-xs cursor-pointer ${
                            isUser 
                              ? 'text-white/70 hover:text-white hover:bg-white/10' 
                              : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                          }`}
                          title="نسخ النص كاملاً"
                        >
                          {copiedMessageId === msg.id ? (
                            <span className="flex items-center gap-1 text-emerald-500 font-bold text-[11px]">
                              <Check className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">تم النسخ</span>
                            </span>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Rich Legal Message Body */}
                    <div className="pt-1">
                      <LegalMessageRenderer content={msg.text} isModel={!isUser} />
                    </div>

                    {/* Production Hybrid RAG Deep Inspector */}
                    {!isUser && msg.ragResult && (
                      <HybridRagInspector 
                        ragResult={msg.ragResult} 
                        onOpenLab={() => {
                          setLabInitialQuery(msg.ragResult?.query || '');
                          setIsRagLabOpen(true);
                        }}
                      />
                    )}

                    {/* Footer / Timestamp */}
                    <div className={`text-[11px] mt-4 pt-2 border-t flex items-center justify-between font-medium ${
                      isUser ? 'border-white/10 text-white/75' : 'border-slate-100 text-slate-400'
                    }`}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                      <span className="text-[10px]">
                        استشارة قانونية موثقة
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading / Generating State */}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white border border-[#C5A059]/40 p-4 rounded-3xl rounded-bl-none shadow-xs flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#700000] text-white flex items-center justify-center animate-spin">
                    <Scale className="w-4 h-4 text-[#C5A059]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800">
                      جاري صياغة السند القانوني واستحضار القرارات الوزارية ذات الصلة...
                    </p>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-3">
            
            {/* Live Continuous Mic Indicator */}
            {isMicActive && (
              <div className="flex items-center justify-between gap-3 p-3 bg-red-50 border-2 border-red-300 rounded-2xl text-red-900 shadow-sm animate-pulse">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
                  </span>
                  <p className="text-xs font-black">
                    المايك مستمر في الاستماع والكتابة الفورية دون انقطاع... تحدث بحرية، ولن يقفل إلا عند ضغطك على زر الإيقاف.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleMic}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>إيقاف المايك</span>
                </button>
              </div>
            )}

            {/* Unsupported Mic Banner */}
            {micUnsupported && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>متصفحك الحالي لا يتيح الوصول لميكروفون التعرف الصوتي، يرجى كتابة السؤال في الحقل أو استخدام متصفح Chrome أو Edge.</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="space-y-2">
              <div className="relative flex items-center">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (isMicActive) {
                      accumulatedTranscriptRef.current = e.target.value;
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="اكتب استفسارك العمالي هنا أو اضغط زر الميكروفون للتحدث الصوتي المباشر..."
                  className={`w-full pr-4 pl-32 py-3 bg-slate-50 border-2 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all resize-none shadow-inner ${
                    isMicActive 
                      ? 'border-red-400 bg-red-50/20 ring-2 ring-red-200' 
                      : 'border-slate-200 focus:border-[#C5A059]'
                  }`}
                />

                <div className="absolute left-2.5 flex items-center gap-2">
                  {/* Dictate Inquiry Button - Continuous */}
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={`px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 font-black text-xs cursor-pointer ${
                      isMicActive 
                        ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-300 animate-pulse' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-[#700000]'
                    }`}
                    title={isMicActive ? 'إيقاف المايك والتسجيل' : 'تحدث صوتياً (المايك مستمر حتى تضغط للإيقاف)'}
                  >
                    {isMicActive ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>إيقاف</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-[#700000]" />
                        <span className="hidden sm:inline">تحدث</span>
                      </>
                    )}
                  </button>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="bg-[#700000] text-[#C5A059] hover:bg-[#550000] p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all font-bold cursor-pointer"
                    title="إرسال الاستفسار القانوني"
                  >
                    <Send className="w-4 h-4 rotate-180 text-white" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الردود مدعومة بنصوص قانون 14 لسنة 2025 والوقائع المصرية</span>
                </span>
                <span className="hidden sm:inline text-slate-400">
                  {isMicActive ? 'الميكروفون مستمر في الكتابة حتى تضغط إيقاف' : 'اضغط Enter للإرسال، أو زر الميكروفون للتحدث الصوتي'}
                </span>
              </div>
            </form>
          </div>

        </div>

      </div>

      {/* Interactive Voice Call Modal */}
      <VoiceCallModal 
        isOpen={isVoiceCallOpen} 
        onClose={handleVoiceCallClose} 
      />

      {/* Production Hybrid RAG Laboratory & Inspector Modal */}
      <HybridRagLabModal
        isOpen={isRagLabOpen}
        onClose={() => setIsRagLabOpen(false)}
        initialQuery={labInitialQuery}
      />

    </div>
  );
};

export default ChatView;
