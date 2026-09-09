import { LegalDocumentChunk, RagRetrievedChunk } from './types';
import { tokenizeArabic, normalizeArabicText } from './arabicNormalizer';

export interface CandidateScore {
  chunk: LegalDocumentChunk;
  bm25Score: number;
  bm25Rank: number;
  semanticCosineScore: number;
  semanticRank: number;
  metadataBoost: number;
  boostReasons: string[];
  hybridRawScore: number;
}

/**
 * Production Cross-Scoring Reranker with Reciprocal Rank Fusion (RRF)
 */
export function rerankCandidates(
  candidates: CandidateScore[],
  query: string,
  topK = 4
): RagRetrievedChunk[] {
  const normQuery = normalizeArabicText(query);
  const queryTokens = tokenizeArabic(query, true);

  const rerankedList = candidates.map(cand => {
    // 1. Reciprocal Rank Fusion (RRF with k = 60)
    const rrfBm25 = 1 / (60 + cand.bm25Rank);
    const rrfSemantic = 1 / (60 + cand.semanticRank);
    const rrfScore = (rrfBm25 + rrfSemantic) * 30; // Scaled to ~[0, 1]

    // 2. Query Coverage Ratio (how much of the user's intent is answered by this chunk)
    const docTokens = new Set(tokenizeArabic(cand.chunk.content + ' ' + cand.chunk.title, true));
    let coveredTokens = 0;
    queryTokens.forEach(tok => {
      if (docTokens.has(tok)) coveredTokens++;
    });
    const coverageRatio = queryTokens.length > 0 ? coveredTokens / queryTokens.length : 0;

    // 3. Exact Key Terms Density
    let termDensityBonus = 0;
    cand.chunk.keyTerms.forEach(term => {
      const normTerm = normalizeArabicText(term);
      if (normQuery.includes(normTerm)) {
        termDensityBonus += 0.08;
      }
    });

    // 4. Combined Final Rerank Score
    // Balances Hybrid Raw Score (40%), RRF (25%), Query Coverage (25%), and Term Density (10%)
    const finalRerankScore = Math.min(
      1.0,
      cand.hybridRawScore * 0.40 +
      rrfScore * 0.25 +
      coverageRatio * 0.25 +
      Math.min(0.15, termDensityBonus)
    );

    // Compute intuitive confidence percentage (e.g. 75% - 99%)
    const confidencePercent = Math.min(99, Math.max(50, Math.round(finalRerankScore * 100)));

    return {
      chunk: cand.chunk,
      bm25Score: Math.round(cand.bm25Score * 1000) / 1000,
      bm25Rank: cand.bm25Rank,
      semanticCosineScore: Math.round(cand.semanticCosineScore * 1000) / 1000,
      semanticRank: cand.semanticRank,
      metadataBoost: Math.round(cand.metadataBoost * 1000) / 1000,
      boostReasons: cand.boostReasons,
      hybridRawScore: Math.round(cand.hybridRawScore * 1000) / 1000,
      rerankScore: Math.round(finalRerankScore * 1000) / 1000,
      finalRank: 0, // Will be set after sorting
      confidencePercent
    };
  });

  // Sort descending by final rerank score
  rerankedList.sort((a, b) => b.rerankScore - a.rerankScore);

  // Set final sequential rank
  rerankedList.forEach((item, idx) => {
    item.finalRank = idx + 1;
  });

  return rerankedList.slice(0, topK);
}
