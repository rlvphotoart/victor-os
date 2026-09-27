# Victor OS — Meridian

Meridian is the internal design language for Victor OS. The interface is a single, persistent instrument plane with a narrow navigation spine. A workspace changes the information and tools on that plane; the operating frame stays in place.

## Principles

1. **State before destination.** Home begins with what matters now. Navigation is present, but never the main event.
2. **One plane, deliberate elevation.** Ordinary content sits on a continuous workspace. A selected object moves to a focus plane; commands and confirmations rise above it briefly.
3. **Position carries meaning.** The left edge marks the current workspace, a section's index locates it in the whole, and a datum line connects labels to content.
4. **Numbers are instruments.** A large reading, a quiet unit, and a comparison rail use the same grammar in Money, Home, and project progress.
5. **Attention is earned.** Warm state color appears for an item that needs action. Neutral and complete items stay quiet; status is also expressed with shape and text.
6. **Controls arrive near the work.** The persistent frame offers search and quick creation. Each workspace owns its filters, tabs, and actions.
7. **Motion explains continuity.** Context shifts along a short horizontal axis. Focus arrives from the workspace edge. Reduced-motion mode keeps the same hierarchy without movement.

## Signature elements

- **Meridian spine:** a narrow vertical channel with numbered workspace positions and a split-corner active locator. It stays visible on desktop.
- **Datum headers:** a short rule, folio number, and uppercase context label introduce each section without an enclosing card.
- **Split readings:** primary numeric value and smaller unit sit on separate baselines; an instrument rail below carries comparison or progress.
- **Signal marks:** one to three tiny strokes plus text indicate active, waiting, blocked, complete, and critical states without relying on color alone.
- **Focus seam:** selecting a project, task, prompt, note, or money record opens a work plane from the right. The main workspace remains visible behind it.

## Surfaces and modes

| Surface | Purpose |
| --- | --- |
| Root | Deep olive or chalk canvas. |
| Workspace | Continuous content plane with sections organized by type and spacing. |
| Instrument | Deliberately bounded area for charts, editors, or dense financial readings. |
| Focus | Contextual work plane for editing one object. |
| Command | Global action and search layer. |
| Transient | Brief success, error, and confirmation feedback. |

The active shell mode is `NORMAL`, `FOCUS`, or `COMMAND`. `ATTENTION` is a semantic state inside a workspace, not an always-on alert mode. The palette has an action view and a result view; forms use `EDIT` inside the focus plane.

## Tokens

`src/os.css` owns all Meridian tokens under the `--vos-*` prefix, including dark and light palettes, typography roles, radii, spacing, and motion. The older component anatomy in `src/styles.css` remains only to preserve working controls while the visible presentation uses Meridian rules.

## Research translated into principles

These sources informed interaction structure, not Victor OS's visual appearance:

- [Mercedes-Benz MBUX Zero Layer](https://group.mercedes-benz.com/technologie/digitalisierung/konnektivitaet/mbux-hyperscreen.html): surface relevant actions before requiring navigation into a hierarchy.
- [Autodesk Fusion workspaces](https://help.autodesk.com/cloudhelp/ENU/Fusion-GetStarted/files/GS-WORKSPACES.htm): keep a stable frame while tools change with the workspace.
- [Autodesk Fusion marking menus](https://help.autodesk.com/cloudhelp/ENU/Fusion-GetStarted/files/GUID-6514ABC1-CB75-4F0B-AB0E-316FAD36BA93.htm): contextual actions belong close to the selected object.
- [Siemens WinCC Unified guidance](https://cache.industry.siemens.com/dl/files/603/109827603/att_1351398/v1/109827603_WinCC_Unified_engineering_guideline_DOC_V4_en.pdf): persistent regions should carry stable system state; detailed alarms appear when needed.
- [Fluke multimeter display](https://www.fluke.com/en-us/learn/blog/digital-multimeters/multimeter-dial-button-jacks-display): readings, units, and status legends need separate visual roles.
- [TradingView chart accessibility](https://tradingview.com/charting-library-docs/latest/configuration/accessibility/): selected chart values need a keyboard and screen-reader path as well as pointer interaction.
- [Apple spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout/): use depth sparingly to clarify hierarchy.
- [Figma variables](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma): semantic tokens support distinct light and dark modes.

## Audit of the previous interface

The prior version used a full sidebar, a header search field, four equal KPI slots, and four large dashboard cards. That composition made every area look equally important. The same card treatment carried into projects, notes, links, prompts, and settings. Meridian replaces the full sidebar with a spine, the equal KPI strip with Now and split readings, and default cards with a continuous workspace and selective instrument surfaces. Existing IndexedDB data, routes, repository methods, formulas, import/export, and CRUD flows remain unchanged.

## Screenshot and template audit

The Home, Money, Projects, and AI Lab desktop views and the Home, Tasks, Projects, Money, AI Lab, and Settings phone views were inspected in a browser. With the wordmark ignored, the numbered spine, split readings, copper seams, datum headers, and signal marks still identify the system. Notes and Links deliberately use quieter ledger layouts; Toolbox uses a bounded instrument plane. A source search found no `rounded-xl`, `bg-card`, `border-border`, or `grid-cols-4` template classes.

The interface was checked at 1280, 768, 393, and 360 CSS pixels. No horizontal document overflow was observed. Keyboard command search, project and tool destinations, focus planes, contextual project actions, theme switching, local JSON formatting, and local backup export were exercised. Dark and light palettes were visually inspected. Physical iPhone Safari and Windows device testing remain deployment checks.
