import React, { useState } from 'react';
import { RagSearchResult, RagRetrievedChunk } from '../services/rag/types';
import { 
  Database, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  CheckCircle2, 
  FileText, 
  Cpu, 
  Zap,
  Info
} from 'lucide-react';

interface HybridRagInspectorProps {
  ragResult: RagSearchResult;
  onOpenLab?: () => void;
}

export const HybridRagInspector: React.FC<HybridRagInspectorProps> = ({ ragResult, onOpenLab }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedChunkIdx, setSelectedChunkIdx] = useState<number>(0);

  if (!ragResult || !ragResult.retrievedChunks || ragResult.retrievedChunks.length === 0) {
    return null;
  }

  const topChunk = ragResult.retrievedChunks[0];

  return (
    <div className="mt-3.5 border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-slate-50 to-emerald-50/40 rounded-2xl p-3 text-right text-xs shadow-xs transition-all">
      {/* Header Toggle Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 font-black text-slate-800 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Database className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs">سند الاسترجاع الهجين (Hybrid RAG)</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 font-bold text-[10px]">
            <Zap className="w-3 h-3 text-emerald-600" />
            {ragResult.latencyMs} مللي ثانية
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 font-bold text-[10px]">
            <Sparkles className="w-3 h-3 text-amber-600" />
            دقة المطابقة: {topChunk.confidencePercent}%
          </span>
        </div>

        {onOpenLab && (
          <button
            type="button"
            onClick={onOpenLab}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-emerald-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            title="فتح مختبر ومحلل محرك الاسترجاع الهجين"
          >
            <Sliders className="w-3 h-3 text-emerald-600" />
            <span>فحص المتجهات والـ BM25</span>
          </button>
        )}
      </div>

      {/* Collapsed Brief Highlight */}
      {!isExpanded && (
        <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-slate-800">أقوى سند مسترجع:</span>
          <span className="text-emerald-900 font-bold underline decoration-emerald-300">
            {topChunk.chunk.referenceNumber} - {topChunk.chunk.title}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500 font-medium">
            (BM25: {topChunk.bm25Score} + Cosine: {topChunk.semanticCosineScore} + تعزيز: {topChunk.metadataBoost})
          </span>
        </div>
      )}

      {/* Expanded Deep Inspection View */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3">
          {/* Query Tokens */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-700">كلمات الاستعلام المعالجة عربياً:</span>
            {ragResult.normalizedQueryTokens.map((tok, idx) => (
              <span key={idx} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] text-slate-700 font-mono">
                {tok}
              </span>
            ))}
          </div>

          {/* Retrieved Chunks Tabs */}
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {ragResult.retrievedChunks.map((chunkResult, idx) => (
                <button
                  key={chunkResult.chunk.id}
                  type="button"
                  onClick={() => setSelectedChunkIdx(idx)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all text-right whitespace-nowrap cursor-pointer border ${
                    selectedChunkIdx === idx
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="ml-1 opacity-75">#{chunkResult.finalRank}</span>
                  {chunkResult.chunk.referenceNumber}
                </button>
              ))}
            </div>

            {/* Selected Chunk Deep Dive */}
            {ragResult.retrievedChunks[selectedChunkIdx] && (
              <SelectedChunkCard chunkResult={ragResult.retrievedChunks[selectedChunkIdx]} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SelectedChunkCard: React.FC<{ chunkResult: RagRetrievedChunk }> = ({ chunkResult }) => {
  const { chunk, bm25Score, bm25Rank, semanticCosineScore, semanticRank, metadataBoost, boostReasons, rerankScore, confidencePercent } = chunkResult;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2.5">
      {/* Title & Metadata */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{chunk.title}</span>
          </h4>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {chunk.referenceNumber} • {chunk.gazetteIssue || 'الجريدة الرسمية'} • تصنيف: {chunk.category}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-[11px]">
            ثقة إعادة الترتيب: {confidencePercent}%
          </span>
        </div>
      </div>

      {/* Multimodal Metric Scores Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
        {/* BM25 Sparse */}
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center text-slate-500 font-bold">
            <span>BM25 Sparse</span>
            <span className="text-emerald-700">ترتيب #{bm25Rank}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-sm font-black text-slate-900">{bm25Score}</span>
            <span className="text-[9px] text-slate-400">/ 1.0</span>
          </div>
          <div className="w-full bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, bm25Score * 100)}%` }} />
          </div>
        </div>

        {/* Dense Cosine Similarity */}
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center text-slate-500 font-bold">
            <span>Cosine Similarity</span>
            <span className="text-emerald-700">ترتيب #{semanticRank}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-sm font-black text-slate-900">{semanticCosineScore}</span>
            <span className="text-[9px] text-slate-400">/ 1.0</span>
          </div>
          <div className="w-full bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, semanticCosineScore * 100)}%` }} />
          </div>
        </div>

        {/* Metadata Boost */}
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center text-slate-500 font-bold">
            <span>تعزيز البيانات (Boost)</span>
            <span className="text-purple-700 font-black">+{metadataBoost}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-sm font-black text-purple-900">{metadataBoost}</span>
            <span className="text-[9px] text-slate-400">/ 0.5</span>
          </div>
          <div className="w-full bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, (metadataBoost / 0.5) * 100)}%` }} />
          </div>
        </div>

        {/* Final Rerank Score */}
        <div className="p-2 bg-emerald-50/70 rounded-lg border border-emerald-200">
          <div className="flex justify-between items-center text-emerald-800 font-bold">
            <span>إعادة الترتيب (RRF)</span>
            <span className="text-emerald-800 font-black">نهائي</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-sm font-black text-emerald-900">{rerankScore}</span>
            <span className="text-[9px] text-emerald-600">/ 1.0</span>
          </div>
          <div className="w-full bg-emerald-200 h-1 rounded-full mt-1 overflow-hidden">
            <div className="bg-emerald-700 h-full rounded-full" style={{ width: `${Math.min(100, rerankScore * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Boost Reasons */}
      {boostReasons.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-purple-900 bg-purple-50/60 p-1.5 rounded-lg border border-purple-100">
          <span className="font-bold">أسباب التعزيز:</span>
          {boostReasons.map((reason, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-purple-200">
              <CheckCircle2 className="w-2.5 h-2.5 text-purple-600" />
              {reason}
            </span>
          ))}
        </div>
      )}

      {/* Verbatim Content Excerpt */}
      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] leading-relaxed text-slate-700">
        <p className="font-medium">{chunk.content}</p>
      </div>
    </div>
  );
};
