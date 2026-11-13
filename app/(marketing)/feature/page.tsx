import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "Feature",
};

/**
 * Feature page — ported from user/feature.blade.php (four sections after the
 * shared hero). Copy including the repeated "Multi-Source Integration."
 * headings is verbatim. Dark-mode tints added for the pastel icon chips;
 * white section bands map to the surface token.
 */

const settingsRows = [
  {
    label: "Integration Analytics",
    checked: true,
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    label: "Preliminary Analytics",
    checked: true,
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    label: "Email Analytics",
    checked: false,
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    label: "Connection Analytics",
    checked: true,
    icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  },
];

const featureItems = [
  {
    title: "Automatic Time Tracking",
    text: "Lorem ipsum dolor sit consectetur.",
    chip: "bg-purple-100 dark:bg-purple-500/15",
    iconColor: "text-purple-600 dark:text-purple-400",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Customizable Dashboard",
    text: "Lorem ipsum dolor sit consectetur.",
    chip: "bg-yellow-100 dark:bg-yellow-500/15",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  {
    title: "Easy Data Analytics",
    text: "Lorem ipsum dolor sit consectetur.",
    chip: "bg-green-100 dark:bg-green-500/15",
    iconColor: "text-green-600 dark:text-green-400",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
];

const socialCircles = [
  {
    name: "LinkedIn",
    position: "top-0 left-1/2 transform -translate-x-1/2",
    chip: "bg-blue-100 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
    path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z",
  },
  {
    name: "Facebook",
    position: "top-1/4 right-12",
    chip: "bg-blue-100 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
    path: "M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z",
  },
  {
    name: "Twitter",
    position: "top-1/2 right-0",
    chip: "bg-gray-100 dark:bg-white/10",
    iconColor: "text-gray-900 dark:text-gray-100",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    name: "YouTube",
    position: "bottom-1/4 right-12",
    chip: "bg-red-100 dark:bg-red-500/15",
    iconColor: "text-red-600 dark:text-red-400",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  {
    name: "TikTok",
    position: "bottom-0 left-1/2 transform -translate-x-1/2",
    chip: "bg-gray-100 dark:bg-white/10",
    iconColor: "text-gray-900 dark:text-gray-100",
    path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
  {
    name: "Apple",
    position: "bottom-1/4 left-12",
    chip: "bg-gray-100 dark:bg-white/10",
    iconColor: "text-gray-900 dark:text-gray-100",
    path: "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701",
  },
  {
    name: "Whatsapp",
    position: "top-1/4 left-12",
    chip: "bg-green-100 dark:bg-green-500/15",
    iconColor: "text-green-600 dark:text-green-400",
    path: "M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z",
  },
];

export default function FeaturePage() {
  return (
    <>
      <PageHero />

      {/* Focused On Your Ultimate Goal */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-ink">
                  We Are Focused On Your Ultimate Goal
                </h2>
                <p className="text-muted">
                  Lorem ipsum dolor sit amet consectetur. Cursus quisque nunc
                  dictumst vel at.
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-6">
                {featureItems.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start space-x-4"
                  >
                    <div className="shrink-0">
                      <div
                        className={`w-10 h-10 rounded-lg ${item.chip} flex items-center justify-center`}
                      >
                        <svg
                          className={`w-5 h-5 ${item.iconColor}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={item.icon}
                          ></path>
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">{item.title}</h3>
                      <p className="text-muted mt-1">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Image */}
            <div className="relative">
              <img
                src="/images/Dashboard.png"
                alt="Dashboard Interface"
                className="w-full rounded-lg shadow-xl"
              />
              {/* Optional: Add a subtle gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-tr from-blue-500/10 to-transparent rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Source Integration (with graph) */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Graph Image */}
            <div className="relative">
              <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-6">
                <img
                  src="/images/graph.png"
                  alt="Integration Graph"
                  className="w-full"
                />
                {/* Purple gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 via-transparent to-transparent rounded-2xl"></div>
              </div>
            </div>

            {/* Right Content */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-ink mb-4">
                  Multi-Source Integration.
                </h2>
                <div className="space-y-4 text-muted">
                  <p>
                    Lorem ipsum dolor sit amet consectetur. Bibendum egestas
                    lorem netus eu viverra dui sapittis nisi ut. Ultrices
                    ultramolestie est finibus cursus est mi placerat venenatis
                    aliqut verius sed at. Donec augue vivamus. Nam semper ac vel
                    id.
                  </p>
                  <p>
                    Tincidunt niam nuchi commodo lacus. Dignissim velit id
                    scelerisque ullamcorper et dui ut placerat venenatis aliqut
                    verius sed at donec augue vivamus. Nam semper ac vel id.
                    Tincidunt niam nuchi commodo lacus. Dignissim velit id
                    scelerisque ullamcorper et dui ut placerat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Integration */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-4">
                Multi-Source Integration.
              </h2>
              <div className="text-muted max-w-xl">
                <p>
                  Lorem ipsum dolor sit amet consectetur. Bibendum egestas
                  lorem netus eu viverra dui sapittis nisi ut. Ultrices
                  ultramolestie est finibus cursus est mi placerat venenatis
                  aliqut verius sed at donec augue vivamus. Nam semper ac vel
                  id. Tincidunt niam nuchi commodo lacus. Dignissim velit id
                  scelerisque ullamcorper et dui ut placerat venenatis aliqut
                  verius sed at donec augue vivamus. Nam semper ac vel id.
                  Tincidunt niam nuchi commodo lacus. Dignissim velit id
                  scelerisque ullamcorper et dui ut placerat.
                </p>
              </div>
            </div>

            {/* Right Social Icons Circle */}
            <div className="relative h-80">
              {socialCircles.map((social) => (
                <div
                  key={social.name}
                  className={`absolute ${social.position}`}
                >
                  <div
                    className={`w-12 h-12 ${social.chip} rounded-full flex items-center justify-center`}
                  >
                    <svg
                      className={`w-6 h-6 ${social.iconColor}`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d={social.path} />
                    </svg>
                  </div>
                </div>
              ))}

              {/* Center decorative circle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-line rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Settings */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              {/* Card with Settings */}
              <div className="bg-surface rounded-xl shadow-xs border border-gray-100 dark:border-line p-6">
                {/* Title */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-purple-100 dark:bg-purple-500/15 p-3 rounded-lg">
                    <svg
                      className="w-6 h-6 text-purple-600 dark:text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold">
                    Data Analysis Settings
                  </h3>
                </div>

                {/* Settings List */}
                <div className="space-y-4">
                  {settingsRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          <svg
                            className="w-5 h-5 text-faint"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d={row.icon}
                            />
                          </svg>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">
                          {row.label}
                        </span>
                      </div>
                      {/* Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          defaultChecked={row.checked}
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Content */}
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold text-ink">
                Multi-Source Integration.
              </h2>
              <div className="text-muted">
                <p>
                  Lorem ipsum dolor sit amet consectetur. Bibendum egestas
                  lorem netus eu viverra dui sapittis nisi ut. Ultrices
                  ultramolestie est finibus cursus est mi placerat venenatis
                  aliqut verius sed at donec augue vivamus. Nam semper ac vel
                  id. Tincidunt niam nuchi commodo lacus. Dignissim velit id
                  scelerisque ullamcorper et dui ut placerat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
