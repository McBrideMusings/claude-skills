#!/usr/bin/env python3
"""Mechanical extraction pass for `audit-session`.

Turns a corpus of Claude Code transcripts into the facts the lenses judge.
The lenses never eyeball raw JSONL — they read this output.

Usage:
    python3 analyze.py <corpus-path> [--since YYYY-MM-DD] [--json]
    python3 analyze.py <corpus-path> --steering        # inventory only
    python3 analyze.py <corpus-path> --steering --dump # + the full text of each source

<corpus-path> is either
    a single  <session-id>.jsonl
    a project dir  ~/.claude/projects/<encoded-cwd>/
    ALL          every project dir

Validated 2026-08-20 against 4.3 GB of transcripts.

Two traps this encodes, both learned the hard way:
  * Forked sessions copy prior history into a new file. Dedupe by message uuid
    or every fork double-counts (2,422 duplicate turns in one project).
  * Sub-agent transcripts live in <session-id>/subagents/**.jsonl, NOT beside
    the parent .jsonl. Miss them and sub-agent cost reads as zero.

A third, for --steering: the injected steering is NOT in the user/assistant
records. It arrives as `attachment` records (hook stdout, the skill listing,
the agent and deferred-tool listings, MCP instructions, the auto-mode flags).
Scan only user+assistant and the whole steering set reads as absent.

What --steering CANNOT see, and says so rather than under-reporting silently:
the CLAUDE.md / CLAUDE.local.md / MEMORY.md reminder is injected at request
build time and never written to the JSONL. Read those from disk — which is
what SKILL.md Phase 3 already tells the lenses to do.
"""
import os, sys, json, glob, datetime, argparse
from collections import Counter, defaultdict

ROOT = os.path.expanduser("~/.claude/projects")

# $/Mtok: (input, cache-write, cache-read, output)
PRICE = {"opus": (15.0, 18.75, 1.50, 75.0),
         "sonnet": (3.0, 3.75, 0.30, 15.0),
         "haiku": (1.0, 1.25, 0.10, 5.0)}

def tier(model):
    m = (model or "").lower()
    return "opus" if "opus" in m else ("haiku" if "haiku" in m else "sonnet")

def ts(s):
    try: return datetime.datetime.fromisoformat((s or "").replace("Z", "+00:00"))
    except Exception: return None


def corpus_files(path):
    """Return (main_files, sub_files) for a session file, a project dir, or ALL."""
    if path == "ALL":
        dirs = [os.path.join(ROOT, d) for d in os.listdir(ROOT)
                if os.path.isdir(os.path.join(ROOT, d)) and not d.startswith("-private")]
    elif os.path.isdir(path):
        dirs = [path]
    elif os.path.isfile(path):
        sid = os.path.basename(path)[:-6]
        d = os.path.dirname(path)
        return [path], (glob.glob(os.path.join(d, sid, "subagents", "*.jsonl"))
                        + glob.glob(os.path.join(d, sid, "subagents", "*", "*.jsonl")))
    else:
        sys.exit(f"no such corpus: {path}")
    main, sub = [], []
    for d in dirs:
        main += glob.glob(os.path.join(d, "*.jsonl"))
        sub += glob.glob(os.path.join(d, "*", "subagents", "*.jsonl"))
        sub += glob.glob(os.path.join(d, "*", "subagents", "*", "*.jsonl"))
    return main, sub


class Facts:
    def __init__(self):
        self.cost = Counter(); self.tok = Counter(); self.turns = Counter()
        self.tools = Counter(); self.tool_cost = Counter(); self.tool_errors = Counter()
        self.skills = Counter(); self.skill_args = defaultdict(list)
        self.agents = Counter()
        self.bash = Counter(); self.bash_blocked = Counter()
        self.denied = {}; self.denied_cmd = Counter()
        self.cmd_prefix = Counter()
        self.dup_reads = Counter(); self.dup_bash = Counter()
        self.user_msgs = []          # (timestamp, text) — the steering signal
        self.steering = defaultdict(lambda: {"n": 0, "texts": {}})   # source -> texts by hash
        self.hook_cmds = Counter()   # every hook the harness reports running
        self.ctx_bucket = Counter()
        self.first_ctx = []
        self.sessions = 0; self.dupe_turns = 0
        self.tool_wait = 0.0; self.human_wait = 0.0
        self.slow_tools = Counter()
        self.seen = set()


def add_steering(F, source, text):
    """Record one injected steering source, deduped by content."""
    if not text or not text.strip():
        return
    text = text.strip()
    e = F.steering[source]
    e["n"] += 1
    e["texts"][hash(text)] = text


def reminder_blocks(content):
    """<system-reminder> blocks riding on a user turn, if this build persists them."""
    blocks = [content] if isinstance(content, str) else [
        b.get("text") for b in (content or [])
        if isinstance(b, dict) and b.get("type") == "text"
    ]
    for txt in blocks:
        if txt and "<system-reminder>" in txt:
            yield "system-reminder", txt


def collect_steering(r, F):
    """Pull injected steering out of an `attachment` or `system` record.

    Every branch here exists because the text it grabs shapes the session before
    the user says anything. Anything not steering (token counters, turn timings)
    is deliberately dropped.
    """
    if r.get("type") == "system":
        # The only steering-relevant system record: which hooks the harness ran.
        for h in (r.get("hookInfos") or []):
            if h.get("command"):
                F.hook_cmds[h["command"]] += 1
        return

    a = r.get("attachment") or {}
    kind = a.get("type")

    if kind == "hook_success":
        add_steering(F, f"hook:{a.get('hookName') or a.get('hookEvent') or '?'}",
                     a.get("content"))
    elif kind == "hook_additional_context":
        c = a.get("content")
        add_steering(F, "hook:additional-context",
                     "\n".join(c) if isinstance(c, list) else c)
    elif kind == "skill_listing":
        add_steering(F, "skill-listing", a.get("content"))
    elif kind == "agent_listing_delta":
        add_steering(F, "agent-listing", "\n".join(a.get("addedLines") or []))
    elif kind == "mcp_instructions_delta":
        add_steering(F, "mcp-instructions", "\n".join(a.get("addedBlocks") or []))
    elif kind == "deferred_tools_delta":
        add_steering(F, "deferred-tools", ", ".join(a.get("addedNames") or []))
    elif kind == "auto_mode":
        flags = {k: v for k, v in a.items() if k != "type"}
        add_steering(F, "auto-mode", json.dumps(flags, sort_keys=True))


def scan(path, F, side, since=None):
    reads, bashes = Counter(), Counter()
    err_ids = set()
    first_seen = False
    prev_t, prev_tools = None, None
    try: lines = open(path, errors="replace").readlines()
    except Exception: return
    if side == "main": F.sessions += 1

    denied_ids = set()
    for line in lines:                       # pre-pass: which tool_uses errored or were denied
        if '"is_error":true' not in line: continue
        try: r = json.loads(line)
        except Exception: continue
        for b in ((r.get("message") or {}).get("content") or []):
            if not (isinstance(b, dict) and b.get("type") == "tool_result" and b.get("is_error")):
                continue
            err_ids.add(b.get("tool_use_id"))
            txt = b.get("content")
            txt = txt if isinstance(txt, str) else json.dumps(txt)[:300]
            if "doesn't want to proceed with this tool use" in txt:
                denied_ids.add(b.get("tool_use_id"))
                F.denied[b.get("tool_use_id")] = True

    for line in lines:
        try: r = json.loads(line)
        except Exception: continue
        t = ts(r.get("timestamp"))
        if since and t and t.date().isoformat() < since: return

        if r.get("type") in ("attachment", "system"):
            collect_steering(r, F)
            continue

        if r.get("type") == "user":
            m = r.get("message") or {}
            c = m.get("content")
            for src, txt in reminder_blocks(c):
                add_steering(F, src, txt)
            if isinstance(c, str) and c.strip():
                F.user_msgs.append((r.get("timestamp", "")[:19], c.strip()))
            elif isinstance(c, list):
                for b in c:
                    if isinstance(b, dict) and b.get("type") == "text" and b.get("text", "").strip():
                        F.user_msgs.append((r.get("timestamp", "")[:19], b["text"].strip()))
                    if isinstance(b, dict) and b.get("type") == "tool_result" and b.get("is_error"):
                        txt = b.get("content")
                        txt = txt if isinstance(txt, str) else json.dumps(txt)[:300]
                        if "Blocked:" in txt:
                            F.bash_blocked[txt.split("\n")[0][:120]] += 1
            if prev_t and t:
                d = (t - prev_t).total_seconds()
                if d >= 0:
                    if prev_tools:
                        F.tool_wait += d
                        if d > 60:
                            for tl in prev_tools: F.slow_tools[tl] += d / len(prev_tools)
                    else:
                        F.human_wait += d
                prev_t, prev_tools = None, None
            continue

        if r.get("type") != "assistant": continue
        m = r.get("message") or {}
        u = m.get("usage") or {}
        if not u: continue
        uid = r.get("uuid") or m.get("id")
        if uid and uid in F.seen:
            F.dupe_turns += 1; continue
        if uid: F.seen.add(uid)

        tr = tier(m.get("model")); p = PRICE[tr]
        i = u.get("input_tokens") or 0
        cw = u.get("cache_creation_input_tokens") or 0
        cr = u.get("cache_read_input_tokens") or 0
        o = u.get("output_tokens") or 0
        cost = (i*p[0] + cw*p[1] + cr*p[2] + o*p[3]) / 1e6
        F.cost[side] += cost; F.cost[tr] += cost; F.turns[side] += 1
        for k, v in (("in", i), ("cw", cw), ("cr", cr), ("out", o)):
            F.tok[(side, k)] += v
        ctx = i + cw + cr
        F.ctx_bucket[min(int(ctx // 50000) * 50, 500)] += 1
        if side == "main" and not first_seen and ctx > 5000:
            F.first_ctx.append(ctx); first_seen = True

        tools_this_turn = []
        for b in (m.get("content") or []):
            if not (isinstance(b, dict) and b.get("type") == "tool_use"): continue
            n = b.get("name", "?"); inp = b.get("input") or {}
            tools_this_turn.append(n)
            F.tools[n] += 1; F.tool_cost[n] += cost
            if b.get("id") in err_ids: F.tool_errors[n] += 1
            if n == "Skill":
                s = inp.get("skill", "?")
                F.skills[s] += 1
                if inp.get("args"): F.skill_args[s].append(str(inp["args"])[:120])
            elif n in ("Task", "Agent"):
                F.agents[inp.get("subagent_type", "?")] += 1
            elif n == "Bash":
                cmd = (inp.get("command") or "").strip()
                if cmd:
                    parts = cmd.split()
                    head = parts[0]
                    F.bash[head] += 1
                    F.cmd_prefix[" ".join(parts[:2])] += 1
                    if b.get("id") in denied_ids: F.denied_cmd[" ".join(parts[:3])] += 1
                    bashes[cmd] += 1
                    if bashes[cmd] > 1: F.dup_bash[head] += 1
            elif n == "Read":
                fp = inp.get("file_path")
                if fp:
                    reads[fp] += 1
                    if reads[fp] > 1: F.dup_reads[fp] += 1
        prev_t, prev_tools = t, tools_this_turn


def steering_report(F, dump):
    """The fact base for `steering-conflict`: what was injected, from where, how much."""
    P = print
    P("=" * 72)
    P("INJECTED STEERING — what shaped the session before the work started")
    P("")
    if not F.steering:
        P("  none found. Either the corpus predates attachment records, or this")
        P("  build does not persist them. Do not read that as 'nothing was injected'.")
    rows = sorted(F.steering.items(), key=lambda kv: -sum(len(t.split()) for t in kv[1]["texts"].values()))
    total = 0
    for src, e in rows:
        words = sum(len(t.split()) for t in e["texts"].values())
        total += words
        variants = len(e["texts"])
        P(f"  {words:7,} w  x{e['n']:<4} {'(' + str(variants) + ' variants) ' if variants > 1 else ''}{src}")
    P("")
    P(f"  {total:,} words of steering across {len(rows)} sources.")
    P("")
    P("  NOT IN THE TRANSCRIPT, read from disk instead:")
    P("    ~/.claude/CLAUDE.md, the project CLAUDE.md / CLAUDE.local.md, MEMORY.md.")
    P("    These are injected at request build time and never persisted here.")
    if F.hook_cmds:
        P("")
        P("  HOOKS THE HARNESS RAN (from stop_hook_summary):")
        for c, n in F.hook_cmds.most_common(20):
            P(f"    {n:5d}x  {c}")
    P("=" * 72)
    if not dump:
        P("")
        P("Re-run with --dump to get the text of each source, which is what a")
        P("contradiction finding has to quote.")
        return
    for src, e in rows:
        for i, t in enumerate(e["texts"].values(), 1):
            P("")
            P("-" * 72)
            P(f"SOURCE: {src}" + (f"  (variant {i})" if len(e["texts"]) > 1 else ""))
            P("-" * 72)
            P(t)


def report(F, args):
    tot = F.cost["main"] + F.cost["sub"]
    cr = sum(v for k, v in F.tok.items() if k[1] == "cr")
    out = sum(v for k, v in F.tok.items() if k[1] == "out")
    tt = F.turns["main"] + F.turns["sub"]
    P = print
    P("=" * 72)
    P(f"CORPUS  {args.corpus}")
    P(f"  sessions {F.sessions}   assistant turns {tt:,} "
      f"(main {F.turns['main']:,} / sub {F.turns['sub']:,})")
    P(f"  deduped forked turns skipped: {F.dupe_turns:,}")
    P("")
    P("SPEND (Anthropic list-price equivalent, not a bill)")
    P(f"  total ${tot:,.2f}   main ${F.cost['main']:,.2f}   sub ${F.cost['sub']:,.2f}"
      f"  ({100*F.cost['sub']/tot:.0f}% sub)" if tot else "  no spend")
    if tt:
        P(f"  cache-read {cr:,} tok vs output {out:,} tok  "
          f"= {cr/max(out,1):.0f} re-read per token produced")
        P(f"  avg context/turn: main {sum(v for k,v in F.tok.items() if k[0]=='main' and k[1] in ('in','cw','cr'))//max(F.turns['main'],1):,}"
          f"   sub {sum(v for k,v in F.tok.items() if k[0]=='sub' and k[1] in ('in','cw','cr'))//max(F.turns['sub'],1):,}")
    if F.first_ctx:
        s = sorted(F.first_ctx)
        P(f"  first-turn context (the fixed preamble): median {s[len(s)//2]:,}  n={len(s)}")
    P("  spend by context band:")
    for b in sorted(F.ctx_bucket):
        P(f"    {b:>4}k+  {F.ctx_bucket[b]:>7,} turns")
    P("")
    P("TIME")
    P(f"  waiting on tools {F.tool_wait/3600:8.1f} h     waiting on the human {F.human_wait/3600:8.1f} h")
    if F.slow_tools:
        P("  hours lost to single calls over 60s:")
        for t_, v in F.slow_tools.most_common(6):
            P(f"    {v/3600:6.1f} h  {t_}")
    P("")
    P("SKILLS FIRED")
    if F.skills:
        for s, n in F.skills.most_common(40): P(f"  {n:5d}  {s}")
    else:
        P("  none")
    P("")
    P("AGENTS SPAWNED")
    for a, n in F.agents.most_common(12): P(f"  {n:5d}  {a}")
    P("")
    P("TOOLS  (cost = spend on turns that issued the tool)")
    for t_, n in F.tools.most_common(15):
        P(f"  {n:6d}  ${F.tool_cost[t_]:9,.2f}  err {F.tool_errors[t_]:4d}  {t_}")
    P("")
    P("FRICTION")
    P(f"  repeated identical Bash commands: {sum(F.dup_bash.values()):,}")
    P(f"  repeated Read of the same path:   {sum(F.dup_reads.values()):,}")
    for f_, n in F.dup_reads.most_common(5): P(f"    {n:4d}x  {f_}")
    P(f"  permission denials (user said no): {len(F.denied):,}")
    for c, n in F.denied_cmd.most_common(6): P(f"    {n:4d}x  {c}")
    P("  NOTE: approved prompts leave NO trace. Denials undercount permission friction —")
    P("        rank allowlist candidates by repeated command prefixes instead:")
    for c, n in F.cmd_prefix.most_common(10):
        if n >= 5: P(f"    {n:5d}x  {c}")
    if F.bash_blocked:
        P("  blocked / rejected tool calls:")
        for b, n in F.bash_blocked.most_common(8): P(f"    {n:4d}x  {b}")
    P("")
    P(f"USER MESSAGES: {len(F.user_msgs)} captured "
      f"(the steering corpus — the lenses read these against CLAUDE.md)")
    P("=" * 72)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("corpus")
    ap.add_argument("--since")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--dump-user-messages", action="store_true")
    ap.add_argument("--steering", action="store_true",
                    help="inventory the steering injected into the session")
    ap.add_argument("--dump", action="store_true",
                    help="with --steering, print each source's full text")
    args = ap.parse_args()

    main_files, sub_files = corpus_files(args.corpus)
    F = Facts()
    for f in main_files: scan(f, F, "main", args.since)
    for f in sub_files: scan(f, F, "sub", args.since)

    if args.dump and not args.steering:
        sys.exit("--dump only means anything with --steering. "
                 "For raw user turns use --dump-user-messages.")
    if args.steering:
        steering_report(F, args.dump)
        return
    if args.dump_user_messages:
        for t, m in F.user_msgs: print(f"--- {t}\n{m}\n")
        return
    if args.json:
        print(json.dumps({
            "sessions": F.sessions,
            "turns": dict(F.turns), "cost": {k: round(v, 2) for k, v in F.cost.items()},
            "skills": dict(F.skills), "agents": dict(F.agents),
            "tools": dict(F.tools.most_common(20)),
            "tool_errors": dict(F.tool_errors),
            "blocked": dict(F.bash_blocked),
            "dup_reads": sum(F.dup_reads.values()),
            "dup_bash": sum(F.dup_bash.values()),
            "permission_denials": len(F.denied),
            "cmd_prefixes": dict(F.cmd_prefix.most_common(25)),
            "tool_wait_h": round(F.tool_wait/3600, 1),
            "human_wait_h": round(F.human_wait/3600, 1),
            "first_ctx_median": sorted(F.first_ctx)[len(F.first_ctx)//2] if F.first_ctx else None,
        }, indent=1))
        return
    report(F, args)


if __name__ == "__main__":
    main()
