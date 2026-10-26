import React from 'react';
import { CircleCheck } from 'lucide-react';
import { estimatedSeparateToolValueAud, pricingComparisonRows } from '@/content/pricingComparison';
import { formatPublicPricingPrice } from '@/lib/liveCurrencyPricing';
import { PACKAGE_PRICES_AUD } from '@/lib/packagePricing';

const aud = (value: number) =>
  `A$${new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(value)}`;

const comparisonPriceLabel = 'Estimated $149 - $299';

export const PricingValueComparison: React.FC = () => {
  const weddingWaitressPrice = formatPublicPricingPrice('AUD', PACKAGE_PRICES_AUD.essential);
  let lastCategory = '';

  return (
    <section className="ww-section bg-[#fffdf9]" aria-labelledby="platform-value-heading">
      <div className="ww-container">
        <header className="mx-auto max-w-4xl text-center">
          <p className="ww-eyebrow">The complete platform value</p>
          <h2 id="platform-value-heading" className="ww-title mt-3">
            One connected platform instead of a dozen separate tools
          </h2>
          <p className="ww-lead mt-5">
            Wedding Waitress brings your planning, guest experience, stationery, seating,
            event-day coordination and shared memories together. See what comparable standalone
            tools and services may cost when purchased separately.
          </p>
          <p className="ww-lead mx-auto mt-6 max-w-4xl rounded-xl border border-[#d7b985]/65 bg-[#f6efe5] px-5 py-4 font-semibold text-[#412419]">
            More tools included. More value in one plan. See how Wedding Waitress compares with
            buying separate tools below.
          </p>
        </header>
        <p className="mt-10 text-sm text-[#6f625b] md:hidden">
          Comparison details are shown as stacked cards for easier reading.
        </p>
      </div>

      <div
        className="mx-auto mt-5 hidden overflow-x-auto overflow-y-hidden rounded-2xl border border-[#d7b985]/65 bg-white shadow-[0_8px_35px_rgba(43,23,17,.08)] md:block"
        style={{ width: 'calc(100% - 2rem)', maxWidth: '1020px' }}
        aria-label="Pricing comparison table"
      >
        <table className="w-full table-fixed border-collapse text-left text-[13px] leading-[18px]">
          <caption className="sr-only">
            Comparison of Wedding Waitress capabilities with estimated separate tools
          </caption>
          <thead data-solid-text-surface="dark" className="bg-[#412419] text-[#fff8ee]">
            <tr>
              <th scope="col" className="w-[46%] px-4 py-4 font-semibold">Planning Tools</th>
              <th scope="col" className="w-[27%] border-l border-[#d7b985]/30 px-4 py-4 font-semibold">Other Online Tools \ Average Prices</th>
              <th scope="col" className="w-[27%] border-l border-[#d7b985]/30 px-4 py-4 font-semibold">
                Included in Wedding Waitress
              </th>
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
                        {row.category}
                      </th>
                    </tr>
                  )}
                  <tr className="border-b border-[#e7d8c7]/75 align-top">
                    <th
                      scope="row"
                      className={`px-4 py-3.5 font-medium text-[#412419] ${row.indent ? 'pl-8' : ''}`}
                    >
                      {row.indent && <span aria-hidden="true" className="mr-2 text-[#a88558]">↳</span>}
                      {row.product}
                      <span className="mt-1 block font-normal text-[#6f625b]">{row.replaces}</span>
                    </th>
                    <td className="border-l border-[#e7d8c7]/60 px-4 py-3.5 text-[#412419]">{comparisonPriceLabel}</td>
                    <td className="border-l border-[#e7d8c7]/60 px-4 py-3.5">
                      <span className="inline-flex items-center gap-2 font-semibold text-[#412419]">
                        <CircleCheck size={16} strokeWidth={1.8} aria-hidden="true" />
                        Included
                      </span>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
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
                {row.category}
              </p>
              <h3 className="mt-2 text-base font-semibold text-[#412419]">{row.product}</h3>
              <dl className="mt-4 grid gap-3 text-[13px] leading-[18px]">
                <div>
                  <dt className="font-semibold text-[#412419]">What it replaces</dt>
                  <dd className="mt-1 text-[#6f625b]">{row.replaces}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#412419]">Estimated separate cost</dt>
                  <dd className="mt-1 text-[#6f625b]">{comparisonPriceLabel}</dd>
                </div>
              </dl>
              <p className="mt-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#412419]">
                <CircleCheck size={16} strokeWidth={1.8} aria-hidden="true" />
                Included with Wedding Waitress
              </p>
            </article>
          ))}
        </div>

        <p className="mt-5 text-sm leading-6 text-[#6f625b]">
          Estimated separate costs illustrate the potential value of purchasing comparable tools
          individually. Actual provider prices, features and inclusions may vary.
        </p>

        <div className="mt-8 grid overflow-hidden rounded-2xl border border-[#d7b985]/70 shadow-[0_8px_32px_rgba(43,23,17,.10)] lg:grid-cols-2">
          <div className="bg-[#f6efe5] p-7 md:p-9">
            <h3 className="text-2xl font-semibold text-[#412419]">Estimated separate-tool value</h3>
            <p className="mt-3 text-4xl font-bold text-[#412419]">
              {aud(estimatedSeparateToolValueAud)}+
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#6f625b]">
              Automatically calculated from the 15 main product estimates above. Bundled
              subfeatures are not counted again.
            </p>
          </div>
          <div data-pricing-dark-surface="wedding-waitress-value" data-solid-text-surface="dark" className="ww-public-dashboard-background p-7 text-[#fff8ee] md:p-9">
            <h3 className="text-2xl font-semibold !text-[#fff8ee]">
              Wedding Waitress from {weddingWaitressPrice}
            </h3>
            <p className="mt-3 font-semibold text-[#ead5b7]">
              One event · 12 months of access · Complete platform included
            </p>
            <p className="mt-4 text-sm leading-6 text-[#fff8ee]">
              Planning and download access ends when the paid period expires. Your saved information remains retained. Renewal requires your explicit package selection and a successful, verified payment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
