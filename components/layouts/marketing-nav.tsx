"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * Marketing top navigation — ported from base/app.blade.php.
 * The reference toggles #mobile-menu with vanilla JS; here it is React state.
 * Desktop links carry no hover styles in the reference (kept faithful);
 * mobile menu links do (kept faithful).
 * Layout: theme toggle pinned to the left edge, links in the center,
 * auth links + Metrispot logo at the far right (hamburger after the logo
 * on mobile). The theme toggle is an added feature.
 */
export function MarketingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="flex w-full justify-between items-center py-4 px-4 md:px-20 max-w-7xl mx-auto">
        {/* Left edge: logo */}
        <div className="flex items-center">
          <Link href="/" aria-label="Metrispot home">
            <BrandLogo className="text-xl font-semibold" />
          </Link>
        </div>

        {/* Desktop links (center slot) */}
        <div className="hidden md:flex space-x-8">
          <Link href="/feature" className="text-muted text-sm">
            Features
          </Link>
          <Link href="/pricing" className="text-muted text-sm">
            Pricing
          </Link>
          <Link href="/contact" className="text-muted text-sm">
            Contact Us
          </Link>
        </div>

        {/* Right cluster: auth links, then the logo at the far right edge
            (hamburger after the logo on mobile) */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/login" className="text-brand text-sm">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-brand text-white px-4 py-2 rounded-md text-sm hover:bg-brand-hover transition duration-200"
            >
              Sign Up
            </Link>
          </div>

          {/* <Link href="/" aria-label="Metrispot home">
            <BrandLogo className="text-xl font-semibold" />
          </Link> */}

          <ThemeToggle
            className="p-4.5 text-muted hover:text-brand"
            iconClassName="h-4 w-4"
          />

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="md:hidden text-muted focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16m-7 6h7"
              />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu (reference: #mobile-menu, outside the nav element) */}
      {menuOpen && (
        <div className="md:hidden">
          <div className="flex flex-col space-y-4 py-6 px-4 pb-8 bg-surface shadow-md rounded-lg">
            <Link
              href="/feature"
              onClick={() => setMenuOpen(false)}
              className="text-muted text-sm hover:text-brand transition duration-200"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="text-muted text-sm hover:text-brand transition duration-200"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              onClick={() => setMenuOpen(false)}
              className="text-muted text-sm hover:text-brand transition duration-200"
            >
              Contact Us
            </Link>
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-brand text-sm font-medium"
            >
              Login
            </Link>
            <Link
              href="/register"
              onClick={() => setMenuOpen(false)}
              className="bg-brand text-white px-4 py-2 rounded-md text-sm hover:bg-brand-hover transition duration-200"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
