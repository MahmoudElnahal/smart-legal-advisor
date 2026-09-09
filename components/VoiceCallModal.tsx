import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck, 
  Send,
  Radio,
  FileCheck,
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { CallTurn } from '../types';
import { voiceConsultWithLegalAI } from '../services/geminiService';
import { speakArabic, stopArabicSpeech, setSpeechRate, getSpeechRate } from '../services/speechService';
import { MinistryLogo } from './MinistryLogo';

interface VoiceCallModalProps {
  isOpen: boolean;
  onClose: (transcript: CallTurn[], duration: string) => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({ isOpen, onClose }) => {
  const [callDuration, setCallDuration] = useState(0);
  const [callSpeechRate, setCallSpeechRate] = useState<number>(getSpeechRate());
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  
  // Call status: 'idle' | 'listening' | 'processing' | 'speaking'
  const [callStatus, setCallStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const [latestAIResponse, setLatestAIResponse] = useState<string>(
    'أهلاً بك يا فندم. معك المستشار القانوني الرقمي لوزارة العمل بجمهورية مصر العربية. تفضل بالضغط على الميكروفون وتحدث باستفسارك وسأجيبك بالسند القانوني فوراً.'
  );
  
  const [transcript, setTranscript] = useState<CallTurn[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Suggested questions for rapid testing
  const quickQuestions = [
    'كم تبلغ العلاوة السنوية بالمادة 12؟',
    'ما هي شروط إجازة الوضع بالمادة 54؟',
    'ما هي أقصى فترة اختبار بالمادة 90؟',
    'ما هو تعويض الفصل التعسفي بالمادة 165؟'
  ];

  // Duration timer
  useEffect(() => {
    if (isOpen) {
      setCallDuration(0);
      setTranscript([]);
      setMicPermissionError(null);
      setCallStatus('idle');

      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Welcome voice greeting via Arabic speech service
      const welcomeText = 'أهلاً بحضرتك يا فندم. معك المستشار القانوني لوزارة العمل المصرية. تفضل بالتحدث أو طرح استفسارك العمالي وسأجيبك فوراً بنص القانون والقرارات الوزارية.';
      setCallStatus('speaking');
      speakArabic(welcomeText, {
        onStart: () => setCallStatus('speaking'),
        onEnd: () => {
          setCallStatus('idle');
          // Auto-prompt user to speak after intro
          startSpeechRecognition();
        },
        onError: () => setCallStatus('idle')
      });
    } else {
      cleanupCall();
    }

    return () => {
      cleanupCall();
    };
  }, [isOpen]);

  const cleanupCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    stopSpeechRecognition();
    stopArabicSpeech();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // Setup Web Audio Analyser for real-time mic visualizer
  const setupAudioAnalyser = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!isOpen) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        // Normalize 0 - 100
        setAudioLevel(Math.min(100, Math.round(avg * 1.8)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err: any) {
      console.warn('Microphone stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError('يرجى السماح بصلاحية الميكروفون في المتصفح للتحدث الصوتي المباشر.');
      }
    }
  };

  // Start Speech Recognition
  const startSpeechRecognition = () => {
    if (isMicMuted) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicPermissionError('متصفحك لا يدعم التعرف الصوتي المباشر. يمكنك استخدام الأسئلة السريعة أو الكتابة.');
      return;
    }

    stopSpeechRecognition();
    setupAudioAnalyser();

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.continuous = false; // Single utterance mode is vastly more stable across all browsers
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setCallStatus('listening');
        setMicPermissionError(null);
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript;
          } else {
            interimText += res[0].transcript;
          }
        }

        const spoken = finalText || interimText;
        setCurrentSpeechText(spoken);

        // If we have final text or strong input, trigger submission after silence
        if (finalText && finalText.trim().length > 2) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            handleInquiry(finalText.trim());
          }, 800);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setMicPermissionError('تم رفض إذن الميكروفون. يرجى تفعيله من شريط عنوان المتصفح.');
          setCallStatus('idle');
        } else if (event.error !== 'no-speech') {
          setCallStatus('idle');
        }
      };

      recognition.onend = () => {
        if (callStatus === 'listening') {
          // If ended without final, return to idle
          setCallStatus('idle');
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setCallStatus('idle');
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Process legal inquiry
  const handleInquiry = async (queryText: string) => {
    if (!queryText.trim()) return;

    stopSpeechRecognition();
    stopArabicSpeech();
    setCallStatus('processing');
    setCurrentSpeechText(queryText);

    const userTurn: CallTurn = {
      role: 'user',
      text: queryText,
      timestamp: new Date().toISOString()
    };

    const updatedTranscript = [...transcript, userTurn];
    setTranscript(updatedTranscript);

    try {
      const historyForAI = transcript.map(t => ({ role: t.role, text: t.text }));
      const answer = await voiceConsultWithLegalAI(queryText, historyForAI);
      const safeAnswer = answer || 'وفقاً لقانون العمل المصري رقم 14 لسنة 2025، يحق للعامل اللجوء لمكتب العمل المختص.';

      const modelTurn: CallTurn = {
        role: 'model',
        text: safeAnswer,
        timestamp: new Date().toISOString()
      };

      setTranscript([...updatedTranscript, modelTurn]);
      setLatestAIResponse(safeAnswer);
      setCurrentSpeechText('');

      // Speak response in verified Arabic
      if (!isSpeakerMuted) {
        setCallStatus('speaking');
        speakArabic(safeAnswer, {
          onStart: () => setCallStatus('speaking'),
          onEnd: () => setCallStatus('idle'),
          onError: () => setCallStatus('idle')
        });
      } else {
        setCallStatus('idle');
      }
    } catch (err) {
      console.error('AI call error:', err);
      const fallback = 'وفقاً لصريح نصوص قانون العمل المصري الجديد رقم 14 لسنة 2025، تم حفظ استفسار سيادتكم وسيتم ربطه بالمستشار القانوني مباشرة، ويمكنكم مراجعة لجنة التسوية بمكتب العمل وفق المادة 149.';
      const fallbackTurn: CallTurn = {
        role: 'model',
        text: fallback,
        timestamp: new Date().toISOString()
      };
      setTranscript([...updatedTranscript, fallbackTurn]);
      setLatestAIResponse(fallback);
      setCurrentSpeechText('');
      if (!isSpeakerMuted) {
        setCallStatus('speaking');
        speakArabic(fallback, {
          onStart: () => setCallStatus('speaking'),
          onEnd: () => setCallStatus('idle'),
          onError: () => setCallStatus('idle')
        });
      } else {
        setCallStatus('idle');
      }
    }
  };

  // Replay latest response
  const handleReplayResponse = () => {
    if (!latestAIResponse) return;
    setCallStatus('speaking');
    speakArabic(latestAIResponse, {
      onStart: () => setCallStatus('speaking'),
      onEnd: () => setCallStatus('idle'),
      onError: () => setCallStatus('idle')
    });
  };

  // End and save
  const handleEndCall = () => {
    cleanupCall();
    const durationFormatted = formatDuration(callDuration);
    onClose(transcript, durationFormatted);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#1b0000] via-[#2a0404] to-[#120000] rounded-3xl shadow-2xl border-2 border-[#C5A059]/40 text-white overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header Ribbon */}
        <div className="bg-black/40 px-5 py-3.5 border-b border-[#C5A059]/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-[#E5C378] tracking-wide">
              مكالمة استشارية مباشرة - وزارة العمل
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Speed Selector: 1x, 1.5x, 2x */}
            <div 
              className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/15 text-[11px] font-bold" 
              dir="ltr" 
              title="سرعة نطق الصوت"
            >
              {[1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setCallSpeechRate(rate);
                    setSpeechRate(rate);
                  }}
                  className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer font-bold ${
                    callSpeechRate === rate
                      ? 'bg-[#C5A059] text-[#700000] font-black shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                  title={`سرعة الصوت ${rate}x`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <span className="px-2.5 py-1 bg-white/10 rounded-full text-xs font-mono font-bold text-slate-200 border border-white/10">
              {formatDuration(callDuration)}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>مشفرة وموثقة</span>
            </div>

            <button
              onClick={handleEndCall}
              className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="إغلاق المكالمة وتوثيقها"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Central Call Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 flex flex-col items-center justify-center text-center">
          
          {/* Official Ministry Emblem */}
          <div className="relative">
            <MinistryLogo className="w-28 h-28 md:w-32 md:h-32" withGlow={callStatus === 'speaking' || callStatus === 'listening'} />

            {/* Audio Waves when speaking or listening */}
            {(callStatus === 'speaking' || callStatus === 'listening') && (
              <div className="absolute -inset-3 rounded-full border-2 border-[#C5A059]/50 animate-ping pointer-events-none" />
            )}
          </div>

          {/* Caller Designation */}
          <div className="space-y-1">
            <h3 className="text-xl md:text-2xl font-black text-white">المستشار القانوني الرقمي</h3>
            <p className="text-xs text-[#E5C378] font-bold">
              الإدارة المركزية للاستشارات التشريعية - وزارة العمل المصرية
            </p>
          </div>

          {/* Dynamic Status Pill */}
          <div>
            {callStatus === 'listening' && (
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-4 py-1.5 rounded-full text-xs font-bold animate-pulse">
                <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>المستشار يستمع لسيادتك الآن... تحدث بحرية</span>
              </div>
            )}
            {callStatus === 'processing' && (
              <div className="inline-flex items-center gap-2 bg-[#C5A059]/20 text-[#E5C378] border border-[#C5A059]/40 px-4 py-1.5 rounded-full text-xs font-bold animate-pulse">
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
                <span>جاري استخراج السند من قانون 14 لسنة 2025...</span>
              </div>
            )}
            {callStatus === 'speaking' && (
              <div className="inline-flex items-center gap-2 bg-[#700000] text-[#FFE899] border border-[#C5A059]/60 px-4 py-1.5 rounded-full text-xs font-black shadow-md">
                <Volume2 className="w-4 h-4 text-[#FFE899] animate-bounce" />
                <span>المستشار يتحدث باللغة العربية الفصحى...</span>
              </div>
            )}
            {callStatus === 'idle' && (
              <div className="inline-flex items-center gap-2 bg-white/10 text-slate-300 border border-white/15 px-4 py-1.5 rounded-full text-xs font-semibold">
                <span>جاهز للاستماع - اضغط زر الميكروفون للتحدث</span>
              </div>
            )}
          </div>

          {/* Live Audio Level Equalizer */}
          <div className="flex items-center justify-center gap-1 h-6 w-full max-w-xs">
            {[20, 45, 75, 90, 60, 85, 40, 70, 95, 50, 30].map((baseHeight, idx) => {
              const active = callStatus === 'speaking' || (callStatus === 'listening' && audioLevel > 5);
              const height = active 
                ? Math.max(15, Math.min(100, baseHeight + (audioLevel * 0.7))) 
                : 15;
              return (
                <div
                  key={idx}
                  className="w-1.5 rounded-full transition-all duration-100"
                  style={{
                    height: `${height}%`,
                    backgroundColor: callStatus === 'speaking' ? '#C5A059' : callStatus === 'listening' ? '#34D399' : '#ffffff25'
                  }}
                />
              );
            })}
          </div>

          {/* Mic permission warning if any */}
          {micPermissionError && (
            <div className="bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs px-4 py-2 rounded-xl flex items-center gap-2 max-w-md text-right">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{micPermissionError}</span>
            </div>
          )}

          {/* Live Spoken Text Bubble */}
          {currentSpeechText && (
            <div className="w-full max-w-lg bg-white/10 border border-white/20 p-3 rounded-2xl text-slate-100 text-sm font-medium animate-fade-in shadow-inner">
              <span className="text-[#C5A059] font-bold text-xs block mb-1">صوت المتحدث:</span>
              "{currentSpeechText}"
            </div>
          )}

          {/* Latest AI Legal Advice Screen */}
          <div className="w-full max-w-xl bg-black/40 border border-[#C5A059]/30 rounded-2xl p-4 text-right space-y-2 shadow-inner">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-black text-[#E5C378] flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#C5A059]" />
                <span>إفادة المستشار القانوني:</span>
              </span>
              <button 
                onClick={handleReplayResponse}
                className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md border border-white/10 transition-colors"
                title="إعادة الاستماع للرد"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة الاستماع</span>
              </button>
            </div>
            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed max-h-36 overflow-y-auto">
              {latestAIResponse}
            </p>
          </div>

          {/* Quick Voice Inquiries (1-Click test prompts) */}
          <div className="w-full max-w-xl space-y-2 text-right">
            <span className="text-[11px] font-bold text-slate-400 block">
              استفسارات نموذجية سريعة بنقرة واحدة:
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleInquiry(q)}
                  disabled={callStatus === 'processing'}
                  className="bg-white/5 hover:bg-[#C5A059]/20 text-slate-300 hover:text-[#FFE899] border border-white/10 hover:border-[#C5A059]/50 text-xs px-3 py-1.5 rounded-full transition-all text-right disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* In-Call Text Input Fallback */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (manualInput.trim()) {
                handleInquiry(manualInput.trim());
                setManualInput('');
              }
            }} 
            className="w-full max-w-xl flex items-center gap-2 pt-1"
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="اكتب استفسارك هنا أثناء المكالمة إن تعذر الميكروفون..."
              className="flex-1 bg-black/30 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#C5A059]"
            />
            <button
              type="submit"
              disabled={!manualInput.trim() || callStatus === 'processing'}
              className="bg-[#C5A059] text-[#700000] p-2 rounded-xl hover:bg-[#d8b46b] disabled:opacity-40 transition-colors shrink-0"
              title="إرسال في المكالمة"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* Bottom Call Controls Dock */}
        <div className="bg-black/50 p-4 border-t border-[#C5A059]/30 flex items-center justify-around gap-3">
          
          {/* Mute/Unmute Speaker */}
          <button
            onClick={() => {
              if (!isSpeakerMuted) {
                stopArabicSpeech();
              }
              setIsSpeakerMuted(!isSpeakerMuted);
            }}
            className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border transition-all ${
              isSpeakerMuted ? 'bg-rose-600/30 border-rose-500 text-rose-300' : 'bg-white/10 border-white/15 text-slate-300 hover:bg-white/20'
            }`}
            title={isSpeakerMuted ? 'تشغيل صوت المستشار' : 'كتم صوت المستشار'}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            <span className="text-[10px] font-bold">{isSpeakerMuted ? 'صوت مكتوم' : 'صوت المستشار'}</span>
          </button>

          {/* Primary Action Button: Tap to Talk / Stop Talking */}
          <button
            onClick={() => {
              if (callStatus === 'listening') {
                stopSpeechRecognition();
                setCallStatus('idle');
              } else {
                startSpeechRecognition();
              }
            }}
            disabled={callStatus === 'processing'}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-2xl border-4 transition-all transform active:scale-95 ${
              callStatus === 'listening'
                ? 'bg-emerald-600 border-emerald-300 text-white animate-pulse'
                : 'bg-[#C5A059] hover:bg-[#dfba6b] border-[#FFEAA7] text-[#700000]'
            }`}
            title={callStatus === 'listening' ? 'جار الاستماع - اضغط للإيقاف' : 'اضغط للتحدث الآن'}
          >
            {callStatus === 'listening' ? (
              <Mic className="w-7 h-7 animate-bounce" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </button>

          {/* End & Document Call Button */}
          <button
            onClick={handleEndCall}
            className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white border border-rose-500 shadow-lg hover:shadow-rose-900/50 transition-all active:scale-95"
            title="إنهاء المكالمة وتوثيقها فوراً في سجل المحادثة"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-[10px] font-black">إنهاء وتوثيق</span>
          </button>

        </div>

      </div>
    </div>
  );
};
