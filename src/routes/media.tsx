import { createFileRoute } from "@tanstack/react-router";
import { Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container, PageHero, SectionHeading, VideoPlayer } from "@/components/site/blocks";
import { gallery, media, profile } from "@/data/profile";

export const Route = createFileRoute("/media")({
  head: () => ({
    meta: [
      { title: "Multimedia — Rhumi Twin Launch Videos & Images · Harirajan M" },
      { name: "description", content: "Watch the Rhumi Twin liftoff and an interview from the design office, and browse images of rockets, test beds and prototypes." },
      { property: "og:title", content: "Multimedia — Harirajan M" },
      { property: "og:description", content: "Launch videos, interviews and image gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MediaPage,
});

function MediaPage() {
  return (
    <>
      <PageHero
        eyebrow="Multimedia"
        title={<>Images & video</>}
        intro="Launch-day footage, behind-the-scenes from the design office and a gallery of hardware."
        image={media.liftoffPoster}
      />

      <section className="py-24">
        <Container>
          <SectionHeading index="01" eyebrow="Featured video" title="Watch" />
          <div className="mt-12 grid gap-10 md:grid-cols-2 lg:mx-auto lg:max-w-4xl">
            <VideoPlayer src={media.liftoffVideo} poster={media.liftoffPoster} title="Rhumi Twin liftoff" caption="The Rhumi Twin rocket clears the launch rail." />
            <VideoPlayer src={media.interviewVideo} poster={media.interviewPoster} title="Designing flight hardware" caption="On fins, nozzles, airframes — and why design changes are almost unavoidable." />
          </div>
        </Container>
      </section>

      <section className="border-t border-line bg-surface py-24">
        <Container>
          <SectionHeading index="02" eyebrow="Image of the mission" title="Gallery" />
          <div className="mt-10 grid auto-rows-[260px] gap-3 md:grid-cols-3">
            {gallery.map((g, i) => (
              <figure key={g.caption} className={`group relative overflow-hidden ${i === 0 ? "md:col-span-1 md:row-span-2" : ""} ${i === 1 ? "md:col-span-2" : ""}`}>
                <img src={g.src} alt={g.caption} loading="lazy" className="hover-zoom h-full w-full object-cover" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-scrim p-4 pt-12">
                  <p className="font-display text-xl font-bold uppercase">{g.caption}</p>
                  <p className="eyebrow mt-1">{g.credit}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-24">
        <Container className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="eyebrow"><span className="text-signal">03</span> Channel</p>
            <h2 className="display-lg mt-3">More on Nebula Spacetime</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">Space science, rocket technology and the universe — in videos and Shorts.</p>
          </div>
          <Button asChild variant="signal" size="xl">
            <a href={profile.youtube} target="_blank" rel="noreferrer"><Youtube /> Visit @nebulaspacetime</a>
          </Button>
        </Container>
      </section>
    </>
  );
}
