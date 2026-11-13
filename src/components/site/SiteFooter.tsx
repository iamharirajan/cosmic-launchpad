import { Link } from "@tanstack/react-router";

import { profile } from "@/data/profile";
import { Insignia } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-10">
        <div>
          <div className="flex items-center gap-3">
            <Insignia className="h-12 w-12" />
            <p className="font-display text-2xl font-extrabold uppercase">Harirajan M</p>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Aerospace & propulsion design engineer building flight hardware — from nozzles to airframes — at Space Zone Aerospace.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/missions" className="hover:text-signal">Missions</Link></li>
            <li><Link to="/about" className="hover:text-signal">Flight Log</Link></li>
            <li><Link to="/media" className="hover:text-signal">Multimedia</Link></li>
            <li><Link to="/contact" className="hover:text-signal">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Channels</p>
          <ul className="space-y-2 text-sm">
            <li><a href={profile.youtube} target="_blank" rel="noreferrer" className="hover:text-signal">YouTube · Nebula Spacetime</a></li>
            <li><a href={profile.instagram} target="_blank" rel="noreferrer" className="hover:text-signal">Instagram · @nebulaspacetime</a></li>
            <li><a href={profile.linkedin} target="_blank" rel="noreferrer" className="hover:text-signal">LinkedIn</a></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Comm Link</p>
          <a href={`mailto:${profile.email}`} className="break-all text-sm hover:text-signal">{profile.email}</a>
          <p className="mt-2 text-sm text-muted-foreground">{profile.location}</p>
          <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.18em] text-signal hover:underline">
            Download résumé ↗
          </a>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-6 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground md:flex-row md:justify-between md:px-10">
          <span>Harirajan M · Aerospace & Propulsion Design Engineer</span>
          <span>Designed & engineered to reach orbit · 2026</span>
        </div>
      </div>
    </footer>
  );
}
