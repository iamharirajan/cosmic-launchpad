import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { Container, MissionVisual, PageHero, VideoPlayer } from "@/components/site/blocks";
import { media, missions, profile } from "@/data/profile";

export const Route = createFileRoute("/missions")({
  head: () => ({
    meta: [
      { title: "Missions — Harirajan M · Rocket & Test Bed Design" },
      { name: "description", content: "Rhumi Twin rocket, engine test beds, propulsion components, CubeSat prototypes and more — the mission manifest of Harirajan M." },
      { property: "og:title", content: "Missions — Harirajan M" },
      { property: "og:description", content: "Rocket, test bed, propulsion and satellite projects from concept to hot-fire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MissionsPage,
});

function MissionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Mission manifest"
        title={<>Missions</>}
        intro={profile.cycle}
        image={media.rhumiLaunch}
      />
      <Container className="py-10">
        <div className="flex items-start gap-4 border border-line bg-surface p-5">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Confidentiality notice.</span> Specific design data, drawings and test details are covered by confidentiality agreements and are not shown. Descriptions reflect scope only.
          </p>
        </div>
      </Container>
      <div className="pb-24">
        {missions.map((m, i) => (
          <section key={m.code} id={m.code.toLowerCase()} className="scroll-mt-20 border-t border-line">
            <div className={`grid lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div className="relative min-h-[420px] overflow-hidden">
                <MissionVisual mission={m} eager={i === 0} />
                {m.images && m.images.length > 1 && (
                  <img
                    src={m.images[1]}
                    alt={`${m.title} — second test bed`}
                    loading="lazy"
                    width={1600}
                    height={720}
                    className="absolute bottom-4 right-4 hidden h-24 w-40 border border-line object-cover shadow-card md:block"
                  />
                )}
                <span className="absolute left-5 top-5 bg-background/80 px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] backdrop-blur">
                  Status · <span className="text-signal">{m.status}</span>
                </span>
              </div>
              <div className="flex items-center px-5 py-14 md:px-14">
                <div>
                  <p className="eyebrow"><span className="text-signal">{m.code}</span> · {m.category}</p>
                  <h2 className="display-lg mt-3">{m.title}</h2>
                  <p className="mt-5 max-w-xl text-lg text-foreground/85">{m.summary}</p>
                  <ul className="mt-7 space-y-3">
                    {m.details.map((d) => (
                      <li key={d} className="flex gap-3 text-foreground/80">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-signal" />
                        {d}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-2">
                    {m.tags.map((t) => (
                      <span key={t} className="border border-line px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                  {m.videos && m.videos.length > 0 && (
                    <div className="mt-10 grid gap-6 sm:grid-cols-2">
                      {m.videos.map((v) => (
                        <VideoPlayer key={v.src} src={v.src} poster={v.poster} title={v.title} caption={v.caption} aspect="aspect-video" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
