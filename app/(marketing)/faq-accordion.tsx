"use client";

import { useState } from "react";

/**
 * FAQ accordion — ported from the Alpine.js block in welcome.blade.php
 * (`x-data="{ active: 1 }"`): the first item starts open, clicking a
 * question toggles it and rotates the chevron 180°.
 */

const faqs = [
  {
    id: 1,
    question: "What is Windsor AI?",
    answer:
      "Lorem ipsum dolor sit amet consectetur. Purus sollicitudin pharetra et mauris. Egestas viverra in ut sodales eget nunc. Vitae vel ultrices purus dolor purus vivamus aliquam massa. Ut nam nulla vitae.",
  },
  {
    id: 2,
    question: "What is Windsor AI?",
    answer:
      "Lorem ipsum dolor sit amet consectetur. Purus sollicitudin pharetra et mauris. Egestas viverra in ut sodales eget nunc.",
  },
  {
    id: 3,
    question: "What is Windsor AI?",
    answer:
      "Lorem ipsum dolor sit amet consectetur. Purus sollicitudin pharetra et mauris. Egestas viverra in ut sodales eget nunc.",
  },
  {
    id: 4,
    question: "What is Windsor AI?",
    answer:
      "Lorem ipsum dolor sit amet consectetur. Purus sollicitudin pharetra et mauris. Egestas viverra in ut sodales eget nunc.",
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
