# mobile — injected context

> Small screen, unreliable network, backgrounded process. Test on a real device.

Stacks with the platform label ([../apple/](../apple/) for iOS) and [../gui/](../gui/).
This is what is true of a phone regardless of vendor.

- **The process does not own its lifetime.** The OS backgrounds it, suspends it and kills it
  without warning. Any state that matters is persisted before that happens, not on exit.
- **The network drops, and it drops mid-request.** Offline, slow, and captive-portal are
  ordinary states to design for, not edge cases.
- **Battery, data and thermals are user-visible costs.** Polling loops and wake locks show
  up on a screen the user can see and act on.
- **The simulator hides performance and hardware.** Camera, GPS, notifications and real
  frame timing need a device.
