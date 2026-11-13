import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Lock, Pause, Play } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import type { Mission } from "@/data/profile";
import { cn } from "@/lib/utils";

export function SectionHeading({
  index,
  eyebrow,
  title,
  action,
}: {
  index?: string;
  eyebrow: string;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow">
          {index && <span className="mr-3 text-signal">{index}</span>}
          {eyebrow}
        </p>
        <h2 className="display-lg mt-3">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  intro,
  image,
}: {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  image: string;
}) {
  return (
    <section className="relative flex min-h-[72vh] items-end overflow-hidden">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" width={1600} height={1000} />
      <div className="absolute inset-0 bg-scrim" />
      <div className="absolute inset-0 bg-scrim-side" />
      <div className="relative mx-auto w-full max-w-[1440px] px-5 pb-16 pt-32 md:px-10 md:pb-20">
        <p className="eyebrow animate-rise text-foreground/80">{eyebrow}</p>
        <h1 className="display-xl animate-rise mt-4 max-w-5xl [animation-delay:100ms]">{title}</h1>
        <p className="animate-rise mt-6 max-w-2xl text-lg text-foreground/85 [animation-delay:200ms]">{intro}</p>
      </div>
    </section>
  );
}

/** Mission photo, or a "imagery withheld" panel when there is no real photo. */
export function MissionVisual({
  mission,
  className,
  eager = false,
  fit = "cover",
}: {
  mission: Mission;
  className?: string;
  eager?: boolean;
  fit?: "cover" | "contain";
}) {
  if (mission.image) {
    if (fit === "contain")
      return (
        <div className={cn("absolute inset-0 bg-surface", className)}>
          <div className="grid-lines absolute inset-0 opacity-40" />
          <img
            src={mission.image}
            alt={mission.title}
            loading={eager ? "eager" : "lazy"}
            className="relative h-full w-full object-contain p-5 md:p-8"
          />
        </div>
      );
    return (
      <img
        src={mission.image}
        alt={mission.title}
        loading={eager ? "eager" : "lazy"}
        width={1600}
        height={1000}
        className={cn("absolute inset-0 h-full w-full object-cover", className)}
      />
    );
  return (
    <div className={cn("absolute inset-0 bg-surface", className)} aria-hidden>
      <div className="grid-lines absolute inset-0 opacity-60" />
      <span className="absolute right-6 top-4 font-display text-[9rem] font-extrabold leading-none text-foreground/10 md:text-[12rem]">
        {mission.code.slice(-3)}
      </span>
      <span className="absolute left-6 top-6 inline-flex items-center gap-2 border border-line px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
        <Lock className="h-3 w-3" /> Imagery withheld · confidential
      </span>
    </div>
  );
}

export function MissionCard({ mission, large = false }: { mission: Mission; large?: boolean }) {
  return (
    <Link
      to="/missions"
      hash={mission.code.toLowerCase()}
      className={cn("group relative block overflow-hidden bg-surface", large ? "min-h-[520px]" : "min-h-[380px]")}
    >
      <MissionVisual mission={mission} className="hover-zoom" />
      <div className="absolute inset-0 bg-scrim" />
      <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
        <p className="eyebrow text-foreground/80">
          <span className="text-signal">{mission.code}</span> · {mission.category}
        </p>
        <h3 className={cn("mt-2 font-display font-extrabold uppercase leading-none", large ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl")}>
          {mission.title}
        </h3>
        {large && <p className="mt-4 max-w-lg text-foreground/85">{mission.summary}</p>}
        <span className="mt-5 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-foreground/90 group-hover:text-signal">
          Mission details <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

export function VideoPlayer({
  src,
  poster,
  title,
  caption,
  autoPlay = false,
  aspect = "aspect-[9/16]",
  className,
}: {
  src: string;
  poster: string;
  title: string;
  caption?: string;
  autoPlay?: boolean;
  aspect?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPlay);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.muted = false;
      void v.play();
    } else v.pause();
  };

  return (
    <figure className={cn("group", className)}>
      <div className="relative overflow-hidden bg-surface">
        <video
          ref={ref}
          src={src}
          poster={poster}
          playsInline
          preload="metadata"
          autoPlay={autoPlay}
          muted={autoPlay}
          loop={autoPlay}
          controls={playing}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className={cn(aspect, "w-full object-cover")}
          aria-label={title}
        />
        {!playing && (
          <button
            type="button"
            onClick={toggle}
            className="absolute inset-0 flex items-center justify-center bg-background/25 transition-colors hover:bg-background/10"
            aria-label={`Play ${title}`}
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-signal text-signal-foreground shadow-card transition-transform group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 fill-current" />
            </span>
          </button>
        )}
        {playing && autoPlay && (
          <button
            type="button"
            onClick={toggle}
            className="absolute right-3 top-3 rounded-full bg-background/70 p-2"
            aria-label={`Pause ${title}`}
          >
            <Pause className="h-4 w-4" />
          </button>
        )}
      </div>
      <figcaption className="mt-4">
        <p className="font-display text-2xl font-bold uppercase">{title}</p>
        {caption && <p className="mt-1 text-sm text-muted-foreground">{caption}</p>}
      </figcaption>
    </figure>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-5 md:px-10", className)}>{children}</div>;
}
