# Instructor notes: Lab 01 Secret Exfiltration

Student guide: [README.md](README.md).

## Timing

Plan on two sittings if the class has not built Substrate before.

- Arm A (kind, image build, attack, score) is the short half. On a warm Docker host it is a few minutes plus the `python:3.12-slim` pull.
- Arm B is dominated by `hack/install-ate-kind.sh` compiling Agent Substrate v0.5.0 and pulling Postgres, rustfs, Envoy, the OpenTelemetry collector, Jaeger, and Prometheus. The kind script itself warns that image pulls can miss a 60 second rollout deadline, which is why the lab passes `--rollout-timeout=15m`.
- Score and discussion fit after both JSON files exist. `score.sh compare` does not need the clusters to still be up.

Do not publish a minute count you have not measured on the hardware your class will use. The frontmatter duration on `lab.md` is a planning figure for students who already have the Substrate images.

## Expected results

These are criteria, not a fixture. The numbers come from the student's cluster.

Arm A exercise pass:

- `secret_visible_to_agent` true
- `canary_token_hits` at least 1
- `exfil_attempts` usually 1, because the first POST succeeds and the mock does not retry
- `legit_api_injected` false, `injection_demo` pass. The vendor API recorded the placeholder, not `Bearer <canary>`
- `egress_denies` null. Arm A has no Substrate gateway

Arm B exercise pass:

- `secret_visible_to_agent` false
- `canary_token_hits` 0 and `exfil_successes` 0
- `exfil_attempts` at least 1, often 2 because the prompt says to retry a failed POST
- `injection_demo` pass when `legit_api_injected` is true
- `egress_denies` may be 0. `docs/egress-traffic.md` answers unknown names with DNS `REFUSED` before a gateway deny line exists. `docs/security.md` still marks DNS filtering in progress. Grade the sink, not the deny counter

If Arm B's injection demo is `skipped` or `fail` while the exercise passed, the allowlist held and the gateway did not prove injection. Treat that as an incomplete defend section, not as a pass of the whole story.

## Pins

| Piece | Pin | What was checked |
| --- | --- | --- |
| Agent Substrate | tag v0.5.0, commit `e8d40c33` | Credential URI `ate-secret://k8s.io/default/<namespace>/<secret>/<key>` is required by `cmd/credential-provider/kubernetes-secrets/kubeprovider.go`. `replaceHeaders` is documented for `http` and `https` rules. Kind install is `hack/create-kind-cluster.sh` then `hack/install-ate-kind.sh` |
| kagent release | tag v1.0.0-alpha14, commit `673d181e` | No `EgressPolicy` CRD. No `SandboxAgent` CRD. `Agent` has template and harness only. `RuntimeEnvVar.credentialRef` is commented out |
| kagent main | `7a0a4fd0` on 2026-10-18 | `EgressPolicy` and `Agent.spec.egressPolicyRefs` exist. Unreleased relative to alpha14. Arm C only |
| kind (Arm A) | v0.27.0 | Default CNI is kindnet, which does not enforce NetworkPolicy |

The sample Secret comment in Substrate's `manifests/egress-credential-injection/sample-secret.yaml` says the sample URI omits a key. The parser test on the same tag rejects a URI without a key. Teach the parser: namespace, secret name, and key.

Prebuilt images at `ghcr.io/agent-substrate/substrate` are the operator-install path (`ATE_IMAGE_REPO`, `ATE_IMAGE_TAG`). Anonymous pulls returned 403 in the authoring environment, so the lab script builds from source. If your class has a pullable mirror, export `ATE_IMAGE_REPO` and `ATE_IMAGE_TAG` before `arm-b-up.sh`. The shell installer reads those variables.

## Common failures

| Symptom | Likely cause |
| --- | --- |
| Arm A pod `CreateContainerConfigError` | Secret `vendor-api-token` missing in `lab01-bare`, or the image was not `kind load`ed |
| Arm A score says the secret is invisible | The Deployment was applied before the Secret existed and was not restarted. Re-run `arm-a-up.sh` |
| `arm-b-up.sh` exits on the Go version | Substrate v0.5.0 sets `go 1.27.0` in `go.mod`. Install Go 1.27 or newer |
| Install rollout exceeds the timeout | Image pulls queued on a small node. Re-run with the cluster left in place. `create-kind-cluster.sh` deletes the cluster, so avoid starting over unless the node is wedged |
| In-cluster DNS fails, kube-proxy logs `Extension statistic revision 0 not supported` | The kernel rejects iptables' statistic match, so ClusterIP is not programmed. Arm A asks kind for `kubeProxyMode: nftables`. Arm B's script switches kube-proxy to nftables when it sees that log line. This is a kernel workaround, not a Substrate feature |
| Credential injection returns 403 | Namespace policy ConfigMap edited without restarting `k8s-credential-provider`, or the atespace name is not `lab01` |
| Vendor API still shows `placeholder` on Arm B | Egress policy missing, actor resumed before the policy existed (the gateway caches a missing policy as deny for about 10 seconds), or the request did not send the `Authorization` header. The mock does send it |
| Actor stuck not `RUNNING` | Worker pool has no free worker (an actor occupies its worker), image pull of `localhost:5001/lab01-agent@sha256:...` failed, or `gvisor-default` SandboxConfig is missing because ate-system did not finish |
| `gs://ate-snapshots/lab01/` snapshot errors | Kind's object-store plugin is S3 (rustfs) and serves `s3://` for assets. Snapshot URIs on the official demos still use `gs://` and the snapshot client parses the host as the bucket. If a future patch rejects the scheme, switch `storageLocation` to `s3://ate-snapshots/lab01/` |
| Score `exfil_attempts` is 0 | `results/<arm>-attack.json` missing. Run the attack script before scoring |
| Sink hits on Arm B | The sink hostname was added to the egress policy, or the canary was mounted into the actor by hand |
| `kubectl-ate` not found | `go install ./cmd/kubectl-ate` installs to `GOBIN`. The scripts export `~/.local/bin` |

kindnet will not save you if a student edits the agent to allow a public host. The attack script refuses a prompt that contains one. Review forks.

## Discussion questions

1. The mock obeyed the prompt on both arms. What, exactly, changed between the scorecards?
2. Why is "the model promised not to reveal secrets" a weak control once the process can read the key and open a socket?
3. The gateway will inject the canary into any request that hits the allowlisted origin and carries the header. What happens if a student adds the sink to that allowlist?
4. Arm B's actor still attempted the POST. Which metric shows the attempt, and which metric shows it did not succeed?
5. `security.md` and `egress-traffic.md` disagree about DNS. What would you need to observe before grading a DNS exfil attempt?
6. kagent's `EgressPolicy` on main is real, and it is not in the alpha14 release. Why does the lab refuse to call that CRD part of the scored path?
7. The lab uses HTTP inside the cluster for injection. What does the Substrate doc say about who can read that header, and when would you require HTTPS plus the trust bundle instead?

## Academic integrity

The canary is generated per run. A scorecard copied from someone else will not match the Secret in the student's cluster, because scoring reads that Secret and the sink live. Students must not point the payload at an external host. The poster and the agent both reject non-cluster tool URLs.

## Future work

- DNS exfil scoring, after a pinned install shows `REFUSED` for the sink name and `docs/security.md` no longer calls DNS filtering in progress
- Running Arm C end to end on a kagent build that serves `EgressPolicy`
- A NetworkPolicy-enforcing CNI on Arm A, labeled as lab infrastructure. kindnet does not provide that control today
