import { LegalDocumentChunk } from './types';
import { tokenizeArabic, normalizeArabicText } from './arabicNormalizer';

export interface BM25IndexStats {
  totalDocs: number;
  avgDocLength: number;
  vocabularySize: number;
}

export class ArabicBM25Engine {
  private k1: number;
  private b: number;
  private documents: LegalDocumentChunk[] = [];
  private docLengths: Map<string, number> = new Map();
  private avgDocLength = 0;
  
  // Inverted index: token -> Map<docId, termFrequency>
  private invertedIndex: Map<string, Map<string, number>> = new Map();
  // Document frequencies: token -> count of docs containing token
  private docFrequencies: Map<string, number> = new Map();
  // Pre-calculated IDF cache
  private idfCache: Map<string, number> = new Map();

  constructor(k1 = 1.25, b = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  /**
   * Builds the inverted index over the local dataset
   */
  public buildIndex(corpus: LegalDocumentChunk[]) {
    this.documents = corpus;
    this.docLengths.clear();
    this.invertedIndex.clear();
    this.docFrequencies.clear();
    this.idfCache.clear();

    let totalTokens = 0;

    corpus.forEach(doc => {
      // Index title, reference, category, key terms, and main content
      const compositeText = `${doc.title} ${doc.referenceNumber} ${doc.category} ${doc.keyTerms.join(' ')} ${doc.content}`;
      const tokens = tokenizeArabic(compositeText, true);
      
      const docLen = tokens.length;
      this.docLengths.set(doc.id, docLen);
      totalTokens += docLen;

      // Count term frequencies for this document
      const termCounts = new Map<string, number>();
      tokens.forEach(tok => {
        termCounts.set(tok, (termCounts.get(tok) || 0) + 1);
      });

      // Update inverted index and document frequencies
      termCounts.forEach((tf, tok) => {
        if (!this.invertedIndex.has(tok)) {
          this.invertedIndex.set(tok, new Map());
        }
        this.invertedIndex.get(tok)!.set(doc.id, tf);
        this.docFrequencies.set(tok, (this.docFrequencies.get(tok) || 0) + 1);
      });
    });

    this.avgDocLength = corpus.length > 0 ? totalTokens / corpus.length : 1;

    // Pre-calculate Robertson-Spärck Jones IDF
    const N = corpus.length;
    this.docFrequencies.forEach((df, term) => {
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      this.idfCache.set(term, Math.max(0.1, idf));
    });
  }

  /**
   * Computes BM25 sparse scores for all documents in the index for a given query
   * Returns a map of docId -> normalized BM25 score in range [0, 1]
   */
  public scoreQuery(query: string): Map<string, number> {
    const rawScores = new Map<string, number>();
    const queryTokens = tokenizeArabic(query, true);

    if (queryTokens.length === 0 || this.documents.length === 0) {
      return rawScores;
    }

    const normQuery = normalizeArabicText(query);

    this.documents.forEach(doc => {
      let docScore = 0;
      const docLen = this.docLengths.get(doc.id) || this.avgDocLength;
      const lenNorm = 1 - this.b + this.b * (docLen / this.avgDocLength);

      queryTokens.forEach(term => {
        const idf = this.idfCache.get(term);
        if (!idf) return;

        const tf = this.invertedIndex.get(term)?.get(doc.id) || 0;
        if (tf > 0) {
          const numerator = tf * (this.k1 + 1);
          const denominator = tf + this.k1 * lenNorm;
          docScore += idf * (numerator / denominator);
        }
      });

      // Exact phrase match bonus for legal article / decree identifiers
      const normTitle = normalizeArabicText(doc.title);
      const normRef = normalizeArabicText(doc.referenceNumber);
      if (normTitle.includes(normQuery) || normRef.includes(normQuery)) {
        docScore += 3.0;
      }

      rawScores.set(doc.id, docScore);
    });

    // Normalize scores to [0, 1] for balanced hybrid combination
    let maxScore = 0;
    rawScores.forEach(score => {
      if (score > maxScore) maxScore = score;
    });

    const normalizedScores = new Map<string, number>();
    rawScores.forEach((score, docId) => {
      normalizedScores.set(docId, maxScore > 0 ? score / maxScore : 0);
    });

    return normalizedScores;
  }

  public getStats(): BM25IndexStats {
    return {
      totalDocs: this.documents.length,
      avgDocLength: Math.round(this.avgDocLength * 10) / 10,
      vocabularySize: this.invertedIndex.size
    };
  }
}
