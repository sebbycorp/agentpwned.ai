---
title: Arm A workloads
summary: Apply the sink and the vendor API, then the bare namespace.
canary: not placed
sink: empty
legit: idle
plane: none
---

![Env, a file, and a socket.](../diagrams/story-02-tools.svg)

Apply the sink. `arm-a-up.sh` uses this file.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lab01-shared
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
          command: ["python3", "/app/sink.py"]
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
      port: 80
      targetPort: http
```

```bash
kubectl --context kind-lab01-bare apply -f labs/01-secret-exfiltration/k8s/sink.yaml
```

Apply the vendor API.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lab01
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
          command: ["python3", "/app/legit.py"]
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
      port: 80
      targetPort: http
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

[Back: Arm A cluster](02-arm-a-cluster.md)

[Next: Arm A agent](04-arm-a-agent.md)
