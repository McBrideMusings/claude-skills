# Checkpoint and sample contract

The checkpoint is one screen, rewritten every pass (see section 5 of the skill). Everything older goes to git or an archive file.

A performance sample carries: build hash and settings, scene and whether it is stationary or moving, warm or cold, the native frame count with median and p99 interval, generated or repeated frames counted separately, the sample's wall duration, and the path to the raw records. State what the timestamps measure: CPU queue return, GPU completion, or display feedback. Mark capture, profiling, compilation and transition intervals so they cannot become warm samples.

A frame-model row carries: the link's name, its measured ms in the same launch as the FPS number, how it was measured, and whether it is serial or overlapped with its neighbours.

Project health metrics: passes so far, passes with nothing kept, ms removed from the longest serial path since the first model, and the current native median against the budget. Lines of code, launches, probes and documents are not progress.
