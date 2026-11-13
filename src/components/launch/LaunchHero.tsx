import { ClientOnly, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { media, profile } from "@/data/profile";
import {
  PHASE_SWITCH,
  activeStage,
  altitudeKm,
  formatClock,
  launchState,
  missionClock,
  smooth,
  stages,
  velocityKmh,
  windowOpacity,
} from "./timeline";

const LaunchCanvas = lazy(() => import("./LaunchCanvas"));

const captions = [
  { from: 0.075, to: 0.18, stage: "T−0 · Ignition", title: "From concept to hot-fire", body: "Every nozzle, injector and pyro valve starts as a SolidWorks model — then it has to survive the flame." },
  { from: 0.18, to: 0.31, stage: "Liftoff · Tower clear", title: "Rhumi Twin — flight proven", body: "Designed the Rhumi Twin rocket, successfully launched by Space Zone Aerospace." },
  { from: 0.31, to: 0.42, stage: "Max Q", title: "Built to take the load", body: "Vertical and horizontal test beds engineered to hold full engine thrust through static fire." },
  { from: 0.5, to: 0.66, stage: "SRB Separation", title: "Flight-critical hardware", body: "Fins, airframe sections and fuel grains — production-ready drawings with tolerances and material callouts." },
  { from: 0.7, to: 0.85, stage: "MECO · ET Sep", title: "Getting hardware to the pad", body: "DFM reviews, BOMs, procurement and vendor coordination — the work behind every launch." },
];

function Fallback() {
  return (
    <div className="absolute inset-0">
      <img src={media.liftoffPoster} alt="" className="h-full w-full object-cover opacity-60" />
    </div>
  );
}

export function LaunchHero() {
  const section = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const prog = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / Math.max(total, 1)));
      launchState.progress = prog;
      setP(prog);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const stageIdx = activeStage(p);
  const introOpacity = 1 - smooth(0.02, 0.07, p);
  const haze = smooth(PHASE_SWITCH - 0.07, PHASE_SWITCH, p) * (1 - smooth(PHASE_SWITCH, PHASE_SWITCH + 0.06, p));
  const finale = smooth(0.88, 0.93, p);

  return (
    <section ref={section} className="relative h-[700vh] bg-background" aria-label="Scroll to launch the space shuttle">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <ClientOnly fallback={<Fallback />}>
          <Suspense fallback={<Fallback />}>
            <LaunchCanvas />
          </Suspense>
        </ClientOnly>

        {/* cloud punch-through between atmosphere and orbit */}
        <div className="pointer-events-none absolute inset-0 bg-haze" style={{ opacity: haze, transform: `scale(${1 + haze})` }} />

        {/* Intro */}
        <div
          className="pointer-events-none absolute inset-0 flex items-end bg-scrim-side"
          style={{ opacity: introOpacity }}
        >
          <div
            className="mx-auto w-full max-w-[1440px] px-5 pb-24 md:px-10 md:pb-28"
            style={{ pointerEvents: introOpacity > 0.5 ? "auto" : "none" }}
          >
            <p className="eyebrow animate-rise flex items-center gap-2 text-foreground/80">
              <span className="animate-blink inline-block h-2 w-2 rounded-full bg-signal" />
              Mission status: active · {profile.company}
            </p>
            <h1 className="display-xl animate-rise mt-4 max-w-4xl [animation-delay:120ms]">
              Harirajan <span className="text-signal">M</span>
            </h1>
            <p className="animate-rise mt-5 max-w-xl text-lg text-foreground/85 [animation-delay:240ms] md:text-xl">
              Aerospace & propulsion design engineer. I design rocket and missile hardware — from nozzles to airframes — and see it through to hot-fire.
            </p>
            <div className="animate-rise mt-8 flex flex-wrap gap-3 [animation-delay:360ms]">
              <Button asChild variant="signal" size="xl">
                <Link to="/missions">Explore missions</Link>
              </Button>
              <Button asChild variant="frame" size="xl">
                <Link to="/media">Watch Rhumi Twin liftoff</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div
          className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex"
          style={{ opacity: introOpacity }}
        >
          <span className="eyebrow text-foreground/80">Scroll to launch</span>
          <span className="relative h-12 w-px overflow-hidden bg-foreground/20">
            <span className="animate-scroll-cue absolute inset-x-0 top-0 h-1/2 bg-foreground" />
          </span>
        </div>

        {/* Stage captions */}
        {captions.map((c) => {
          const o = windowOpacity(p, c.from, c.to);
          if (o <= 0.001) return null;
          return (
            <div
              key={c.stage}
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-5 md:px-10"
              style={{ opacity: o, transform: `translateY(${(1 - o) * 20}px)` }}
            >
              <div className="max-w-md border-l-2 border-signal bg-background/55 py-5 pl-5 pr-6 backdrop-blur-sm">
                <p className="eyebrow text-signal">{c.stage}</p>
                <h2 className="display-md mt-2">{c.title}</h2>
                <p className="mt-3 text-foreground/85">{c.body}</p>
              </div>
            </div>
          );
        })}

        {/* Finale */}
        <div
          className="absolute inset-x-0 top-24 px-5 md:top-32 md:px-10"
          style={{ opacity: finale, pointerEvents: finale > 0.5 ? "auto" : "none" }}
        >
          <div>
            <p className="eyebrow text-signal">Orbit achieved</p>
            <h2 className="display-lg mt-3 max-w-xl">Ready for the next mission</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="signal" size="xl">
                <Link to="/contact">Open a channel</Link>
              </Button>
              <Button asChild variant="frame" size="xl">
                <a href={profile.resumeUrl} target="_blank" rel="noreferrer">Download résumé</a>
              </Button>
            </div>
          </div>
        </div>

        {/* Telemetry HUD */}
        <div className="pointer-events-none absolute bottom-6 right-5 w-[min(320px,calc(100%-2.5rem))] border border-line bg-background/60 p-4 font-mono text-xs backdrop-blur-md md:bottom-10 md:right-10">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-[0.6rem]">Telemetry · HM-01</span>
            <span className="flex items-center gap-1.5 text-signal">
              <span className="animate-blink h-1.5 w-1.5 rounded-full bg-signal" /> LIVE
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <p className="text-[0.6rem] text-muted-foreground">CLOCK</p>
              <p className="text-base tabular-nums">{formatClock(missionClock(p))}</p>
            </div>
            <div>
              <p className="text-[0.6rem] text-muted-foreground">ALT KM</p>
              <p className="text-base tabular-nums">{altitudeKm(p).toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[0.6rem] text-muted-foreground">VEL KM/H</p>
              <p className="text-base tabular-nums">{Math.round(velocityKmh(p)).toLocaleString("en-US")}</p>
            </div>
          </div>
          <div className="mt-3 h-px w-full bg-line">
            <div className="h-px bg-signal" style={{ width: `${p * 100}%` }} />
          </div>
          <ol className="mt-3 hidden space-y-1 sm:block">
            {stages.map((s, i) => (
              <li
                key={s.label}
                className={
                  i === stageIdx
                    ? "flex items-center gap-2 text-foreground"
                    : i < stageIdx
                      ? "flex items-center gap-2 text-muted-foreground line-through decoration-signal/60"
                      : "flex items-center gap-2 text-muted-foreground/60"
                }
              >
                <span className={i === stageIdx ? "h-1.5 w-1.5 bg-signal" : "h-1.5 w-1.5 bg-foreground/25"} />
                {s.label}
              </li>
            ))}
          </ol>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-scrim" style={{ opacity: smooth(0.95, 1, p) }} />
      </div>
    </section>
  );
}
