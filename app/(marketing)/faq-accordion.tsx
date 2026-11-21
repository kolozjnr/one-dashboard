"use client";

import { useState } from "react";

/**
 * FAQ accordion — ported from the Alpine.js block in welcome.blade.php
 * (`x-data="{ active: 1 }"`): the first item starts open, clicking a
 * question toggles it and rotates the chevron 180°.
 * Copy rewritten for Metrispot's services.
 */

const faqs = [
  {
    id: 1,
    question: "What is Metrispot?",
    answer:
      "Metrispot is a unified analytics platform. Connect your website, social, and advertising accounts once, and every metric lands in a single dashboard — website analytics, audience insights, cross-platform comparisons, and shareable reports, all in one place.",
  },
  {
    id: 2,
    question: "Which data sources can I connect?",
    answer:
      "More than 40 sources out of the box, including websites, Instagram, Facebook, X, LinkedIn, TikTok, YouTube, Slack, Shopify, WordPress, Amazon, and Reddit. Anything else can be pushed in through our API or webhooks.",
  },
  {
    id: 3,
    question: "Do I need to install any code?",
    answer:
      "For websites, add a single lightweight tracking snippet (or use your existing tag manager). For social, ad, and commerce platforms you simply sign in through the secure OAuth prompt — Metrispot handles the sync and backfills your history automatically.",
  },
  {
    id: 4,
    question: "How does the free trial work?",
    answer:
      "Start on the Try Free plan with no credit card required. Connect a source, explore the dashboard, and upgrade whenever you need more data sources, scheduled refreshes, or PDF report exports — your data carries over.",
  },
];

export function FaqAccordion() {
  const [active, setActive] = useState<number | null>(1);

  return (
    <div className="space-y-4">
      {faqs.map((faq) => (
        <div key={faq.id} className="border border-line rounded-lg">
          <button
            type="button"
            onClick={() => setActive(active === faq.id ? null : faq.id)}
            className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <span className="font-medium text-left">{faq.question}</span>
            <svg
              className={`w-5 transform transition-transform duration-200 ${
                active === faq.id ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {active === faq.id && (
            <div className="px-6 pb-4">
              <p className="text-muted">{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
