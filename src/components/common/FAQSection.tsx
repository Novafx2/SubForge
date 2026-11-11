import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FaqItem } from '../../utils/seoData';

interface FAQSectionProps {
  faqs: FaqItem[];
  title?: string;
  description?: string;
}

export function FAQSection({
  faqs,
  title = 'Frequently Asked Questions',
  description = 'Everything you need to know about this tool and subtitle formatting standards.',
}: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  if (!faqs || faqs.length === 0) return null;

  return (
    <section className="mt-16 pt-12 border-t border-slate-800">
      <div className="max-w-3xl mb-8">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Knowledge Base</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
          {title}
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="rounded-lg border border-slate-800 bg-[#0c1322] overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm font-medium text-slate-200 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                aria-expanded={isOpen}
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-blue-400' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
