import { PublicCopy } from '@/i18n/PublicCopy';
import React from 'react';
import { usePublicCopy } from '@/i18n/usePublicCopy';
import { CircleCheck } from 'lucide-react';
import { estimatedSeparateToolValueAud, pricingComparisonRows } from '@/content/pricingComparison';

const roundedSeparateToolValueAud = Math.floor(estimatedSeparateToolValueAud / 100) * 100;
const separateToolValueLabel = `$${new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(roundedSeparateToolValueAud)} +`;

const ComparisonTotal: React.FC = () => (
  <div data-pricing-comparison-total data-pricing-dark-surface="wedding-waitress-value" data-solid-text-surface="dark" className="ww-public-dashboard-background p-7 text-[#fff8ee] md:p-9">
    <h3 data-comparison-total-heading className="font-semibold !text-[#fff8ee]" style={{ textAlign: 'center', fontSize: 'clamp(1.5rem, 2.1vw, 1.875rem)', lineHeight: 1.35 }}><bdi dir="ltr" style={{ whiteSpace: 'nowrap' }}>{separateToolValueLabel}</bdi>{' '}<PublicCopy text={"In total estimated cost of separate tools."} /></h3>
    <p data-comparison-total-support className="mt-3 !text-[#fff8ee]" style={{ textAlign: 'center', fontSize: 'clamp(1.25rem, 1.7vw, 1.5rem)', lineHeight: 1.5 }}><PublicCopy text={"Plan your wedding or event with all the tools you need for perfect planning on one platform inside Wedding Waitress at one low price."} /></p>
  </div>
);

const comparisonPriceLabel = 'Estimated $149 - $299';

export const PricingValueComparison: React.FC = () => {
  const copy = usePublicCopy();
  let lastCategory = '';

  return (
    <section className="ww-section ww-section-cream" aria-labelledby="platform-value-heading">
      <div className="ww-container">
        <header className="mx-auto max-w-4xl text-center">
          <p className="ww-eyebrow"><PublicCopy text={"The complete platform value"} /></p>
          <h2 id="platform-value-heading" className="ww-title mt-3"><PublicCopy text={"One connected platform instead of a dozen separate tools"} /></h2>
          <p className="ww-lead mt-5"><PublicCopy text={"Wedding Waitress brings your planning, guest experience, stationery, seating, event-day coordination and shared memories together. See what comparable standalone tools and services may cost when purchased separately."} /></p>
          <p className="ww-lead mx-auto mt-6 max-w-4xl rounded-xl border border-[#d7b985]/65 bg-[#f6efe5] px-5 py-4 font-semibold text-[#412419]"><PublicCopy text={"More tools included. More value in one plan. See how Wedding Waitress compares with buying separate tools below."} /></p>
        </header>
        <p className="mt-10 text-sm text-[#6f625b] md:hidden"><PublicCopy text={"Comparison details are shown as stacked cards for easier reading."} /></p>
      </div>

      <div
        className="mx-auto mt-5 hidden overflow-x-auto overflow-y-hidden rounded-2xl border border-[#d7b985]/65 bg-white shadow-[0_8px_35px_rgba(43,23,17,.08)] md:block"
        style={{ width: 'calc(100% - 2rem)', maxWidth: '1020px' }}
        aria-label={copy("Pricing comparison table")}
      >
        <table className="w-full table-fixed border-collapse text-left text-[13px] leading-[18px]">
          <caption className="sr-only"><PublicCopy text={"Comparison of Wedding Waitress capabilities with estimated separate tools"} /></caption>
          <thead data-solid-text-surface="dark" className="bg-[#412419] text-[#fff8ee]">
            <tr>
              <th scope="col" className="w-[46%] px-4 py-4 font-semibold"><PublicCopy text={"Planning Tools"} /></th>
              <th scope="col" className="w-[27%] border-l border-[#d7b985]/30 px-4 py-4 font-semibold"><PublicCopy text={"Other Online Tools \\ Average Prices"} /></th>
              <th scope="col" className="w-[27%] border-l border-[#d7b985]/30 px-4 py-4 font-semibold"><PublicCopy text={"Included in Wedding Waitress"} /></th>
            </tr>
          </thead>
          <tbody>
            {pricingComparisonRows.map((row) => {
              const showCategory = row.category !== lastCategory;
              lastCategory = row.category;
              return (
                <React.Fragment key={`${row.category}-${row.product}`}>
                  {showCategory && (
                    <tr>
                      <th
                        colSpan={3}
                        scope="colgroup"
                        className="border-y border-[#d7b985]/50 bg-[#f6efe5] px-4 py-3 text-xs font-bold uppercase tracking-[.11em] text-[#70452f]"
                      >
                        {copy(row.category).replace(/[-‐‑–—]/g, ' ')}
                      </th>
                    </tr>
                  )}
                  <tr className="border-b border-[#e7d8c7]/75 align-top">
                    <th
                      scope="row"
                      className={`px-4 py-3.5 font-medium text-[#412419] ${row.indent ? 'pl-8' : ''}`}
                    >
                      {row.indent && <span aria-hidden="true" className="mr-2 text-[#a88558]">↳</span>}
                      {copy(row.product).replace(/[-‐‑–—]/g, ' ')}
                      <span className="mt-1 block font-normal text-[#6f625b]">{copy(row.replaces).replace(/[-‐‑–—]/g, ' ')}</span>
                    </th>
                    <td className="border-l border-[#e7d8c7]/60 px-4 py-3.5 text-[#412419]">{row.product==='Photo Group List'?'—':<PublicCopy text={comparisonPriceLabel} />}</td>
                    <td className="border-l border-[#e7d8c7]/60 px-4 py-3.5">
                      <span className="inline-flex items-center gap-2 font-semibold text-[#412419]">
                        <CircleCheck size={16} strokeWidth={1.8} aria-hidden="true" /><PublicCopy text={"Included"} /></span>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot><tr><td colSpan={3} className="p-0"><ComparisonTotal /></td></tr></tfoot>
        </table>
      </div>

      <div className="ww-container">
        <div className="mt-5 grid gap-4 md:hidden">
          {pricingComparisonRows.map((row) => (
            <article
              key={`${row.category}-${row.product}`}
              className={`rounded-2xl border border-[#e7d8c7] bg-white p-5 ${row.indent ? 'ml-4' : ''}`}
            >
              <p className="text-[11px] font-bold uppercase tracking-[.1em] text-[#a88558]">
                {copy(row.category).replace(/[-‐‑–—]/g, ' ')}
              </p>
              <h3 className="mt-2 text-base font-semibold text-[#412419]">{copy(row.product).replace(/[-‐‑–—]/g, ' ')}</h3>
              <dl className="mt-4 grid gap-3 text-[13px] leading-[18px]">
                <div>
                  <dt className="font-semibold text-[#412419]"><PublicCopy text={"What it replaces"} /></dt>
                  <dd className="mt-1 text-[#6f625b]">{copy(row.replaces).replace(/[-‐‑–—]/g, ' ')}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#412419]"><PublicCopy text={"Estimated separate cost"} /></dt>
                  <dd className="mt-1 text-[#6f625b]">{row.product==='Photo Group List'?'—':<PublicCopy text={comparisonPriceLabel} />}</dd>
                </div>
              </dl>
              <p className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#412419]">
                <CircleCheck size={16} strokeWidth={1.8} aria-hidden="true" /><PublicCopy text={"Included with Wedding Waitress"} /></p>
            </article>
          ))}
        </div>
        <div className="md:hidden"><ComparisonTotal /></div>

        <p className="mt-5 text-sm leading-6 text-[#6f625b]"><PublicCopy text={"Estimated separate costs illustrate the potential value of purchasing comparable tools individually. Actual provider prices, features and inclusions may vary."} /></p>


      </div>
    </section>
  );
};
