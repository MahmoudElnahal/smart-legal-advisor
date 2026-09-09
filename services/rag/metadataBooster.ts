import { LegalDocumentChunk } from './types';
import { normalizeArabicText } from './arabicNormalizer';

export interface MetadataBoostResult {
  totalBoost: number;
  reasons: string[];
}

/**
 * Calculates metadata-driven precision boosts for a legal document chunk
 */
export function calculateMetadataBoost(
  doc: LegalDocumentChunk,
  query: string
): MetadataBoostResult {
  let boost = 0;
  const reasons: string[] = [];
  const normQuery = normalizeArabicText(query);
  const normRef = normalizeArabicText(doc.referenceNumber);
  const normTitle = normalizeArabicText(doc.title);
  const normCategory = normalizeArabicText(doc.category);

  // 1. Exact Reference Match (e.g. "المادة 12", "القرار 48", "القرار 162", "259", "4693", "271")
  const extractedNumbers = query.match(/\d+/g) || [];
  for (const num of extractedNumbers) {
    if (doc.referenceNumber.includes(num) || doc.title.includes(num)) {
      boost += 0.35;
      reasons.push(`تطابق صريح للرقم القانوني (${num})`);
      break;
    }
  }

  // Exact reference phrase match
  if (normQuery.includes(normRef) || (normRef.length > 5 && normQuery.includes(normRef.slice(0, 8)))) {
    boost += 0.25;
    reasons.push(`تطابق مرجعية السند القانوني (${doc.referenceNumber})`);
  }

  // 2. Legal Category Affinity
  const categoryKeywords: Record<string, string[]> = {
    'الأجور والعلاوات': ['علاوه', 'اجر', 'تاميني', 'مرتب', 'اشتراك', '3%', 'زياده'],
    'دور الحضانة ورعاية الأمومة': ['حضانه', 'عامله', 'اطفال', 'رضع', '100 عامله', 'اشتراك'],
    'الأعمال الخطرة والإجازات': ['خطره', 'صعبه', 'نائية', 'نائية', 'بترول', 'مطاحن', 'تعدين', '7 ايام'],
    'تشغيل وتدريب الأطفال': ['اطفال', 'طفل', '15 سنه', '14 سنه', 'وجبه', 'اوزان', 'حمل'],
    'التحقيق والجزاءات التأديبية': ['تحقيق', 'جزاء', 'خصم', '5 ايام', 'استقاله حكميه', 'غياب', 'انقطاع'],
    'تصفية المنشآت وحماية الأجور': ['تصفيه', 'امتياز', 'اغلاق', 'تفليسه', 'ديون', 'جدوله'],
    'المساعدة القضائية والتقاضي': ['مساعده قانونيه', 'قضائي', 'رسوم', 'دمغه', 'محاكم', 'دعوي', 'نفاذ معجل'],
    'المنازعات والتسوية الودية': ['تسوية', 'لجنه', 'نزاع', 'سند تنفيذي', 'صلح', 'توفيق', '21 يوم'],
    'عقود العمل وفترة الاختبار': ['عقد عمل', 'فتره اختبار', '3 اشهر', 'تكرار'],
    'تشغيل ذوي الإعاقة والأقزام': ['معاق', 'اعاقه', 'اقزام', '5%', 'سجل'],
    'إلحاق العمالة والتشغيل': ['الحاق عماله', 'عموله', 'سماسره', '1%']
  };

  const matchedKeywords = categoryKeywords[doc.category] || [];
  let categoryMatches = 0;
  matchedKeywords.forEach(kw => {
    if (normQuery.includes(kw)) {
      categoryMatches++;
    }
  });

  if (categoryMatches > 0) {
    const catBoost = Math.min(0.20, categoryMatches * 0.08);
    boost += catBoost;
    reasons.push(`تطابق موضوعي مع تصنيف (${doc.category})`);
  }

  // 3. Key Terms Semantic Intersection
  let keyTermsMatched = 0;
  doc.keyTerms.forEach(term => {
    const normTerm = normalizeArabicText(term);
    if (normQuery.includes(normTerm)) {
      keyTermsMatched++;
    }
  });

  if (keyTermsMatched > 0) {
    const termBoost = Math.min(0.15, keyTermsMatched * 0.05);
    boost += termBoost;
    reasons.push(`تطابق الكلمات المفتاحية التخصصية (${keyTermsMatched})`);
  }

  // 4. Temporal Recency & Legal Hierarchy
  if (doc.year === 2026 && normQuery.includes('2026')) {
    boost += 0.10;
    reasons.push('قرارات حديثة لعام 2026');
  }

  // Cap the boost to max +0.50
  const totalBoost = Math.min(0.50, Math.round(boost * 100) / 100);

  return {
    totalBoost,
    reasons
  };
}
