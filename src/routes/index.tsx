import { createFileRoute } from "@tanstack/react-router";

import { LaunchHero } from "@/components/launch/LaunchHero";
import { HomeSections } from "@/components/site/HomeSections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Harirajan M — Rocket & Missile Systems Design Engineer" },
      {
        name: "description",
        content:
          "Scroll to launch: the portfolio of Harirajan M, designer of the Rhumi Twin rocket and rocket engine test beds at Space Zone Aerospace.",
      },
      { property: "og:title", content: "Harirajan M — Rocket & Missile Systems Design Engineer" },
      { property: "og:description", content: "Designer of the Rhumi Twin rocket. Nozzles, injectors, test beds and airframes — concept to hot-fire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <LaunchHero />
      <HomeSections />
    </>
  );
}
