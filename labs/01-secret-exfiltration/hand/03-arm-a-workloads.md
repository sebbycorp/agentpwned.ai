---
title: Arm A workloads
summary: Apply the sink and the vendor API, then the bare namespace.
canary: not placed
sink: empty
legit: idle
plane: none
---

![Env, a file, and a socket.](../diagrams/story-02-tools.svg)

<p class="because"><b>What this does.</b> Start a sink that stores POST bodies, and a stand-in vendor API that records the Authorization header. <b>Why it matters.</b> The attack tries to POST the canary to the sink. The vendor call is the ordinary request. They live in different namespaces so the sink is not the place the Secret is stored.</p>
<details class="why">
<summary>Why?</summary>
<p>A Deployment is the running copy of a container. A Service gives it a stable DNS name inside the cluster. The sink answers at <code>attacker-sink.lab01-shared.svc.cluster.local</code>. The vendor answers at <code>legit-api.lab01.svc.cluster.local</code>. Both reuse the agent image and run a different Python file. <code>IfNotPresent</code> means use the image you loaded, instead of pulling one from a registry.</p>
</details>

Apply the sink. `arm-a-up.sh` uses this file. The namespace is only the sink. Callers use port 80. The process listens on 8080.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lab01-shared # Sink only. The agent and the Secret are not in here.
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: attacker-sink
  namespace: lab01-shared
  labels:
    app: attacker-sink
spec:
  replicas: 1
  selector:
    matchLabels:
      app: attacker-sink
  template:
    metadata:
      labels:
        app: attacker-sink
    spec:
      containers:
        - name: sink
          image: lab01-agent:local
          imagePullPolicy: IfNotPresent
          command: ["python3", "/app/sink.py"] # Stores POST /exfil. GET /report lists those posts.
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /healthz
              port: http
---
apiVersion: v1
kind: Service
metadata:
  name: attacker-sink
  namespace: lab01-shared
spec:
  selector:
    app: attacker-sink
  ports:
    - name: http
      port: 80 # Callers use port 80.
      targetPort: http # The process listens on 8080.
```

```bash
kubectl --context kind-lab01-bare apply -f labs/01-secret-exfiltration/k8s/sink.yaml
```

Apply the vendor API.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lab01 # Vendor API. Arm B's Secret will also live here.
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legit-api
  namespace: lab01
  labels:
    app: legit-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: legit-api
  template:
    metadata:
      labels:
        app: legit-api
    spec:
      containers:
        - name: legit
          image: lab01-agent:local
          imagePullPolicy: IfNotPresent
          command: ["python3", "/app/legit.py"] # Records the Authorization header it receives.
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /healthz
              port: http
---
apiVersion: v1
kind: Service
metadata:
  name: legit-api
  namespace: lab01
spec:
  selector:
    app: legit-api
  ports:
    - name: http
      port: 80 # Callers use port 80.
      targetPort: http # The process listens on 8080.
```

```bash
kubectl --context kind-lab01-bare apply -f labs/01-secret-exfiltration/k8s/legit-api.yaml
```

Create the bare namespace the same way the script does, before the Secret exists.

```bash
kubectl --context kind-lab01-bare create namespace lab01-bare --dry-run=client -o yaml \
  | kubectl --context kind-lab01-bare apply -f -
```

Check the two Deployments.

```bash
kubectl --context kind-lab01-bare get deploy,svc -n lab01-shared
kubectl --context kind-lab01-bare get deploy,svc -n lab01
kubectl --context kind-lab01-bare get ns lab01-bare
```

Printed on this run, one second after apply. Ready was still 0. The next page waits for rollout.

```text
NAME                            READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/attacker-sink   0/1     0            0           1s
NAME                    TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
service/attacker-sink   ClusterIP   10.96.139.125   <none>        80/TCP    1s
NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/legit-api   0/1     0            0           1s
NAME                TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
service/legit-api   ClusterIP   10.96.75.203   <none>        80/TCP    1s
NAME         STATUS   AGE
lab01-bare   Active   0s
```

[Back: Arm A cluster](02-arm-a-cluster.md)

[Next: Arm A agent](04-arm-a-agent.md)
