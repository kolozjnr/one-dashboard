import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { PricingPeriodToggle } from "./pricing-period-toggle";

export const metadata: Metadata = {
  // Reference quirk kept: pricing.blade.php sets @section('title', 'Feature'),
  // so the tab reads "Feature" in the original app too.
  title: "Feature",
};

/**
 * Pricing page — ported from user/pricing.blade.php.
 *
 * Two documented reference defects repaired here:
 * 1. The Blade file renders TWO identical #monthly-plans grids (lines 18-94
 *    and 97-174) — only one is rendered.
 * 2. The vanilla-JS toggle binds via `document.querySelector('button:first-of-type')`,
 *    which resolves to the nav hamburger, so the Monthly/Yearly buttons never
 *    work and the yearly grid is unreachable. The toggle is wired properly
 *    here (initial state: Monthly, matching the reference's static classes).
 *
 * Content (prices, features, plan names incl. the yearly "Gold" plan) is
 * verbatim.
 */

const features = [
  "• 1 user",
  "• 1 data source",
  "• 1 account",
  "• 5 DB destination",
  "• No DB restoration backfile",
  "• Daily DB refresh",
];

const monthlyPlans = [
  { name: "Try Free", price: "$ 0.00", highlight: false },
  { name: "Basic Plan", price: "$ 50.00", highlight: true },
  { name: "Professional", price: "$ 120.00", highlight: false },
  { name: "VIP", price: "$ 150.00", highlight: false },
];

const yearlyPlans = [
  { name: "Try Free", price: "$ 0.00", highlight: false },
  { name: "Gold", price: "$ 150.00", highlight: true },
  { name: "Professional", price: "$ 120.00", highlight: false },
  { name: "VIP", price: "$ 150.00", highlight: false },
];

export default function PricingPage() {
  return (
    <>
      <PageHero />

      <div className="container mx-auto px-4 py-8">
        {/* Period toggle (working here — see defect note above) */}
        <PricingPeriodToggle monthlyPlans={monthlyPlans} yearlyPlans={yearlyPlans} features={features} />
      </div>
    </>
  );
}
