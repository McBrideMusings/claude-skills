# cli — injected context

> Exit non-zero on failure. Detect a non-TTY stdout and drop the decoration.

- **The exit code is the API.** Zero means it worked. Anything else means it did not, and a
  script downstream is reading that number. A command that prints an error and exits 0 is
  broken in the way that is hardest to notice.
- **stdout is data, stderr is commentary.** Progress, warnings and diagnostics go to stderr
  so `cmd | other` keeps working. When stdout is not a TTY, drop colour, spinners and
  progress bars — they become escape-sequence garbage in a pipe or a log file.
Terminal *interfaces* — full-screen, keyboard-driven — are [../tui/](../tui/), not this.
