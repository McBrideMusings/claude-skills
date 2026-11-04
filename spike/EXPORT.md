# Handing a prototype over — `spike-export`

To look at a prototype on a real phone, or to give it to someone who does not have
this repo, run `~/.claude/skills/spike/tool/spike-export`. It writes one folder
(default `~/Desktop/<slug>/`) holding four files:

```
index.html      the prototype, with its Tweaks panel — open it on this Mac
serve.command   double-click: opens Terminal, serves the folder on the LAN,
                prints the http://<lan-ip>:8791/ URL to type into the phone
RUN.bat         the same on Windows; needs nothing installed
README.md       standard, generated: what the folder is, how to view it on a
                phone, how to use the Tweaks card, how to report something
```

```bash
~/.claude/skills/spike/tool/spike-export \
  --fragment /abs/path/fragment.html --slug wheelhouse-phone \
  --title "Wheelhouse Phone" --subtitle "<the question this answers>" --dest ~/Desktop
```

The prototype is the same build `spike build --kind prototype` writes, so it opens in the
browser window at whatever size that window is. On a phone that is the real screen. On a Mac,
narrow the window to see a phone layout.

Each launcher picks its own free port from 8791 to 8799 and prints it. `PORT=9000 ./serve.command`
overrides it. Both devices must be on the same Wi-Fi.
