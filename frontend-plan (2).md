# Internal Mail Client — Frontend Plan

**Stack:** Angular 21+

---

## 1. System context

The mail transport already exists. It consists of two independent halves:

**Outbound** — an API accepts a send request from an employee inside the network, carries the message out through the boundary, and sends it from that employee's own Gmail account to the destination. It also persists a copy of each sent message to an internal PostgreSQL database.

**Inbound** — a fetcher pulls incoming mail from the employee's Gmail inbox, brings it back across proxies and firewalls, and stores it in a PostgreSQL database.

Two things are missing: a fetcher API for the incoming messages, and the UI itself.

### The architectural shape

Consequences that drive the frontend design:

| Property | Implication for the UI |
| --- | --- |
| Sent and received both land in Postgres | Sent folder and threading are viable from internal data |
| Ingestion is batched, not live | Sync freshness must be visible; never imply real-time delivery |
| Read/delete state has no upstream | Postgres is authoritative for user-facing state; Gmail diverges by design |
| Delivery timeout failures or authentication failures can arrive hours later | Status needs UI treatment |
| Bodies originate on the public internet | Every message body is untrusted content |

**State-ownership policy**

Postgres authoritative for flags and folders; fetcher archives in Gmail on ingestion so the upstream inbox stays clean.

---

## 2. API layer

**Design principles**

* **Contract first.** Write the OpenAPI spec, generate TypeScript types from it, stand up a MSW mock server, and build the entire UI against the mock. The frontend never blocks on backend delivery, and the spec becomes the negotiation artifact.
* **List/detail split.** Mailbox listing returns headers and preview only. Bodies and attachment metadata load on open. Mail lists get long; never ship full bodies in a list response.
* **Cursor pagination**, never offset — the mailbox shifts under the user as the fetcher runs.
* **A `?since=` changes endpoint.** With a monotonic sequence or `updated_at` column this is nearly free in Postgres, and it turns polling from "re-fetch the list" into "fetch the delta".

---

## 3. Angular 21 baseline decisions

Lock these before the first commit — retrofitting any of them is expensive.

* **Zoneless change detection.** Default for new v21 projects. Better INP, native `async`/`await` without `NgZone.run()` workarounds. Requires every component to be signal-driven or correctly `OnPush` from day one.
* **Standalone components** throughout, no NgModules.
* **Built-in control flow** (`@if` / `@for` / `@switch`); `@defer` for heavy sub-trees.
* **Signals for all state**; `resource()` / `httpResource` for reads.
* **Vitest** as the test runner.
* **Classic reactive forms for Compose.** Signal Forms are still experimental in v21.
* **`@angular/aria`** (developer preview) for headless menus, listboxes, and comboboxes.

### UI foundation

Not Angular Material. A mail client's core surfaces are a dense three-pane layout, a virtualized list with custom rows, and a compose window — all of which mean fighting Material's density defaults and component opinions.

Instead:

* **Angular CDK** — virtual scroll, overlays, drag-and-drop for folder moves, `a11y` focus traps, live announcers. This is the useful half of Material anyway.
* **`@angular/aria`** for headless interactive primitives, styled entirely in-house.
* **Tailwind + CSS custom properties as design tokens** for styling. Logical properties (`padding-inline`, `margin-block`, `inset-inline-start`) are mandatory, not preferred — the UI is Hebrew and therefore RTL. Ban `left`/`right`/`margin-left` in review; Tailwind's `ps-*`/`pe-*`/`ms-*`/`me-*` utilities cover the common cases. Also define an explicit Hebrew font stack; Tailwind's defaults don't include one.

> Note: we are rebuilding Gmail's *look* without Material's *components*. The full visual specification — tokens, type scale, layout metrics, component anatomy — is section 8. Read it before writing any CSS.

---

## 4. Application structure

```
src/app/
  core/          auth, HTTP interceptors, error handling, config, sync status
  shared/        UI primitives, pipes, aria wrappers
  features/
    mailbox/     list, thread view, message renderer
    compose/     editor, recipients, attachments
    search/
    settings/    signature, rules, preferences
  data/          API clients, DTOs + mappers, signal stores
```

Route-level lazy loading per feature. `@defer` for attachment previewer.

### State and data layer

* **One signal store service per feature** (`MailboxStore`, `ComposeStore`). `signal` for raw state, `computed` for derived views. No NgRx.
* **Optimistic updates** for read/unread, star, and delete, with rollback on failure. **Never optimistic for send** — the outbound path can fail after the request returns.
* **Draft autosave** on a debounce to the server, with a local fallback so a network blip doesn't lose a long email.
* **Polling against the changes endpoint**, tuned to the fetcher's actual cadence (15 mins). Polling faster than the fetcher runs is pure waste.

---

## 5. Security

Message bodies came from the public internet and must be treated as hostile.

* **Render bodies in a sandboxed iframe** with a locked CSP. Not `innerHTML` plus `DomSanitizer` — the sanitizer is not designed as a mail-body renderer.
* **Rewrite links** — `rel="noopener noreferrer"` at minimum, real target visible on hover, optionally an interstitial.
* **Contain style bleed** so message CSS cannot leak into the application shell.
* **Attachment previews render server-side.** Never execute or parse untrusted files in the client.
* **External recipient warnings** on compose. Every outbound message leaves the corporate network — make that unmissable rather than assumed.

---

## 6. Screens

| Screen | Notes |
| --- | --- |
| Mailbox list | Virtualized (`cdk-virtual-scroll`), `@for` with `track` on a stable id. Must stay smooth at 10k+ messages. |
| Thread / reading pane | Sandboxed body renderer, collapsed quote history, attachment strip. |
| Compose | Recipients with external warning, attachments, draft autosave, reply/forward quoting |
| Sent & delivery status | Sent copies already exist in Postgres |
| Search | Postgres full-text (`tsvector` + GIN) is sufficient at this scale. Note the Hebrew stemming gap — see cross-cutting concerns. |
| Folders & bulk actions | Internal constructs, not Gmail labels. Start with Inbox / Sent / Drafts / Trash. |

### Application shell

A persistent **sync status** element showing last sync time. This is specific to this system and users will look at it constantly. Silently implying freshness the system can't deliver destroys trust quickly.

---

## 7. Cross-cutting concerns

### Hebrew UI, multilingual content

The interface is Hebrew and therefore RTL. Message content is arbitrary — Hebrew, English, Arabic, anything a correspondent sends. This mix is the defining constraint of the app, not a localization afterthought, and it needs handling in three distinct places.

**The application shell is RTL.** `dir="rtl"` at the document root, logical CSS properties throughout, `he-IL` registered as the Angular locale so `DatePipe`, `DecimalPipe`, and `Intl` formatting follow. Directional icons — reply, forward, back, chevrons, list indentation — must be mirrored explicitly; logical properties don't touch SVG. Contact and folder sorting uses `Intl.Collator('he')`, not raw string comparison.

**Message text has its own direction, per string.** Subjects, sender names, previews, and body text each carry their own direction independent of the shell. Set `dir="auto"` on every element rendering message-derived text, so the first strong character decides. An English subject in an RTL list must not be laid out RTL.

**Isolate embedded LTR strings.** Email addresses, filenames, URLs, and version numbers inside Hebrew sentences produce the classic bidi mangling — punctuation migrating to the wrong end, address fragments reordering. Wrap them in `<bdi>` or apply `unicode-bidi: isolate`. Recipient chips are the highest-risk surface here, since an address rendered wrong is a correctness problem, not a cosmetic one.

**The body iframe must not inherit the shell's direction.** The sandboxed renderer should start direction-neutral and let the message's own `dir` attributes and markup govern. Inheriting `rtl` from the app would silently reverse the layout of every English email.

**Compose needs a per-message direction control** with a sensible default from the first typed characters, and it must write `dir` into the outgoing HTML so the recipient's client renders it correctly. Mail sent from a Hebrew UI to an English-speaking recipient is a normal case here, not an edge case.

* **Search across a mixed corpus needs a decision.** PostgreSQL has no Hebrew stemmer; the `simple` configuration does no stemming and Hebrew morphology is heavy, so recall on Hebrew content will be mediocre. We are accepting that for v1.

---

## 8. Visual design system

### 8.1 Direction

The target is Gmail's current (Material 3) visual language: a tinted app background with white content panes floating on it, generously rounded corners, a blue-tinted selection state, pill-shaped navigation, and near-zero chrome — no heavy borders, separation by surface color and whitespace instead of rules.

What we take from Gmail: palette, type scale, density model, row anatomy, pill nav, compose-as-floating-window, snackbars.

What we deliberately don't take:

* **Gmail's brand marks.** Different product, no Gmail logo, no Google "M" glyph, no Google-branded avatar treatment.
* **Tabs (Primary/Social/Promotions), labels-as-colored-chips, conversation categories.** Our folders are internal constructs; don't imply Gmail semantics we don't have.
* **The "instant" affordances.** Gmail implies live delivery. We don't have it. Sync status is a first-class shell element, not a hidden refresh button — see 8.9.

The values below are approximations of Gmail's palette, tuned for contrast. Treat them as our tokens, not as a claim of pixel-parity; check them against a real Gmail window during the first UI review and adjust once, centrally.

### 8.2 Color tokens

All color lives in CSS custom properties on `:root`. **No component may contain a literal color value.** Dark mode swaps the same token names under `[data-theme="dark"]`; nothing else changes.

**Light**

| Token | Value | Use |
| --- | --- | --- |
| `--surface-app` | `#F6F8FC` | Page background behind the panes |
| `--surface-raised` | `#FFFFFF` | List pane, reading pane, compose window, menus |
| `--surface-sunken` | `#EAF1FB` | Search field at rest, inline input wells |
| `--surface-hover` | `#F2F6FC` | Row and button hover |
| `--surface-pressed` | `#E4EBF5` | Active/pressed |
| `--surface-selected` | `#C2E7FF` | Selected mail rows, selected chips |
| `--surface-nav-selected` | `#D3E3FD` | Active folder pill |
| `--surface-scrim` | `rgba(0,0,0,0.32)` | Modal backdrop |
| `--text-primary` | `#1F1F1F` | Sender, subject, body |
| `--text-secondary` | `#5F6368` | Preview text, timestamps, counts, helper text |
| `--text-disabled` | `#9AA0A6` | Disabled labels |
| `--text-on-selected` | `#001D35` | Text on `--surface-selected` |
| `--text-on-accent` | `#FFFFFF` | Text on filled buttons |
| `--accent` | `#0B57D0` | Primary actions, links, focus ring |
| `--accent-hover` | `#0842A0` | |
| `--accent-quiet` | `#D3E3FD` | Tonal button fill, accent backgrounds |
| `--border-subtle` | `#E0E3E7` | Dividers, input outlines |
| `--border-strong` | `#C4C7C5` | Focused input outline, checkbox rest |
| `--star` | `#F9AB00` | Starred state (amber, and only here) |
| `--status-ok` | `#188038` | Delivered, sync fresh |
| `--status-ok-bg` | `#E6F4EA` | |
| `--status-warn` | `#A8710A` | External recipient, sync stale |
| `--status-warn-bg` | `#FEF7E0` | |
| `--status-error` | `#B3261E` | Send failed, auth expired |
| `--status-error-bg` | `#FCE8E6` | |
| `--status-pending` | `#5F6368` | Queued, syncing |

**Dark**

| Token | Value |
| --- | --- |
| `--surface-app` | `#131314` |
| `--surface-raised` | `#1E1F20` |
| `--surface-sunken` | `#2A2B2D` |
| `--surface-hover` | `#2D2F31` |
| `--surface-pressed` | `#37393B` |
| `--surface-selected` | `#004A77` |
| `--surface-nav-selected` | `#0842A0` |
| `--text-primary` | `#E3E3E3` |
| `--text-secondary` | `#9AA0A6` |
| `--text-on-selected` | `#C2E7FF` |
| `--accent` | `#A8C7FA` |
| `--accent-quiet` | `#0842A0` |
| `--border-subtle` | `#37393B` |
| `--status-*-bg` | ~12% alpha of the corresponding status hue over `--surface-raised` |

Two dark-mode rules that are easy to get wrong:

* **Message bodies never invert.** HTML email is authored for a white canvas; inverting it produces unreadable mail and broken images. The body iframe keeps a light canvas in both themes, with a visible seam between it and the dark shell (see 8.10).
* **Status colors are re-picked for dark, not alpha-faded.** `#B3261E` on `#131314` fails contrast.

Contrast floor: 4.5:1 for text, 3:1 for icons and interactive outlines, in both themes. `--text-secondary` on `--surface-selected` is the pair that usually fails — check it explicitly.

### 8.3 Typography

**`Heebo` for the entire UI.** It is Roboto extended with Hebrew by design — same skeleton, same metrics, same weights — so mixed Hebrew/Latin UI strings sit on one baseline with no fallback seam, which is exactly the failure mode a Hebrew mail client hits on every list row. This gives us Gmail's typographic texture and a real Hebrew face in one file. `Assistant` as the secondary for large headings if we want a slightly warmer display voice; optional, and used only above 20px.

```css
--font-ui: 'Heebo', 'Assistant', 'Segoe UI', Roboto, Arial, sans-serif;
--font-mono: 'IBM Plex Mono', 'Courier New', monospace; /* raw headers, message source */
```

Self-host the fonts. This is an internal network; a Google Fonts CDN request is both a boundary crossing and a hard dependency on egress.

**Scale**

| Role | Size / line-height | Weight | Notes |
| --- | --- | --- | --- |
| Thread subject | 22 / 28 | 400 | Reading pane header |
| Section header | 16 / 24 | 500 | Settings, dialog titles |
| Body & UI default | 14 / 20 | 400 | Everything unmarked |
| List row — unread | 14 / 20 | 500 | Sender and subject only |
| List row — read | 14 / 20 | 400 | |
| Preview text | 14 / 20 | 400 | `--text-secondary` |
| Meta | 12 / 16 | 400 | Timestamps, sizes, counts, badges |
| Button label | 14 / 20 | 500 | |

Hebrew-specific type rules:

* **No italics anywhere in the shell.** Hebrew has no true italic; browsers synthesize a slant that looks like a rendering bug. Emphasis is weight or color. (Inside the message body iframe, whatever the sender wrote stands.)
* **No negative letter-spacing.** Hebrew is set with normal tracking; tightening it damages legibility of similar letterforms.
* **`font-variant-numeric: tabular-nums`** on timestamps, message counts, and attachment sizes so columns don't jitter as rows scroll.
* **Sentence case for all UI copy**, matching Gmail. No title case, no ALL CAPS — uppercase is meaningless in Hebrew and produces inconsistent bilingual labels.

### 8.4 Spacing, radius, elevation

4px base grid. `--space-1: 4px` through `--space-8: 32px`; nothing between steps.

**Radius** — Gmail is heavily rounded, and this is most of the visual resemblance:

```css
--radius-sm: 4px;    /* checkboxes, small badges */
--radius-md: 8px;    /* menus, dialogs, compose window, attachment cards */
--radius-lg: 16px;   /* panes, search field, list rows */
--radius-full: 9999px; /* nav pills, chips, FAB-style compose button */
```

Use **logical radius properties** for anything rounded on one side only — the nav pill and the search field both are. `border-start-end-radius` / `border-end-end-radius`, never `border-top-right-radius`. Physical radius properties do not flip in RTL and will produce a pill pointing the wrong way.

**Elevation** — three levels, no more:

```css
--elev-1: 0 1px 2px rgba(60,64,67,0.30), 0 1px 3px 1px rgba(60,64,67,0.15); /* raised panes, resting compose */
--elev-2: 0 1px 3px rgba(60,64,67,0.30), 0 4px 8px 3px rgba(60,64,67,0.15); /* menus, popovers, focused search */
--elev-3: 0 4px 4px rgba(60,64,67,0.30), 0 8px 12px 6px rgba(60,64,67,0.15); /* dialogs, dragged row */
```

In dark mode, shadows read as noise. Replace elevation with surface lightening: `--surface-raised` at level 1, a `+4%` white overlay at level 2, `+8%` at level 3.

### 8.5 Layout metrics

`inline-start` is the **right** edge in this app. The nav rail sits on the right, the reading pane opens to the left of the list, compose anchors bottom-left. Write it all logically; never encode that mapping in a property name.

```
┌──────────────────────────────────────────────────────────────┐
│  [sync status]        [ search ]           [avatar] [ ☰ ]    │  app bar 64
├────────────────────┬────────────────────┬────────────────────┤
│                    │                    │  ● כתיבה           │  nav rail 256
│   reading pane     │    message list    │  ▸ דואר נכנס   12  │  (72 collapsed)
│   (fills)          │    min 360         │  ▸ נשלחו           │
│                    │                    │  ▸ טיוטות       3  │
│                    │                    │  ▸ אשפה            │
└────────────────────┴────────────────────┴────────────────────┘
```

* **App bar** 64px, background `--surface-app` (not white — it merges with the page, Gmail-style).
* **Nav rail** 256px expanded / 72px collapsed. Below 1024px it becomes a CDK overlay drawer entering from `inline-start`.
* **List pane** min 360px, `--surface-raised`, `--radius-lg`, `--elev-1`, with `--space-2` gap from the app background on all sides. The floating-card look is what makes it read as Gmail rather than as a generic table.
* **Reading pane** same treatment. Below 1280px, drop to a single pane and route to the thread instead of splitting.
* **Compose** floats above everything, anchored bottom / `inline-start`.

**Density** — three modes, exactly like Gmail, driven by one token flipped on `:root`:

| Mode | `--row-height` | Preview text |
| --- | --- | --- |
| Compact | 40px | hidden |
| Default | 48px | inline, single line |
| Comfortable | 56px | inline, single line |

The virtual scroll `itemSize` reads this token. Any component that hardcodes a row height breaks the virtualizer — flag it in review.

### 8.6 Message list row

Order along the inline axis, `inline-start` → `inline-end`: checkbox → star → sender → subject + preview → attachment indicator → timestamp. In RTL that puts the checkbox and star at the **right**, timestamp at the **left**, mirroring Gmail's layout rather than translating it.

* Sender column: fixed 168px (default density), `text-overflow: ellipsis`, `dir="auto"`.
* Subject and preview share one flex line: subject, then a `—` separator in `--text-secondary`, then preview. Preview truncates first.
* Timestamp: 96px, tabular numerals, `--text-secondary`. Today → time; this year → day + month; older → short date.
* Attachment indicator: paperclip icon only in the row; count only if > 1.

**Row states**, in precedence order:

| State | Treatment |
| --- | --- |
| Read | `--surface-app` background, weight 400 |
| Unread | `--surface-raised` background, weight 500, `--text-primary` on preview too |
| Hover | `--surface-hover`, `--elev-1`, row actions replace the timestamp |
| Selected | `--surface-selected`, `--text-on-selected` |
| Keyboard focus | 2px `--accent` outline, `outline-offset: -2px` (inset, so it isn't clipped by the virtual scroll viewport) |

Hover actions (archive, delete, mark read, snooze) appear on hover **and on focus**, never hover-only — keyboard users must reach them.

**Truncation and bidi interact.** `text-overflow: ellipsis` places the ellipsis at the element's own logical end. An English subject inside an RTL row without `dir="auto"` truncates at the visually wrong side and reads as a rendering bug. Every truncating cell that renders message-derived text needs `dir="auto"`; this is a visual requirement as much as a correctness one.

### 8.7 Component specs

**Search field.** Full width of the list+reading area, 48px tall, `--radius-lg`, `--surface-sunken`, no border. On focus: `--surface-raised`, `--elev-2`, radius stays, and the advanced-search panel drops below as an overlay. Leading icon at `inline-start`, clear button at `inline-end`.

**Buttons.**

| Variant | Fill | Text | Use |
| --- | --- | --- | --- |
| Filled | `--accent` | `--text-on-accent` | Send, primary dialog action |
| Tonal | `--accent-quiet` | `--accent` | Compose, secondary emphasis |
| Text | none | `--accent` | Cancel, tertiary |
| Icon | none, `--surface-hover` on hover | `--text-secondary` | Toolbar |

Height 40px, `--radius-full`, inline padding `--space-4`. Icon buttons 40×40 with a `--radius-full` hover circle. Minimum touch target 48px via padding, not size.

**Compose window.** 500×560px, anchored bottom / `inline-start` with `--space-4` offset. `--radius-md` on the two top corners only (logical: `border-start-start-radius`, `border-start-end-radius`). Header 40px, `--surface-sunken`, title 14/500. Supports minimized (header only), default, and full-screen. Multiple compose windows tile along the inline axis from `inline-start`.

**Recipient chips.** 24px tall, `--radius-full`, `--surface-sunken`, avatar circle 20px at `inline-start`, remove ✕ at `inline-end`. Address wrapped in `<bdi>` — non-negotiable. **External recipients** (all of them, in this system) get `--status-warn-bg` fill, a 1px `--status-warn` outline, and a small outbound-arrow icon. Because every recipient is external, the compose window also carries a persistent banner above the recipient field: `--status-warn-bg`, 32px, one line — the chip styling is the per-recipient reminder, the banner is the standing one.

**Attachment cards.** 72px tall, `--radius-md`, `--border-subtle` outline, file-type icon, name (`<bdi>`, truncating), size in tabular numerals. Never render a thumbnail generated client-side — previews come from the server (section 5).

**Snackbar.** Bottom / `inline-start`, above the compose stack, `--radius-md`, dark surface (`#2E3134`) in both themes, single action in `--accent` on dark. Undo lives here for archive/delete; 6s, pausing on hover.

**Empty and loading states.** Skeleton rows must match `--row-height` exactly so the list doesn't reflow on load. Empty states get one line of instruction, not an illustration and not an apology: "אין הודעות בתיקייה זו." Errors state what failed and what to do.

### 8.8 Delivery status

Gmail has nothing to copy here — send either works or bounces days later by email. Our outbound path can fail hours after the request returned, so status is a rendered property of every sent message.

Small pill badge, `--radius-full`, 20px, 12/500 text, in the list row (replacing the attachment slot) and again in the thread header:

| Status | Fill / text | Label |
| --- | --- | --- |
| Queued | `--surface-sunken` / `--status-pending` | ממתין לשליחה |
| Sent | none — no badge | — |
| Failed | `--status-error-bg` / `--status-error` | השליחה נכשלה |
| Auth expired | `--status-error-bg` / `--status-error` | נדרשת התחברות מחדש |

Failed and auth-expired rows also get a 3px `--status-error` bar on the `inline-start` edge of the row, so a failure is visible while scanning without reading badges. Auth-expired is the only status that opens a shell-level banner, since it blocks all sending, not one message.

### 8.9 Sync status — the signature element

The one place we intentionally diverge from Gmail's visual language, because Gmail's whole design implies immediacy and ours can't. It sits in the app bar at `inline-start`, always visible, never a tooltip:

* A 8px dot plus a relative timestamp: `סונכרן לפני 4 דקות`, in 12/400 `--text-secondary`, updating on a 30s tick.
* **Fresh** (< 1 fetcher interval): `--status-ok` dot.
* **Stale** (> 2 intervals): `--status-warn` dot, and the text shifts to `--status-warn`.
* **Syncing**: `--accent` dot with a 1.4s opacity pulse — the only ambient animation in the app.
* **Failed**: `--status-error` dot, text becomes a button opening the failure detail.

It is a `<button>` with an `aria-live="polite"` region for state changes. Deliberately understated at rest and impossible to miss when stale; the whole point is that a user glancing at an empty inbox can tell "nothing arrived" from "nothing was fetched."

### 8.10 The message body frame

The iframe is a hard boundary, visually as well as securely.

* Inject a minimal reset only: `margin: 0`, `font: 14px/1.5` a neutral system stack, `img { max-width: 100% }`, `word-break: break-word`. Nothing else. Do not push app tokens, app fonts, or app direction across the boundary.
* **No `dir` on the iframe's root.** It starts neutral; the message's own markup governs (section 7).
* Canvas stays `#FFFFFF` in both themes, with `color-scheme: light` set inside so the embedded document doesn't get UA dark treatment. In dark mode, separate it from the shell with `--radius-md` and a 1px `--border-subtle` frame rather than letting white bleed to the pane edge.
* Height: auto-size to content via a `postMessage` from inside, capped; no internal scrollbars for normal mail.
* Collapsed quote history: Gmail's `···` control, 24×16, `--surface-sunken`, `--radius-sm`, rendered by the shell **outside** the iframe wherever possible.

### 8.11 Motion

```css
--dur-fast: 100ms;   /* hover, checkbox, ripple-less press */
--dur-base: 200ms;   /* menus, chips, snackbar */
--dur-slow: 300ms;   /* compose open, drawer, pane transitions */
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

Animate `opacity` and `transform` only — never `height`, `top`, or layout properties, and never anything inside a virtualized row.

Directional transitions mirror: drawers and panes enter from `inline-start`/`inline-end`, expressed as `translateX(100%)` under a `[dir]` selector or via a logical custom property. A drawer sliding in from the wrong side is the single most common RTL animation bug.

Everything above collapses to `--dur-fast` opacity fades under `prefers-reduced-motion: reduce`, and the sync pulse stops entirely.

### 8.12 Icons

**Material Symbols Rounded**, self-hosted as a variable font, weight 400, optical size 20 for toolbars and 24 for the nav. Rounded matches Gmail's current set and the radius scale.

Mirrored explicitly in RTL (`transform: scaleX(-1)` under `[dir="rtl"]`, applied by an `appIconMirror` directive, not ad hoc): reply, reply-all, forward, send, arrow-back, chevrons, undo/redo, list indentation, tree expanders.

**Never mirrored**: clock faces, the star, checkmarks, attachment paperclip, search magnifier, logos, anything containing Latin or Hebrew text.

### 8.13 Tokens in code

Tokens are defined once in CSS and exposed to Tailwind, so a utility class and a hand-written rule can't drift:

```css
/* styles/tokens.css */
:root {
  --surface-app: #F6F8FC;
  --accent: #0B57D0;
  --row-height: 48px;
  /* …full set above… */
}
[data-theme="dark"] { --surface-app: #131314; /* … */ }
[data-density="compact"] { --row-height: 40px; }

@theme inline {
  --color-surface-app: var(--surface-app);
  --color-accent: var(--accent);
  --radius-lg: 16px;
}
```

Theme and density are attributes on `<html>`, driven by a signal in `core/`, persisted per user. No theme-conditional logic in components.

### 8.14 Review checklist

A PR touching UI is not mergeable until all of these hold:

1. No physical direction properties (`left`, `right`, `margin-left`, `padding-right`, `border-top-right-radius`, `text-align: left`). Enforce with stylelint.
2. No literal color, font size, or radius in a component — tokens only.
3. Every element rendering message-derived text has `dir="auto"`; every embedded address, filename, or URL is inside `<bdi>`.
4. No `font-style: italic` in shell CSS.
5. Visible focus state on every interactive element; every hover-revealed action also reveals on focus.
6. Row heights read `--row-height`; nothing hardcodes 48px.
7. Contrast checked in both themes, including text on `--surface-selected`.
8. Animation limited to `opacity`/`transform`, and reduced-motion honoured.
9. New surface checked at 1280px, 1024px, and 768px, and with the nav rail collapsed.
10. Screenshot of the surface in Hebrew **with an English-subject message in view** attached to the PR. Most bidi regressions are invisible in a Hebrew-only screenshot.
