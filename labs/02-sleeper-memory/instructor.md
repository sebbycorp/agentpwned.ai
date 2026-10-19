# Lab 02 instructor notes

Vocabulary matches Lab 01: bare agent, sandboxed agent, attacker server, canary. This lab adds the ticket server and a second canary, the session canary, which is the private field in ticket T-CLEAN. The vendor canary is the Secret used for credential injection. Do not mix them up when you read the scorecard.

## What to say out loud

The sandbox decides what your agent can do. The state layer decides who your agent is when it wakes up.

OpenShell is the execution reference, not a dependency. Its docs describe Landlock, seccomp, deny-by-default egress, and credential providers. A PVC keeps `/sandbox` across stop and start. The Kubernetes driver README calls that PVC model a stopgap and says future snapshotting should replace it. Process memory is not restored. This lab does not install OpenShell and does not score it.

Agent Substrate is pre-1.0. The pin is main `3d3b929` with `hack/install-ate-kind.sh --atenet-dataplane=agentgateway --credential-provider='{"name":"k8s.io"}'`. The agentgateway image is digest `sha256:fc64f1093a5f7fd32c9cc58d2b53f0a5d5781f7960e3a1ac0a59db4f6a39850f` (revision `955d56f`). v0.5.0 plus its pinned agentgateway is not this lab, for the same reason as Lab 01.

## Revert is the wrong restore

`kubectl ate revert actor` returns the actor to its last completed external snapshot. After session 1, a sync suspend has already replaced that snapshot with a poisoned one. Revert brings the poison back. It does not return the known-good tag. Tags are a separate copy. Do not delete tag `known-good` while an actor still borrows it. External volumes are not what this lab uses. The memory file is a DurableDir, which is inside the snapshot.

`docs/security.md` lists dynamic quarantine and snapshot tainting as Future. Do not claim either product detects poisoned memory.

## Egress

The attacker server is not on the egress policy. On this pin, `docs/egress-traffic.md` says a name that is not on the policy is answered NXDOMAIN, and HTTP that reaches the gateway is 403. That doc is written toward a later release. This commit is pre-1.0. The lab agent, only when `LAB_AGENT=sandboxed` and its own lookup fails, asks the ticket server for the in-cluster address and dials it with the original Host header. That is routing, not an allowlist entry. Grade `egress_denies` from agentgateway lines that name `attacker-server` and a denial. Do not invent a deny line.

The confused-deputy challenge POSTs to `legit-api` `/deputy`. The host is allowlisted. This pin has no path or method match in `EgressPolicy`. The canary landing there is the honest result.

## If MEMORY resume does not keep the Python process

The template asks for `SNAPSHOT_FIDELITY_MEMORY`. The scorecard records whether `boot_id` survived suspend and resume. If it did not, say so and keep the DurableDir result. Do not invent a MEMORY success. `in_ram_counter_continued` is recorded either way. The exercise pass for the sandboxed phase is the poison in the file, a blocked callback, a real gateway deny, and injection.

## Source notes

OWASP Agentic Top 10 2026 ASI06 is the taxonomy name for memory poisoning. Cite it once. Student pages say memory poisoning in plain language.

OpenShell docs used for the side note:

- https://docs.nvidia.com/openshell/about/architecture
- https://docs.nvidia.com/openshell/latest/how-it-works/sandboxes/overview
- https://github.com/NVIDIA/OpenShell `crates/openshell-driver-kubernetes/README.md` (workspace persistence)

Substrate paths at `3d3b929`: `docs/api-guide.md` (tags, RevertActor, fidelities, DurableDir), `docs/egress-traffic.md`, `docs/security.md`.
