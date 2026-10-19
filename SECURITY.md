# Security policy

agentpwned.ai publishes educational labs about agent sandboxing.

- Run labs only on a local kind cluster.
- Use the generated canary values. Do not substitute a real API key, cloud token, or customer secret.
- The attacker endpoint in Lab 01 is the in-cluster `attacker-server` Service. Do not retarget prompts, scripts, or agents at hosts you do not own.
- Lab scripts refuse prompt files that contain a URL outside cluster DNS.

Report repository issues through the project's usual private channel. This file is not an invitation to test third-party systems.
