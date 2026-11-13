"use client";

import { useState } from "react";

/**
 * Pricing grid with Monthly/Yearly switch — the reference wires this with a
 * broken vanilla-JS selector (buttons inert, yearly grid unreachable); here
 * the intended behaviour is implemented with React state. Cards and button
 * styles are verbatim from user/pricing.blade.php (highlighted plan uses the
 * red-500 variant; note the pricing page uses red-500 while the home page
 * uses orange — two accent systems coexist in the reference).
 */

type Plan = { name: string; price: string; highlight: boolean };

export function PricingPeriodToggle({
  monthlyPlans,
  yearlyPlans,
  features,
}: {
  monthlyPlans: Plan[];
  yearlyPlans: Plan[];
  features: string[];
}) {
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const plans = period === "monthly" ? monthlyPlans : yearlyPlans;

  return (
    <>
      {/* Period Toggle */}
      <div className="flex justify-center gap-2 mb-8">
        <button
          type="button"
          onClick={() => setPeriod("monthly")}
          className={`px-4 py-1 rounded-full ${
            period === "monthly" ? "bg-red-500 text-white" : "text-muted"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setPeriod("yearly")}
          className={`px-4 py-1 rounded-full ${
            period === "yearly" ? "bg-red-500 text-white" : "text-muted"
          }`}
        >
          Yearly
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {plans.map((plan) => (
          <div
            key={`${period}-${plan.name}`}
            className={`border border-line rounded-lg p-6 flex flex-col ${
              plan.highlight ? "bg-red-50 dark:bg-red-500/10" : ""
            }`}
          >
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="mt-4 mb-6">
              <span className="text-2xl font-bold">{plan.price}</span>
            </div>
            <ul className="space-y-3 mb-8 flex-grow">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center text-sm text-muted"
                >
                  {feature}
                </li>
              ))}
            </ul>
            {/* Action Button (inert in the reference) */}
            <button
              type="button"
              className={`rounded-md py-2 transition-colors ${
                plan.highlight
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              }`}
            >
              Activate
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
