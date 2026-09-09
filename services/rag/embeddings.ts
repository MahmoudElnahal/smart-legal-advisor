import { normalizeArabicText, tokenizeArabic } from './arabicNormalizer';

export const EMBEDDING_DIMENSION = 128;

// Top legal domain concept anchor clusters for high-precision semantic projection
export const LEGAL_SEMANTIC_ANCHORS: { name: string; terms: string[] }[] = [
  { name: 'bonus_wages', terms: ['علاوه', 'دوريه', 'اجر', 'تاميني', 'اشتراك', '3%', 'ماده 12', 'زياده', 'استحقاق', 'حد ادني'] },
  { name: 'nurseries', terms: ['حضانه', 'اطفال', '100 عامله', 'قرار 48', 'رضع', 'اشتراك', '4%', '3%', '2%', 'تضامن', 'دار'] },
  { name: 'hazardous_remote', terms: ['اعمال خطره', 'صعبه', 'قرار 49', 'اجازه 7 ايام', 'مناطق نائيه', 'صناعات كيميائيه', 'بترول', 'مطاحن', 'تعدين', 'غاز'] },
  { name: 'child_labor', terms: ['تشغيل اطفال', 'قرار 50', '15 سنه', '14 سنه', 'وجبه صحيه', 'مجانيه', 'اوزان حمل', '10 كجم', '7 كجم', 'حظر ليلي'] },
  { name: 'investigation_deductions', terms: ['تحقيق', 'جزاءات', 'قرار 162', 'خصم 5 ايام', '7 ايام', '3 اشهر', 'استقاله حكميه', '20 يوم', '10 ايام', 'انقطاع'] },
  { name: 'liquidation_lien', terms: ['تصفيه', 'امتياز ممتاز', 'قرار 259', 'ديون عمال', 'جدوله سنه', 'مديريه', 'تفليسه', 'مصفي', 'اغلاق', 'حقوق'] },
  { name: 'legal_aid_exemption', terms: ['قرار 4693', 'مساعده قانونيه', 'محاكم ابتدائيه', 'اعفاء قضائي', 'رسوم', 'دمغه', 'نفاذ معجل', 'محامي', 'دعوي'] },
  { name: 'amicable_settlement', terms: ['لجنه تسويه', 'ماده 149', 'قرار 299', '21 يوم', 'سند تنفيذي', 'نزاع فردي', 'توفيق', 'صلح'] },
  { name: 'working_hours_overtime', terms: ['ساعات عمل', 'ماده 121', 'قرار 291', '8 ساعات', '48 ساعه', 'اضافي', '35%', '70%', 'عطله', 'راحه اسبوعيه'] },
  { name: 'leave_vacations', terms: ['اجازات سنويه', 'ماده 124', '15 يوم', '21 يوم', '30 يوم', '45 يوم', 'خمسين سنه', '10 سنوات', 'حج', 'اعياد'] },
  { name: 'probation_contract', terms: ['عقد عمل', 'ماده 90', 'فتره اختبار', '3 اشهر', 'تكرار', '4 نسخ', 'تضامن سلف وخلف'] },
  { name: 'disabled_quota', terms: ['ذوي اعاقه', 'اقزام', 'قرار 271', 'نسبه 5%', 'سجل الزامي', 'تاهيل', 'بطاقه اثبات'] },
  { name: 'recruitment_agencies', terms: ['الحاق عماله', 'قرار 272', 'حظر عموله', '1% صاحب عمل', 'ترخيص', 'سماسره'] },
  { name: 'skills_licensing', terms: ['قياس مستوي مهاره', 'قرار 266', '435 مهنه', 'ترخيص مزاوله حرفه', 'مستويات خمسه'] },
  { name: 'general_penalties', terms: ['غرامات', 'حبس', 'سخره', 'تحرش', 'تنمر', 'تمييز', 'بطلان استماره 6', 'محكمه عماليه'] },
  { name: 'hotline_procedures', terms: ['19468', 'شكوي', 'مكتب عمل', 'تفتيش', 'وزاره العمل', 'خط ساخن', 'اجراء عملي'] }
];

/**
 * Calculates Cosine Similarity between two numerical vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  
  // Clamp between -1 and 1
  return Math.max(-1, Math.min(1, similarity));
}

/**
 * Normalizes a vector to unit length (L2 norm)
 */
export function l2Normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec.map(() => 0);
  return vec.map(v => v / norm);
}

/**
 * Generates high-dimensional semantic embedding locally using legal concept anchors + subword hashing.
 * 100% deterministic, ultra-fast (<1ms), and eliminates dependencies on external vector databases.
 */
export function generateLocalSemanticEmbedding(text: string): number[] {
  const normalized = normalizeArabicText(text);
  const tokens = tokenizeArabic(text, true);
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);

  // 1. Concept Cluster Projections (first 64 dimensions)
  LEGAL_SEMANTIC_ANCHORS.forEach((cluster, clusterIdx) => {
    let matchScore = 0;
    cluster.terms.forEach(term => {
      const normTerm = normalizeArabicText(term);
      if (normalized.includes(normTerm)) {
        matchScore += 2.0;
      }
      tokens.forEach(tok => {
        if (tok === normTerm || tok.includes(normTerm) || normTerm.includes(tok)) {
          matchScore += 1.0;
        }
      });
    });

    // Spread across 4 orthogonal dimensions per cluster (16 * 4 = 64 dimensions)
    const baseDim = clusterIdx * 4;
    vector[baseDim] += matchScore * 1.5;
    vector[baseDim + 1] += matchScore * 0.8;
    vector[baseDim + 2] += (matchScore > 0 ? 1.0 : 0);
    vector[baseDim + 3] += (tokens.length > 0 ? matchScore / tokens.length : 0);
  });

  // 2. Character Tri-grams and Subword Projections (remaining 64 dimensions)
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.substring(i, i + 3);
    let hash = 0;
    for (let c = 0; c < trigram.length; c++) {
      hash = (hash * 31 + trigram.charCodeAt(c)) & 0xFFFFFFFF;
    }
    const dim = 64 + (Math.abs(hash) % 64);
    vector[dim] += 1.0;
  }

  // 3. Exact Numeric Signatures (Articles: 12, 90, 149; Decrees: 48, 49, 50, 162, 259, 4693; Years: 2025, 2026)
  const numbers = text.match(/\d+/g) || [];
  numbers.forEach(num => {
    let numHash = 0;
    for (let c = 0; c < num.length; c++) {
      numHash = (numHash * 17 + num.charCodeAt(c)) & 0xFFFFFFFF;
    }
    const dim = Math.abs(numHash) % EMBEDDING_DIMENSION;
    vector[dim] += 3.0; // Strong signal for legal numbers
  });

  return l2Normalize(vector);
}
