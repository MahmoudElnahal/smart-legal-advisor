import React from 'react';
import { Scale, CheckCircle2, ShieldCheck, AlertCircle, Bookmark, FileText } from 'lucide-react';

interface LegalMessageRendererProps {
  content: string;
  isModel?: boolean;
}

// Parses inline bold **text** and highlights legal articles
export const renderInlineFormattedText = (text: string) => {
  // Regex to match **bold**
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const innerText = part.slice(2, -2);
      
      // If it's a legal article reference like المادة (12)
      if (/المادة\s*\(?\d+\)?|قانون\s*(\d+|العمل)|قرار\s*وزاري/i.test(innerText)) {
        return (
          <span 
            key={index} 
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-[#700000]/10 text-[#700000] font-black border border-[#C5A059]/40 shadow-xs"
          >
            <Scale className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
            <span>{innerText}</span>
          </span>
        );
      }

      return (
        <strong key={index} className="font-black text-slate-900 mx-0.5">
          {innerText}
        </strong>
      );
    }

    // Replace standalone article patterns in normal text
    const subParts = part.split(/(المادة\s*\(\d+\)|المادة\s*\d+|قانون العمل الجديد رقم 14 لسنة 2025|الوقائع المصرية)/g);
    if (subParts.length > 1) {
      return (
        <React.Fragment key={index}>
          {subParts.map((sub, sIdx) => {
            if (/المادة\s*\(\d+\)|المادة\s*\d+|قانون العمل الجديد رقم 14 لسنة 2025|الوقائع المصرية/.test(sub)) {
              return (
                <span 
                  key={sIdx} 
                  className="font-bold text-[#700000] bg-[#C5A059]/15 px-1.5 py-0.5 rounded border border-[#C5A059]/30"
                >
                  {sub}
                </span>
              );
            }
            return sub;
          })}
        </React.Fragment>
      );
    }

    return part;
  });
};

export const LegalMessageRenderer: React.FC<LegalMessageRendererProps> = ({ content, isModel = true }) => {
  if (!isModel) {
    return (
      <div className="text-white text-base leading-relaxed font-medium whitespace-pre-wrap">
        {content}
      </div>
    );
  }

  // Split into structural blocks by double newline or numbered sections
  const rawParagraphs = content.split(/\n\s*\n/);

  return (
    <div className="space-y-4 text-slate-800 text-[15px] md:text-[15.5px] leading-relaxed font-normal">
      {rawParagraphs.map((paragraph, pIdx) => {
        const trimmed = paragraph.trim();
        if (!trimmed) return null;

        // 1. Check if this block is an "Action/Procedure" block (الإجراء العملي / خطوات الشكوى / لجنة التسوية)
        const isActionCallout = /الإجراء العملي|خطوات الشكوى|الشكوى الرسمية|لجنة التسوية|التوصية القانونية|تنبيه هام|المخالفات والجزاءات/i.test(trimmed);

        if (isActionCallout) {
          return (
            <div 
              key={pIdx} 
              className="bg-gradient-to-l from-[#FFFDF9] via-[#FBF7EE] to-[#F5ECE0] border-r-4 border-[#700000] rounded-2xl p-4 md:p-5 shadow-xs border border-[#E5D7BF] space-y-2 my-3"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-[#E2D1A6]/60">
                <div className="w-8 h-8 rounded-xl bg-[#700000] text-[#E2D1A6] flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-base font-black text-[#700000] tracking-tight">
                  الإجراء القانوني المعتمد لدى وزارة العمل
                </h4>
              </div>
              <div className="text-slate-700 leading-relaxed text-sm md:text-[14.5px] pt-1">
                {renderInlineFormattedText(trimmed.replace(/^(\*\*الإجراء العملي.*?\*\*|\*\*خطوات.*?\*\*):?\s*/i, ''))}
              </div>
            </div>
          );
        }

        // 2. Check if this paragraph contains a numbered clause like: "1. **النسبة المقررة قانوناً:**"
        const numberedMatch = trimmed.match(/^(\d+)[\.\)]\s*(.*)/s);
        if (numberedMatch) {
          const numberStr = numberedMatch[1];
          const clauseBody = numberedMatch[2];

          // Extract title if exists in bold: **عنوان**
          const titleMatch = clauseBody.match(/^\*\*(.*?)\*\*:?\s*(.*)/s);
          const title = titleMatch ? titleMatch[1] : null;
          const bodyText = titleMatch ? titleMatch[2] : clauseBody;

          return (
            <div 
              key={pIdx} 
              className="flex items-start gap-3 bg-white/90 p-3.5 md:p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-[#C5A059]/50 transition-colors"
            >
              {/* Number Badge */}
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#700000] to-[#4A0000] text-[#E2D1A6] font-black text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                {numberStr}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                {title && (
                  <h5 className="font-black text-slate-900 text-sm md:text-[15px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]"></span>
                    <span>{title}</span>
                  </h5>
                )}

                {/* Body of the clause with sub-bullets */}
                <div className="text-slate-700 text-sm md:text-[14.5px] leading-relaxed">
                  {bodyText.split('\n').map((line, lIdx) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) return null;

                    const isBullet = cleanLine.startsWith('-') || cleanLine.startsWith('•');
                    const textOnly = isBullet ? cleanLine.replace(/^[-•]\s*/, '') : cleanLine;

                    return (
                      <div key={lIdx} className={isBullet ? "flex items-start gap-2 mt-1.5 pr-2" : "mt-1"}>
                        {isBullet && (
                          <span className="text-[#C5A059] font-black mt-0.5 select-none shrink-0">•</span>
                        )}
                        <span className="flex-1 leading-relaxed">
                          {renderInlineFormattedText(textOnly)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        // 3. Check if paragraph is list of bullet points
        if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
          const lines = trimmed.split('\n');
          return (
            <div key={pIdx} className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
              {lines.map((line, lIdx) => {
                const clean = line.replace(/^[-•]\s*/, '').trim();
                if (!clean) return null;
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 text-slate-700 text-sm md:text-[14.5px]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{renderInlineFormattedText(clean)}</span>
                  </div>
                );
              })}
            </div>
          );
        }

        // 4. Standard introductory or concluding paragraph
        return (
          <p key={pIdx} className="leading-relaxed">
            {renderInlineFormattedText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};
