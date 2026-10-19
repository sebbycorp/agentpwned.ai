---
title: Prerequisites
summary: The commands the bring-up scripts look for before they build anything.
canary: not placed
server: idle
legit: idle
plane: none
---

![Env, a file, and a socket.](../diagrams/story-02-tools.svg)

<p class="because"><b>What this does.</b> Confirm Docker, kind, kubectl, Python, git, and Go are on the path. Sandboxed agent stops if Go is older than 1.27. <b>Why it matters.</b> kind is a Kubernetes cluster that runs in Docker, so this lab does not need a cloud account. This Substrate pin is pre-1.0 and its <code>go.mod</code> says <code>go 1.27.0</code>.</p>
<details class="why">
<summary>Why?</summary>
<p>Docker builds the container images. kubectl is the client that applies YAML and reads status. Python runs the agent, the attacker server, and the scorer. git fetches the pinned Substrate commit when the checkout is not already that commit. The version check is the same one <code>sandboxed-up.sh</code> runs.</p>
</details>

Bare agent checks these four.

```bash
command -v docker
command -v kind
command -v kubectl
command -v python3
```

Sandboxed agent also checks git and Go 1.27 or newer.

```bash
command -v git
command -v go
go env GOVERSION
python3 - "$(go env GOVERSION | sed 's/^go//')" <<'END'
import sys
parts = [int(p) for p in sys.argv[1].split(".")[:2]]
if parts < [1, 27]:
    sys.exit(f"Go {sys.argv[1]} is too old. This Substrate pin requires Go 1.27 or newer.")
END
```

Check that each command printed a path and the Go snippet printed nothing.

```bash
command -v docker && command -v kind && command -v kubectl && command -v python3 && command -v git && go env GOVERSION
```

This run printed the paths below. The Go snippet printed nothing. `go env GOVERSION` was `go1.27.2`.

```text
/usr/bin/docker
/usr/local/bin/kind
/usr/local/bin/kubectl
/usr/bin/python3
/usr/bin/git
go1.27.2
```

[Overview](../README.md)

[Next: Bare agent cluster](02-bare-cluster.md)
