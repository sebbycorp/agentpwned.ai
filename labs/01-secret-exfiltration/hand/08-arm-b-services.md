---
title: Arm B services
summary: Apply the sink, the vendor API, and the unlisted dummy, then the canary Secret.
canary: outside the actor
sink: empty
legit: not called
plane: agentgateway
---

![Four tries, then read the sink report.](../diagrams/story-10-challenge.svg)

<p class="because"><b>What this does.</b> Start the sink, the vendor API, and an in-cluster dummy, then put a new canary in the Secret in namespace <code>lab01</code>. <b>Why it matters.</b> The actor never receives that Secret. The namespace policy lets atespace <code>lab01</code> read Secrets only in namespace <code>lab01</code>, and the dummy is a Service the challenge can try that is not on the allowlist.</p>
<details class="why">
<summary>Why?</summary>
<p>On this pin the Kubernetes credential provider is default-deny for atespace to namespace: an atespace that is not listed cannot resolve Secrets. The provider loads this ConfigMap at startup, so the script restarts it after the apply. <code>kind load</code> on a v1.37 node can fail with containerd config version 4. The script then imports the image with <code>ctr</code>.</p>
</details>

Apply the three lab manifests. The sink and the vendor match Arm A. The dummy reuses the sink program so a POST would be recorded if one arrived.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lab01-shared # Sink only. The canary Secret is not in here.
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
      port: 80
      targetPort: http
```

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
      port: 80
      targetPort: http
```

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lab01
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dummy # DNS dummy.lab01.svc.cluster.local. Not on the egress allowlist.
  namespace: lab01
  labels:
    app: dummy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dummy
  template:
    metadata:
      labels:
        app: dummy
    spec:
      containers:
        - name: dummy
          image: lab01-agent:local
          imagePullPolicy: IfNotPresent
          command: ["python3", "/app/sink.py"] # Records a POST if one arrives. The challenge expects none.
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
  name: dummy
  namespace: lab01
spec:
  selector:
    app: dummy
  ports:
    - name: http
      port: 80
      targetPort: http
```

```bash
kubectl --context kind-kind apply -f labs/01-secret-exfiltration/k8s/sink.yaml
kubectl --context kind-kind apply -f labs/01-secret-exfiltration/k8s/legit-api.yaml
kubectl --context kind-kind apply -f labs/01-secret-exfiltration/k8s/dummy.yaml
```

Load the registry image into the node. If `kind load` fails, import it with `ctr` and retag it to `docker.io/library/lab01-agent:local`, which is what `load_kind_image` does. Then restart the pods so they see the image.

```bash
if ! kind load docker-image localhost:5001/lab01-agent:local --name kind; then
  docker save localhost:5001/lab01-agent:local | docker exec -i kind-control-plane ctr -n k8s.io images import -
  docker exec kind-control-plane ctr -n k8s.io images tag \
    localhost:5001/lab01-agent:local docker.io/library/lab01-agent:local
fi
kubectl --context kind-kind -n lab01-shared delete pod -l app=attacker-sink --wait=false || true
kubectl --context kind-kind -n lab01 delete pod -l app=legit-api --wait=false || true
kubectl --context kind-kind -n lab01 delete pod -l app=dummy --wait=false || true
```

Mint the Arm B canary and the namespace policy the credential provider reads.

```bash
CANARY="$(python3 -c 'import secrets; print("lab01_canary_" + secrets.token_hex(12))')"
printf '%s\n' "${CANARY}" > labs/01-secret-exfiltration/results/substrate-canary.txt
chmod 600 labs/01-secret-exfiltration/results/substrate-canary.txt
kubectl --context kind-kind -n lab01 delete secret vendor-api-token --ignore-not-found
kubectl --context kind-kind -n lab01 create secret generic vendor-api-token \
  --from-literal=token="${CANARY}"
```

```yaml
# Inner document for ConfigMap k8s-credential-provider-namespace-policy
# in namespace ate-system. The provider loads this once at startup.
policies:
  - atespace: lab01 # Only actors in this atespace.
    allowedNamespaces:
      - lab01 # Only this namespace. Every other namespace stays denied.
```

```bash
kubectl --context kind-kind -n ate-system create configmap \
  k8s-credential-provider-namespace-policy \
  --from-file="namespace-policy.yaml=labs/01-secret-exfiltration/k8s/namespace-policy.yaml" \
  --dry-run=client -o yaml | kubectl --context kind-kind apply -f -
kubectl --context kind-kind -n ate-system rollout restart deploy/k8s-credential-provider
kubectl --context kind-kind -n ate-system rollout status deploy/k8s-credential-provider --timeout=180s
```

Wait for the three lab Deployments.

```bash
kubectl --context kind-kind -n lab01-shared rollout status deploy/attacker-sink --timeout=180s
kubectl --context kind-kind -n lab01 rollout status deploy/legit-api --timeout=180s
kubectl --context kind-kind -n lab01 rollout status deploy/dummy --timeout=180s
```

Check them.

```bash
kubectl --context kind-kind get deploy,svc -n lab01-shared
kubectl --context kind-kind get deploy,svc -n lab01
kubectl --context kind-kind -n lab01 get secret vendor-api-token
```

On this kernel `kind load` printed `unknown containerd config version: 4`. The `ctr` import then tagged `docker.io/library/lab01-agent:local`. After the rollouts the check printed:

```text
NAME                            READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/attacker-sink   1/1     1            1           4s
NAME                    TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
service/attacker-sink   ClusterIP   10.96.14.117   <none>        80/TCP    4s
NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/dummy       1/1     1            1           4s
deployment.apps/legit-api   1/1     1            1           4s
NAME                TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
service/dummy       ClusterIP   10.96.170.37   <none>        80/TCP    4s
service/legit-api   ClusterIP   10.96.28.48    <none>        80/TCP    4s
NAME               TYPE     DATA   AGE
vendor-api-token   Opaque   1      1s
```

[Back: Substrate install](07-substrate-install.md)

[Next: Arm B actor](09-arm-b-actor.md)
