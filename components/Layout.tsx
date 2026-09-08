import React from 'react';
import { View } from '../types';
import { ShieldCheck, Phone, Scale, Award, FileText } from 'lucide-react';
import { MinistryLogo } from './MinistryLogo';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onViewChange?: (view: View) => void;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Official Government Top Ribbon */}
      <div className="bg-[#190000] text-[#E2D1A6] px-4 py-1.5 text-xs font-semibold border-b border-[#C5A059]/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>البوابة الرقمية الرسمية - جمهورية مصر العربية</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>المرجع التشريعي: قانون 14 لسنة 2025 والوقائع المصرية</span>
            <span className="hidden sm:inline">الخط الساخن الموحد: 19468</span>
          </div>
        </div>
      </div>

      {/* Main Ministerial Header */}
      <header className="royal-gradient text-white shadow-2xl sticky top-0 z-40 border-b border-[#C5A059]/40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            
            {/* Official Ministry of Labour Circular Emblem */}
            <div className="p-1 rounded-full bg-black/20 border border-[#C5A059]/50 shadow-xl hover:scale-105 transition-transform">
              <MinistryLogo className="w-14 h-14 md:w-16 md:h-16" withGlow />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">المستشار القانوني الذكي</h1>
                <span className="bg-[#C5A059] text-[#700000] text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                  وزارة العمل
                </span>
              </div>
              <p className="text-xs text-[#E5C378] font-bold mt-1">
                المنظومة الرقمية الرسمية للاستشارات العمالية والقانونية الفورية
              </p>
            </div>
          </div>
          
          {/* Status & Official Badges */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end text-left bg-black/30 px-4 py-2 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">خدمة الاستشارة المباشرة</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <span className="text-[11px] text-[#C5A059] font-medium">متاحة صوتياً وكتابياً 24/7</span>
            </div>

            <div className="bg-[#C5A059]/20 border border-[#C5A059]/40 text-[#E5C378] px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-inner">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>مطابق للتشريعات 2025/2026</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="flex-grow max-w-7xl mx-auto w-full p-3 sm:p-4 md:p-8">
        {children}
      </main>

      {/* Ministerial Footer */}
      <footer className="bg-[#0b1120] text-slate-300 pt-10 pb-8 border-t-2 border-[#C5A059]/30">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <MinistryLogo className="w-12 h-12" />
              <div>
                <h4 className="text-white font-black text-sm">وزارة العمل</h4>
                <p className="text-[10px] text-[#C5A059]">جمهورية مصر العربية</p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              المنظومة الوطنية للذكاء الاصطناعي السيادي لتقديم المشورة القانونية وتوثيق حقوق أطراف علاقة العمل بكل شفافية ونزاهة.
            </p>
          </div>

          <div>
            <h4 className="text-white font-black text-sm mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#C5A059]" />
              <span>المرجعيات القانونية</span>
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>• قانون العمل الجديد رقم 14 لسنة 2025</li>
              <li>• قرارات الوقائع المصرية 2025 و2026</li>
              <li>• قانون التأمينات الاجتماعية والمعاشات رقم 148</li>
              <li>• معايير العمل الدولية المصدق عليها</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black text-sm mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#C5A059]" />
              <span>خدمة المواطنين والشكاوى</span>
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>• الخط الساخن المباشر: <strong className="text-white font-mono text-sm">19468</strong></li>
              <li>• منظومة الشكاوى الحكومية: <strong className="text-white font-mono text-sm">16528</strong></li>
              <li>• لجان التسوية الودية: بجميع مديريات العمل بالمحافظات</li>
              <li>• البريد الرسمي: support@manpower.gov.eg</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black text-sm mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#C5A059]" />
              <span>التوثيق والاعتماد</span>
            </h4>
            <p className="text-slate-400 leading-relaxed mb-2">
              جميع الإجابات والمكالمات الصوتية موثقة ومعتمدة رقمياً بالاستناد لنصوص المواد والقرارات الوزارية.
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center text-[#E5C378] font-bold">
              نسخة معتمدة للمراجعة والاختبار الوزاري
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2025 - 2026 جميع الحقوق محفوظة - وزارة العمل، جمهورية مصر العربية</p>
          <p className="text-[11px] text-slate-400">نظام المستشار القانوني الذكي - مدعوم بالذكاء الاصطناعي</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
