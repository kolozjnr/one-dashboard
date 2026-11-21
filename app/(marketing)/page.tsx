import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "./faq-accordion";

export const metadata: Metadata = {
  title: "Home | Metrispot",
};

const plans = [
  {
    name: "Try Free",
    price: "$ 0.00",
    buttonClass: "border border-line-strong text-gray-700 dark:text-gray-300",
    bgClass: "bg-surface",
  },
  {
    name: "Basic Plan",
    price: "$ 50.00",
    buttonClass: "bg-orange-500 text-white",
    bgClass: "bg-pink-50 dark:bg-pink-500/10",
  },
  {
    name: "Professional",
    price: "$ 120.00",
    buttonClass: "border border-line-strong text-gray-700 dark:text-gray-300",
    bgClass: "bg-surface",
  },
  {
    name: "VIP",
    price: "$ 150.00",
    buttonClass: "border border-line-strong text-gray-700 dark:text-gray-300",
    bgClass: "bg-surface",
  },
];

const planFeatures = [
  "1 user",
  "1 data source",
  "1 account",
  "5 GB destination",
  "Daily DB refresh",
  "Standard reports",
];

const testimonials = [
  {
    text: "We connected our website, Instagram, and ad accounts in an afternoon. The Compare view alone saved our team the weekly spreadsheet ritual — every platform side by side, same date range.",
    name: "Amara Okafor",
    position: "Head of Growth, Lumen Retail",
    initials: "AO",
  },
  {
    text: "Audience Insights shows us which sources actually bring engaged readers, not just clicks. We moved budget based on it and cost per acquisition dropped within a month.",
    name: "Daniel Reyes",
    position: "Marketing Lead, Northwind Studio",
    initials: "DR",
  },
  {
    text: "Reports go straight to the stakeholders who need them — executive summary, key metrics, charts, tables. What used to take a Monday morning now takes one click.",
    name: "Priya Nair",
    position: "Analytics Manager, Cove Media",
    initials: "PN",
  },
];

/**
 * Home page for Metrispot.
 * Structure kept from the original port (hero + floating stat cards, stats
 * row, feature cards, ROI split, integrations, pricing, testimonials, FAQ);
 * all copy rewritten to describe the dashboard's actual services:
 * data sources/connections, website analytics, audience insights,
 * compare, reports, and performance.
 * CTA buttons are wired to real routes (/register, /feature, /pricing).
 */
export default function HomePage() {
  return (
    <>
      {/*- Hero (reference: @section('hero') — outside the content wrapper) */}
      <section className="relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center relative">
          {/* Decorative Wand - Hidden on small screens */}
          <div className="hidden md:block absolute left-4 top-0">
            <div className="relative">
              <div className="w-12 h-20 bg-[#FF5C71] rounded-full rotate-[-35deg]"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFB443] rounded-full"></div>
            </div>
          </div>

          {/* Hero Headline - Adjusted for mobile readability */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2D2F6D] dark:text-white leading-tight">
            Every source you use, one{" "}
            <span className="text-[#FF5C39]">dashboard</span>
            <br className="hidden md:block" /> you{" "}
            <span className="text-[#FF5C39]">control</span>
          </h1>

          {/* Subheadline - Responsive width and padding */}
          <p className="mt-4 md:mt-6 text-faint max-w-xl lg:max-w-2xl mx-auto text-base md:text-lg px-4">
            Metrispot connects your website, social, and advertising data in
            one place — then turns it into analytics, audience insights,
            cross-platform comparisons, and reports your whole team can read.
          </p>

          {/* Call to Action Buttons */}
          <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-[#FF5C39] text-white px-4 md:px-6 py-2 md:py-3 rounded-md inline-flex items-center hover:bg-brand-hover transition duration-200"
            >
              Start Free Trial
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
            <Link
              href="/feature"
              className="px-4 md:px-6 py-2 md:py-3 rounded-md inline-flex items-center border border-line-strong text-gray-700 dark:text-gray-300 hover:bg-surface transition duration-200"
            >
              Explore Features
            </Link>
          </div>

          {/* Stats Section - Responsive Layout */}
          <div className="mt-12 md:mt-20 flex flex-col md:flex-row justify-center md:space-x-8 items-center md:items-start">
            {/* Total Subscribe Card - Responsive Positioning */}
            <div className="hidden md:block bg-surface p-6 rounded-2xl shadow-xs w-64 -mt-24">
              <div className="flex items-center space-x-3">
                <div>
                  <img
                    src="/images/slack.png"
                    className="rounded-sm h-24 -ml-20"
                    alt="Slack logo"
                  />
                </div>
              </div>
            </div>

            {/* Cards Container - Responsive Flex and Wrapping */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-6 md:mt-0">
              {/* Engagement Card */}
              <div className="bg-surface p-6 rounded-2xl shadow-xs w-64">
                <div className="flex items-center space-x-3 py-12">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#FF5C39]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M10 18l-1.45-1.32C3.4 12.36 0 9.28 0 5.5 0 2.42 2.42 0 5.5 0c1.74 0 3.41.81 4.5 2.09C11.09.81 12.76 0 14.5 0 17.58 0 20 2.42 20 5.5c0 3.78-3.4 6.86-8.55 11.54L10 18z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">15.9k</p>
                    <p className="text-sm text-green-500 flex items-center">
                      <span className="mr-1">↑</span>21% vs last 7 days
                    </p>
                  </div>
                </div>
              </div>

              {/* Traffic Stats Card */}
              <div className="bg-surface p-6 rounded-2xl shadow-xs w-64">
                <p className="text-faint mb-4 text-sm">Sessions by Day</p>
                <div className="h-32 flex items-end space-x-2">
                  <div className="w-6 h-20 bg-[#FF5C39] rounded-t-md"></div>
                  <div className="w-6 h-24 bg-[#FF5C39] rounded-t-md"></div>
                  <div className="w-6 h-16 bg-[#FF5C39] rounded-t-md"></div>
                  <div className="w-6 h-28 bg-[#FF5C39] rounded-t-md"></div>
                  {/* Reference: `h-18` is not a valid Tailwind v3 class — that
                      bar renders zero-height; reproduced by omitting height. */}
                  <div className="w-6 bg-[#FF5C39] rounded-t-md"></div>
                  <div className="w-6 h-32 bg-[#FF5C39] rounded-t-md"></div>
                </div>
              </div>

              {/* Reach Card */}
              <div className="bg-surface p-6 rounded-2xl shadow-xs w-64">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/15 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-[#FF5C39]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">256.18k</p>
                    <p className="text-sm text-green-500 flex items-center">
                      <span className="mr-1">↑</span>24% vs last 7 days
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instagram Card - Responsive Positioning */}
            <div className="hidden md:block absolute top-64 right-48 bg-surface p-4 rounded-2xl shadow-xs">
              <div className="flex items-center space-x-2">
                <img
                  src="/images/instagram.png"
                  className="rounded-sm h-24"
                  alt="Instagram logo"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content (reference: inside the layout's max-w-7xl wrapper) */}
      <div className="max-w-7xl mx-auto">
        {/* Features Stats Section */}
        <section className="mt-16 md:mt-32 rounded-2xl">
          <div className="flex flex-col md:flex-row pb-12 justify-between p-4 max-w-6xl mx-auto gap-6">
            {/* Connected Sources Stat */}
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/15 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600 dark:text-purple-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold">40+</h3>
                <p className="text-faint text-sm">Ready-made sources</p>
              </div>
            </div>

            {/* Sync Frequency Stat */}
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-500/15 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Daily</h3>
                <p className="text-faint text-sm">Automatic data refresh</p>
              </div>
            </div>

            {/* Report Export Stat */}
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-500/15 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold">1-click</h3>
                <p className="text-faint text-sm">Report generation & export</p>
              </div>
            </div>
          </div>

          {/* Features Content */}
          <div className="px-4 md:px-8 pb-8 md:pb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-[#2D2F6D] dark:text-white mb-4">
              One platform, every analytics service
            </h2>
            <p className="text-muted max-w-3xl mb-6">
              Connect data sources once and Metrispot keeps them in sync — then
              measure it all from the same place. Website analytics, audience
              insights, platform comparisons, scheduled reports, and paid
              channel performance, sharing one date range and one set of
              sources.
            </p>
            {/* Learn More Button */}
            <div className="flex justify-end mb-8">
              <Link
                href="/feature"
                className="inline-flex items-center px-4 py-2 text-sm text-red-500 border border-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Learn More
                <svg
                  className="w-4 h-4 ml-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-8">
              {/* Connect sources Card */}
              <div className="bg-surface p-6 md:p-8 rounded-2xl shadow-xs w-full">
                <img
                  src="/images/save-time.png"
                  alt="Rate graph"
                  className="w-full h-auto mb-6 rounded-lg"
                />
                <h3 className="text-xl font-semibold mb-3">
                  Connect your sources, skip the spreadsheets
                </h3>
                <p className="text-muted">
                  Add a website snippet or sign in through OAuth to pull in
                  social, ad, and commerce data — then let Metrispot handle the
                  syncs. No CSV exports, no manual stitching, and no scripts to
                  maintain. Anything unusual can go in through our API.
                </p>
              </div>

              {/* Website Analytics Card */}
              <div className="bg-surface p-6 md:p-8 rounded-2xl shadow-xs w-full">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <img
                    src="/images/instagram.png"
                    alt="Instagram widget"
                    className="w-1/2 rounded-lg"
                  />
                  <img
                    src="/images/follower-stat.png"
                    alt="Stats graph"
                    className="w-1/2 rounded-lg"
                  />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  Website Analytics, down to the page
                </h3>
                <p className="text-muted">
                  Track sessions, traffic sources, top pages, events, devices,
                  and conversions across every tab of the analytics module —
                  with realtime monitoring and a visitor journey view when you
                  need to see what happened just now.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ROI Section */}
        <section className="max-w-6xl mx-auto p-4">
          <div className="bg-surface rounded-lg p-6 flex flex-col md:flex-row gap-8">
            {/* Left Section with Image and Stats */}
            <div className="relative bg-[#FFF5F5] dark:bg-red-500/10 rounded-lg p-6 flex-1 h-full">
              <div className="space-y-4">
                <img
                  src="/images/markup-followe.png"
                  alt="Professional with laptop"
                  className="w-full h-auto object-cover rounded-lg"
                />
              </div>
            </div>

            {/* Right Section with ROI Information */}
            <div className="flex-1 p-6">
              <div className="inline-block px-4 py-1 bg-[#FFF5F5] dark:bg-red-500/10 text-red-500 rounded-full mb-4">
                Compare &amp; Reports
              </div>

              <h2 className="text-2xl font-bold mb-6">
                Answer &quot;which channel is working?&quot; in one screen
              </h2>

              {/* Service bullet points */}
              <div className="space-y-4">
                {[
                  "Compare platforms or date ranges side by side",
                  "Audience insights by source, geo, and activity time",
                  "Executive summary, charts, and tables in every report",
                ].map((stat, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center text-red-500 text-sm font-semibold">
                      {index + 1}
                    </div>
                    <span className="text-muted">{stat}</span>
                  </div>
                ))}
              </div>

              {/* Description Text */}
              <p className="text-muted mt-6 mb-8">
                Every module shares the same connected sources and date
                filters, so comparisons, audience segments, and reports all
                read from one version of the truth. Change the range once and
                the whole dashboard follows.
              </p>

              <Link
                href="/register"
                className="inline-block px-6 py-2 border border-red-500 text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition"
              >
                Try Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Services Section (structure kept from the original integrations block) */}
        <section className="max-w-6xl mx-auto">
          <div className="bg-pink-50 dark:bg-pink-500/10 p-8 w-full">
            {/* Header Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">
                Everything inside Metrispot
              </h2>
              <p className="text-muted text-sm">
                Each service plugs into the sources you have already connected,
                so you can move from a raw number to a shareable answer without
                leaving the dashboard.
              </p>
            </div>

            {/* Service Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="bg-surface p-8 rounded-2xl shadow-xs">
                <img
                  src="/images/source.png"
                  alt="Rate graph"
                  className="w-full mb-6 rounded-lg"
                />
                <h3 className="text-xl font-semibold mb-3">
                  Sources &amp; Connections
                </h3>
                <p className="text-muted">
                  Browse 40+ platforms — websites, social, ads, commerce, and
                  more — then manage every connection from one tab. Add a
                  source, preview the data, and it flows into every other
                  module automatically.
                </p>
              </div>

              <div className="bg-surface p-8 rounded-2xl shadow-xs">
                <img
                  src="/images/social.png"
                  alt="Rate graph"
                  className="w-full mb-6 rounded-lg"
                />
                <h3 className="text-xl font-semibold mb-3">
                  Audience Insights
                </h3>
                <p className="text-muted">
                  See who is actually engaging — demographics, geography, and
                  activity timing per source. Panels only show what a source
                  genuinely reports, so you never read a metric the platform
                  does not measure.
                </p>
              </div>

              {/* Image Gallery Card */}
              <div className="bg-surface p-8 rounded-2xl shadow-xs">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <img
                    src="/images/Illustrations.png"
                    alt="Instagram widget"
                    className="w-full md:w-1/2 rounded-lg"
                  />
                  <img
                    src="/images/Illustrations.png"
                    alt="Stats graph"
                    className="w-full md:w-1/2 rounded-lg"
                  />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  Compare &amp; Performance
                </h3>
                <p className="text-muted">
                  Put platforms or periods next to each other, and keep an eye
                  on paid channels: ad spend, subscribers, traffic sources, and
                  report-ready performance summaries for every campaign.
                </p>
              </div>

              <div className="bg-surface p-8 rounded-2xl shadow-xs">
                <img
                  src="/images/source.png"
                  alt="Rate graph"
                  className="w-full mb-6 rounded-lg"
                />
                <h3 className="text-xl font-semibold mb-3">
                  Reports &amp; Dashboard
                </h3>
                <p className="text-muted">
                  Build the dashboard your way with customizable widgets, then
                  generate reports with an executive summary, key metrics,
                  charts, and tables — ready to export and share with
                  stakeholders.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section>
          <div className="max-w-6xl mx-auto px-4 py-12">
            {/* Header Section */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">
                Pricing Plans for You
              </h2>
              <p className="text-muted">
                Choose the perfect pricing plan that best suits your business
                needs and budgets
              </p>
            </div>

            {/* Toggle Switch (decorative in the reference) */}
            <div className="flex justify-center gap-4 mb-12">
              <button
                type="button"
                className="bg-orange-500 text-white px-4 py-2 rounded-full"
              >
                Monthly
              </button>
              <button type="button" className="text-muted px-4 py-2">
                Yearly
              </button>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-6 ${plan.bgClass} transition-all duration-300 hover:scale-105`}
                >
                  {/* Plan Name & Price */}
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium mb-2">{plan.name}</h3>
                    <div className="text-2xl font-bold">{plan.price}</div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-4 mb-8">
                    {planFeatures.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-ghost"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        <span className="text-sm text-muted">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  <Link
                    href="/register"
                    className={`block w-full py-2 px-4 rounded-full text-center ${plan.buttonClass} hover:opacity-90 transition-opacity`}
                  >
                    Activate
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section>
          <div className="py-12 px-4">
            {/* Header Section */}
            <div className="max-w-6xl mx-auto mb-12 text-center">
              <h2 className="text-2xl font-bold mb-2">
                What Our Clients Say
              </h2>
              <p className="text-muted text-sm">
                Teams use Metrispot to replace scattered exports with one
                dashboard every stakeholder can open.
              </p>
            </div>

            {/* Testimonials Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <div
                  key={testimonial.name}
                  className="bg-gray-50 dark:bg-white/5 rounded-xl p-6 flex flex-col justify-between"
                >
                  {/* Testimonial Text */}
                  <div className="min-h-[120px] mb-6">
                    <p className="text-muted text-sm leading-relaxed">
                      {testimonial.text}
                    </p>
                  </div>

                  {/* Author Info — initials avatar (no image asset needed) */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center text-orange-500 font-semibold shrink-0">
                      {testimonial.initials}
                    </div>
                    <div>
                      <h4 className="font-medium">{testimonial.name}</h4>
                      <p className="text-sm text-faint">
                        {testimonial.position}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <div className="max-w-3xl mx-auto py-16 px-4">
            {/* Header Section */}
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold mb-2">
                Frequently Asked Questions
              </h2>
              <p className="text-muted text-sm">
                Everything you need to know about connecting sources and
                reading your data in Metrispot.
              </p>
            </div>

            {/* FAQ Accordion (Alpine x-data="{ active: 1 }") */}
            <FaqAccordion />
          </div>
        </section>
      </div>
    </>
  );
}
