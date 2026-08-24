# python — injected context

> Run tools through the project's venv or uv, never a global interpreter.

- **Find the environment before running anything.** A `uv.lock` means `uv run <cmd>`; a
  `poetry.lock` means `poetry run`; a bare `pyproject.toml` or `requirements.txt` usually
  means an activated `.venv`. Invoking the system `python3` picks up the wrong packages and
  reports failures that have nothing to do with the code.
- **The gates:** the project's own runner — commonly `pytest`, plus `ruff` and a type checker
  (`mypy` or `pyright`) if the config names one. Read `pyproject.toml` rather than guessing.
- **A mutable default argument is evaluated once**, at definition, and shared by every call.
- **A bare `except:` swallows `KeyboardInterrupt` and `SystemExit`.** Catch the exception you
  meant, and let the rest travel.
