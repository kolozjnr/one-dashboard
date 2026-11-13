"use client";

/**
 * Contact form — ported from user/contact.blade.php.
 * Reference defect handled: the form POSTs to `action="#"` (no POST route
 * exists in Laravel → 404 on submit). The React form validates natively and
 * no-ops instead of navigating. Input classes are verbatim — note the
 * reference inputs have only a border COLOR class (no `border` width), so
 * with the framework's border-width:0 preflight they render borderless with
 * the shadow (intentional look, kept).
 */
export function ContactForm() {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Reference posts to "#" which 404s — no endpoint backs this form.
    event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="full_name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Your Full Name
        </label>
        <input
          type="text"
          name="full_name"
          id="full_name"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs bg-surface dark:bg-sunken text-ink focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Your Email
        </label>
        <input
          type="email"
          name="email"
          id="email"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs bg-surface dark:bg-sunken text-ink focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Your Message
        </label>
        <textarea
          name="message"
          id="message"
          rows={4}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-xs bg-surface dark:bg-sunken text-ink focus:border-blue-500 focus:ring-blue-500"
          placeholder="Enter your request"
        ></textarea>
      </div>

      <button
        type="submit"
        className="w-full bg-[#0D1117] text-white py-3 px-4 rounded-md hover:bg-[#0D1117]/90 transition-colors"
      >
        Send Message
      </button>
    </form>
  );
}
