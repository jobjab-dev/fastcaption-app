"use client";

import { useState } from "react";
import { useLocale } from "./LocaleProvider";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  /** Number of items to show before "Show more" button. Default: 6 */
  initialCount?: number;
}

export function FAQAccordion({ items, initialCount = 6 }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { isThai } = useLocale();

  const visibleItems = showAll ? items : items.slice(0, initialCount);
  const hasMore = items.length > initialCount;

  return (
    <>
      <div className="faq-grid">
        {visibleItems.map((item, i) => (
          <div
            key={i}
            className={`faq-item${openIndex === i ? " open" : ""}`}
          >
            <button
              className="faq-q"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              aria-expanded={openIndex === i}
            >
              <span>{item.q}</span>
              <svg
                className="faq-chevron"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className="faq-a">
              <p>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
      {hasMore && !showAll && (
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <button
            onClick={() => setShowAll(true)}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "10px 28px",
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            {isThai ? `ดูเพิ่มเติม (${items.length - initialCount})` : `Show more (${items.length - initialCount})`}
          </button>
        </div>
      )}
    </>
  );
}

/** Generate FAQPage JSON-LD for SEO rich snippets */
export function FAQSchema({ items }: FAQAccordionProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
