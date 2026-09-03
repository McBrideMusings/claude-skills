# Handing a prototype over — `spike-export`

To look at a prototype on a real phone, or to give it to someone who does not have
this repo, run `~/.claude/skills/spike/tool/spike-export`. It writes one folder
(default `~/Desktop/<slug>/`) holding four files:

```
<slug>.html     the device-framed build — open it on this Mac
index.html      no device frame, no Tweaks panel — what the phone renders
serve.command   double-click: opens Terminal, serves the folder on the LAN,
                prints the http://<lan-ip>:8080/ URL to type into the phone
README.md       standard, generated: what the folder is, how to view it on a
                phone, how to read the panel, how to send comments back
```

```bash
~/.claude/skills/spike/tool/spike-export \
  --fragment /abs/path/fragment.html --slug wheelhouse-phone \
  --title "Wheelhouse Phone" --device phone --dest ~/Desktop
```

**The bare copy is the reason this exists.** A phone drawing a phone frame inside a
phone answers nothing about how the design feels in the hand, and the Tweaks panel
covers the thing being judged. `--without viewport,checks,annotate,contrast` drops
the frame; the panel is generated from the fragment's own `atTweaks` calls rather
than being a widget, so it is hidden with `--extra-css` instead.

`PORT=9000 ./serve.command` overrides the port. Both devices must be on the same
Wi-Fi.

