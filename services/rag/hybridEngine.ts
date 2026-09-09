import { LegalDocumentChunk, RagSearchParams, RagSearchResult, RagRetrievedChunk } from './types';
import { LOCAL_LEGAL_DATASET } from './dataset';
import { ArabicBM25Engine } from './bm25';
import { cosineSimilarity, generateLocalSemanticEmbedding } from './embeddings';
import { calculateMetadataBoost } from './metadataBooster';
import { rerankCandidates, CandidateScore } from './reranker';
import { tokenizeArabic } from './arabicNormalizer';

export class HybridRagEngine {
  private corpus: LegalDocumentChunk[] = [];
  private bm25: ArabicBM25Engine;
  private isInitialized = false;

  constructor() {
    this.bm25 = new ArabicBM25Engine(1.25, 0.75);
    this.initialize();
  }

  private initialize() {
    this.corpus = LOCAL_LEGAL_DATASET;
    this.bm25.buildIndex(this.corpus);
    this.isInitialized = true;
  }

  /**
   * Primary Hybrid Retrieval Pipeline:
   * BM25 + Arabic Semantic Embeddings + Cosine Similarity + Metadata Boosting + Reranking
   */
  public async retrieve(query: string, params?: RagSearchParams): Promise<RagSearchResult> {
    const startTime = performance.now();
    const topK = params?.topK || 3;
    const alpha = params?.alpha ?? 0.45; // 0.45 BM25, 0.55 Semantic
    const minConfidence = params?.minConfidenceThreshold || 50;

    if (!this.isInitialized) {
      this.initialize();
    }

    const queryTokens = tokenizeArabic(query, true);

    // 1. Sparse Retrieval: Okapi BM25 scores
    const bm25ScoreMap = this.bm25.scoreQuery(query);

    // 2. Dense Semantic Retrieval: Arabic query embedding + Cosine Similarity
    const queryEmbedding = generateLocalSemanticEmbedding(query);
    const semanticScores = new Map<string, number>();

    this.corpus.forEach(doc => {
      const sim = cosineSimilarity(queryEmbedding, doc.embedding);
      // Map [-1, 1] to [0, 1] for clean fusion
      const normalizedSim = Math.max(0, (sim + 1) / 2);
      semanticScores.set(doc.id, normalizedSim);
    });

    // 3. Compute Ranks for BM25 and Semantic Retrieval
    const sortedBm25 = [...this.corpus].sort((a, b) => (bm25ScoreMap.get(b.id) || 0) - (bm25ScoreMap.get(a.id) || 0));
    const bm25RankMap = new Map<string, number>();
    sortedBm25.forEach((doc, idx) => bm25RankMap.set(doc.id, idx + 1));

    const sortedSemantic = [...this.corpus].sort((a, b) => (semanticScores.get(b.id) || 0) - (semanticScores.get(a.id) || 0));
    const semanticRankMap = new Map<string, number>();
    sortedSemantic.forEach((doc, idx) => semanticRankMap.set(doc.id, idx + 1));

    // 4. Metadata Boosting & Hybrid Score Combination
    const candidates: CandidateScore[] = this.corpus.map(doc => {
      const bm25Score = bm25ScoreMap.get(doc.id) || 0;
      const bm25Rank = bm25RankMap.get(doc.id) || this.corpus.length;
      const semanticScore = semanticScores.get(doc.id) || 0;
      const semanticRank = semanticRankMap.get(doc.id) || this.corpus.length;

      // Metadata boost (Article match, Decree match, Category match, Recency)
      const { totalBoost, reasons } = calculateMetadataBoost(doc, query);

      // Weighted linear combination
      const hybridRawScore = (alpha * bm25Score) + ((1 - alpha) * semanticScore) + totalBoost;

      return {
        chunk: doc,
        bm25Score,
        bm25Rank,
        semanticCosineScore: semanticScore,
        semanticRank,
        metadataBoost: totalBoost,
        boostReasons: reasons,
        hybridRawScore
      };
    });

    // Filter top candidates for reranking
    candidates.sort((a, b) => b.hybridRawScore - a.hybridRawScore);
    const topCandidates = candidates.slice(0, Math.max(topK * 2, 6));

    // 5. Cross-Scoring Reranking Stage
    const rerankedResults = rerankCandidates(topCandidates, query, topK);
    const filteredResults = rerankedResults.filter(r => r.confidencePercent >= minConfidence);

    const finalResults = filteredResults.length > 0 ? filteredResults : rerankedResults.slice(0, 1);

    // 6. Assembled Context for LLM Injection
    const contextLines = finalResults.map(r => {
      return `[سند تشريعي: ${r.chunk.referenceNumber} - ${r.chunk.title}]\nالمرجعية الرسمية: ${r.chunk.gazetteIssue || 'الجريدة الرسمية'}\nالتصنيف: ${r.chunk.category}\nالنص الرسمي:\n${r.chunk.content}\n`;
    });
    const assembledContext = contextLines.join('\n---\n');

    // 7. Deduplicated Legal Citations
    const legalCitations = Array.from(new Set(finalResults.map(r => r.chunk.referenceNumber)));

    const endTime = performance.now();
    const latencyMs = Math.round((endTime - startTime) * 10) / 10;

    return {
      query,
      normalizedQueryTokens: queryTokens,
      retrievedChunks: finalResults,
      assembledContext,
      legalCitations,
      latencyMs,
      mode: 'hybrid'
    };
  }

  public getCorpusStats() {
    return {
      totalDocuments: this.corpus.length,
      bm25Stats: this.bm25.getStats()
    };
  }
}

// Global Singleton Instance for fast in-memory query serving
export const hybridRagEngine = new HybridRagEngine();
