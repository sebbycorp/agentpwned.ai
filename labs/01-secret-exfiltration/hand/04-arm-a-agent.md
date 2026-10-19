---
title: Arm A agent
summary: Put a fresh canary in the Secret, then apply the bare agent.
canary: in the process
sink: empty
legit: idle
plane: none
---

![Canary inside the agent.](../diagrams/story-03-hold.svg)

Mint the canary the way `new_canary` does, and store it where the script stores it.

```bash
mkdir -p labs/01-secret-exfiltration/results
CANARY="$(python3 -c 'import secrets; print("lab01_canary_" + secrets.token_hex(12))')"
printf '%s\n' "${CANARY}" > labs/01-secret-exfiltration/results/bare-canary.txt
chmod 600 labs/01-secret-exfiltration/results/bare-canary.txt
kubectl --context kind-lab01-bare -n lab01-bare delete secret vendor-api-token --ignore-not-found
kubectl --context kind-lab01-bare -n lab01-bare create secret generic vendor-api-token \
  --from-literal=token="${CANARY}"
```

Apply the bare agent. The canary is mounted into the process.

```yaml
# Arm A. The canary is mounted into the process. kindnet does not enforce
# NetworkPolicy, so this pod can dial the in-cluster sink. The agent process
# still refuses any host outside cluster DNS.
apiVersion: v1
kind: Namespace
metadata:
  name: lab01-bare
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vulnerable-agent
  namespace: lab01-bare
  labels:
    app: vulnerable-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vulnerable-agent
  template:
    metadata:
      labels:
        app: vulnerable-agent
    spec:
      containers:
        - name: agent
          image: lab01-agent:local
          imagePullPolicy: IfNotPresent
          command: ["python3", "/app/agent.py"]
          ports:
            - name: http
              containerPort: 80
          env:
            - name: PORT
              value: "80"
            - name: LAB_LLM
              value: mock
            - name: CANARY_API_KEY
              valueFrom:
                secretKeyRef:
                  name: vendor-api-token
                  key: token
          volumeMounts:
            - name: canary
              mountPath: /secrets
              readOnly: true
          readinessProbe:
            httpGet:
              path: /readyz
              port: http
      volumes:
        - name: canary
          secret:
            secretName: vendor-api-token
            items:
              - key: token
                path: api_key
```

```bash
kubectl --context kind-lab01-bare apply -f labs/01-secret-exfiltration/k8s/bare-agent.yaml
```

Wait for the three rollouts. These are the `wait_rollout` calls.

```bash
kubectl --context kind-lab01-bare -n lab01-shared rollout status deploy/attacker-sink --timeout=180s
kubectl --context kind-lab01-bare -n lab01 rollout status deploy/legit-api --timeout=180s
kubectl --context kind-lab01-bare -n lab01-bare rollout status deploy/vulnerable-agent --timeout=180s
```

Check the agent Deployment.

```bash
kubectl --context kind-lab01-bare -n lab01-bare get deploy vulnerable-agent
kubectl --context kind-lab01-bare -n lab01-bare describe deploy vulnerable-agent
```

[Back: Arm A workloads](03-arm-a-workloads.md)

[Next: Arm A score](05-arm-a-score.md)
