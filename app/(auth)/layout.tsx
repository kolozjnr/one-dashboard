import { PersonPanel } from "@/components/auth/person-panel";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * Auth shell — ported from user/login.blade.php, user/register.blade.php and
 * user/forgot-password.blade.php (all three share the same outer frame).
 * Each page renders its own right-hand form pane (their wrappers differ
 * slightly in the reference and are kept page-specific).
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Left side image section */}
      <PersonPanel />

      {/* Right side form section (page-provided) */}
      {children}

      {/* Theme toggle (added feature) */}
      <ThemeToggle
        className="fixed top-4 right-4 z-30 p-1.5 text-muted hover:text-brand"
        iconClassName="h-4 w-4"
      />
    </div>
  );
}
