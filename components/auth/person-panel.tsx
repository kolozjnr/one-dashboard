"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";

const slides = [
  { src: "/images/auth-slide-1.svg", alt: "Abstract colorful analytics illustration" },
  { src: "/images/auth-slide-2.svg", alt: "Abstract dashboard and data illustration" },
  { src: "/images/auth-slide-3.svg", alt: "Abstract connected platforms illustration" },
];

/**
 * Left illustration panel — ported from partials/person.blade.php.
 * Shared by login / register / forgot-password.
 */
export function PersonPanel() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex lg:w-1/2 relative rounded-2xl m-4 overflow-hidden">
      {/* Logo - Repositioned to top-left of image container */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" aria-label="Metrispot home">
          {/* Sits on a dark photo overlay in both themes — pin the dark logo */}
          <BrandLogo variant="dark" className="text-2xl font-bold text-white" />
        </Link>
      </div>

      <div className="absolute inset-0 z-10 bg-linear-to-b from-black/30 via-black/25 to-black/70"></div>
      {slides.map((slide, index) => <Image
        key={slide.src}
        src={slide.src}
        alt={slide.alt}
        fill
        priority={index === 0}
        sizes="50vw"
        className={`object-cover transition-opacity duration-1000 ${activeSlide === index ? "opacity-100" : "opacity-0"}`}
      />)}
      <div className="absolute bottom-6 right-7 z-20 flex gap-2" aria-label="Authentication image slides">
        {slides.map((slide, index) => <button key={slide.src} type="button" aria-label={`Show image ${index + 1}`} aria-pressed={activeSlide === index} onClick={() => setActiveSlide(index)} className={`h-2 rounded-full transition-all ${activeSlide === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`} />)}
      </div>
      <div className="relative z-20 p-10 mt-auto">
        <h2 className="text-4xl font-bold mb-2 text-white">
          All your data, one dashboard
        </h2>
        <p className="text-gray-200">
          Connect your website, social, and advertising platforms to Metrispot
          and see every metric that matters in one place.
        </p>
      </div>
    </div>
  );
}
