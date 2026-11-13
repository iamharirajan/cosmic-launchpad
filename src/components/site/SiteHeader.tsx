import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/missions", label: "Missions" },
  { to: "/about", label: "Flight Log" },
  { to: "/media", label: "Multimedia" },
  { to: "/contact", label: "Contact" },
] as const;

export function Insignia({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="23" className="fill-agency" />
      <circle cx="14" cy="15" r="1" className="fill-foreground" />
      <circle cx="35" cy="12" r="0.8" className="fill-foreground" />
      <circle cx="37" cy="33" r="1" className="fill-foreground" />
      <ellipse cx="24" cy="26" rx="21" ry="6.5" transform="rotate(-18 24 26)" className="fill-none stroke-foreground" strokeWidth="1.4" />
      <path d="M6 33 C 18 26, 30 18, 44 9 L 41 15 C 30 21, 18 28, 8 36 Z" className="fill-signal" />
      <text x="24" y="28.5" textAnchor="middle" className="fill-foreground" style={{ font: "800 13px 'Barlow Condensed', sans-serif", letterSpacing: "0.5px" }}>
        HM
      </text>
    </svg>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
        scrolled || open ? "border-line bg-background/90 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:px-10">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Insignia className="h-10 w-10" />
          <span className="leading-none">
            <span className="block font-display text-xl font-extrabold uppercase tracking-wide">Harirajan M</span>
            <span className="eyebrow block text-[0.6rem]">Aerospace Design</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="font-display text-lg font-semibold uppercase tracking-wide text-foreground/80 transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground underline decoration-signal decoration-2 underline-offset-[10px]" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button asChild variant="signal" size="lg" className="rounded-none">
            <a href={`mailto:iamharirajan2002@gmail.com`}>Contact Mission Control</a>
          </Button>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          className="p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-background px-5 pb-6 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block border-b border-line py-4 font-display text-2xl font-bold uppercase"
            >
              {item.label}
            </Link>
          ))}
          <Button asChild variant="signal" size="xl" className="mt-6 w-full">
            <a href="mailto:iamharirajan2002@gmail.com">Contact Mission Control</a>
          </Button>
        </nav>
      )}
    </header>
  );
}
