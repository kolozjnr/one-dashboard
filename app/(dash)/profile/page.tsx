import type { Metadata } from "next";

export const metadata: Metadata = {
  // Reference quirk kept: profile.blade.php sets @section('title', 'Dashboard'),
  // so the tab reads "Dashboard" in the original app too.
  title: "Dashboard",
};

/**
 * Profile page — ported from items/profile.blade.php (served by
 * dashboard/profile.blade.php on the reference's /profile route).
 * The photo upload form is inert in the reference (posts to /upload).
 */
export default function ProfilePage() {
  return (
    <div className="bg-gray-50 dark:bg-white/5 min-h-screen">
      <div className="max-w-3xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-medium mb-1">Profile</h1>
          <p className="text-sm text-faint">
            Take a look at your settings and the new policy to see what&apos;s
            covered
          </p>
        </div>

        {/* Profile Photo Section */}
        <div className="mb-8">
          <h2 className="text-sm font-medium">Profile photo</h2>
          <p className="text-sm text-faint mb-3">
            This image will be displayed on your profile
          </p>

          <div className="flex items-start gap-8">
            <form action="/upload" method="POST" encType="multipart/form-data">
              <label
                htmlFor="photo-upload"
                className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300 bg-surface px-3 py-2 border border-line rounded-md hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                Change Photo
              </label>
              <input
                id="photo-upload"
                type="file"
                name="photo"
                accept="image/*"
                className="hidden"
                required
              />
            </form>

            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-500/10 overflow-hidden">
                <img
                  src="/images/adewale.png"
                  alt="Profile photo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-sm font-medium">Personal Information</h2>
              <p className="text-sm text-faint">Update your personal details here</p>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 text-sm bg-sunken rounded-md hover:bg-gray-200 dark:hover:bg-white/10"
            >
              Save changes
            </button>
          </div>

          {/* Form Fields using Flex Layout */}
          <div className="flex flex-col space-y-6">
            {/* First & Last Name Row */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm mb-1">First name</label>
                <input
                  type="text"
                  value="Gabriella"
                  className="w-full px-3 py-1.5 border border-line rounded-md"
                />
              </div>

              <div className="flex-1">
                <label className="block text-sm mb-1">Last name</label>
                <input
                  type="text"
                  value="McPherson"
                  className="w-full px-3 py-1.5 border border-line rounded-md"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm mb-1">Email address</label>
              <input
                type="email"
                value="thegabriellapherson@gmail.com"
                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-white/5 border border-line rounded-md"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm mb-1">Username</label>
              <input
                type="text"
                value="@heekisnexo"
                className="w-full px-3 py-1.5 border border-line rounded-md mb-1"
              />
              <p className="flex items-center text-sm text-green-600 mt-1">
                <svg className="w-3 h-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="10" r="10" />
                </svg>
                This username is available
              </p>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm mb-1">Role</label>
              <input
                type="text"
                value="Account Manager"
                className="w-full px-3 py-1.5 border border-line rounded-md"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
