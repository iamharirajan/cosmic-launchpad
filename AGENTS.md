<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Site content (profile, missions, media URLs) lives in `src/data/profile.ts`; pages read from it so copy changes happen in one place.
- The home hero is a scroll-driven R3F scene (`src/components/launch/`): `timeline.ts` is the pure scroll→mission-state module (tested), `LaunchCanvas.tsx` is lazy-loaded behind `ClientOnly` so three.js never runs during SSR.
- The shuttle stack (orbiter, ET, SRBs) comes entirely from the GLB, split by glTF mesh index in `Shuttle.tsx` and painted by model-space shaders in `shuttleMaterials.ts` (the GLB has no textures); don't add procedural tank/booster stand-ins.
- `LaunchPad.tsx` is the Pad 39A-style complex; deck/hardstand/ground heights are its exported constants, and smoke deflection in `Smoke.tsx` assumes them (flame trench runs along x).
- Launch-scene budgets (DPR, shadow map, smoke/trail/tree counts, MSAA) come only from `quality.ts` tiers (tested); drei `PerformanceMonitor` adapts DPR at runtime — keeps phones smooth without a separate code path.
- Scene output goes through one `EffectComposer` (bloom → grade → ACES `ToneMapping` → vignette); custom shaders emit linear HDR and flames clamp their output so bloom never sees Inf/NaN.
- The ascent camera is a fixed long-lens ground tracking camera far across the marsh (`CAM_DIST`, ocean horizon behind the pad) whose FOV zooms to keep the stack framed; point-sprite smoke (`Smoke.tsx`, `Trail.tsx`) scales `uScale` by camera FOV, so any new sprite effect must do the same.
- Draco decoder files are self-hosted in `public/draco/` because the shuttle GLB is Draco-compressed and drei would otherwise fetch a decoder from a third-party CDN.
- Media (videos, photos, GLB, Earth textures, résumé) is hosted via `lovable-assets` pointers under `src/assets/`; never commit the binaries.
- Dev-only hook: `window.__launch` (`{ progress, snap, inspect }`) — `snap = true` skips scroll smoothing; `inspect = [x,y,z]` parks the camera at that offset from the stack for model close-ups.
- Do not add `N8AO` ambient occlusion: the installed n8ao 2.x throws every frame with this three.js version and blanks the launch scene.
- The launch sky is a self-hosted photographed upper-hemisphere equirect (`loadSkyPhoto` in `LaunchPad.tsx`), loaded without Suspense so the gradient sky shows until it arrives; its `uPhotoOffset` keeps the photo sun at the scene sun azimuth.
