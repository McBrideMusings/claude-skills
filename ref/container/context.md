# container — injected context

> Compose file and Dockerfile are the interface. Build multi-stage; define a healthcheck.

- **Read the compose file before assuming how anything runs.** It names the services, the
  ports, the volumes and the dependency order — the closest thing to a runbook there is.
- **Build multi-stage.** Compile in a stage with the toolchain, copy only the artefact into a
  runtime stage. A single-stage image ships the compiler, the source and the package cache.
- **A container with no `HEALTHCHECK` is "running" the moment the process starts**, which is
  not the same as ready. Orchestrators route traffic on that distinction.
- **Never bake a secret into an image layer.** Deleting it in a later layer does not remove
  it; the layer is still in the history.
