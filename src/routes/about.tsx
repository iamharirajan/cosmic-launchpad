import { createFileRoute } from "@tanstack/react-router";
import { Award, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container, PageHero, SectionHeading } from "@/components/site/blocks";
import { certifications, education, experience, media, profile, skills } from "@/data/profile";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Flight Log — Experience & Skills · Harirajan M" },
      { name: "description", content: "Experience at Space Zone Aerospace, CAD and manufacturing skills, education and certifications of Harirajan M." },
      { property: "og:title", content: "Flight Log — Harirajan M" },
      { property: "og:description", content: "Junior Design Engineer at Space Zone Aerospace. SolidWorks, CATIA V5, DFM and static fire operations." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Flight log · Experience"
        title={<>Flight log</>}
        intro={profile.summary}
        image={media.earthNight}
      />

      <section className="py-24">
        <Container>
          <SectionHeading index="01" eyebrow="Current assignment" title="Space Zone Aerospace" />
          <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_2fr]">
            <div className="space-y-4">
              <div className="border border-line bg-surface p-6">
                <p className="eyebrow">Role</p>
                <p className="mt-2 font-display text-3xl font-bold uppercase">Junior Design Engineer</p>
                <p className="mt-4 eyebrow">Base</p>
                <p className="mt-1">Chengalpattu, Tamil Nadu</p>
                <p className="mt-4 eyebrow">Mission elapsed</p>
                <p className="mt-1 font-mono">DEC 2025 — PRESENT</p>
              </div>
            </div>
            <ol className="relative border-l border-line">
              {experience.map((e, i) => (
                <li key={e} className="relative pb-8 pl-8 last:pb-0">
                  <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 bg-signal" />
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">Log entry {String(i + 1).padStart(2, "0")}</p>
                  <p className="mt-2 text-lg text-foreground/90">{e}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <section className="border-t border-line bg-surface py-24">
        <Container>
          <SectionHeading index="02" eyebrow="Systems & capabilities" title="Skills" />
          <div className="mt-10 grid gap-px bg-line md:grid-cols-2 lg:grid-cols-5">
            {skills.map((s) => (
              <div key={s.group} className="bg-surface p-6">
                <p className="eyebrow text-signal">{s.group}</p>
                <ul className="mt-4 space-y-2">
                  {s.items.map((it) => (
                    <li key={it} className="font-display text-xl font-semibold uppercase">{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-24">
        <Container className="grid gap-16 lg:grid-cols-2">
          <div>
            <SectionHeading index="03" eyebrow="Training" title="Education" />
            <ul className="mt-8 divide-y divide-line">
              {education.map((e) => (
                <li key={e.title} className="flex gap-5 py-6">
                  <GraduationCap className="mt-1 h-6 w-6 shrink-0 text-signal" />
                  <div className="flex-1">
                    <p className="font-display text-2xl font-bold uppercase">{e.title}</p>
                    <p className="text-muted-foreground">{e.place}</p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <p>{e.years}</p>
                    <p className="mt-1 text-signal">{e.score}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeading index="04" eyebrow="Commendations" title="Achievements" />
            <ul className="mt-8 divide-y divide-line">
              {certifications.map((c) => (
                <li key={c.title} className="flex gap-5 py-6">
                  <Award className="mt-1 h-6 w-6 shrink-0 text-signal" />
                  <div>
                    <p className="font-display text-2xl font-bold uppercase">{c.title}</p>
                    <p className="text-muted-foreground">{c.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}
