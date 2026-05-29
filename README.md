# 🚀 Kubernetes User Management Project — Full Setup Guide

> **Stack:** Kubernetes (kubeadm) · Docker · Calico · Backend · Frontend · PostgreSQL · Prometheus · Loki · Grafana · ArgoCD · Jenkins · Helm

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Clone the Repository](#clone-the-repository)
3. [System Preparation](#system-preparation)
4. [Install Docker](#install-docker)
5. [Disable Swap](#disable-swap)
6. [Kernel Modules & Networking](#kernel-modules--networking)
7. [Install Container Runtime (containerd)](#install-container-runtime-containerd)
8. [Install Kubernetes Tools](#install-kubernetes-tools)
9. [Initialize Kubernetes Cluster](#initialize-kubernetes-cluster)
10. [Configure kubectl](#configure-kubectl)
11. [Install Pod Network (Calico)](#install-pod-network-calico)
12. [Remove Control Plane Taint](#remove-control-plane-taint)
13. [Install Helm](#install-helm)
14. [Deploy Application via Helm Chart](#deploy-application-via-helm-chart)
15. [Install Observability Stack](#install-observability-stack)
16. [Access Grafana & Import Dashboard](#access-grafana--import-dashboard)
17. [Install ArgoCD (CD)](#install-argocd-cd)
18. [Jenkins CI Pipeline](#jenkins-ci-pipeline)
19. [Dashboard Reference](#dashboard-reference)

---

## Prerequisites

- AWS EC2 instance running **Ubuntu 22.04**
- Instance type: **t2.medium or higher** (2 CPU, 4GB RAM minimum)
- Ports open in Security Group:

| Port | Purpose |
|---|---|
| `22` | SSH |
| `6443` | Kubernetes API |
| `30000–32767` | NodePort services |
| `30080` | Frontend |
| `30081` | Backend |
| `32000` | Grafana UI |
| `32001` | ArgoCD UI |
| `8080` | Jenkins |

---

## Clone the Repository

```bash
git clone https://github.com/dev-krishan-dhaka/Kubernetes-Project
cd Kubernetes-Project
```

---

## System Preparation

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Install Docker

```bash
sudo apt install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker
```

Verify:

```bash
docker --version
```

---

## Disable Swap

Kubernetes **requires** swap to be disabled.

```bash
sudo swapoff -a
```

Permanent disable (survives reboot):

```bash
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

Verify:

```bash
free -h
```

`Swap` row should show `0`.

---

## Kernel Modules & Networking

> ⚠️ Must be done **before** installing Kubernetes tools.

```bash
sudo modprobe br_netfilter
sudo modprobe overlay
```

Make permanent:

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
```

Configure networking:

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
```

Apply:

```bash
sudo sysctl --system
```

---

## Install Container Runtime (containerd)

```bash
sudo apt install -y curl gnupg2 software-properties-common apt-transport-https ca-certificates
sudo apt install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
```

Enable `SystemdCgroup`:

```bash
sudo nano /etc/containerd/config.toml
# Find: SystemdCgroup = false
# Change to: SystemdCgroup = true
```

Restart:

```bash
sudo systemctl restart containerd
sudo systemctl enable containerd
```

---

## Install Kubernetes Tools

```bash
sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | \
sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

---

## Initialize Kubernetes Cluster

Get your EC2 private IP:

```bash
hostname -I
```

Initialize (replace `YOUR_PRIVATE_IP`):

```bash
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=YOUR_PRIVATE_IP
```

---

## Configure kubectl

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

Verify:

```bash
kubectl get nodes
```

---

## Install Pod Network (Calico)

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/calico.yaml
```

Wait for all pods:

```bash
kubectl get pods -A -w
```

Node should show `Ready`. ✅

---

## Remove Control Plane Taint

Single EC2 node setup — allow pods on control plane:

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

---

## Install Helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

---

## Deploy Application via Helm Chart

The app uses a structured Helm chart with HPA, PDB, PVC, and Ingress support.

### Chart Structure

```
helm-chart/
├── Chart.yaml
├── values.yaml              ← central config — edit this only
└── templates/
    ├── backend/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   ├── hpa.yaml
    │   └── pdb.yaml
    ├── frontend/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   ├── hpa.yaml
    │   └── pdb.yaml
    ├── postgres/
    │   ├── deployment.yaml
    │   ├── service.yaml
    │   ├── secret.yaml
    │   ├── configmap.yaml
    │   └── pvc.yaml
    └── ingress.yaml
```

### Install local-path StorageClass (required for PVC)

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml

kubectl patch storageclass local-path \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

### Install metrics-server (required for HPA)

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

kubectl patch deployment metrics-server \
  -n kube-system \
  --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

### Deploy via Helm

```bash
helm upgrade --install user-management helm-chart/ \
  --namespace user-management \
  --create-namespace
```

Verify:

```bash
helm list
kubectl get all -n user-management
kubectl get hpa -n user-management
kubectl get pdb -n user-management
kubectl get pvc -n user-management
```

### Updating the App

All configuration is controlled from `helm-chart/values.yaml`:

```yaml
backend:
  replicas: 2          # scale up/down
  image:
    tag: "v1"          # change image version

frontend:
  image:
    tag: "v3"

ingress:
  enabled: false       # set true when you have a domain
```

After any change:

```bash
helm upgrade user-management helm-chart/ --namespace user-management
```

---

## Install Observability Stack

### Add Helm Repositories

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

### Create Monitoring Namespace

```bash
kubectl create namespace monitoring
```

### Create Monitoring Values File (with Persistence)

```bash
mkdir -p ~/user-managemenT/monitoring-chart

cat > ~/user-managemenT/monitoring-chart/monitoring-values.yaml << 'EOF'
prometheus:
  prometheusSpec:
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: local-path
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 5Gi

loki:
  persistence:
    enabled: true
    storageClassName: local-path
    size: 5Gi
EOF
```

### Install Prometheus (with persistent storage)

```bash
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  -f ~/user-managemenT/monitoring-chart/monitoring-values.yaml
```

### Install Loki + Promtail (with persistent storage)

```bash
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --set loki.enabled=true \
  --set promtail.enabled=true \
  --set grafana.enabled=false \
  -f ~/user-managemenT/monitoring-chart/monitoring-values.yaml
```

### Install Grafana

```bash
helm upgrade --install grafana grafana/grafana \
  --namespace monitoring \
  --values ~/user-managemenT/monitoring-chart/values.yaml
```

Where `monitoring-chart/values.yaml` contains:

```yaml
adminPassword: "admin123"

service:
  type: NodePort
  nodePort: 32000

datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090
        access: proxy
        isDefault: true
      - name: Loki
        type: loki
        url: http://loki.monitoring.svc.cluster.local:3100
        access: proxy
```

### Verify PVCs Created

```bash
kubectl get pvc -n monitoring
```

Expected:

```
NAME                                                        STATUS
storage-prometheus-prometheus-kube-prometheus-prometheus-0  Bound
storage-loki-0                                              Bound
```

### Verify All Monitoring Pods

```bash
kubectl get pods -n monitoring
```

All should be `Running`. ✅

---

## Access Grafana & Import Dashboard

Open Security Group port `32000` in AWS Console, then:

```
http://<YOUR_EC2_PUBLIC_IP>:32000
Username: admin
Password: admin123
```

### Import the Sample Dashboard

1. Grafana → **"+"** → **"Import"**
2. Click **"Upload JSON file"**
3. Select `grafana-dashboards/Grafana-dashboard.json` from this repo
4. Select **Prometheus** datasource → **Import**

Dashboard covers:
- Backend CPU & Memory per pod
- Frontend CPU & Memory per pod
- Backend & Frontend live logs

---

## Install ArgoCD (CD)

### Install ArgoCD

```bash
kubectl create namespace argocd

kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### Expose UI

```bash
kubectl patch svc argocd-server -n argocd \
  -p '{"spec": {"type": "NodePort", "ports": [{"port": 443, "targetPort": 8080, "nodePort": 32001, "name": "https"}]}}'
```

### Get Admin Password

```bash
kubectl get secret argocd-initial-admin-secret \
  -n argocd \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

Access: `http://<EC2_PUBLIC_IP>:32001`
Login: `admin` / (password from above)

### Create ArgoCD Application

```bash
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-management
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/dev-krishan-dhaka/Kubernetes-Project
    targetRevision: HEAD
    path: helm-chart
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: user-management
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
EOF
```

ArgoCD will now **auto-deploy** any changes pushed to GitHub. ✅

---

## Jenkins CI Pipeline

### Install yq (required)

```bash
sudo wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 \
  -O /usr/local/bin/yq
sudo chmod +x /usr/local/bin/yq
```

### Add Jenkins Credentials

Go to: **Manage Jenkins → Credentials → Global → Add Credentials**

| ID | Type | Value |
|---|---|---|
| `DOCKERHUB_CREDENTIALS` | Username/Password | DockerHub login |
| `GITHUB_CREDENTIALS` | Username/Password | GitHub token |

### Pipeline Flow

```
Push code to GitHub
       ↓
Jenkins detects change (polls every 1 min)
       ↓
Build Docker image (only if backend/ or frontend/ changed)
       ↓
Push to DockerHub
       ↓
Update image tag in helm-chart/values.yaml using yq
       ↓
Push updated values.yaml to GitHub
       ↓
ArgoCD detects change → auto deploys to Kubernetes ✅
```

### Key Pipeline Features

- Builds **only changed** service (backend or frontend)
- Uses `yq` to update **only** the correct image tag (postgres tag never touched)
- `disableConcurrentBuilds()` prevents race conditions
- Auto-retries GitHub push up to 3 times
- Skips all stages and shows **SUCCESS** when no changes detected

### Jenkinsfile Location

`Jenkinsfile` is in the root of this repo and is automatically used by Jenkins.

---

## Dashboard Reference

### Prometheus Queries

**Backend CPU:**
```promql
sum(rate(container_cpu_usage_seconds_total{namespace="user-management", pod=~"backend-.*", container!="", container!="POD"}[5m])) by (pod)
```

**Backend Memory:**
```promql
sum(container_memory_working_set_bytes{namespace="user-management", pod=~"backend-.*", container!="", container!="POD"}) by (pod)
```

**Frontend CPU:**
```promql
sum(rate(container_cpu_usage_seconds_total{namespace="user-management", pod=~"frontend-.*", container!="", container!="POD"}[5m])) by (pod)
```

**Frontend Memory:**
```promql
sum(container_memory_working_set_bytes{namespace="user-management", pod=~"frontend-.*", container!="", container!="POD"}) by (pod)
```

**Pod Restart Count:**
```promql
sum(kube_pod_container_status_restarts_total{namespace="user-management"}) by (pod)
```

### Loki Log Queries

**Backend Logs:**
```logql
{namespace="user-management", pod=~"backend-.*"}
```

**Frontend Logs:**
```logql
{namespace="user-management", pod=~"frontend-.*"}
```

---

## Quick Troubleshooting

| Problem | Fix |
|---|---|
| Node `NotReady` | Wait for Calico: `kubectl get pods -A` |
| Grafana `No Data` | Check monitoring pods: `kubectl get pods -n monitoring` |
| HPA shows `<unknown>` | Install metrics-server + patch with `--kubelet-insecure-tls` |
| PVC `Pending` | Install local-path-provisioner and set as default StorageClass |
| ArgoCD shows empty tree | Check ArgoCD app `path:` points to `helm-chart` not `k8s` |
| Jenkins push rejected | Already handled — pipeline retries 3 times with rebase |
| Loki missing namespace | Restart promtail: `kubectl rollout restart daemonset -n monitoring` |
| Port unreachable | Add inbound rule in EC2 Security Group |

---

## Full Stack Summary

| Component | Purpose | Access |
|---|---|---|
| **Kubernetes (kubeadm)** | Container orchestration | — |
| **Calico** | Pod networking | — |
| **containerd** | Container runtime | — |
| **Helm** | Package manager for K8s | — |
| **Backend** | App backend (Node.js) | `:30081` |
| **Frontend** | App frontend (React) | `:30080` |
| **PostgreSQL** | Database with PVC | internal |
| **HPA** | Auto-scales pods on CPU | automatic |
| **PDB** | Min pods always available | automatic |
| **Prometheus** | Metrics scraping + PVC | internal |
| **Loki** | Log storage + PVC | internal |
| **Promtail** | Log collector (DaemonSet) | automatic |
| **Grafana** | Metrics & log visualization | `:32000` |
| **ArgoCD** | GitOps CD — auto deploy | `:32001` |
| **Jenkins** | CI — build & push images | `:8080` |

---

> Made with ❤️ by [dev-krishan-dhaka](https://github.com/dev-krishan-dhaka)
