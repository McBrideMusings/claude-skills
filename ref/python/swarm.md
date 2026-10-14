# Python swarm axis

Read by every `swarm` worker in a repo with a `pyproject.toml` or `requirements.txt`.

## One environment per worktree, one download cache

A virtual environment belongs to the worktree it was made in; never point a worker at the main
checkout's `.venv`, because installing into it changes every other worker's interpreter. `uv`
and `pip` keep a per-user download cache, so a second worktree's install reuses downloaded
wheels instead of fetching them again.

## Test runs take turns

Run `pytest`, type checkers (`mypy`, `pyright`) and anything that trains, encodes or crunches
data through `swarm heavy -- <command>`. `pytest -n auto` (pytest-xdist) already starts one
process per core; two runs at once oversubscribe the machine.

## Tests that need more than CPU

A test suite that uses a fixed port, a fixed database name or a shared local service collides
between workers. Use `tmp_path` and port `0`; the project's `swarm-worker` skill names any fixed
resource the suite still needs and how a worker gets its own.
