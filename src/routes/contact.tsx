import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Linkedin, Mail, MapPin, Youtube } from "lucide-react";

import { Container, PageHero } from "@/components/site/blocks";
import { media, profile } from "@/data/profile";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Mission Control — Harirajan M" },
      { name: "description", content: "Get in touch with Harirajan M, aerospace design engineer based in Madurai, Tamil Nadu — email, LinkedIn, YouTube and Instagram." },
      { property: "og:title", content: "Contact — Harirajan M" },
      { property: "og:description", content: "Open a channel with an aerospace & propulsion design engineer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

const channels = [
  { icon: Mail, label: "Primary comm link", title: "Email", value: profile.email, href: `mailto:${profile.email}`, cta: "Send message" },
  { icon: Linkedin, label: "Professional network", title: "LinkedIn", value: "harirajan-m", href: profile.linkedin, cta: "Connect" },
  { icon: Youtube, label: "Broadcast channel", title: "YouTube", value: "@nebulaspacetime", href: profile.youtube, cta: "Subscribe" },
  { icon: Instagram, label: "Visual log", title: "Instagram", value: "@nebulaspacetime", href: profile.instagram, cta: "Follow" },
  { icon: MapPin, label: "Base of operations", title: "Location", value: profile.location, href: undefined, cta: undefined },
];

function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Open channel"
        title={<>Contact mission control</>}
        intro="Open to aerospace design roles, collaborations and propulsion projects. The fastest way to reach me is email."
        image={media.nebula}
      />
      <section className="py-24">
        <Container>
          <div className="grid gap-px bg-line md:grid-cols-2 lg:grid-cols-3">
            {channels.map((c) => {
              const Icon = c.icon;
              const body = (
                <>
                  <Icon className="h-7 w-7 text-signal" />
                  <p className="eyebrow mt-8">{c.label}</p>
                  <p className="mt-2 font-display text-4xl font-extrabold uppercase">{c.title}</p>
                  <p className="mt-2 break-all text-muted-foreground">{c.value}</p>
                  {c.cta && <p className="mt-8 font-mono text-xs uppercase tracking-[0.18em] group-hover:text-signal">{c.cta} ↗</p>}
                </>
              );
              return c.href ? (
                <a key={c.title} href={c.href} target={c.href.startsWith("mailto") ? undefined : "_blank"} rel="noreferrer" className="group bg-background p-8 transition-colors hover:bg-surface">
                  {body}
                </a>
              ) : (
                <div key={c.title} className="bg-background p-8">{body}</div>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
