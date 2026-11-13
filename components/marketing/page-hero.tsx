/**
 * Shared marketing hero band — ported from partials/hero.blade.php
 * ("Explore the standout features"). Included by /feature and /pricing;
 * /contact has no hero in the reference.
 */
export function PageHero() {
  return (
    <section className="relative h-96 overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="/images/business.jpg"
          alt="Background"
          className="w-full h-full object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-gray-900/75 rounded-lg"></div>
      </div>

      {/* Content Container */}
      <div className="relative h-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-center items-center h-full text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Explore the standout features
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-gray-200">
            Connect all marketing data with our attribution platform to boost
            ROI by 15-44%. Measure ROI across channels, campaigns, keywords, and
            creatives.
          </p>
        </div>
      </div>
    </section>
  );
}
