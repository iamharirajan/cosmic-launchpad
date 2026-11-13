import { Link } from "@tanstack/react-router";
import { ArrowRight, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { media, missions, profile } from "@/data/profile";
import { Container, MissionCard, SectionHeading, VideoPlayer } from "./blocks";

const stats = [
  { value: "01", label: "Rocket designed & launched", note: "Rhumi Twin" },
  { value: "02", label: "Engine test beds", note: "Vertical + horizontal" },
  { value: "06+", label: "Flight-critical component types", note: "Nozzles to fuel grains" },
  { value: "B.E.", label: "Mechanical engineering", note: "Anna University · 2024" },
];

export function HomeSections() {
  const rhumi = missions[0]!;
  const rest = missions.slice(1);
  return (
    <>
      {/* Featured story */}
      <section className="relative overflow-hidden border-t border-line">
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[60vh] lg:min-h-[86vh]">
            <img
              src={media.rhumiLaunch}
              alt="The Rhumi Twin rocket leaving its launch rail at the coastal launch site"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute left-5 top-5 bg-signal px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-signal-foreground md:left-10 md:top-10">
              Featured mission
            </div>
          </div>
          <div className="flex items-center bg-surface">
            <div className="px-5 py-16 md:px-14 lg:py-24">
              <p className="eyebrow"><span className="text-signal">MISSION-001</span> · Launch vehicle</p>
              <h2 className="display-lg mt-4">Mission<br />Rhumi Twin</h2>
              <p className="mt-6 max-w-lg text-lg text-foreground/85">
                {rhumi.summary} I took the vehicle from SolidWorks models to production drawings, and stood on the beach as it cleared the rail.
              </p>
              <ul className="mt-8 space-y-3 border-t border-line pt-6">
                {rhumi.details.map((d) => (
                  <li key={d} className="flex gap-3 text-foreground/85">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-signal" />
                    {d}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild variant="signal" size="xl">
                  <Link to="/missions">All missions</Link>
                </Button>
                <Button asChild variant="frame" size="xl">
                  <Link to="/media">Watch the launch</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-line bg-background">
        <Container className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div key={s.label} className={i > 0 ? "border-l border-line px-5 py-10 md:px-8" : "px-0 py-10 md:pr-8"}>
              <p className="font-display text-6xl font-extrabold text-foreground md:text-7xl">{s.value}</p>
              <p className="mt-3 font-display text-lg font-semibold uppercase">{s.label}</p>
              <p className="eyebrow mt-1">{s.note}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* Missions */}
      <section className="py-24">
        <Container>
          <SectionHeading
            index="01"
            eyebrow="Mission manifest"
            title="Recent missions"
            action={
              <Link to="/missions" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] hover:text-signal">
                View all missions <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {rest.map((m, i) => (
              <MissionCard key={m.code} mission={m} large={i < 2} />
            ))}
          </div>
        </Container>
      </section>

      {/* Watch */}
      <section className="relative overflow-hidden border-t border-line bg-surface py-24">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-40" />
        <Container className="relative">
          <SectionHeading index="02" eyebrow="Multimedia · Watch" title={<>From the<br />launch site</>} />
          <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_1fr_1.1fr]">
            <VideoPlayer
              src={media.liftoffVideo}
              poster={media.liftoffPoster}
              title="Rhumi Twin liftoff"
              caption="Launch-day footage from the coastal launch site."
              autoPlay
            />
            <VideoPlayer
              src={media.interviewVideo}
              poster={media.interviewPoster}
              title="Inside the design office"
              caption="Harirajan on designing fins, nozzles, airframes and other critical components."
            />
            <div className="lg:pt-6">
              <p className="eyebrow text-signal">Engineer's log</p>
              <blockquote className="mt-4 font-display text-4xl font-bold uppercase leading-tight md:text-5xl">
                “Design changes are almost unavoidable — the job is to make the hardware ready for them.”
              </blockquote>
              <p className="mt-6 text-muted-foreground">
                Hands-on across the full cycle: SolidWorks design, fabrication, assembly and live static fire testing.
              </p>
              <Button asChild variant="frame" size="xl" className="mt-8">
                <Link to="/media">Open the gallery</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Channel */}
      <section className="relative overflow-hidden">
        <img src={media.earthLimb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-scrim-side" />
        <Container className="relative py-28 md:py-40">
          <p className="eyebrow text-foreground/80">Transmissions · YouTube & Instagram</p>
          <h2 className="display-lg mt-4 max-w-3xl">Nebula Spacetime</h2>
          <p className="mt-5 max-w-xl text-lg text-foreground/85">
            Videos and Shorts exploring space science, rocket technology and the universe — demystifying the cosmos one mission at a time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="signal" size="xl">
              <a href={profile.youtube} target="_blank" rel="noreferrer">
                <Youtube /> Watch on YouTube
              </a>
            </Button>
            <Button asChild variant="frame" size="xl">
              <a href={profile.instagram} target="_blank" rel="noreferrer">@nebulaspacetime</a>
            </Button>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t border-line py-24">
        <Container className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="eyebrow"><span className="text-signal">03</span> Open channel</p>
            <h2 className="display-lg mt-3 max-w-3xl">Have hardware that needs to fly?</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="signal" size="xl">
              <Link to="/contact">Contact mission control</Link>
            </Button>
            <Button asChild variant="frame" size="xl">
              <a href={profile.resumeUrl} target="_blank" rel="noreferrer">Download résumé</a>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
