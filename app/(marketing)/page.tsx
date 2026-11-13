import type { Metadata } from "next";
import { FaqAccordion } from "./faq-accordion";

export const metadata: Metadata = {
  title: "Home | BitzMag",
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
  "No GB destination backup/m",
  "Daily DB refresh",
];

const testimonials = [
  {
    text: "The capability of being able to customize the dashboard and present data in ways we requested it to be. Also, we are able to see attributes of what content drives.",
    name: "Marvel",
    position: "Social Media Manager",
  },
  {
    text: "The capability of being able to customize the dashboard and present data in ways we requested it to be. Also, we are able to see attributes of what content drives.",
    name: "Marvel",
    position: "Social Media Manager",
  },
  {
    text: "The capability of being able to customize the dashboard and present data in ways we requested it to be. Also, we are able to see attributes of what content drives.",
    name: "Marvel",
    position: "Social Media Manager",
  },
];

/**
 * Home page — ported from welcome.blade.php (the reference's `/` route).
 * The Blade file's commented-out alternative hero is not rendered there and
 * is not ported. Reference quirks kept: inert CTA buttons, the "Learn More"
 * / "Try Demo" dead links, and the pricing toggle being purely decorative.
 * Reference defects repaired (documented): `illustrations.png` case mismatch
 * (file is Illustrations.png), missing testimonial avatars (rendered as the
 * gray circle only, no broken image), and the invalid `h-18` bar class in
 * the reference's Tailwind v3 CDN (that bar renders with zero height there —
 * reproduced here by omitting the height).
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
            Connecting all your <span className="text-[#FF5C39]">data</span>{" "}
            from any
            <br className="hidden md:block" /> tool to{" "}
            <span className="text-[#FF5C39]">anywhere</span>
          </h1>

          {/* Subheadline - Responsive width and padding */}
          <p className="mt-4 md:mt-6 text-faint max-w-xl lg:max-w-2xl mx-auto text-base md:text-lg px-4">
            Seamlessly integrate and unify your data from any platform, device,
            or tool. Easily connect and sync your data anywhere for a
            streamlined, efficient workflow.
          </p>

          {/* Call to Action Button - Responsive sizing (inert in the reference) */}
          <button
            type="button"
            className="mt-6 md:mt-8 bg-[#FF5C39] text-white px-4 md:px-6 py-2 md:py-3 rounded-md inline-flex items-center"
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
          </button>

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
              {/* Likes Card */}
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

              {/* Followers Stats Card */}
              <div className="bg-surface p-6 rounded-2xl shadow-xs w-64">
                <p className="text-faint mb-4 text-sm">Followers Stats</p>
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
            {/* Active Users Stat */}
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/15 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600 dark:text-purple-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold">15k+</h3>
                <p className="text-faint text-sm">Active user</p>
              </div>
            </div>

            {/* Total Integrations Stat */}
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-500/15 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M19 9H15V3H9V9H5L12 16L19 9ZM5 18V20H19V18H5Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold">30k</h3>
                <p className="text-faint text-sm">Total Integrations</p>
              </div>
            </div>

            {/* Customer Stat */}
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-500/15 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold">10k</h3>
                <p className="text-faint text-sm">Customer</p>
              </div>
            </div>
          </div>

          {/* Features Content */}
          <div className="px-4 md:px-8 pb-8 md:pb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-[#2D2F6D] dark:text-white mb-4">
              Windsor Amazing Features
            </h2>
            <p className="text-muted max-w-3xl mb-6">
              Connect all marketing data with our attribution platform to boost
              ROI by 15-44%. Measure ROI across channels, campaigns, keywords,
              and creatives, including cancellations, returns, and offline
              conversions.
            </p>
            {/* Learn More Button */}
            <div className="flex justify-end mb-8">
              <a
                href="#"
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
              </a>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-8">
              {/* Save time and automate Card */}
              <div className="bg-surface p-6 md:p-8 rounded-2xl shadow-xs w-full">
                <img
                  src="/images/save-time.png"
                  alt="Rate graph"
                  className="w-full h-auto mb-6 rounded-lg"
                />
                <h3 className="text-xl font-semibold mb-3">
                  Save time and automate
                </h3>
                <p className="text-muted">
                  Automate the collection of all marketing data and reduce time
                  spent on preparation. Focus on insights with our advanced
                  marketing attribution software. Easily use and integrate your
                  data anywhere with our connectors and APIs.
                </p>
              </div>

              {/* Multi-touch Attribution Card */}
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
                  Multi-touch Attribution Modelling Software
                </h3>
                <p className="text-muted">
                  Analyze and optimize customer journeys across all touchpoints.
                  Our attribution software and budget optimizer saves time by
                  sending optimizations directly to platforms.
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
                Attribution Insights
              </div>

              <h2 className="text-2xl font-bold mb-6">
                Optimize ROI by looking at the whole customer journey
              </h2>

              {/* Cross Device Stats (reference repeats the same string ×3) */}
              <div className="space-y-4">
                {["Criteo, Tapad etc.", "Criteo, Tapad etc.", "Criteo, Tapad etc."].map(
                  (stat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-500/15 rounded-full flex items-center justify-center text-red-500">
                        <span>28</span>
                      </div>
                      <span className="text-muted">
                        Cross-device data, eg {stat}
                      </span>
                    </div>
                  ),
                )}
              </div>

              {/* Description Text */}
              <p className="text-muted mt-6 mb-8">
                Attribution insights empowers advertisers and marketers to make
                data-driven decisions on marketing budget allocations across the
                entire customer journey. Customer journey data is matched to
                cost-data, this together with multi-touch
              </p>

              {/* Demo Button (inert in the reference) */}
              <button
                type="button"
                className="px-6 py-2 border border-red-500 text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition"
              >
                Try Demo
              </button>
            </div>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="max-w-6xl mx-auto">
          <div className="bg-pink-50 dark:bg-pink-500/10 p-8 w-full">
            {/* Header Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">Integrations</h2>
              <p className="text-muted text-sm">
                Connect all marketing data with our attribution platform to
                boost ROI by 15-44%. Measure ROI across channels, campaigns,
                keywords and creatives, including cancellations, returns, and
                offline conversions.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="bg-surface p-8 rounded-2xl shadow-xs">
                <img
                  src="/images/source.png"
                  alt="Rate graph"
                  className="w-full mb-6 rounded-lg"
                />
                <h3 className="text-xl font-semibold mb-3">
                  Connect to entire slack
                </h3>
                <p className="text-muted">
                  Automate the collection of all marketing data and reduce time
                  spent on preparation. Focus on insights with our advanced
                  marketing attribution software. Easily use and integrate your
                  data anywhere with our connectors and APIs.
                </p>
              </div>

              <div className="bg-surface p-8 rounded-2xl shadow-xs">
                <img
                  src="/images/social.png"
                  alt="Rate graph"
                  className="w-full mb-6 rounded-lg"
                />
                <h3 className="text-xl font-semibold mb-3">
                  Connect to entire stack
                </h3>
                <p className="text-muted">
                  Analyze and optimize customer journeys across all touchpoints.
                  Our attribution software and budget optimizer saves time by
                  sending optimizations directly to platforms.
                </p>
              </div>

              {/* Image Gallery Card (reference asks for illustrations.png —
                  repaired to the real file name Illustrations.png) */}
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
                  Connect to entire slack
                </h3>
                <p className="text-muted">
                  Automate the collection of all marketing data and reduce time
                  spent on preparation. Focus on insights with our advanced
                  marketing attribution software. Easily use and integrate your
                  data anywhere with our connectors and APIs.
                </p>
              </div>

              <div className="bg-surface p-8 rounded-2xl shadow-xs">
                <img
                  src="/images/source.png"
                  alt="Rate graph"
                  className="w-full mb-6 rounded-lg"
                />
                <h3 className="text-xl font-semibold mb-3">
                  Connect to entire stack
                </h3>
                <p className="text-muted">
                  Analyze and optimize customer journeys across all touchpoints.
                  Our attribution software and budget optimizer saves time by
                  sending optimizations directly to platforms.
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

                  {/* Action Button (inert in the reference) */}
                  <button
                    type="button"
                    className={`w-full py-2 px-4 rounded-full text-center ${plan.buttonClass} hover:opacity-90 transition-opacity`}
                  >
                    Activate
                  </button>
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
                Connect all marketing data with our attribution platform to
                boost ROI by 15-44%. Measure ROI across channels.
              </p>
            </div>

            {/* Testimonials Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-white/5 rounded-xl p-6 flex flex-col justify-between"
                >
                  {/* Testimonial Text */}
                  <div className="min-h-[120px] mb-6">
                    <p className="text-muted text-sm leading-relaxed">
                      {testimonial.text}
                    </p>
                  </div>

                  {/* Author Info — reference points at /path-to-imageN.jpg,
                      which never exists (no broken image rendered here) */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700"></div>
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
                Connect all marketing data with our attribution platform to
                boost ROI by 15-44%. Measure ROI across channels.
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
