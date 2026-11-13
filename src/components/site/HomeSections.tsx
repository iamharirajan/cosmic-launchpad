import { Link } from "@tanstack/react-router";
import { ArrowRight, Award, GraduationCap, Instagram, Linkedin, Lock, Mail, MapPin, Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { certifications, education, experience, media, missions, profile, skills } from "@/data/profile";
import { Container, MissionCard, SectionHeading, VideoPlayer } from "./blocks";

/* Section order mirrors the live site (iamharirajan.github.io):
   01 Intro · 02 Projects · 03 Experience · 04 Systems · 05 Education · 06 Achievements · 07 YouTube · 08 Contact */

const introFacts = [
  { label: "Designed", value: "Rhumi twin rocket, launched by Space Zone Aerospace" },
  { label: "Developed", value: "Vertical and horizontal test beds for engine testing" },
  { label: "Tools", value: "SolidWorks, CATIA V5, 3D printing" },
];

const channels = [
  { icon: Mail, eyebrow: "Primary comm link", title: "Email", value: profile.email, href: `mailto:${profile.email}`, cta: "Send message" },
  { icon: MapPin, eyebrow: "Location", title: "Base of operations", value: profile.location },
  { icon: Linkedin, eyebrow: "Professional", title: "LinkedIn", value: "harirajan-m-7170b6265", href: profile.linkedin, cta: "Connect" },
  { icon: Youtube, eyebrow: "Broadcast channel", title: "YouTube", value: "@nebulaspacetime", href: profile.youtube, cta: "Subscribe" },
  { icon: Instagram, eyebrow: "Instagram", title: "Instagram", value: "@nebulaspacetime", href: profile.instagram, cta: "Follow" },
];

function PortraitFrame({ src, poster, title, aspect }: { src: string; poster: string; title: string; aspect: string }) {
  return (
    <VideoPlayer
      src={src}
      poster={poster}
      title={title}
      aspect={cn2(aspect, "max-h-[78vh]")}
      fit="contain"
      framed
      showCaption={false}
      className="mx-auto w-full max-w-[340px]"
    />
  );
}

const cn2 = (...c: string[]) => c.join(" ");

export function HomeSections() {
  return (
    <>
      {/* 01 — Intro */}
      <section id="intro" className="relative scroll-mt-20 overflow-hidden border-t border-line py-24">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-30" />
        <Container className="relative">
          <SectionHeading index="01" eyebrow="Mission briefing" title="Intro" />
          <div className="mt-12 grid items-center gap-12 md:grid-cols-[minmax(240px,340px)_1fr]">
            <PortraitFrame src={media.interviewVideo} poster={media.interviewPoster} title="Mission briefing — intro" aspect="aspect-[478/850]" />
            <div>
              <p className="eyebrow text-signal">// Junior Design Engineer · {profile.company}</p>
              <h3 className="display-md mt-4 max-w-2xl">Designing flight hardware that has to survive the test stand.</h3>
              <p className="mt-6 max-w-2xl text-lg text-foreground/85">
                A short walkthrough of what I do: designing fins, nozzles, airframes and other critical components, and why design iteration and design for manufacturability matter before a part ever reaches the machine shop.
              </p>
              <dl className="mt-8 max-w-2xl divide-y divide-line border-y border-line">
                {introFacts.map((f) => (
                  <div key={f.label} className="grid gap-1 py-4 sm:grid-cols-[140px_1fr]">
                    <dt className="eyebrow text-muted-foreground">{f.label}</dt>
                    <dd className="text-foreground/90">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Container>
      </section>

      {/* 02 — Projects */}
      <section id="missions" className="relative scroll-mt-20 overflow-hidden border-t border-line py-24">
        <img src={media.nebula} alt="" loading="lazy" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-scrim-side" />
        <Container className="relative">
          <SectionHeading
            index="02"
            eyebrow="Mission manifest"
            title="Projects"
            action={
              <Link to="/missions" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] hover:text-signal">
                View all missions <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="mt-8 flex max-w-3xl gap-4 border-l-2 border-signal bg-background/70 p-5 backdrop-blur-sm">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
            <p className="text-sm text-foreground/85">
              <span className="eyebrow mr-2 text-foreground">Confidentiality notice</span>
              Due to confidentiality agreements, specific design data, drawings, and test details are not displayed. Project descriptions reflect scope only.
            </p>
          </div>

          <div className="mt-14 grid items-center gap-12 md:grid-cols-[1fr_minmax(240px,340px)]">
            <div className="md:order-1">
              <p className="eyebrow text-signal">// MISSION-001 · Launch footage</p>
              <h3 className="display-md mt-4">Rhumi twin rocket, off the pad.</h3>
              <p className="mt-6 max-w-xl text-lg text-foreground/85">{missions[0]!.details[0]}</p>
              <Button asChild variant="frame" size="xl" className="mt-8">
                <Link to="/missions">Mission details</Link>
              </Button>
            </div>
            <div className="md:order-2">
              <PortraitFrame src={media.liftoffVideo} poster={media.liftoffPoster} title="Rhumi twin liftoff" aspect="aspect-[9/16]" />
            </div>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {missions.map((m, i) => (
              <MissionCard key={m.code} mission={m} large={i < 2} />
            ))}
          </div>
        </Container>
      </section>

      {/* 03 — Experience */}
      <section className="border-t border-line bg-surface py-24">
        <Container>
          <SectionHeading index="03" eyebrow="Flight log" title="Experience" />
          <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_2fr]">
            <div className="border border-line bg-background p-6 self-start">
              <p className="font-display text-3xl font-bold uppercase">{profile.company}</p>
              <p className="mt-2 text-foreground/85">Junior Design Engineer · Chengalpattu, Tamil Nadu</p>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-signal">Dec 2025 – Present</p>
            </div>
            <ol className="relative border-l border-line">
              {experience.map((e) => (
                <li key={e} className="relative pb-7 pl-8 last:pb-0">
                  <span className="absolute -left-[5px] top-2 h-2.5 w-2.5 bg-signal" />
                  <p className="text-lg text-foreground/90">{e}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* 04 — Systems & capabilities */}
      <section className="border-t border-line py-24">
        <Container>
          <SectionHeading index="04" eyebrow="Systems & capabilities" title="Skills" />
          <div className="mt-10 grid gap-px bg-line md:grid-cols-2 lg:grid-cols-4">
            {skills.map((s) => (
              <div key={s.group} className="bg-background p-6">
                <p className="eyebrow text-signal">// {s.group}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {s.items.map((it) => (
                    <li key={it} className="border border-line px-3 py-1.5 font-display text-base font-semibold uppercase">{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 05 Education · 06 Achievements */}
      <section className="border-t border-line bg-surface py-24">
        <Container className="grid gap-16 lg:grid-cols-2">
          <div>
            <SectionHeading index="05" eyebrow="Training" title="Education" />
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
            <SectionHeading index="06" eyebrow="Commendations" title="Achievements" />
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

      {/* 07 — YouTube */}
      <section id="channel" className="relative overflow-hidden border-t border-line">
        <img src={media.earthLimb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-scrim-side" />
        <Container className="relative py-28 md:py-36">
          <p className="eyebrow text-foreground/80"><span className="mr-3 text-signal">07</span>Transmissions · YouTube</p>
          <p className="eyebrow mt-6 text-signal">// YouTube channel · Space content creator</p>
          <h2 className="display-lg mt-3 max-w-3xl">Nebula Spacetime</h2>
          <p className="mt-5 max-w-xl text-lg text-foreground/85">
            Videos and Shorts exploring space science, aerospace engineering, rocket technology, and the universe. From propulsion to planets — demystifying the cosmos one mission at a time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="signal" size="xl">
              <a href={profile.youtube} target="_blank" rel="noreferrer">
                <Youtube /> Visit @nebulaspacetime
              </a>
            </Button>
            <Button asChild variant="frame" size="xl">
              <a href={profile.instagram} target="_blank" rel="noreferrer">
                <Instagram /> @nebulaspacetime
              </a>
            </Button>
          </div>
        </Container>
      </section>

      {/* 08 — Contact */}
      <section id="contact" className="relative scroll-mt-20 overflow-hidden border-t border-line py-24">
        <img src={media.earthNight} alt="" loading="lazy" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-scrim" />
        <Container className="relative">
          <SectionHeading index="08" eyebrow="Open channel" title="Contact" />
          <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-5">
            {channels.map((c) => (
              <div key={c.title} className="flex flex-col bg-background/85 p-6 backdrop-blur-sm">
                <c.icon className="h-5 w-5 text-signal" />
                <p className="eyebrow mt-4 text-muted-foreground">// {c.eyebrow}</p>
                <p className="mt-2 font-display text-2xl font-bold uppercase">{c.title}</p>
                <p className="mt-1 break-words text-sm text-foreground/85">{c.value}</p>
                {c.href && (
                  <a
                    href={c.href}
                    target={c.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel="noreferrer"
                    className="mt-auto inline-flex items-center gap-2 pt-5 font-mono text-xs uppercase tracking-[0.18em] text-signal hover:underline"
                  >
                    {c.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
