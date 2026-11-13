/**
 * Server-feedback alert boxes — ported from the `$errors` / `session('success')`
 * blocks in the reference auth pages. The wrapper div is always rendered
 * (the reference relies on its margins for spacing even when empty) and its
 * classes are page-specific, matching each Blade file. Dark-mode tints are
 * added so the boxes read on the (dark) auth panel.
 */
export function AuthAlert({
  errors,
  success,
  wrapperClassName = "space-y-4 mb-6",
}: {
  errors?: string[];
  success?: string | null;
  wrapperClassName?: string;
}) {
  return (
    <div className={wrapperClassName}>
      {errors && errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
          <div className="flex items-center mb-2">
            <svg
              className="w-5 h-5 text-red-500 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-red-800 dark:text-red-300 font-medium">
              There were some errors with your submission
            </h3>
          </div>
          <ul className="list-disc list-inside text-red-700 dark:text-red-300 space-y-1">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-500/10 border-l-4 border-green-500 rounded-lg p-4 shadow-sm">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-green-500 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-green-700 dark:text-green-300 font-medium">
              {success}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
