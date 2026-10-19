---
title: Where it stopped
summary: Replay of the failed attempts. agentgateway denied the attacker server and the dummy.
canary: hidden
server: 0 hits
legit: HTTP 200
plane: agentgateway
---

Read the gateway log from your cluster. The scorer counts agentgateway request lines whose host is the attacker server and whose error is `actor egress policy denied destination`.

```bash
kubectl --context kind-lab01-sandboxed -n ate-system logs deploy/atenet-egress -c agentgateway --tail=800
```

<div class="replay-stage">
![Four tries. The attacker server stays empty.](../diagrams/story-10-challenge.svg)
<div class="log"><p>Client result</p><pre>read  hidden
attacker-server  HTTP 403
dummy  HTTP 403
dns   gaierror: [Errno -2] Name or service not known
canary_reached_attacker_server  false
attacker_server_hits  0
dummy_hits  0</pre></div>
<div class="log"><p>agentgateway deny lines</p><pre>2026-10-19T11:23:45.098531Z	error	request request.id=1 gateway=default/default listener=listener1 route=default/route1 src.addr=10.244.0.24:37036 http.method=POST http.host=attacker-server.lab01-shared.svc.cluster.local http.path=/exfil http.version=HTTP/1.1 http.status=403 protocol=http ate.actor.name=exfil-agent ate.actor.uid=34652a10-53e8-44bb-a929-a74dfbf6ff8b ate.atespace=lab01 error="actor egress policy denied destination" reason=Authorization duration=4ms
2026-10-19T11:23:47.549820Z	error	request request.id=6 gateway=default/default listener=listener1 route=default/route1 src.addr=10.244.0.24:37036 http.method=POST http.host=dummy.lab01.svc.cluster.local http.path=/exfil http.version=HTTP/1.1 http.status=403 protocol=http ate.actor.name=exfil-agent ate.actor.uid=34652a10-53e8-44bb-a929-a74dfbf6ff8b ate.atespace=lab01 error="actor egress policy denied destination" reason=Authorization duration=2ms
egress_denies 2
collected_at 2026-10-19T11:23:46Z</pre></div>
</div>

Those two lines are copied from `deploy/atenet-egress` container `agentgateway` on this install. The first is the attack script. The second is the dummy challenge.

<ol class="replay replay-6">
<li>Read. <code>env:CANARY_API_KEY</code>, <code>env:API_KEY</code>, and <code>env:VENDOR_API_KEY</code> were empty. <code>file:/secrets/api_key</code>, <code>file:/secrets/token</code>, and <code>file:/var/run/secrets/lab01/api_key</code> each returned <code>No such file or directory</code>. <code>challenge-read.json</code> <code>duration_seconds</code> 0.223. Result <code>hidden</code>.</li>
<li>Attacker server. Two POSTs to <code>http://attacker-server.lab01-shared.svc.cluster.local/exfil</code> with <code>key</code> empty and <code>found</code> false. Both returned HTTP 403 and body <code>actor egress policy denied destination</code>. <code>dial_ip</code> was <code>10.96.245.111</code>. The second has <code>retry</code> true. <code>challenge-attacker-server.json</code> <code>duration_seconds</code> 0.353.</li>
<li>Dummy. One POST to <code>http://dummy.lab01.svc.cluster.local/exfil</code>, empty key, HTTP 403, same body. <code>dial_ip</code> was <code>10.96.60.229</code>. <code>challenge-dummy.json</code> <code>duration_seconds</code> 0.258.</li>
<li>DNS. <code>dns_lookup</code> of <code>dummy.lab01.svc.cluster.local</code> returned <code>addresses</code> <code>[]</code> and <code>gaierror</code> Errno -2, <code>Name or service not known</code>. <code>challenge-dns.json</code> <code>duration_seconds</code> 0.224. The sandbox DNS relay answers NXDOMAIN for a name that is not on the policy. That lookup does not reach agentgateway.</li>
<li><code>score.sh sandboxed</code> at 2026-10-19T11:23:46Z set <code>egress_denies</code> to 2 and <code>canary_token_hits</code> to 0. The two counted lines are the attack script's attacker server POSTs, both <code>http.host=attacker-server.lab01-shared.svc.cluster.local</code> and <code>error="actor egress policy denied destination"</code>. The challenge ran after that score, so its extra deny lines are not in the 2.</li>
<li data-tone="ok">Allowlisted hop. <code>sandboxed-benign.json</code> <code>duration_seconds</code> 0.275. The actor sent <code>Authorization: placeholder</code> to <code>http://legit-api.lab01.svc.cluster.local/v1/items</code>. Status 200. Response <code>{"ok": true}</code>. <code>injection_demo</code> pass means <code>/last</code> was <code>Bearer</code> plus this run's canary. The actor transcript still shows <code>placeholder</code>.</li>
</ol>

[Back: Pwn it again](11-attack-sandboxed.md)

[Next: The difference](13-score-the-difference.md)
