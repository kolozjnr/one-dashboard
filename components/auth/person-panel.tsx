import Link from "next/link";

/**
 * Left illustration panel — ported from partials/person.blade.php.
 * Shared by login / register / forgot-password.
 * Copy (including the placeholder Lorem text) kept exactly as the reference.
 */
export function PersonPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative rounded-2xl m-4 overflow-hidden">
      {/* Logo - Repositioned to top-left of image container */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/">
          <h1 className="text-2xl font-bold text-orange-500">
            Bitz<span className="text-white">Mag</span>
          </h1>
        </Link>
      </div>

      <div className="absolute inset-0 bg-linear-to-b from-black/40 to-black/60 z-10"></div>
      <img
        src="/images/bitz.png"
        alt="Login background"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="relative z-20 p-10 mt-auto">
        <h2 className="text-4xl font-bold mb-2 text-white">
          Lorem ipsum dolor sit amet consectetur
        </h2>
        <p className="text-gray-200">
          Lorem ipsum dolor sit amet consectetur. Condimentum nihil nam nam
          tempor pellentesque lacus in amet nulla
        </p>
      </div>
    </div>
  );
}
