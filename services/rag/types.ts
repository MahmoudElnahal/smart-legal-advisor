export type DocumentType = 
  | 'primary_law'          // قانون العمل رقم 14 لسنة 2025
  | 'ministerial_decree'   // قرارات وزير العمل بالوقائع المصرية
  | 'justice_decree'       // قرارات وزير العدل (مكاتب المساعدة)
  | 'official_guide';      // الدليل الإرشادي والتثقيفي للوزارة

export interface LegalDocumentChunk {
  id: string;
  title: string;
  documentType: DocumentType;
  referenceNumber: string; // e.g. "المادة 12", "القرار 48 لسنة 2026"
  year: number;            // 2025 or 2026
  gazetteIssue?: string;   // e.g. "الوقائع المصرية - العدد 64 تابع"
  category: string;        // e.g. "الأجور والعلاوات", "دور الحضانة", "الأعمال الخطرة"
  content: string;
  keyTerms: string[];
  authorityWeight: number; // 0.8 to 1.0 (Hierarchy of legal authority)
  embedding: number[];     // High-dimensional vector representation
}

export interface RagRetrievedChunk {
  chunk: LegalDocumentChunk;
  bm25Score: number;
  bm25Rank: number;
  semanticCosineScore: number;
  semanticRank: number;
  metadataBoost: number;
  boostReasons: string[];
  hybridRawScore: number;
  rerankScore: number;
  finalRank: number;
  confidencePercent: number;
}

export interface RagSearchParams {
  topK?: number;
  alpha?: number;          // Weight between BM25 (alpha) and Dense Cosine (1 - alpha), default 0.45
  metadataBoostWeight?: number; // default 0.2
  minConfidenceThreshold?: number;
}

export interface RagSearchResult {
  query: string;
  normalizedQueryTokens: string[];
  retrievedChunks: RagRetrievedChunk[];
  assembledContext: string;
  legalCitations: string[];
  latencyMs: number;
  mode: 'hybrid' | 'bm25_only' | 'semantic_only';
}
