// ref/gui/scripts/preflight.mjs
//
// Scans UI source for craft defects and slop tells. Node 20+, no dependencies.
// Usage: node preflight.mjs <file-or-dir> [...more]
//
// HARD rules are defects a user hits; any hit exits 1. WARN rules are tells from
// ref/gui/slop.md and its siblings, never fatal, because a brief can earn any of
// them back. Hits go to stdout; the reason for each rule that fired and the tally
// go to stderr. Exit 2 means a path could not be read.
//
// Every check reads one line at a time, with one level of CSS brace tracking: a
// minified stylesheet hides hits, and a rule nested in SCSS or `@media` loses the
// state of its outer rule.
//
// Adapted from h3nryprod01/design-taste scripts/preflight.mjs.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, basename } from "node:path";

const SCAN_EXTENSIONS = new Set([
  ".html", ".css", ".scss", ".less", ".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx",
  ".vue", ".svelte", ".astro",
]);
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build"]);
// Tests quote banned patterns as data (`sanitize(".x { z-index: 9999 }")`).
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

const REASONS = {
  TRANSITION_ALL: "animates layout and colour properties nobody chose; name the properties",
  Z_INDEX_999: "a magic number in an arms race; use a named z-index scale",
  OUTLINE_NONE_NO_FOCUS_VISIBLE: "removes the focus ring on a selector that never gets a :focus-visible replacement",
  OUTLINE_NONE_RING_NOT_IN_FILE: "removes the focus ring and no :focus-visible ring exists in this file; check the project",
  SCALE_ZERO_ENTRY: "an entrance from scale(0) materialises from a point; enter from scale(0.95) with opacity",
  SCROLL_LISTENER: "runs on every scroll event; IntersectionObserver or scroll-driven animation often does the job",
  DASH_SEPARATOR: "a spaced em or en dash as a visible separator is the top AI copy tell (slop/copy.md)",
  GRADIENT_TEXT: "decorative, never meaningful; solid colour, emphasis by weight or size (slop.md)",
  SIDE_STRIPE_BORDER: "coloured side stripe on a card or callout (slop.md); full hairline, tint, or nothing",
  REPEATING_GRADIENT: "decorative stripe background unless the surface is a canvas or blueprint (slop.md)",
  FE_TURBULENCE: "paper-grain filter reads amateurish (slop.md); no real asset means no illustration",
  CURSOR_IMAGE: "a bespoke cursor reads amateur-flashy (slop/colour-and-type.md)",
  PURE_BLACK_WHITE: "pure black or white text or surface carries no hue; use the palette's ends",
  UNTINTED_SHADOW: "a pure black shadow on a light page reads as grey dirt; tint it toward the background (design/polish.md)",
  GOOGLE_FONTS_LINK: "self-host the face (slop/stand-ins.md)",
  VIEWPORT_UNIT: "100vh overshoots the visible area on mobile and cuts off the bottom; use 100dvh",
  Z_INDEX_UNSCALED: "z-index >= 1000 with no --z- token or zIndex map in the file; use a named scale",
  FONT_FAMILY_COUNT: "more than 3 families; display + body + optional mono",
  EYEBROW_COUNT: "more uppercase-tracked labels than ceil(sections / 3); on a Persuade page that is the eyebrow cap (slop/structure.md)",
  GHOST_CARD: "border plus a shadow blurred 16px or more on one element; pick one (slop.md, Codex ghost-card)",
  OVER_ROUNDED: "radius between 24px and a pill; cards top out at 12-16px (slop.md)",
  GLASSMORPHISM: "backdrop blur as decoration; rare and purposeful, or nothing (slop.md)",
  REFLEX_SERIF: "Fraunces and Instrument Serif are the reflex display serifs; pick a serif for a reason",
};

const DASH_SEPARATOR = /[ \t][–—][ \t]|&mdash;|&#8212;|&#x2014;/i;
const TRANSITION_ALL = /transition(?:-property)?:[^;}"']*\ball\b|\btransition-all\b/;
const SCALE_ZERO = /scale\(0\)|\bscale:\s*0(?![.\d])|\bscale-0(?![.\w-])/;
const OUTLINE_OFF = /outline:\s*["']?(none|0(?:px)?)\b|\boutline-(none|hidden)\b/;
const SCROLL_LISTENER = /addEventListener\(\s*["']scroll["']/;
const GRADIENT_TEXT = /background-clip:\s*text|\bbg-clip-text\b/;
const SIDE_STRIPE_BORDER =
  /border-(?:left|right):\s*(?:[2-9]|\d{2,})px|\bborder-[lr]-(?:\[)?[2-8](?:px)?(?:\])?(?![\w-])/;
const REPEATING_GRADIENT = /repeating-linear-gradient/;
const FE_TURBULENCE = /feTurbulence/;
const CURSOR_IMAGE = /cursor:\s*url\(/;
const PURE_BLACK_WHITE = /#(?:000000|ffffff|000|fff)\b/i;
const BLACK_IN_SHADOW = /rgba?\(\s*0\s*,\s*0\s*,\s*0\b|#000(?:000)?\b|\bblack\b/i;
const GOOGLE_FONTS_LINK = /fonts\.googleapis\.com/;
const GLASSMORPHISM = /backdrop-filter:\s*blur|\bbackdrop-blur\b/;
const REFLEX_SERIF = /Fraunces|Instrument[ +_]Serif/i;
const Z_CUSTOM_PROPERTY = /--z-[\w-]*/;
const Z_INDEX_MAP = /\bzIndex\s*[:=]\s*\{/;
const NOT_A_FAMILY = /^(?:inherit|initial|unset|revert|var\(|serif$|sans-serif$|monospace$|system-ui$|cursive$|ui-)/;

// Tailwind tokens inside a class attribute, with any variant prefixes (`md:`, `hover:`).
const TW = (token) => new RegExp(`(?:^|\\s)(?:[\\w-]+:)*${token}(?=\\s|$)`);
const TW_BORDER = TW("border(?:-[1-9])?");
const TW_BIG_SHADOW = TW("shadow-(?:xl|2xl)");
const TW_OVER_ROUNDED = TW(
  "rounded(?:-[trblse]{1,2})?-(?:3xl|4xl|\\[(?:2[4-9]|[3-9]\\d)px\\]|\\[(?:1\\.[5-9]|[2-5](?:\\.\\d+)?)rem\\])",
);

const notFound = [];
const skipped = [];

function collectFiles(inputPaths, explicit = true) {
  const files = [];
  for (const p of inputPaths) {
    let stat;
    try {
      stat = statSync(p);
    } catch {
      notFound.push(p);
      continue;
    }
    if (stat.isDirectory()) {
      const entries = readdirSync(p, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
        files.push(...collectFiles([join(p, entry.name)], false));
      }
    } else if (SCAN_EXTENSIONS.has(extname(p)) && !TEST_FILE.test(basename(p))) {
      files.push(p);
    } else if (explicit) {
      skipped.push(p);
    }
  }
  return files;
}

function snippet(line) {
  return line.trim().slice(0, 80);
}

// `.card:focus` and `.card:focus-visible` share the base `.card`. A ring on `*`,
// `:where(...)` or a bare `:focus-visible` has no base and covers every selector.
function selectorBases(selectorList) {
  return selectorList
    .replace(/::?[a-zA-Z-]+(\([^()]*\))?/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s !== "*");
}

// The line minus code comments, for rules about what renders or runs. A `//` after a
// colon is a URL scheme, not a comment.
function withoutComments(line) {
  // A block-comment continuation is `*` then a space or `/`; `*:focus-visible` is a selector.
  if (/^\s*(?:\*(?:\s|\/|$)|\/\*|\/\/|<!--)/.test(line)) return "";
  return line
    .replace(/<!--.*?-->/g, "")
    .replace(/\/\*.*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/, "$1");
}

// Largest blur radius across a `box-shadow:` list, in px; inset shadows don't count.
function shadowBlurPx(line) {
  const m = line.match(/box-shadow:\s*([^;}"']+)/);
  if (!m) return 0;
  let max = 0;
  for (const shadow of m[1].split(/,(?![^()]*\))/)) {
    if (/\binset\b/.test(shadow)) continue;
    const lengths = shadow.replace(/\([^()]*\)/g, " ").trim().split(/\s+/)
      .filter((t) => /^-?[\d.]+(px)?$/.test(t));
    if (lengths.length >= 3) max = Math.max(max, parseFloat(lengths[2]));
  }
  return max;
}

function hasCssBorder(line) {
  return /(?:^|[\s;{])border:\s*(?!none|0\b)[\d.]/.test(line);
}

// Largest radius on the line, between 24px and a pill (100px and up).
function overRoundedCss(line) {
  const m = line.match(/border-radius:\s*([^;}"']+)/);
  if (!m) return false;
  const values = [...m[1].matchAll(/([\d.]+)(px|rem)\b/g)].map(([, v, unit]) =>
    unit === "rem" ? parseFloat(v) * 16 : parseFloat(v),
  );
  const px = Math.max(0, ...values);
  return px >= 24 && px < 100;
}

function checkFile(path) {
  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);
  const hard = [];
  const warn = [];
  const outlineHits = [];
  const ringBases = new Set();
  let globalRing = false;
  const zIndexCandidates = [];
  const fontFamilies = new Set();
  let sectionCount = 0;
  let microLabelCount = 0;
  let currentCssSelectors = null;
  let block = null; // the open multi-line CSS rule

  const hit = (list, n, rule, line) => list.push({ n, rule, snippet: snippet(line) });

  lines.forEach((raw, idx) => {
    const n = idx + 1;
    const line = withoutComments(raw);
    const trimmed = line.trim();
    if (!trimmed) return;

    if (TRANSITION_ALL.test(line)) hit(hard, n, "TRANSITION_ALL", raw);
    if (SCALE_ZERO.test(line)) hit(warn, n, "SCALE_ZERO_ENTRY", raw);
    if (SCROLL_LISTENER.test(line)) hit(warn, n, "SCROLL_LISTENER", raw);
    if (DASH_SEPARATOR.test(line)) hit(warn, n, "DASH_SEPARATOR", raw);
    if (GRADIENT_TEXT.test(line)) hit(warn, n, "GRADIENT_TEXT", raw);
    if (SIDE_STRIPE_BORDER.test(line)) hit(warn, n, "SIDE_STRIPE_BORDER", raw);
    if (REPEATING_GRADIENT.test(line)) hit(warn, n, "REPEATING_GRADIENT", raw);
    if (FE_TURBULENCE.test(line)) hit(warn, n, "FE_TURBULENCE", raw);
    if (CURSOR_IMAGE.test(line)) hit(warn, n, "CURSOR_IMAGE", raw);
    if (/box-shadow:/.test(line)) {
      if (BLACK_IN_SHADOW.test(line)) hit(warn, n, "UNTINTED_SHADOW", raw);
    } else if (PURE_BLACK_WHITE.test(line)) {
      hit(warn, n, "PURE_BLACK_WHITE", raw);
    }
    if (GOOGLE_FONTS_LINK.test(line)) hit(warn, n, "GOOGLE_FONTS_LINK", raw);
    if (GLASSMORPHISM.test(line)) hit(warn, n, "GLASSMORPHISM", raw);
    if (REFLEX_SERIF.test(line)) hit(warn, n, "REFLEX_SERIF", raw);
    // `height: 100vh; height: 100dvh` is the fallback pair, not the defect.
    const nearby = `${lines[idx - 1] ?? ""}${line}${lines[idx + 1] ?? ""}`;
    if (/\bh-screen\b|\b100vh\b/.test(line) && !/dvh\b/.test(nearby)) hit(warn, n, "VIEWPORT_UNIT", raw);

    const zIndexMatch =
      line.match(/z-index:\s*(\d+)/) || line.match(/zIndex:\s*["']?(\d+)/) || line.match(/z-\[(\d+)/);
    if (zIndexMatch) {
      if (/^9{3,}$/.test(zIndexMatch[1])) hit(hard, n, "Z_INDEX_999", raw);
      else if (Number(zIndexMatch[1]) >= 1000) zIndexCandidates.push({ n, snippet: snippet(raw) });
    }

    const classMatch = line.match(/(?:class|className)\s*=\s*["']([^"']+)["']/);
    const openMatch = trimmed.match(/^([^{}]+)\{\s*$/);
    const inlineMatch = trimmed.match(/^([^{}]+)\{[^{}]*\}\s*$/);
    if (openMatch) {
      currentCssSelectors = selectorBases(openMatch[1]);
      block = { start: n, line: raw, border: false, shadow: false, upper: false, tracked: false };
    }

    // A class attribute or a one-line rule is judged on its own line; a multi-line
    // rule is judged when it closes.
    if (classMatch) {
      const cls = classMatch[1];
      if (TW_BORDER.test(cls) && TW_BIG_SHADOW.test(cls)) hit(warn, n, "GHOST_CARD", raw);
      if (TW_OVER_ROUNDED.test(cls)) hit(warn, n, "OVER_ROUNDED", raw);
      if (/\buppercase\b/.test(cls) && /\btracking-/.test(cls)) microLabelCount += 1;
    }
    if (overRoundedCss(line)) hit(warn, n, "OVER_ROUNDED", raw);
    if (inlineMatch) {
      if (hasCssBorder(line) && shadowBlurPx(line) >= 16) hit(warn, n, "GHOST_CARD", raw);
      if (/text-transform:\s*uppercase/.test(line) && /letter-spacing/.test(line)) microLabelCount += 1;
    } else if (block) {
      if (hasCssBorder(line)) block.border = true;
      if (shadowBlurPx(line) >= 16) block.shadow = true;
      if (/text-transform:\s*uppercase/.test(line)) block.upper = true;
      if (/letter-spacing/.test(line)) block.tracked = true;
    }

    let bases;
    if (classMatch) bases = [classMatch[1]];
    else if (inlineMatch) bases = selectorBases(inlineMatch[1]);
    else bases = currentCssSelectors ?? [];

    const hasRing = /focus-visible/.test(line);
    if (OUTLINE_OFF.test(line) && !hasRing) outlineHits.push({ n, snippet: snippet(raw), bases });
    if (hasRing) {
      if ((openMatch || inlineMatch) && (bases.length === 0 || /:where\(/.test(line))) globalRing = true;
      for (const b of bases) ringBases.add(b);
    }

    if (trimmed === "}") {
      if (block?.border && block.shadow) hit(warn, block.start, "GHOST_CARD", block.line);
      if (block?.upper && block.tracked) microLabelCount += 1;
      currentCssSelectors = null;
      block = null;
    }

    const sectionTags = line.match(/<section[\s>]/gi);
    if (sectionTags) sectionCount += sectionTags.length;

    const fontMatch = line.match(/font-family:\s*["']?([^;}"']+)/);
    if (fontMatch) {
      const family = fontMatch[1].split(",")[0].trim().toLowerCase();
      if (!NOT_A_FAMILY.test(family)) fontFamilies.add(family);
    }
  });

  for (const h of outlineHits) {
    if (globalRing) continue;
    if (h.bases.length > 0 && h.bases.every((b) => ringBases.has(b))) continue;
    // A ring elsewhere in the file but not on this base proves this one is unringed.
    if (ringBases.size > 0) hard.push({ n: h.n, rule: "OUTLINE_NONE_NO_FOCUS_VISIBLE", snippet: h.snippet });
    else warn.push({ n: h.n, rule: "OUTLINE_NONE_RING_NOT_IN_FILE", snippet: h.snippet });
  }
  if (zIndexCandidates.length > 0 && !Z_CUSTOM_PROPERTY.test(content) && !Z_INDEX_MAP.test(content)) {
    for (const c of zIndexCandidates) warn.push({ n: c.n, rule: "Z_INDEX_UNSCALED", snippet: c.snippet });
  }
  if (fontFamilies.size > 3) {
    warn.push({ n: 0, rule: "FONT_FAMILY_COUNT", snippet: `${fontFamilies.size} distinct families` });
  }
  if (sectionCount > 0 && microLabelCount > Math.ceil(sectionCount / 3)) {
    warn.push({ n: 0, rule: "EYEBROW_COUNT", snippet: `${microLabelCount} labels across ${sectionCount} sections` });
  }

  hard.sort((a, b) => a.n - b.n);
  warn.sort((a, b) => a.n - b.n);
  return { hard, warn };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("usage: node preflight.mjs <file-or-dir> [...more]");
    process.exit(2);
  }

  const files = collectFiles(args);
  const fired = new Set();
  let hardTotal = 0;
  let warnTotal = 0;

  for (const file of files) {
    const { hard, warn } = checkFile(file);
    for (const v of hard) console.log(`${file}:${v.n}  ${v.rule}  ${v.snippet}`);
    for (const v of warn) console.log(`${file}:${v.n}  WARN:${v.rule}  ${v.snippet}`);
    for (const v of [...hard, ...warn]) fired.add(v.rule);
    hardTotal += hard.length;
    warnTotal += warn.length;
  }

  for (const p of skipped) console.error(`skipped (not UI source, or a test): ${p}`);
  for (const p of notFound) console.error(`not found: ${p}`);
  if (fired.size > 0) {
    console.error("\nWhy:");
    for (const rule of fired) console.error(`  ${rule}: ${REASONS[rule]}`);
  }
  console.error(`\n${files.length} file(s) scanned, ${hardTotal} hard violation(s), ${warnTotal} warning(s).`);
  if (notFound.length > 0) process.exit(2);
  process.exit(hardTotal > 0 ? 1 : 0);
}

main();
