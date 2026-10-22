#!/usr/bin/env python3
"""Measure how often context pointers are actually followed.

A context pointer is a reference held in context that names out-of-context
material. Two kinds, and they perform very differently:

  COLD -- a line in CLAUDE.md naming a doc. Nothing has fired; the agent is
          expected to reach for it on its own.
  WARM -- a line in a SKILL.md naming a sibling file, counted only in sessions
          where that skill actually fired.

The rates this produces are the evidence behind improve/POINTERS.md. Re-run it
after rewriting a pointer to see whether the rewrite worked.

A third mode answers a different question: `--fires` reports how often each
model-invoked skill fires. That is the misfire instrument. A skill newly made
model-invocable has an untested trigger, and the failure mode is firing on work
it does not apply to -- which no read-rate number shows, because the skill did
load, it just should not have. Record a baseline the day the flag comes off, then
compare.

A fourth, `--ref`, measures hooks/ref-picker.sh. It joins every ref injection -- the
hook_additional_context attachments in transcripts, and every line of ref-picker.log -- to the
prompt it fired on, and prints: label injections per backend and event; a seeded random sample
of prompt->label and prompt->page picks to grade by hand; follow-through, meaning how often a
session later Reads a page from the injected label's Files table; and how often an injected
page is cited afterwards. Re-run it after rewriting a Covers or When entry.

Usage:
    python3 ~/.claude/skills/retro/pointer_rate.py            # cold + warm
    python3 ~/.claude/skills/retro/pointer_rate.py --cold     # cold only
    python3 ~/.claude/skills/retro/pointer_rate.py --warm     # warm only
    python3 ~/.claude/skills/retro/pointer_rate.py --fires    # per-skill fire rate
    python3 ~/.claude/skills/retro/pointer_rate.py --fires --since 2026-08-30
    python3 ~/.claude/skills/retro/pointer_rate.py --target PATH_SUBSTRING
                                                                      # one custom target
    python3 ~/.claude/skills/retro/pointer_rate.py --ref      # ref-picker accuracy
    python3 ~/.claude/skills/retro/pointer_rate.py --ref --sample 40 --seed 7

Measurement traps this script already avoids -- do not hand-roll around them:

  1. A skill's SKILL.md lands in the transcript when the skill loads, and it
     NAMES its siblings. Matching a bare filename therefore counts the skill's
     own link text as a read. Every warm rate here requires an ABSOLUTE path,
     which only a real Read/cat produces. The naive version reports 100%.
  2. CLAUDE.md and MEMORY.md are injected at request-build time and never
     persisted, so a path appearing in a transcript was genuinely reached for
     rather than merely named in steering.
  3. Config paths (settings.json) appear in transcript metadata independently of
     any read. They are useless as a control; do not add one.
  4. Sessions with fewer than 3 assistant turns are probes and aborts. Counting
     them drags every rate toward zero.
  5. Subagent transcripts (`<session>/subagents/*.jsonl`) are not sessions: no
     user prompt reaches them and they never steer by CLAUDE.md's knowledge map.
     Every mode skips them. They outnumber sessions, so counting them would put
     each rate's denominator mostly outside what the rate is about. `--ref` is the exception
     (trap 9).
  6. A skill loads three ways: a Skill call (`"skill":"name"`, or `"plugin:name"`
     for a scoped one), a typed `/name`, and a Read of its SKILL.md -- `implement`
     reads a project skill as a file. `--fires` counts all three with
     load-pattern.ere, the file hooks/ref-picker.sh reads to decide a skill is
     already loaded.
  7. `--ref`: an edit hook's injection also arrives as a hook_success record carrying the
     same stdout. Only hook_additional_context counts, or every edit injection doubles. A
     fork copies its parent's records with a new sessionId but the same uuid, so injections
     are deduped by uuid.
  8. `--ref` follow-through: a session editing a ref page Reads it first. A read of a page
     the session goes on to edit is maintenance, not use, and does not count.
  9. `--ref` reads subagent transcripts. The edit event fires inside a subagent under its
     parent's session id, so the log names the parent while the injection sits in
     `<session>/subagents/**.jsonl`. Skipping them loses those injections and makes their
     log lines look like transcript-less ones. Each file is its own stream for follow-through.
 10. `--ref`: hook output over the harness's size limit is stored as `<persisted-output>`: a
     2KB preview and the path of the full text under `<session>/tool-results/`. The model
     saw only the preview, so an injection there is reported as cut, and its headers are read
     from the saved file. Matching the preview alone misses every page after the first.
"""
import argparse
import datetime
import json
import os
import random
import re
import sys
from collections import Counter
from pathlib import Path

from analyze import redact

ROOT = Path.home() / ".claude" / "projects"
SKILLS = Path.home() / ".claude" / "skills"
LOAD_PATTERN = Path(__file__).resolve().parent / "load-pattern.ere"
MIN_TURNS = 3
MIN_FIRES = 20          # below this a warm rate is noise
MIN_BYTES = 2000
# Skills every project carries in its own .claude/skills/ (CLAUDE.md requires them), so
# model_invoked_skills, which reads only the global catalog, never sees them.
PROJECT_SKILLS = ("project",)

# Cold targets: what CLAUDE.md's Knowledge map points at.
COLD = {
    "~/.claude/domains-map":     re.compile(r"\.claude/domains-map"),
    "~/.claude/docs/README.md":  re.compile(r"\.claude/docs/README\.md"),
    "~/Systems/":                re.compile(r"/Systems/"),
    "<repo>/docs/":              re.compile(r"/docs/(?!adr)"),
}


def transcripts(since=None):
    """Yield (path, text) for every transcript with real work in it.

    `since` is a YYYY-MM-DD string; files modified before it are skipped. Use it
    to measure a window that starts the day a trigger changed.
    """
    cutoff = None
    if since:
        import datetime
        cutoff = datetime.datetime.strptime(since, "%Y-%m-%d").timestamp()
    for jf in ROOT.rglob("*.jsonl"):
        if "subagents" in jf.parts:
            continue
        try:
            if cutoff and jf.stat().st_mtime < cutoff:
                continue
            raw = jf.read_text(errors="replace")
        except OSError:
            continue
        if len(raw) < MIN_BYTES:
            continue
        turns = raw.count('"type":"assistant"') + raw.count('"type": "assistant"')
        if turns < MIN_TURNS:
            continue
        yield jf, raw


def model_invoked_skills():
    """Every skill the model can fire on its own -- i.e. that has a trigger."""
    out = []
    for d in sorted(SKILLS.iterdir()):
        sk = d / "SKILL.md"
        if not d.is_dir() or not sk.exists():
            continue
        head = sk.read_text(errors="replace")[:2000]
        if re.search(r'^disable-model-invocation:\s*true', head, re.M):
            continue
        out.append(d.name)
    return out + [n for n in PROJECT_SKILLS if n not in out]


def load_patterns(name):
    """The loads of `name` in raw transcript JSONL -- see trap 6. The file holds one POSIX
    ERE per line, which Python's re reads the same way, with NAME standing for the skill.
    Each line is compiled alone: every one starts with a literal re can scan for, where one
    alternation of all three is a byte-by-byte search that takes minutes over the corpus."""
    return [re.compile(line.replace("NAME", re.escape(name)))
            for line in LOAD_PATTERN.read_text().splitlines() if line]


def report_fires(since):
    """How often does each model-invoked skill actually fire?

    High is not automatically wrong and low is not automatically right -- the
    question is whether the rate matches what the description claims. A skill
    whose description names a common case and fires at 0.2% is not selective, it
    is not working. A narrow-by-design skill that suddenly climbs is misfiring.
    """
    names = model_invoked_skills()
    pats = {n: load_patterns(n) for n in names}
    fired = Counter()
    sessions = 0
    for _, raw in transcripts(since):
        sessions += 1
        for n, p in pats.items():
            # Every load pattern contains the bare name; the substring test skips the regex
            # on the transcripts that cannot match.
            if n in raw and any(x.search(raw) for x in p):
                fired[n] += 1
    if not sessions:
        print("no transcripts in window", file=sys.stderr)
        return 1
    window = f" since {since}" if since else ""
    print(f"corpus: {sessions} sessions{window}\n")
    print(f"  {'skill':24} {'fired':>7} {'rate':>8}")
    for n in sorted(names, key=lambda x: -fired[x]):
        print(f"  {n:24} {fired[n]:>7} {fired[n] / sessions * 100:>7.2f}%")
    print("\n  Compare each rate against what its description claims. A skill that")
    print("  names a common case and fires near zero is not selective -- it is")
    print("  missing. A narrow one that climbs after a trigger change is misfiring;")
    print("  take it to retro's skill-misfire lens with the session ids.")
    return 0


def warm_targets():
    """skill -> (fired pattern, absolute-sibling-path pattern, sibling count)."""
    out = {}
    for d in sorted(SKILLS.iterdir()):
        if not d.is_dir() or not (d / "SKILL.md").exists():
            continue
        sibs = sorted({str(p.relative_to(d)) for p in d.rglob("*.md")
                       if p.name != "SKILL.md"})
        if not sibs:
            continue
        out[d.name] = (
            re.compile(r'"skill"\s*:\s*"%s"' % re.escape(d.name)),
            # Absolute path only -- see trap 1 in the module docstring.
            re.compile(r'/\.claude/skills/%s/(?:%s)'
                       % (re.escape(d.name), "|".join(re.escape(s) for s in sibs))),
            len(sibs),
        )
    return out


# --- --ref: hooks/ref-picker.sh's picks, joined to the prompts they fired on ---------------

REF_LOG = Path(os.environ.get("REF_PICKER_LOG",
                              Path.home() / ".local/state/ref-picker/ref-picker.log"))
# The three label headers ever written: ref-picker on a prompt, ref-picker on an edit, and the
# extension-rule edit hook ref-picker replaced. A private cell repeats its label's header.
LABEL_HEAD = re.compile(
    r"^ref/(?:local/)?(?P<label>[a-z0-9-]+)/context\.md — injected because "
    r"(?:this session is editing (?P<extfile>.+)|this (?:prompt|edit of (?P<file>.+?)) is about [a-z0-9-]+):$",
    re.M)
PAGE_HEAD = re.compile(
    r"^(?P<page>\S+\.md) — injected because this (?:prompt|edit of (?P<file>.+?)) needs it "
    r"\(Jev p=(?P<p>[\d.]+), confidence=(?P<conf>[\d.]+)\):$", re.M)
# A transcript line that can hold an injection: a header, or a cut output whose preview may
# end before the first header.
INJECT_MARKS = ("injected because", "additionalContext.txt")
TURN = re.compile(r'"type": ?"(?:user|assistant)"')
PERSISTED = re.compile(r"<persisted-output>\s*Output too large \([^)]*\)\. Full output saved to: (\S+)")
PREVIEW = "Preview (first 2KB):\n"
FILES_ROW = re.compile(r"^\| \[`?([^]`]*)`?\]\(([^)]*)\) \| .* \|$", re.M)
EDIT_TOOLS = ("Edit", "Write", "MultiEdit", "NotebookEdit")
LOG_JOIN_WINDOW = 120   # seconds a prompt may precede the log line it produced


def parse_ts(s):
    try:
        return datetime.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
    except (AttributeError, ValueError):
        return None


def prompt_text(content):
    """A user record's words, or None when it is not something the user typed."""
    if isinstance(content, list):
        if any(b.get("type") == "tool_result" for b in content if isinstance(b, dict)):
            return None
        content = "\n".join(b.get("text", "") for b in content
                            if isinstance(b, dict) and b.get("type") == "text")
    if not isinstance(content, str) or not content.strip():
        return None
    # A typed slash command is stored as tags; the hook saw it as `/name args`.
    name = re.search(r"<command-name>(.*?)</command-name>", content, re.S)
    if name:
        args = re.search(r"<command-args>(.*?)</command-args>", content, re.S)
        return f"{name.group(1).strip()} {args.group(1).strip() if args else ''}".strip()
    return content


def ref_session(lines, seen=None):
    """Walk one transcript in file order.

    Returns (injections, prompts, actions):
      injections -- one dict per ref injection: kind label|page, the label or page, event
                    prompt|edit|edit-ext, the prompt it fired on, its position in the file.
      prompts    -- (timestamp, text) for every prompt the user typed, for the log join.
      actions    -- (position, what, text): what is `edit` (an Edit/Write file path), `read`
                    (a Read file path) or `say` (assistant text).
    `seen` is a set of record uuids shared across files: a fork copies its parent's records,
    uuids included, so an injection counts once -- in the file walked first, which
    ref_corpus makes the parent.
    """
    seen = set() if seen is None else seen
    prompt, injections, prompts, actions = None, [], [], []
    for pos, line in enumerate(lines):
        if not line.startswith("{"):
            continue
        is_inject = '"hook_additional_context"' in line and any(m in line for m in INJECT_MARKS)
        if not is_inject and not TURN.search(line):
            continue
        try:
            r = json.loads(line)
        except ValueError:
            continue
        t = r.get("type")
        if t == "user" and not r.get("isMeta"):
            text = prompt_text(r.get("message", {}).get("content"))
            if text is not None:
                prompt = text
                prompts.append((parse_ts(r.get("timestamp")), text))
        elif t == "assistant":
            for b in r.get("message", {}).get("content") or []:
                if not isinstance(b, dict):
                    continue
                if b.get("type") == "text":
                    actions.append((pos, "say", b.get("text", "")))
                elif b.get("type") == "tool_use":
                    inp = b.get("input") or {}
                    path = str(inp.get("file_path") or inp.get("notebook_path") or "")
                    if b.get("name") in EDIT_TOOLS:
                        actions.append((pos, "edit", path))
                    elif b.get("name") == "Read":
                        actions.append((pos, "read", path))
        elif t == "attachment" and is_inject:
            a = r.get("attachment", {})
            uuid = r.get("uuid")
            if uuid in seen:
                continue
            if uuid:
                seen.add(uuid)
            base = {"session": r.get("sessionId") or "?", "ts": parse_ts(r.get("timestamp")),
                    "prompt": prompt, "pos": pos}
            labels = set()
            for c in a.get("content") or []:
                if isinstance(c, str):
                    injections += content_injections(c, base, labels, a.get("hookEvent"))
    return injections, prompts, actions


def content_injections(c, base, labels, hook_event):
    """The injections in one hook output. `labels` carries the labels already seen in this
    record, so a private cell's repeated header counts once.

    Output over the harness's size limit reaches the model as a 2KB preview and the path of
    the full text (trap 10). The headers come from the saved file; an injection whose whole
    block fits inside the preview reached the model and is not cut.
    """
    saved = PERSISTED.match(c)
    shown = len(c[c.find(PREVIEW) + len(PREVIEW):]) if saved and PREVIEW in c else 0
    if saved:
        try:
            c = Path(saved.group(1)).read_text(errors="replace")
        except OSError:
            pass
    heads = sorted(list(LABEL_HEAD.finditer(c)) + list(PAGE_HEAD.finditer(c)), key=lambda m: m.start())
    out = []
    for n, m in enumerate(heads):
        end = heads[n + 1].start() if n + 1 < len(heads) else len(c)
        inj = {**base, "cut": saved.group(1) if saved and end > shown else None}
        if "label" in m.groupdict():
            if m.group("label") in labels:
                continue
            labels.add(m.group("label"))
            event = ("edit-ext" if m.group("extfile") else
                     "edit" if m.group("file") or hook_event == "PreToolUse" else "prompt")
            out.append({**inj, "kind": "label", "name": m.group("label"), "label": m.group("label"),
                        "event": event, "file": m.group("extfile") or m.group("file")})
        else:
            out.append({**inj, "kind": "page", "name": m.group("page"), "label": None,
                        "file": m.group("file"), "event": "edit" if m.group("file") else "prompt",
                        "p": float(m.group("p")), "conf": float(m.group("conf"))})
    return out


def files_table(label, skills=SKILLS):
    """Every page a label's Files table names, as a path under skills/ (public and private).

    The cells are read through skills/ref-cells, the symlink into the knowledge repo; a skills
    tree without it (the public repo alone) has only the published copy in skills/ref.
    """
    pages = []
    home = "ref-cells" if (skills / "ref-cells").is_dir() else "ref"
    for cell in (skills / home / label / "context.md", skills / home / "local" / label / "context.md"):
        try:
            text = cell.read_text(errors="replace")
        except OSError:
            continue
        for _, href in FILES_ROW.findall(text):
            target = os.path.normpath(cell.parent / href)
            rel = os.path.relpath(target, skills)
            if rel.startswith("..") or rel.endswith("context.md") or rel in pages:
                continue
            pages.append(rel)
    return pages


def follow_through(inj, actions, pages):
    """Did the session Read one of `pages` after this injection?

    A read of a page the session goes on to edit is maintenance of the ref, not use of it,
    and does not count. Returns the set of pages read.
    """
    after = [a for a in actions if a[0] > inj["pos"]]

    def touched(kind, p):
        # A page is one file under two names: ref-cells/<page> since the cells moved to the
        # knowledge repo, ref/<page> in sessions from before.
        names = {"skills/" + p}
        for old, new in (("ref-cells/", "ref/"), ("ref/", "ref-cells/")):
            if p.startswith(old):
                names.add("skills/" + new + p[len(old):])
        return any(what == kind and text.endswith(tuple(names)) for _, what, text in after)
    return {p for p in pages if touched("read", p) and not touched("edit", p)}


def page_used(inj, actions):
    """(cited, reread) for an injected page.

    cited  -- later assistant text names the page by its last two path components
              (`apple/simulator.md`); a bare basename like review.md is in many cells.
    reread -- a later Read opened it again.
    A session that goes on to edit the page counts as neither.
    """
    after = [a for a in actions if a[0] > inj["pos"]]
    page = inj["name"]
    if any(what == "edit" and text.endswith("skills/" + page) for _, what, text in after):
        return False, False
    short = "/".join(page.split("/")[-2:])
    cited = any(what == "say" and short in text for _, what, text in after)
    reread = any(what == "read" and text.endswith("skills/" + page) for _, what, text in after)
    return cited, reread


def log_fields(rest):
    """`key=value` tokens of one log line; a value starting with a quote is a JSON string."""
    out, i, dec = [], 0, json.JSONDecoder()
    while i < len(rest):
        eq = rest.find("=", i)
        if eq < 0:
            break
        key = rest[i:eq]
        if eq + 1 < len(rest) and rest[eq + 1] == '"':
            try:
                val, end = dec.raw_decode(rest, eq + 1)
            except ValueError:
                break
        else:
            end = rest.find(" ", eq + 1)
            end = len(rest) if end < 0 else end
            val = rest[eq + 1:end]
        out.append((key, val))
        i = end + 1
    return out


def parse_log(path=REF_LOG):
    """One dict per line of ref-picker.log and of `<log>.1`, the copy the hook rotates out at
    10MB, oldest first.

    `labels` holds every label the line chose, each with its p, confidence and outcome: one
    `label:<l>=<p>/<conf>:<outcome>` field per label. An older line chose at most one, as
    `label=<l>:<outcome>` with no p or confidence, and `label=none` (or `-`) chose none. A line
    before cc-sfy5 also has no outcome, no event and no prompt; it was always a prompt.
    """
    entries, text = [], ""
    for p in (Path(f"{path}.1"), Path(path)):
        try:
            text += p.read_text(errors="replace")
        except OSError:
            pass
    for line in text.splitlines():
        m = re.match(r"(\S+) session=(\S+) backend=(\S+) (.*)$", line)
        if not m:
            continue
        e = {"ts": parse_ts(m.group(1)), "session": m.group(2), "backend": m.group(3),
             "event": "prompt", "file": None, "labels": [],
             "failed": False, "pages_failed": False, "pages": [], "prompt": None}
        for key, val in log_fields(m.group(4)):
            if key == "pages":
                e["pages_failed"] = val == "failed"
            elif key == "event":
                e["event"] = val
            elif key == "file":
                e["file"] = val
            elif key == "prompt":
                e["prompt"] = val or None
            elif key == "call":
                e["failed"] = val == "failed"
            elif key == "label":
                lab, _, outcome = val.partition(":")
                if lab not in ("-", "none"):
                    e["labels"].append({"name": lab, "p": None, "conf": None, "outcome": outcome or None})
            elif key.startswith("label:"):
                pc, _, outcome = val.partition(":")
                p, _, conf = pc.partition("/")
                e["labels"].append({"name": key[6:], "p": float(p), "conf": float(conf), "outcome": outcome})
            elif key.startswith("page:"):
                pc, _, outcome = val.partition(":")
                p, _, conf = pc.partition("/")
                e["pages"].append({"name": key[5:], "p": float(p), "conf": float(conf), "outcome": outcome})
        entries.append(e)
    return entries


def join_log_prompt(e, prompts):
    """The transcript prompt a log line fired on: the last one typed at or before it."""
    best = None
    for ts, text in prompts:
        if ts is not None and e["ts"] is not None and ts <= e["ts"] + 2:
            best = (ts, text)
    if best and e["ts"] - best[0] <= (LOG_JOIN_WINDOW if e["event"] == "prompt" else 86400):
        return best[1]
    return None


def one_line(text, width=220):
    """A prompt as one redacted line for the sample."""
    if not text:
        return "(prompt not found)"
    text = re.sub(r"\s+", " ", redact(text)).strip()
    return text if len(text) <= width else text[:width - 1] + "…"


def born(path):
    """(creation time, path): a transcript's sort key. A fork's file is created after its
    parent's, while its copied records keep the parent's timestamps."""
    try:
        st = path.stat()
        return (getattr(st, "st_birthtime", st.st_mtime), str(path))
    except OSError:
        return (0, str(path))


def ref_corpus(since=None, log_path=REF_LOG, root=ROOT):
    """Join every transcript injection and every log line. Returns (injections, log entries,
    actions by transcript path)."""
    log = parse_log(log_path)
    cutoff = parse_ts(since + "T00:00:00Z") if since else None
    if cutoff:
        log = [e for e in log if e["ts"] and e["ts"] >= cutoff]
    log_sessions = {e["session"] for e in log}
    # Unlike every other mode this reads subagent transcripts and short sessions too (trap 9):
    # it counts injections that happened, not a rate over sessions.
    # Oldest file first, so a forked record is kept in its parent, which existed before the
    # fork copied it (trap 7).
    seen, injections, actions, prompts = set(), [], {}, {}
    for jf in sorted(root.rglob("*.jsonl"), key=born):
        sub = "subagents" in jf.parts
        try:
            if cutoff and jf.stat().st_mtime < cutoff:
                continue
            raw = jf.read_text(errors="replace")
        except OSError:
            continue
        if not any(m in raw for m in INJECT_MARKS) and (sub or jf.stem not in log_sessions):
            continue
        inj, pr, act = ref_session(raw.splitlines(), seen)
        for i in inj:
            if not cutoff or (i["ts"] or 0) >= cutoff:
                injections.append({**i, "stream": str(jf), "subagent": sub})
        actions[str(jf)] = act
        if not sub:
            prompts[jf.stem] = pr
    for e in log:
        if e["prompt"] is None:
            e["prompt"] = join_log_prompt(e, prompts.get(e["session"], []))
    # Backend for each transcript injection: the log line that picked it, when there is one.
    picked = {}
    for e in log:
        for lab in e["labels"]:
            picked.setdefault((e["session"], "label", lab["name"]), e)
        for pg in e["pages"]:
            picked.setdefault((e["session"], "page", pg["name"]), e)
    have = set()
    for i in injections:
        key = (i["session"], i["kind"], i["name"])
        have.add(key)
        i["source"] = "transcript"
        i["backend"] = ("rule" if i["event"] == "edit-ext" else
                        picked[key]["backend"] if key in picked else "unlogged")
    # A logged injection with no transcript record: the transcript is gone or under 3 turns.
    for e in log:
        found = [("label", lab["name"]) for lab in e["labels"] if lab["outcome"] == "injected"]
        found += [("page", pg["name"]) for pg in e["pages"] if pg["outcome"] == "injected"]
        for kind, name in found:
            key = (e["session"], kind, name)
            if key in have:
                continue
            have.add(key)
            injections.append({"session": e["session"], "ts": e["ts"], "kind": kind, "name": name,
                               "label": name if kind == "label" else None, "event": e["event"],
                               "file": e["file"], "prompt": e["prompt"], "pos": None,
                               "source": "log", "backend": e["backend"],
                               "stream": None, "subagent": False})
    return injections, log, actions


def report_ref(since, sample_n, seed, log_path=REF_LOG, skills=SKILLS, root=ROOT):
    """ref-picker's accuracy and follow-through: label counts, a sample to grade by hand,
    whether the session read the label's pages, and whether an injected page was used."""
    injections, log, actions = ref_corpus(since, log_path, root)
    if not injections and not log:
        print("no ref injections in transcripts or the log", file=sys.stderr)
        return 1
    labels = [i for i in injections if i["kind"] == "label"]
    pages = [i for i in injections if i["kind"] == "page"]
    window = f" since {since}" if since else ""
    print(f"corpus: {len({i['session'] for i in injections})} sessions with a ref injection{window}, "
          f"{len(log)} log lines ({log_path})\n")
    ref_counts(injections, log, actions)
    ref_sample(injections, log, sample_n, seed)
    ref_follow_through(labels, actions, skills)
    ref_pages_used(pages, actions)
    return 0


def ref_counts(injections, log, actions):
    """Section 1: label injections per backend and event, cut outputs, and every asked
    prompt or edit from the log."""
    labels = [i for i in injections if i["kind"] == "label"]
    pages = [i for i in injections if i["kind"] == "page"]
    cols = sorted({(i["backend"], i["event"]) for i in labels})
    print("LABEL INJECTIONS -- per label, by backend/event")
    print("  backend: jev|local from the log; unlogged = a model pick before the log began")
    print("  (2026-10-08); rule = the extension-rule edit hook ref-picker replaced")
    head = "".join(f" {b + '/' + e:>18}" for b, e in cols)
    print(f"  {'label':18}{head} {'total':>7}")
    per = Counter((i["name"], i["backend"], i["event"]) for i in labels)
    tot = Counter(i["name"] for i in labels)
    for name, n in tot.most_common():
        print(f"  {name:18}" + "".join(f" {per[(name, b, e)]:>18}" for b, e in cols) + f" {n:>7}")
    print(f"  {'TOTAL':18}" + "".join(f" {sum(per[(x, b, e)] for x in tot):>18}" for b, e in cols)
          + f" {len(labels):>7}")
    print(f"  pages injected: {len(pages)}; inside a subagent: "
          f"{sum(1 for i in injections if i['subagent'])}; found only in the log: "
          f"{sum(1 for i in injections if i['source'] == 'log')}")
    cut = [i for i in injections if i.get("cut")]
    outputs = {i["cut"]: i for i in cut}
    opened = sum(1 for path, i in outputs.items()
                 if any(what == "read" and text == path
                        for pos, what, text in actions.get(i["stream"], []) if pos > i["pos"]))
    print(f"  cut to a 2KB preview: {len(cut)} injections ({sum(1 for i in cut if i['kind'] == 'label')} labels, "
          f"{sum(1 for i in cut if i['kind'] == 'page')} pages) in {len(outputs)} hook outputs; "
          f"the session opened the saved file after {opened} of them")
    if log:
        print("\n  Every asked prompt or edit, from the log (outcomes start at cc-sfy5, 2026-10-11):")
        print("  labelled = lines choosing at least one label; labels = labels chosen, which is")
        print("  injected + claimed + deferred + nocell + no outcome; pages failed = the page call failed")
        print(f"  {'backend/event':18} {'asked':>6} {'labelled':>9} {'labels':>7} {'none':>6} {'failed':>7} "
              f"{'injected':>9} {'claimed':>8} {'deferred':>9} {'nocell':>7} {'no outcome':>11} {'pages failed':>13}")
        for b, e in sorted({(x["backend"], x["event"]) for x in log}):
            xs = [x for x in log if (x["backend"], x["event"]) == (b, e)]
            c = Counter(lab["outcome"] for x in xs for lab in x["labels"])
            print(f"  {b + '/' + e:18} {len(xs):>6} {sum(1 for x in xs if x['labels']):>9} "
                  f"{sum(len(x['labels']) for x in xs):>7} "
                  f"{sum(1 for x in xs if not x['labels'] and not x['failed']):>6} "
                  f"{sum(1 for x in xs if x['failed']):>7} {c['injected']:>9} {c['claimed']:>8} "
                  f"{c['deferred']:>9} {c['nocell']:>7} {c[None]:>11} "
                  f"{sum(1 for x in xs if x['pages_failed']):>13}")


def ref_sample(injections, log, sample_n, seed):
    """Section 2: a seeded random sample of prompt->label and prompt->page picks to grade."""
    labels = [i for i in injections if i["kind"] == "label"]
    pages = [i for i in injections if i["kind"] == "page"]
    rng = random.Random(seed)
    pairs, logged = [], set()
    for e in log:
        if e["failed"]:
            continue
        names = [lab["name"] for lab in e["labels"]]
        logged.update((e["session"], name) for name in names)
        pairs.append((e["ts"], e["session"], e["event"], e["file"], e["prompt"], " + ".join(names) or "none"))
    for i in labels:
        if i["event"] != "edit-ext" and (i["session"], i["name"]) not in logged:
            pairs.append((i["ts"], i["session"], i["event"], i["file"], i["prompt"], i["name"]))
    page_pairs = [(e["ts"], e["session"], e["event"], e["file"], e["prompt"],
                   f"{pg['name']} p={pg['p']} conf={pg['conf']} {pg['outcome']}")
                  for e in log for pg in e["pages"]]
    logged_pages = {(e["session"], pg["name"]) for e in log for pg in e["pages"]}
    page_pairs += [(i["ts"], i["session"], i["event"], i["file"], i["prompt"],
                    f"{i['name']} p={i.get('p')} conf={i.get('conf')} injected")
                   for i in pages if (i["session"], i["name"]) not in logged_pages]
    for title, pool in (("PROMPT -> LABEL", pairs), ("PROMPT -> PAGE", page_pairs)):
        pick = rng.sample(pool, min(sample_n, len(pool)))
        print(f"\n{title} -- {len(pick)} of {len(pool)} picks, seed {seed}; grade each right or wrong")
        for n, (ts, sid, event, f, text, got) in enumerate(sorted(pick, key=lambda x: x[0] or 0), 1):
            when = datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime("%Y-%m-%d") if ts else "?"
            where = f"edit {os.path.basename(f)}" if f else event
            print(f"  {n:>2}. [{when} {sid[:8]} {where}] -> {got}")
            print(f"      {one_line(text)}")


def ref_follow_through(labels, actions, skills):
    """Section 3: after a label is injected, does the session Read a page from its Files table?"""
    table = {name: files_table(name, skills) for name in {i["name"] for i in labels}}
    rows = Counter()
    read = Counter()
    for i in labels:
        if i["pos"] is None or not table.get(i["name"]):
            continue
        rows[i["name"]] += 1
        if follow_through(i, actions.get(i["stream"], []), table[i["name"]]):
            read[i["name"]] += 1
    print("\nFOLLOW-THROUGH -- after a label is injected, does the session later Read a page")
    print("  from that label's Files table? (transcript injections only; labels with no Files")
    print("  rows omitted; a page the session goes on to edit is maintenance, not counted)")
    print(f"  {'label':18} {'pages':>6} {'injected':>9} {'read':>6} {'rate':>8}")
    for name, n in rows.most_common():
        print(f"  {name:18} {len(table[name]):>6} {n:>9} {read[name]:>6} {read[name] / n * 100:>7.1f}%")
    if rows:
        tn, tr = sum(rows.values()), sum(read.values())
        print(f"  {'TOTAL':18} {'':>6} {tn:>9} {tr:>6} {tr / tn * 100:>7.1f}%")
    print("  Files tables are read as they stand today; a row added since an injection counts.")


def ref_pages_used(pages, actions):
    """Section 4: was an injected page cited or Read again afterwards?"""
    used = Counter()
    for i in pages:
        if i["pos"] is None:
            continue
        cited, reread = page_used(i, actions.get(i["stream"], []))
        used[(i["name"], "n")] += 1
        used[(i["name"], "cut")] += bool(i.get("cut"))
        used[(i["name"], "cited")] += cited
        used[(i["name"], "reread")] += reread
    names = sorted({i["name"] for i in pages if i["pos"] is not None}, key=lambda x: -used[(x, "n")])
    cols = ("n", "cut", "cited", "reread")
    print("\nINJECTED PAGES -- did the session use the page it was handed? (since cc-sfy5)")
    print(f"  {'page':40} {'injected':>9} {'cut':>5} {'cited':>6} {'reread':>7}")
    for name in names + (["TOTAL"] if names else []):
        n, c, ci, r = (sum(used[(x, k)] for x in (names if name == "TOTAL" else [name])) for k in cols)
        print(f"  {name:40} {n:>9} {c:>5} {ci:>6} {r:>7}")
    print("  cited = later assistant text names the page (`apple/simulator.md`). Acting on a page")
    print("  without naming it is not measured: telling that apart from coincidence takes judgment.")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cold", action="store_true", help="cold pointers only")
    ap.add_argument("--warm", action="store_true", help="warm pointers only")
    ap.add_argument("--fires", action="store_true",
                    help="per-skill fire rate -- the misfire instrument")
    ap.add_argument("--since", metavar="YYYY-MM-DD",
                    help="only sessions modified on or after this date")
    ap.add_argument("--target", metavar="SUBSTRING",
                    help="measure one custom path substring as a cold target")
    ap.add_argument("--ref", action="store_true",
                    help="ref-picker's label and page picks: counts, a sample, follow-through")
    ap.add_argument("--sample", type=int, default=20, metavar="N",
                    help="--ref: pairs per sample section (default 20)")
    ap.add_argument("--seed", type=int, default=1,
                    help="--ref: sample seed, so a graded sample can be printed again")
    args = ap.parse_args()

    if args.fires:
        return report_fires(args.since)
    if args.ref:
        return report_ref(args.since, args.sample, args.seed)

    do_cold = args.cold or args.target or not args.warm
    do_warm = args.warm or not (args.cold or args.target)

    cold = dict(COLD)
    if args.target:
        cold = {args.target: re.compile(re.escape(args.target))}

    warm = warm_targets() if do_warm else {}

    sessions = 0
    cold_hits = Counter()
    fired, warm_hits = Counter(), Counter()

    for _, raw in transcripts():
        sessions += 1
        if do_cold:
            for name, pat in cold.items():
                if pat.search(raw):
                    cold_hits[name] += 1
        for name, (fire_pat, sib_pat, _) in warm.items():
            if fire_pat.search(raw):
                fired[name] += 1
                if sib_pat.search(raw):
                    warm_hits[name] += 1

    if not sessions:
        print(f"no transcripts under {ROOT}", file=sys.stderr)
        return 1

    print(f"corpus: {sessions} sessions with >={MIN_TURNS} assistant turns\n")

    if do_cold:
        print("COLD pointers -- a steering line naming a doc")
        print(f"  {'target':30} {'sessions':>9} {'rate':>8}")
        for name in cold:
            n = cold_hits[name]
            print(f"  {name:30} {n:>9} {n / sessions * 100:>7.1f}%")
        print()

    if do_warm:
        rows = [(n, warm[n][2], fired[n], warm_hits[n], warm_hits[n] / fired[n] * 100)
                for n in warm if fired[n] >= MIN_FIRES]
        rows.sort(key=lambda r: -r[4])
        print(f"WARM pointers -- a SKILL.md naming a sibling, in sessions where it fired")
        print(f"  (skills firing < {MIN_FIRES} times omitted as noise)")
        print(f"  {'skill':18} {'sibs':>5} {'fired':>7} {'read':>6} {'rate':>8}")
        for name, nsib, f, w, rate in rows:
            print(f"  {name:18} {nsib:>5} {f:>7} {w:>6} {rate:>7.1f}%")
        if rows:
            tf = sum(r[2] for r in rows)
            tw = sum(r[3] for r in rows)
            print(f"  {'WEIGHTED':18} {'':>5} {tf:>7} {tw:>6} {tw / tf * 100:>7.1f}%")
        print("\n  Read rate falls as the pointing document's own body grows: a skill big")
        print("  enough to act on without opening anything gets acted on without opening")
        print("  anything. Thinness is the forcing function.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
