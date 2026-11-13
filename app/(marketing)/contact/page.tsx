import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  // Reference quirk kept: contact.blade.php sets @section('title', 'Feature'),
  // so the tab reads "Feature" in the original app too.
  title: "Feature",
};

const checkPath = "M5 13l4 4L19 7";

/**
 * Contact page — ported from user/contact.blade.php (the Blade file's
 * commented-out section at the end is not rendered and is not ported).
 * No shared hero on this page in the reference — the dark band starts right
 * after the nav. Literal colors (#0D1117 band, #161B22 feature box) kept as
 * the reference defines them in both themes.
 */
export default function ContactPage() {
  return (
    <>
      {/* Dark band with topography pattern + form */}
      <div className="relative bg-[#0D1117] text-white py-16">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" aria-hidden="true">
            <pattern
              id="topography"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M0 50 Q25 25, 50 50 T100 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
              <path
                d="M-50 50 Q-25 25, 0 50 T50 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#topography)" />
          </svg>
        </div>

        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
            {/* Left Column */}
            <div className="space-y-8">
              <h2 className="text-3xl font-bold">
                Still want to reach out to our team?
              </h2>
              <p className="text-gray-400">
                Provide the details of your issue. Tell us as much as you can
                about the problem, and see how it shakes down.
              </p>

              {/* Feature Box */}
              <div className="bg-[#161B22] rounded-lg p-6 space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  Do more with BitMag <span className="text-orange-500">🚀</span>
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={checkPath}
                      ></path>
                    </svg>
                    Pay for subscriptions faster with easy payment integrations
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={checkPath}
                      ></path>
                    </svg>
                    Pay for subscription faster with easy payment integrations
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="bg-surface rounded-lg p-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>

      {/* General Inquiries + Office Address */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* General Inquiries */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">General Inquiries</h3>
            <div className="space-y-2">
              {/* Phone Numbers */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"
                  />
                </svg>
                <div className="text-muted">
                  <p>0818842443, 0818842443</p>
                </div>
              </div>

              {/* Email Addresses */}
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <div className="text-muted">
                  <p>hello@website.ai , support@website.ai</p>
                </div>
              </div>
            </div>
          </div>

          {/* Office Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Our office Address</h3>
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 mt-1 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-muted">
                kennedsa amet, Tortor eu division maxia lorere. Mauris ultricies
                et dictum lacus
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
