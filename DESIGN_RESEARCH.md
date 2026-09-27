# Victor OS interface redesign

## Reference review (27 September 2026)

The references below informed interaction and information hierarchy. Victor OS keeps its own visual language and local-first scope.

| Reference                                                                                            | Pattern worth borrowing                                                                      |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [Linear's 2026 refresh](https://linear.app/now/behind-the-latest-design-refresh)                     | Navigation recedes; content owns the visual focus. Separators are quiet.                     |
| [Linear's UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)                       | Align headers, views, and panels as one coherent system.                                     |
| [Raycast search](https://manual.raycast.com/search-bar)                                              | One prominent search field is the fastest entry point to commands.                           |
| [Raycast extensions](https://www.raycast.com/blog/how-raycast-api-extensions-work)                   | Utilities feel native when commands share a consistent interaction language.                 |
| [Vercel Geist](https://vercel.com/geist/stack)                                                       | Centralized color, type, and component rules keep a dense app consistent.                    |
| [Vercel interface guidance](https://vercel.com/design/guidelines)                                    | Visible focus, generous mobile targets, and tabular figures support precision.               |
| [Mercury Insights](https://mercury.com/insights)                                                     | A financial overview should make the numbers and time comparison immediately legible.        |
| [Ramp reporting](https://ramp.com/reporting)                                                         | Finance views should connect a headline figure with actionable detail.                       |
| [Attio views](https://attio.com/help/reference/managing-your-data/views)                             | Table and board modes serve different densities while sharing filters.                       |
| [Notion Calendar](https://www.notion.com/en-gb/product/calendar)                                     | Command navigation and restrained scheduling cues support quick orientation.                 |
| [Framer's UI tools](https://www.framer.com/solutions/ui-ux-design/)                                  | Interaction states and responsive breakpoints need design attention alongside static layout. |
| [Superhuman](https://superhuman.com/)                                                                | Keyboard-led productivity should feel direct and immediate.                                  |
| [Mobbin patterns](https://mobbin.com/)                                                               | Mobile sheets, bottom navigation, and compact search are established app patterns.           |
| [Refero's Square reference](https://styles.refero.design/style/86a6814d-2485-4fad-b6fd-56c2d0a23620) | A single accent and flat surfaces can give finance information authority.                    |

## Existing screen inventory and audit

| Area      | Existing controls                                               | Design issue addressed                                                     |
| --------- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Shell     | Sidebar, header search, avatar, mobile bottom navigation        | Flat navigation hierarchy, repeated labels, small mobile search target.    |
| Dashboard | Four KPI cards, daily overview, finance, projects, links        | Equal card weights, duplicate net position, tall mobile stack.             |
| Tasks     | Today / board / all, quick add, filters, drag, editor           | Dense controls compete with the task list.                                 |
| Projects  | Summary strip, search, status filter, project cards, editor     | Heavy cards repeat labels and dividers.                                    |
| Money     | Net position, metrics, seven tabs, bar chart, CRUD forms        | Numerical hierarchy is muted; chart lacks a useful hover or touch readout. |
| AI Lab    | Prompt cards, filters, copy/favorite/edit/duplicate, calculator | Large banner adds little; copy feedback is distant from the action.        |
| Notes     | Search, pin, editor, markdown preview                           | Card chrome dominates sparse content.                                      |
| Toolbox   | Utility rail and editor                                         | Strong foundation; focus and input surfaces need refinement.               |
| Links     | Category groups and draggable link tiles                        | Large empty category panels waste space.                                   |
| Settings  | Preferences, widgets, backup, local privacy, reset              | Sound structure; clearer hierarchy and calmer controls needed.             |
| Overlays  | Forms, confirmations, command palette, toasts                   | Focus handling and motion need consistency.                                |

## Direction

Warm graphite in dark mode and a deliberate stone-white light mode. A cool periwinkle accent identifies interaction; green remains reserved for positive financial and success meaning. The shell is a low-contrast frame. Information is grouped by whitespace and type before borders. Financial figures use tabular numerals. Short, interruptible motion conveys state changes, with reduced-motion support. The dashboard uses an asymmetric composition, while mobile uses one-hand actions, compact summaries, and bottom sheets.
