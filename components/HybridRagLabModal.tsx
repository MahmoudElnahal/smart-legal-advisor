import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Sliders, 
  Database, 
  Cpu, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  Layers, 
  BookOpen, 
  ChevronRight,
  ShieldCheck,
  Code
} from 'lucide-react';
import { hybridRagEngine } from '../services/rag/hybridEngine';
import { RagSearchResult, RagRetrievedChunk } from '../services/rag/types';

interface HybridRagLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const PRESET_QUERIES = [
  'ما هي شروط إنشاء دور الحضانة ونسب اشتراك العاملة بالقرار 48 لسنة 2026؟',
  'ما هي نسبة العلاوة السنوية الدورية الإلزامية في المادة 12؟',
  'ما هو الحد الأقصى لجزاء الخصم وضوابط الاستقالة الحكمية بالقرار 162 لسنة 2026؟',
  'هل يعفى العامل من الرسوم القضائية ومصاريف المحاكم بالقرار 4693 لسنة 2025؟',
  'ما هي أوزان الحمل المسموحة للأطفال والوجبة الصحية المجانية بالقرار 50 لسنة 2026؟',
  'هل يجوز لشركات إلحاق العمالة بالخارج تقاضي عمولة من العامل بالقرار 272؟',
  'ما هي نسبة تشغيل ذوي الإعاقة والأقزام الإلزامية ونموذج السجل بالقرار 271؟'
];

export const HybridRagLabModal: React.FC<HybridRagLabModalProps> = ({
  isOpen,
  onClose,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery || PRESET_QUERIES[0]);
  const [alpha, setAlpha] = useState<number>(0.45); // 0 = Pure Semantic, 1 = Pure BM25
  const [topK, setTopK] = useState<number>(4);
  const [activeTab, setActiveTab] = useState<'results' | 'context' | 'architecture'>('results');
  const [ragResult, setRagResult] = useState<RagSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const runRetrieval = async (q: string, currentAlpha: number, currentTopK: number) => {
    if (!q.trim()) return;
    setIsSearching(true);
    try {
      const result = await hybridRagEngine.retrieve(q, {
        alpha: currentAlpha,
        topK: currentTopK
      });
      setRagResult(result);
    } catch (e) {
      console.error('Error in Hybrid RAG Lab:', e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runRetrieval(query, alpha, topK);
    }
  }, [isOpen, alpha, topK]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs font-sans text-right" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">مختبر الاسترجاع الهجين المتقدم (Hybrid RAG Lab)</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  BM25 + Dense Vectors + Metadata Boosting + Reranker
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                فحص فوري للمتجهات الدلالية العربية والفهارس المقلوبة محلياً بدون قواعد بيانات خارجية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="إغلاق المختبر"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Query Input & Hyperparameter Control Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runRetrieval(query, alpha, topK)}
                placeholder="اكتب استعلامك القانوني أو رقم المادة أو القرار..."
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>

            <button
              type="button"
              onClick={() => runRetrieval(query, alpha, topK)}
              disabled={isSearching}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{isSearching ? 'جاري الفحص...' : 'تنفيذ الاسترجاع'}</span>
            </button>
          </div>

          {/* Preset Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="text-slate-500 font-bold shrink-0">نماذج استعلام سريعة:</span>
            {PRESET_QUERIES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(preset);
                  runRetrieval(preset, alpha, topK);
                }}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg whitespace-nowrap transition-colors cursor-pointer text-[11px]"
              >
                {preset.slice(0, 35)}...
              </button>
            ))}
          </div>

          {/* Hyperparameter Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 text-xs">
            {/* Alpha Slider */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 font-bold text-[11px]">
                <span>توازن النموذج الهجين (Weight Alpha):</span>
                <span className="text-emerald-700 font-black">
                  {Math.round(alpha * 100)}% BM25 / {Math.round((1 - alpha) * 100)}% Dense Cosine
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0.0 (كثيف دلالي فقط)</span>
                <span className="text-emerald-600 font-bold">0.45 (متوازن موصى به)</span>
                <span>1.0 (BM25 رمزي فقط)</span>
              </div>
            </div>

            {/* Top-K Selector */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 font-bold text-[11px]">
                <span>عدد السندات المسترجعة (Top-K):</span>
                <span className="text-emerald-700 font-black">{topK} سندات تشريعية</span>
              </div>
              <input
                type="range"
                min="2"
                max="6"
                step="1"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>2 سندات (تركيز عالي)</span>
                <span>4 سندات (افتراضي)</span>
                <span>6 سندات (تغطية شاملة)</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="px-5 border-b border-slate-200 bg-white flex items-center gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'results'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>نتائج المطابقة والترتيب ({ragResult?.retrievedChunks.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('context')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'context'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>سياق الحَقن للذكاء الاصطناعي (LLM Context)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>معمارية النظام المحلي والمواصفات</span>
          </button>

          {ragResult && (
            <div className="mr-auto text-[11px] text-slate-500 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                زمن المعالجة: <strong className="text-slate-800">{ragResult.latencyMs} ms</strong>
              </span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                سندات قانونية معتمدة: <strong className="text-slate-800">{ragResult.legalCitations.length}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-100/60">
          {activeTab === 'results' && ragResult && (
            <div className="space-y-4">
              {/* Normalized Query Breakdown */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">مراحل المعالجة اللغوية الطبيعية للاستعلام (Arabic NLP Pipeline):</span>
                  <span className="text-[10px] text-slate-400">تجريد التشكيل، توحيد الألف والتاء، وحذف أدوات الربط</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ragResult.normalizedQueryTokens.map((tok, i) => (
                    <span key={i} className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-mono font-bold">
                      {tok}
                    </span>
                  ))}
                </div>
              </div>

              {/* Candidates Grid */}
              <div className="space-y-3">
                {ragResult.retrievedChunks.map((item, index) => (
                  <div key={item.chunk.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs">
                          #{item.finalRank}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{item.chunk.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.chunk.referenceNumber} • {item.chunk.gazetteIssue} • تصنيف: {item.chunk.category}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
                          درجة الثقة: {item.confidencePercent}%
                        </span>
                      </div>
                    </div>

                    {/* Scores Comparison Table */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {/* BM25 */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center text-slate-500 text-[11px] font-bold">
                          <span>Okapi BM25</span>
                          <span className="text-slate-700">ترتيب #{item.bm25Rank}</span>
                        </div>
                        <div className="text-base font-black text-slate-900 mt-0.5">{item.bm25Score}</div>
                        <div className="text-[10px] text-slate-400">تطابق الكلمات المفتاحية والأوزان</div>
                      </div>

                      {/* Cosine */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center text-slate-500 text-[11px] font-bold">
                          <span>Cosine Similarity</span>
                          <span className="text-slate-700">ترتيب #{item.semanticRank}</span>
                        </div>
                        <div className="text-base font-black text-slate-900 mt-0.5">{item.semanticCosineScore}</div>
                        <div className="text-[10px] text-slate-400">المطابقة الدلالية للمتجهات (128d)</div>
                      </div>

                      {/* Metadata Boost */}
                      <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-200">
                        <div className="flex justify-between items-center text-purple-700 text-[11px] font-bold">
                          <span>تعزيز البيانات (Boost)</span>
                          <span className="text-purple-800 font-black">+{item.metadataBoost}</span>
                        </div>
                        <div className="text-base font-black text-purple-900 mt-0.5">+{item.metadataBoost}</div>
                        <div className="text-[10px] text-purple-600">مطابقة رقم المادة/القرار الوزاري</div>
                      </div>

                      {/* Rerank */}
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="flex justify-between items-center text-emerald-800 text-[11px] font-bold">
                          <span>الترتيب النهائي (RRF)</span>
                          <span className="text-emerald-900 font-black">متقدم</span>
                        </div>
                        <div className="text-base font-black text-emerald-900 mt-0.5">{item.rerankScore}</div>
                        <div className="text-[10px] text-emerald-700">دمج الرتب وتغطية الاستعلام الكامل</div>
                      </div>
                    </div>

                    {/* Boost Reasons */}
                    {item.boostReasons.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-xs bg-purple-50 p-2 rounded-xl border border-purple-100 text-purple-900">
                        <span className="font-bold">معايير التعزيز المطبقة:</span>
                        {item.boostReasons.map((r, ri) => (
                          <span key={ri} className="bg-white px-2 py-0.5 rounded-md border border-purple-200 font-medium text-[11px]">
                            ✓ {r}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Content Snippet */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      <p className="font-medium">{item.chunk.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'context' && ragResult && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900">السياق المجمع والمحقون في مطالبة الذكاء الاصطناعي (Prompt Context)</h4>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  جاهز للحقن في Gemini 3.8 Flash
                </span>
              </div>
              <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px]">
                {ragResult.assembledContext}
              </pre>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h4 className="text-sm font-black text-slate-900">معمارية ومكونات منظومة الاسترجاع الهجين المحلية (Production Hybrid RAG Architecture)</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>محلية البيانات 100% (Local In-Memory Corpus)</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    قاعدة المعرفة التشريعية لقانون العمل 14 لسنة 2025 والقرارات الوزارية 2025/2026 مدمجة بالكامل كـ Chunks محلية داخل مشروع TypeScript دون الحاجة إلى قواعد بيانات متجهة سحابية خارجية (No Pinecone, No Milvus, Zero Cloud DB costs).
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-emerald-600" />
                    <span>استرجاع رمزي Okapi BM25 مخصص للعربية</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    فهرس مقلوب (Inverted Index) فائق السرعة مع معالجة لغوية عربية دقيقة (حذف التشكيل، التطبيع الألفي، تجريد السوابق واللواحق، حساب تردد الوثائق المعكوس Robertson-Spärck Jones IDF).
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>متجهات دلالية عربية وتشابه جيب التمام (Cosine)</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    تمثيل متجهي عالي الأبعاد (128d) يغطي العناقيد التشريعية والكلمات المفتاحية التخصصية مع حساب فوري لتشابه جيب التمام (Cosine Similarity) في أقل من 1 مللي ثانية.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    <span>تعزيز البيانات الوصفية وإعادة الترتيب (RRF)</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    محرك تعزيز وصفي (Metadata Booster) يرفع أوزان أرقام المواد والقرارات الوزارية الصريحة وسنة الإصدار، يتبعه محرك إعادة الترتيب المتبادل (Reciprocal Rank Fusion) لضمان دقة قطعية في الإجابات القانونية.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            مستشار وزارة العمل الرقمي • قانون العمل 14 لسنة 2025 • القرارات الوزارية 2025/2026
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold cursor-pointer transition-all"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
