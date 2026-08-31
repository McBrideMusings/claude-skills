# desktop — injected context

> Implies gui. Packaging and signing differ per platform; decide that before shipping.

Always stacks with [../gui/](../gui/). A server that merely runs on a workstation is
`backend` and nothing else.

- **Packaging is per platform and is not an afterthought.** A macOS `.app` needs signing and
  notarisation before it opens on another machine; Windows wants a signed installer; Linux
  wants whichever of AppImage, deb or Flatpak the project chose. Find out which it ships
  before changing anything near the build.
- **The window is not the app.** Closing the last window, the tray icon, the menu bar,
  launch-at-login and multi-monitor placement are all real states with real bugs.
- **The filesystem is shared with a person.** Write to the platform's config and cache
  directories, never beside the binary.
