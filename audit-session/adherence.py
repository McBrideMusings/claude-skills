#!/usr/bin/env python3
"""Measure whether a steering rule is actually obeyed, across the transcript corpus.

`analyze.py` reports spend, skills fired, and friction. This reports the one thing the
negative-space lens needs and could not previously get: **of the turns where a rule should
have applied, how many complied?**

    python3 ~/.claude/skills/audit-session/adherence.py --list
    python3 ~/.claude/skills/audit-session/adherence.py --rule options-format
    python3 ~/.claude/skills/audit-session/adherence.py --rule plan-pseudocode --all-history
    python3 ~/.claude/skills/audit-session/adherence.py --rule options-format --dump-misses 20

A rule is a (trigger, compliance) pair plus the date its current wording landed. Adding a
rule means adding one entry to RULES below — not writing a new scanner.

## Why the denominator is most of the work

Every wrong adherence number this tool exists to prevent came from counting turns that
could never comply. Four exclusions, each of which produced a published error:

1. **Subagent transcripts** (`<session-id>/subagents/**.jsonl`) are not chat with the user.
   Including them put 23 swarm-worker replies into a 122-turn sample on 2026-08-20.
2. **Machine-payload replies** — a reply that parses as JSON is a harness fixture, not a
   conversation. 17 of 32 post-rule "violations" of the options rule were `test-foresight`
   verdict blobs matching the trigger on a word inside the fixture prompt.
3. **Turns predating the rule's current wording.** The options rule landed 2026-08-15
   (`fa02789`); measured across all history it reads 10.6%, and from its own landing date
   forward, 22.0%. Pass `--all-history` only when you mean it.
4. **Tool-result records carry `role: "user"` with no text.** They do NOT open a new turn.
   Treating one as a turn boundary drops every reply that involved a tool call — that bug
   reported n=32 when the true n was 122.

Exclusions 1, 2 and 4 are unconditional. 3 is the `since` field on each rule.

## What this tool cannot do

It measures **shape**, not judgement. A high miss count is a prompt to hand-label, never a
finding on its own — `--dump-misses` exists for that. On 2026-08-20, 19 of 26 sampled
"misses" turned out to be turns that owed no options block at all.
"""
import argparse, collections, json, os, re, random, sys

ROOT = os.path.expanduser("~/.claude/projects")

# --------------------------------------------------------------------------- rules

# Shared trigger: a user message that asks for a code change. Deliberately conservative —
# it wants an imperative on code, not any mention of a file. Even so it over-triggers on
# questions phrased as requests, which is why --dump-misses is the input to hand-labelling
# and never the finding.
CODING_TASK = re.compile(
    r"\b(implement|refactor|fix (?:the|this|that|it|a)\b"
    r"|add (?:a|an|the)\s+\w+|write (?:a|the) (?:function|test|script|hook|component|class)"
    r"|change (?:the|this)|update (?:the|this)|build (?:a|the)|wire (?:it|this|the)"
    r"|hook (?:it|this) up|delete the|remove the|rename (?:the|it)"
    r"|make (?:it|the) \w+)", re.I)

# ---------------------------------------------------------------------------
# READ THIS BEFORE ADDING A RULE.
#
# `trigger` is matched against the USER's message; `comply` against the reply
# (see run(), which searches t[3] then t[4]). A trigger phrased as "the reply
# contains X" therefore cannot work — it will scan the user's words for text
# that only ever appears in yours, and report a confident 0%. That mistake was
# made once, on `escape-hatch`, and the number survived until it was checked
# against a reply known to comply. The trigger names the OPPORTUNITY the user
# created; the compliance names what you owed them for it.
# ---------------------------------------------------------------------------
RULES = {
    "options-format": {
        "clause": "Each option is a bolded numbered line ... its case as bullets beneath, "
                  "the cost as the last bullet",
        "source": "CLAUDE.md §Deciding & designing",
        "since": "2026-08-15",          # fa02789 / 717d057 / 8c30e82
        "trigger": re.compile(
            r"\b(make a plan|write a plan|plan (?:for|this|it|out)|what.{0,15}plan"
            r"|how would you|what.s your plan|give me options|what are (?:my|the) options"
            r"|propose|proposal|approach(?:es)?\b|design (?:a|the) )", re.I),
        "comply": re.compile(r"^\s*(?:>\s*)?\*\*[1-4]\.\s", re.M),
        # near-miss shapes worth counting separately when triaging the misses
        "near": {
            "lettered A)/B)":        re.compile(r"^\s*(?:>\s*)?(?:\*\*)?[A-D][\.\)]\s", re.M),
            "numbered 1. **Bold**":  re.compile(r"^\s*(?:>\s*)?[1-4]\.\s+\*\*", re.M),
            "bulleted **Bold**":     re.compile(r"^\s*(?:>\s*)?[-*]\s+\*\*[A-Z]", re.M),
        },
    },
    "plan-pseudocode": {
        "clause": "Plans are structured pseudocode, not prose — types, signatures, call "
                  "stacks, component trees, file:line labels, call-stack diffs",
        "source": "CLAUDE.md §Deciding & designing",
        "since": "2026-08-20",          # the plan-format skill landed; before that, a pointer
        "trigger": re.compile(
            r"\b(make a plan|write a plan|plan (?:for|this|it|out)|what.{0,15}plan"
            r"|how would you|what.s your plan|propose|proposal|approach(?:es)?\b"
            r"|design (?:a|the) )", re.I),
        "comply": re.compile(
            r"```(?:ts|tsx|js|py|swift|go|rust|diff)\b"                    # a real code fence
            r"|[\w/\.\-]+\.(?:ts|tsx|js|jsx|py|swift|go|rs|md|sh|toml|json|lua|c|cpp|h|m|rb|yml|yaml):\d+"
            r"|```[\w]*\n(?:.*\n)*?\s*[│├└─]", re.M),
        "near": {
            "any fenced block":  re.compile(r"```"),
            "file:line label":   re.compile(r"[\w/\.\-]+\.\w{1,5}:\d+"),
        },
    },
    "finishing-sections": {
        "clause": "End every coding task with three sections — Files changed / Unchanged / "
                  "Follow-up needed",
        "source": "CLAUDE.md §Finishing work",
        "since": "2026-08-04",          # 53db7ac
        "trigger": CODING_TASK,
        "comply": re.compile(r"(?is)(?=.*files\s+changed)"
                             r"(?=.*(?:^|\W)unchanged\b)"
                             r"(?=.*follow[- ]?ups?\s+(?:needed|required))"),
        "near": {
            "Files changed only":   re.compile(r"(?i)files\s+changed"),
            "some follow-up head":  re.compile(r"(?im)^\s*[-*#>\s]*\**follow[- ]?ups?\b"),
        },
    },
    "manual-testing-steps": {
        "clause": "Manual testing steps, always, unasked — **Run:** the exact commands, "
                  "**Look for:** what a pass looks like",
        "source": "CLAUDE.md §Finishing work",
        "since": "2026-08-14",          # 3a7dcd3
        "trigger": CODING_TASK,
        "comply": re.compile(r"(?is)(?=.*\*\*Run:?\*\*)(?=.*\*\*Look for:?\*\*)"),
        "near": {
            "Run: without Look for": re.compile(r"\*\*Run:?\*\*"),
            "any 'to test' prose":   re.compile(r"(?i)\bto (?:test|verify) (?:this|it|that)\b"),
        },
    },
    # The rule that binds every list ending in recommendations, including the
    # "Follow-up needed" section §Finishing work mandates on EVERY coding task.
    # So this trigger and `finishing-sections` fire on nearly the same turns —
    # which is the point: a task-ending turn owes both shapes, and rendering the
    # report shape alone is the failure mode this measures.
    "escape-hatch": {
        "clause": "Whenever a list ends in your own recommendations, close with the "
                  "one-line escape hatch — state that typing `go` applies your picks "
                  "exactly as written, and name the per-item alternative",
        "source": "CLAUDE.md §Deciding & designing",
        "since": "2026-08-15",          # landed with the options-format rewrite
        # NOTE `run()` matches the trigger against the USER message (t[3]), never
        # the reply. So this cannot trigger on "the reply contains a Follow-up
        # section" — it triggers on the same CODING_TASK opportunity
        # `finishing-sections` uses, which is sound because §Finishing work
        # mandates a Follow-up list on every one of them, and every such list
        # ends in recommendations that owe the hatch.
        "trigger": CODING_TASK,
        "comply": re.compile(r"(?i)`go`"),
        "near": {
            "'go' unbackticked":   re.compile(r"(?i)\btype\s+\*{0,2}go\*{0,2}\b"),
            "per-item ask only":   re.compile(r"(?i)\b(?:answer|reply)\s+per\s+item\b"),
            "bare 'let me know'":  re.compile(r"(?i)\b(?:let me know|say the word|want me to)\b"),
        },
    },
}

MIN_REPLY = 600   # chars; below this a reply is an acknowledgement, not an answer
MAX_ASK   = 3000  # chars; above this the user message is a pasted brief, not a question

# A slash command reaches the transcript as TWO user messages: a short wrapper
# carrying <command-name>/orchestrate</command-name> and the args, then the
# whole skill body as its own message. The bodies are enormous — 55,561 / 8,561
# / 7,622 chars in one measured session — so MAX_ASK alone discarded every
# slash-command turn, which is most substantive work: /orchestrate, /implement,
# /review, /wrap-up. Raising the cap on that session took its turn count from
# 87 to 143, a 39% blind spot falling exactly where the finishing rules apply.
# So the body is made TRANSPARENT instead: it neither becomes the user's ask nor
# clears the wrapper that already is one. The wrapper stays the ask, because
# "/orchestrate ui ios work" is what the user actually said.
COMMAND_WRAPPER = re.compile(r"<command-name>")
COMMAND_BODY    = re.compile(r"\A(?:Base directory for this skill:|# /\w[\w-]*\s)")

# ----------------------------------------------------------------------- extraction

def is_machine_payload(text):
    """A reply that parses as JSON is a harness fixture, not conversation (exclusion 2)."""
    t = text.strip()
    if not t or t[0] not in "{[":
        return False
    try:
        json.loads(t)
        return True
    except Exception:
        # a truncated / concatenated blob still reads as machine output
        return t.startswith('{"verdict"') or t.startswith('{"')

def iter_turns():
    """Yield (date, project, path, user_text, reply_text) per completed turn."""
    seen = set()
    for dp, _dirs, files in os.walk(ROOT):
        for fn in files:
            if not fn.endswith(".jsonl"):
                continue
            path = os.path.join(dp, fn)
            if "/subagents/" in path:                       # exclusion 1
                continue
            proj = os.path.relpath(path, ROOT).split(os.sep)[0]
            cur_user, last_asst, out = None, None, []
            prev_wrapper = False
            try:
                fh = open(path, errors="replace")
            except OSError:
                continue
            with fh:
                for line in fh:
                    if '"role"' not in line:
                        continue
                    try:
                        rec = json.loads(line)
                    except Exception:
                        continue
                    uid = rec.get("uuid")
                    if uid in seen:                          # forked sessions reuse uuids
                        continue
                    seen.add(uid)
                    msg = rec.get("message") or {}
                    role, content = msg.get("role"), msg.get("content")
                    date = (rec.get("timestamp") or "")[:10]
                    if role == "user":
                        if isinstance(content, str):
                            t = content
                        elif isinstance(content, list):
                            t = " ".join(c.get("text", "") for c in content
                                         if isinstance(c, dict) and c.get("type") == "text")
                        else:
                            t = ""
                        # exclusion 4 — a tool result does not close the turn
                        if (not t.strip() or "<system-reminder>" in t[:200]
                                or t.startswith("Caveat")):
                            continue
                        # exclusion 5 — a slash-command body is not the ask; the
                        # wrapper before it is. Stay transparent so the wrapper
                        # keeps the turn open (see COMMAND_BODY above).
                        if COMMAND_BODY.match(t) or (prev_wrapper and len(t) >= MAX_ASK):
                            prev_wrapper = False
                            continue
                        prev_wrapper = bool(COMMAND_WRAPPER.search(t))
                        if cur_user and last_asst and len(last_asst) > MIN_REPLY:
                            out.append((cur_user[0], proj, path, cur_user[1], last_asst))
                        cur_user = (date, t) if len(t) < MAX_ASK else None
                        last_asst = None
                    elif role == "assistant" and isinstance(content, list):
                        t = " ".join(c.get("text", "") for c in content
                                     if isinstance(c, dict) and c.get("type") == "text")
                        if t.strip():
                            last_asst = t
            if cur_user and last_asst and len(last_asst) > MIN_REPLY:
                out.append((cur_user[0], proj, path, cur_user[1], last_asst))
            yield from out

# -------------------------------------------------------------------------- report

def run(name, rule, since, dump, dump_hits):
    turns = [t for t in iter_turns()
             if rule["trigger"].search(t[3]) and not is_machine_payload(t[4])]  # exclusion 2
    turns.sort()
    scoped = [t for t in turns if t[0] >= since] if since else turns
    if not scoped:
        print(f"{name}: no trigger opportunities since {since}. "
              f"Say 'no opportunities', never 'ignored'.")
        return

    hits = [t for t in scoped if rule["comply"].search(t[4])]
    misses = [t for t in scoped if not rule["comply"].search(t[4])]

    print(f"# {name}")
    print(f"  clause : {rule['clause']}")
    print(f"  source : {rule['source']}")
    print(f"  window : {since or 'all history'} onward "
          f"(rule's current wording landed {rule['since']})")
    print(f"\n  obeyed in {len(hits)} of {len(scoped)} trigger opportunities "
          f"— {100*len(hits)/len(scoped):.1f}%")

    excluded = len(turns) - len(scoped)
    if excluded:
        pre = [t for t in turns if t[0] < since]
        ph = sum(1 for t in pre if rule["comply"].search(t[4]))
        print(f"  ({excluded} earlier turns excluded as predating the wording; "
              f"they ran at {100*ph/len(pre):.1f}%)")

    if rule.get("near") and misses:
        print("\n  near-miss shapes among the misses:")
        for label, rx in rule["near"].items():
            c = sum(1 for t in misses if rx.search(t[4]))
            print(f"    {label:24s} {c:4d}  {100*c/len(misses):5.1f}%")

    print("\n  per-month:")
    bym = collections.defaultdict(list)
    for t in scoped:
        bym[t[0][:7]].append(t)
    for mo in sorted(bym):
        s = bym[mo]
        h = sum(1 for t in s if rule["comply"].search(t[4]))
        print(f"    {mo}  n={len(s):4d}  obeyed={h:3d}  {100*h/len(s):5.1f}%")

    print("\n  ⚠ This counts SHAPE, not judgement. Hand-label the misses before calling any")
    print("    of them a violation — many turns that trip the trigger owe no such block.")

    for label, sample, k in (("MISS", misses, dump), ("HIT", hits, dump_hits)):
        if not k:
            continue
        random.seed(11)
        for i, t in enumerate(random.sample(sample, min(k, len(sample))), 1):
            print(f"\n===== {label} [{i}] {t[0]} {t[1][:46]} len={len(t[4])}")
            print(f"  {t[2]}")
            print("USER:", " ".join(t[3].split())[:260])
            print("ASST:", " ".join(t[4].split())[:800])

def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--rule")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--since", help="override the rule's own landing date")
    ap.add_argument("--all-history", action="store_true",
                    help="ignore the rule's landing date — usually wrong, see docstring")
    ap.add_argument("--dump-misses", type=int, default=0)
    ap.add_argument("--dump-hits", type=int, default=0)
    a = ap.parse_args()

    if a.list or not a.rule:
        print("rules:")
        for k, v in RULES.items():
            print(f"  {k:18s} {v['source']}  (wording landed {v['since']})")
        print("\nAdd a rule by adding one entry to RULES in this file.")
        return
    if a.rule not in RULES:
        sys.exit(f"unknown rule {a.rule!r}; --list to see them")

    rule = RULES[a.rule]
    since = None if a.all_history else (a.since or rule["since"])
    run(a.rule, rule, since, a.dump_misses, a.dump_hits)

if __name__ == "__main__":
    main()
