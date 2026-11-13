import nozzleImg from "@/assets/images/nozzle-hardware.jpg";
import staticFireImg from "@/assets/images/static-fire.jpg";
import cubesatImg from "@/assets/images/cubesat-prototype.jpg";
import solarCaseImg from "@/assets/images/solar-case.jpg";
import rhumiLaunch from "@/assets/media/rhumi-twin-launch.jpg.asset.json";
import earthLimb from "@/assets/media/earth-limb.jpg.asset.json";
import liftoffVideo from "@/assets/media/rhumi-twin-liftoff.mp4.asset.json";
import liftoffPoster from "@/assets/media/liftoff-poster.jpg.asset.json";
import interviewVideo from "@/assets/media/engineer-interview.mp4.asset.json";
import interviewPoster from "@/assets/media/interview-poster.jpg.asset.json";
import resume from "@/assets/media/resume.pdf.asset.json";

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
  resumeUrl: resume.url,
  summary:
    "Junior Design Engineer at Space Zone Aerospace, designing rocket and missile hardware from concept to hot-fire. Designed the Rhumi Twin rocket, successfully launched by the company, and developed the vertical and horizontal test beds.",
};

export const media = {
  rhumiLaunch: rhumiLaunch.url,
  earthLimb: earthLimb.url,
  liftoffVideo: liftoffVideo.url,
  liftoffPoster: liftoffPoster.url,
  interviewVideo: interviewVideo.url,
  interviewPoster: interviewPoster.url,
};

export type Mission = {
  code: string;
  category: string;
  title: string;
  summary: string;
  details: string[];
  tags: string[];
  image: string;
  status: string;
};

export const missions: Mission[] = [
  {
    code: "MISSION-001",
    category: "Launch Vehicle",
    title: "Rhumi Twin Rocket",
    summary:
      "Designed the Rhumi Twin rocket — successfully launched by Space Zone Aerospace from its coastal launch site.",
    details: [
      "Flight hardware designed in SolidWorks from concept to launch",
      "Production-ready drawings with tolerances and material callouts",
      "Supported integration, rail loading and launch-day operations",
    ],
    tags: ["SolidWorks", "Launch Vehicle", "Flight Proven"],
    image: rhumiLaunch.url,
    status: "Launched",
  },
  {
    code: "MISSION-002",
    category: "Test Systems",
    title: "Vertical & Horizontal Test Beds",
    summary:
      "Developed both vertical and horizontal test bed structures that hold rocket engines through live static fire testing.",
    details: [
      "Structures engineered to withstand engine thrust loads",
      "Present at live static fire operations end-to-end",
      "Engine assembly and disassembly on propulsion hardware",
    ],
    tags: ["Structures", "Static Fire", "SolidWorks"],
    image: staticFireImg,
    status: "Operational",
  },
  {
    code: "MISSION-003",
    category: "Propulsion",
    title: "Flight-Critical Components",
    summary:
      "Nozzles, injectors, pyrotechnic valves, fins, airframe sections and fuel grains — full design packages for manufacturing release.",
    details: [
      "Mechanical drawings to aerospace standards",
      "DFM assessments before manufacturing release",
      "Fuel grain fabrication for hybrid and solid motors",
    ],
    tags: ["Nozzles", "Injectors", "Pyro Valves", "DFM"],
    image: nozzleImg,
    status: "Ongoing",
  },
  {
    code: "MISSION-004",
    category: "Satellite",
    title: "CubeSat & NanoSat Prototypes",
    summary:
      "3D-printed structural frames to validate fit and assembly, cutting iteration time before machined production.",
    details: [
      "FDM prototypes sliced in Ultimaker Cura and PrusaSlicer",
      "Fit and assembly checks before machining",
      "Faster design iteration on satellite structures",
    ],
    tags: ["3D Printing", "Cura", "PrusaSlicer"],
    image: cubesatImg,
    status: "Complete",
  },
  {
    code: "MISSION-005",
    category: "Innovation",
    title: "Solar-Powered Mobile Case",
    summary:
      "A PV-integrated mobile case designed with CATIA V5 Generative Shape Design, selected in the state-level Naan Mudhalvan program.",
    details: [
      "Surface modelling in CATIA V5 GSD",
      "Selected at state level — Naan Mudhalvan program",
      "Concept to presentation-ready model",
    ],
    tags: ["CATIA V5", "Surface Modelling", "State Selected"],
    image: solarCaseImg,
    status: "Complete",
  },
];

export const experience = [
  "Design nozzles, injectors, pyrotechnic valves, fins, airframe sections, fuel grains and other flight-critical rocket components in SolidWorks.",
  "Produce mechanical drawings to aerospace standards and run DFM assessments before manufacturing release.",
  "Support live static fire operations and engine assembly/disassembly — first-hand understanding of fit, function and failure modes.",
  "Fabricate fuel grains and 3D print prototype components and CubeSat/NanoSat models to validate fit before machining.",
  "Own the procurement workflow — specifications, BOMs and vendor coordination for materials and parts.",
];

export const skills = [
  { group: "CAD", items: ["SolidWorks", "CATIA V5", "Parts & Assemblies", "Drawings", "Surface Modelling"] },
  { group: "Aerospace Hardware", items: ["Nozzles", "Injectors", "Pyro Valves", "Fins", "Airframes", "Fuel Grains"] },
  { group: "Manufacturing", items: ["3D Printing", "Ultimaker Cura", "PrusaSlicer", "DFM", "Engine Assembly"] },
  { group: "Operations", items: ["Procurement", "BOMs", "Vendor Coordination", "Static Fire Support"] },
  { group: "Other", items: ["C Programming", "Technical Drawing", "CFD (learning)"] },
];

export const education = [
  { title: "B.E. Mechanical Engineering", place: "Anna University Regional Campus, Madurai", years: "2021 – 2024", score: "CGPA 7.75" },
  { title: "Diploma — Mechanical Engineering", place: "Latha Mathavan Polytechnic College", years: "2018 – 2021", score: "92%" },
  { title: "SSLC", place: "EBG Matriculation Hr. Secondary School", years: "2018", score: "80%" },
];

export const certifications = [
  { title: "IELTS — B2 Level", note: "Upper Intermediate · April 2024" },
  { title: "NCC C Certificate", note: "National Cadet Corps — leadership & national service" },
  { title: "Naan Mudhalvan — State Level", note: "Solar-powered mobile case selected statewide" },
];

export const gallery = [
  { src: rhumiLaunch.url, caption: "Rhumi Twin clears the launch rail", credit: "Space Zone Aerospace" },
  { src: staticFireImg, caption: "Static fire on a horizontal test bed", credit: "Illustration" },
  { src: nozzleImg, caption: "Propulsion hardware close-up", credit: "Illustration" },
  { src: cubesatImg, caption: "3D-printed CubeSat frame prototype", credit: "Illustration" },
  { src: earthLimb.url, caption: "Earth's limb at orbital sunrise", credit: "Archive" },
  { src: solarCaseImg, caption: "Solar-powered mobile case concept", credit: "Illustration" },
];
