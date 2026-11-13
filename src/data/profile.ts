import nebulaImg from "@/assets/images/deep-space-nebula.jpg";
import earthNightImg from "@/assets/images/earth-night-orbit.jpg";
import rhumiLaunch from "@/assets/media/rhumi-twin-launch.jpg.asset.json";
import earthLimb from "@/assets/media/earth-limb.jpg.asset.json";
import liftoffVideo from "@/assets/media/rhumi-twin-liftoff.mp4.asset.json";
import liftoffPoster from "@/assets/media/liftoff-poster.jpg.asset.json";
import interviewVideo from "@/assets/media/engineer-interview.mp4.asset.json";
import interviewPoster from "@/assets/media/interview-poster.jpg.asset.json";
import testBedVertical from "@/assets/media/test-bed-vertical.jpg.asset.json";
import testBedHorizontal from "@/assets/media/test-bed-horizontal.jpg.asset.json";
import testBedVerticalFire from "@/assets/media/test-bed-vertical-fire.mp4.asset.json";
import testBedVerticalPoster from "@/assets/media/test-bed-vertical-poster.jpg.asset.json";
import testBedHorizontalFire from "@/assets/media/test-bed-horizontal-fire.mp4.asset.json";
import testBedHorizontalPoster from "@/assets/media/test-bed-horizontal-poster.jpg.asset.json";
import cubesatPrototypes from "@/assets/media/cubesat-prototype-models.jpg.asset.json";
import solarCase from "@/assets/media/solar-case-cad.jpg.asset.json";

export const profile = {
  name: "Harirajan M",
  role: "Junior Design Engineer — Rocket & Missile Systems",
  company: "Space Zone Aerospace",
  location: "Madurai, Tamil Nadu, India",
  email: "iamharirajan2002@gmail.com",
  linkedin: "https://www.linkedin.com/in/harirajan-m-7170b6265",
  github: "https://iamharirajan.github.io",
  youtube: "https://www.youtube.com/@nebulaspacetime",
  instagram: "https://www.instagram.com/nebulaspacetime",
  summary:
    "Junior Design Engineer at Space Zone Aerospace, designing rocket and missile hardware from concept to hot-fire. Designed the Rhumi twin rocket, successfully launched by the company, and developed the vertical and horizontal test beds.",
  cycle: "Hands-on across the full cycle: SolidWorks design, fabrication, assembly, and live static fire testing.",
};

export const media = {
  rhumiLaunch: rhumiLaunch.url,
  earthLimb: earthLimb.url,
  liftoffVideo: liftoffVideo.url,
  liftoffPoster: liftoffPoster.url,
  interviewVideo: interviewVideo.url,
  interviewPoster: interviewPoster.url,
  testBedVertical: testBedVertical.url,
  testBedHorizontal: testBedHorizontal.url,
  testBedVerticalVideo: testBedVerticalFire.url,
  testBedVerticalPoster: testBedVerticalPoster.url,
  testBedHorizontalVideo: testBedHorizontalFire.url,
  testBedHorizontalPoster: testBedHorizontalPoster.url,
  cubesatPrototypes: cubesatPrototypes.url,
  solarCase: solarCase.url,
  nebula: nebulaImg,
  earthNight: earthNightImg,
};

export type MissionVideo = {
  src: string;
  poster: string;
  title: string;
  caption: string;
};

export type Mission = {
  code: string;
  category: string;
  title: string;
  summary: string;
  details: string[];
  tags: string[];
  /** Real photo only — leave empty rather than use an illustration. */
  image?: string;
  /** Extra real photos, shown as an inset on the mission page. */
  images?: string[];
  /** Show the photo at its true size on the mission page instead of stretching it. */
  imageContain?: boolean;
  /** Real footage only. */
  videos?: MissionVideo[];
  status: string;
};

export const missions: Mission[] = [
  {
    code: "MISSION-001",
    category: "Launch Vehicle",
    title: "Rhumi Twin Rocket",
    summary: "Designed the Rhumi twin rocket at Space Zone Aerospace — successfully launched by the company.",
    details: [
      "Launch footage of the Rhumi twin rocket, the vehicle I designed at Space Zone Aerospace and which the company launched successfully.",
    ],
    tags: ["Launched", "SolidWorks", "Space Zone Aerospace"],
    image: rhumiLaunch.url,
    status: "Launched",
  },
  {
    code: "MISSION-002",
    category: "Structures",
    title: "Vertical & Horizontal Test Beds",
    summary:
      "Developed both the vertical and horizontal test bed structures for rocket engine testing, and supported live static fire operations.",
    details: ["Vertical and horizontal test beds for engine testing", "Supported live static fire operations"],
    tags: ["Structures", "Test Systems", "SolidWorks"],
    image: testBedVertical.url,
    images: [testBedVertical.url, testBedHorizontal.url],
    videos: [
      {
        src: media.testBedVerticalVideo,
        poster: media.testBedVerticalPoster,
        title: "Vertical test bed — hot fire",
        caption: "Engine fired vertically on the stand built and assembled at Space Zone Aerospace.",
      },
      {
        src: media.testBedHorizontalVideo,
        poster: media.testBedHorizontalPoster,
        title: "Horizontal test bed — hot fire",
        caption: "Engine fired horizontally on the thrust stand, with instrumentation and feed lines rigged for the run.",
      },
    ],
    status: "Operational",
  },
  {
    code: "MISSION-003",
    category: "Satellite",
    title: "CubeSat & NanoSat Prototype Models",
    summary:
      "3D printed structural frames to validate fit and assembly, cutting iteration time before machined production.",
    details: ["3D printed structural frames", "Fit and assembly validated before machined production"],
    tags: ["Ultimaker Cura", "PrusaSlicer", "3D Printing"],
    image: cubesatPrototypes.url,
    imageContain: true,
    status: "Complete",
  },
  {
    code: "MISSION-004",
    category: "Innovation",
    title: "Solar-Powered Mobile Case",
    summary:
      "Designed a solar-powered mobile case using CATIA V5 Generative Shape Design (surface modeling) as part of the Naan Mudhalvan Program.",
    details: ["CATIA V5 Generative Shape Design (surface modeling)", "Part of the Naan Mudhalvan Program"],
    tags: ["CATIA V5", "Surface Modeling", "Naan Mudhalvan"],
    image: solarCase.url,
    imageContain: true,
    status: "Complete",
  },
];

export const experience = [
  "Design nozzles, injectors, pyrotechnic valves, fins, airframe sections, fuel grains, and other flight-critical rocket components in SolidWorks, delivering production-ready drawings with tolerances and material callouts.",
  "Produce mechanical drawings to aerospace standards and run DFM assessments before manufacturing release.",
  "Support live static fire operations and engine assembly/disassembly, building first-hand understanding of fit, function, and failure modes.",
  "Fabricate fuel grains and 3D print prototype components and CubeSat/NanoSat models to validate fit before machining.",
  "Own procurement workflow — specifications, BOMs, and vendor coordination for materials and parts.",
];

export const skills = [
  { group: "CAD Software", items: ["SolidWorks", "CATIA V5", "Parts", "Assemblies", "Drawings"] },
  { group: "Flight Hardware Design", items: ["Nozzles", "Injectors", "Pyro Valves", "Fins", "Airframes", "Fuel Grains"] },
  {
    group: "Manufacturing & Prototyping",
    items: ["3D Printing", "Ultimaker Cura", "PrusaSlicer", "Fuel Grain Fabrication", "Engine Assembly/Disassembly", "DFM"],
  },
  { group: "Other", items: ["Procurement & Vendor Coordination", "BOMs", "Mechanical Drawings", "C Programming"] },
];

export const education = [
  { title: "B.E. Mechanical Engineering", place: "Anna University Regional Campus, Madurai", years: "2021 – 2024", score: "CGPA 7.75" },
  { title: "Diploma — Mechanical Engineering", place: "Latha Mathavan Polytechnic College", years: "2018 – 2021", score: "92%" },
  { title: "SSLC", place: "EBG Matriculation Hr. Secondary School", years: "2018", score: "80%" },
];

export const certifications = [
  { title: "Rhumi Twin Rocket", note: "Designed by me — successfully launched by Space Zone Aerospace" },
  { title: "Vertical & Horizontal Test Beds", note: "Developed for rocket engine testing" },
  { title: "IELTS — B2 Level", note: "Upper Intermediate, April 2024" },
  { title: "NCC C Certificate", note: "National Cadet Corps — leadership & national service" },
];

export const gallery = [
  { src: rhumiLaunch.url, caption: "Rhumi twin rocket, off the pad", credit: "Space Zone Aerospace" },
  { src: liftoffPoster.url, caption: "Rhumi twin liftoff — launch footage", credit: "Space Zone Aerospace" },
  { src: testBedVertical.url, caption: "Vertical test bed — hot fire", credit: "Space Zone Aerospace" },
  { src: testBedHorizontal.url, caption: "Horizontal test bed — hot fire", credit: "Space Zone Aerospace" },
  { src: cubesatPrototypes.url, caption: "CubeSat & NanoSat prototype models", credit: "Fit & assembly check" },
  { src: solarCase.url, caption: "Solar-powered mobile case — CATIA V5 model", credit: "Naan Mudhalvan Program" },
  { src: interviewPoster.url, caption: "Mission briefing from the design office", credit: "Space Zone Aerospace" },
];
