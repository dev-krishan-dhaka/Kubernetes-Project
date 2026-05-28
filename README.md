# 🚀 Kubernetes User Management Project — Full Setup Guide

> **Stack:** Kubernetes (kubeadm) · Docker · Calico · Backend · Frontend · PostgreSQL · Prometheus · Loki · Grafana

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
13. [Deploy the Application](#deploy-the-application)
14. [Install Observability Stack](#install-observability-stack)
15. [Access Grafana & Import Dashboard](#access-grafana--import-dashboard)
16. [Dashboard Reference](#dashboard-reference)

---

## Prerequisites

- AWS EC2 instance running **Ubuntu 22.04**
- Instance type: **t2.medium or higher** (2 CPU, 4GB RAM minimum)
- Ports open in Security Group:
  - `6443` — Kubernetes API
  - `30000–32767` — NodePort services
  - `32000` — Grafana UI
  - `22` — SSH

---

## Clone the Repository

```bash
git clone https://github.com/dev-krishan-dhaka/Kubernetes-Project
cd Kubernetes-Project
```

---

## System Preparation

Update the system first:

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

These must be done **before** installing Kubernetes tools.

### Load required kernel modules

```bash
sudo modprobe br_netfilter
sudo modprobe overlay
```

### Make them permanent (survive reboot)

```bash
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
```

### Configure Kubernetes networking (sysctl)

```bash
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
```

Apply immediately:

```bash
sudo sysctl --system
```

---

## Install Container Runtime (containerd)

### Install dependencies

```bash
sudo apt install -y curl gnupg2 software-properties-common apt-transport-https ca-certificates
```

### Install containerd

```bash
sudo apt install -y containerd
```

### Configure containerd

```bash
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
```

Now enable `SystemdCgroup`:

```bash
sudo nano /etc/containerd/config.toml
```

Find this line:

```
SystemdCgroup = false
```

Change it to:

```
SystemdCgroup = true
```

Save and exit (`Ctrl+X` → `Y` → `Enter`), then restart:

```bash
sudo systemctl restart containerd
sudo systemctl enable containerd
```

Verify:

```bash
sudo systemctl status containerd
```

---

## Install Kubernetes Tools

### Add Kubernetes apt repository

```bash
sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | \
sudo tee /etc/apt/sources.list.d/kubernetes.list
```

### Install kubelet, kubeadm, kubectl

```bash
sudo apt update
sudo apt install -y kubelet kubeadm kubectl
```

### Hold versions (prevent accidental upgrades)

```bash
sudo apt-mark hold kubelet kubeadm kubectl
```

Verify:

```bash
kubectl version --client
kubeadm version
```

---

## Initialize Kubernetes Cluster

### Get your EC2 Private IP

```bash
hostname -I
```

Copy the first IP shown (e.g., `172.31.25.213`).

### Run kubeadm init

Replace `YOUR_PRIVATE_IP` with the IP from above:

```bash
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=YOUR_PRIVATE_IP
```

> ⏳ This takes 2–3 minutes. Wait until you see `Your Kubernetes control-plane has initialized successfully!`

---

## Configure kubectl

Run these **immediately after** kubeadm finishes:

```bash
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

Verify cluster is up:

```bash
kubectl get nodes
```

You should see your node with status `NotReady` (normal — Calico not installed yet).

---

## Install Pod Network (Calico)

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/calico.yaml
```

Wait for all pods to be `Running`:

```bash
kubectl get pods -A -w
```

Once all pods are `Running`, check your node again:

```bash
kubectl get nodes
```

Status should now be `Ready`. ✅

---

## Remove Control Plane Taint

Since this is a **single EC2 node**, you need to allow pods to schedule on the control plane:

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

---

## Deploy the Application

Now deploy the full app — this creates the `user-management` namespace and runs backend, frontend, and PostgreSQL:

```bash
cd Kubernetes-Project
kubectl apply -f .
```

This applies all manifests and creates:
- Namespace: `user-management`
- Deployments: `backend`, `frontend`, `postgres`
- Services for each component

Verify everything is running:

```bash
kubectl get all -n user-management
```

Expected output:

```
NAME                            READY   STATUS    RESTARTS   AGE
pod/backend-xxx                 1/1     Running   0          1m
pod/backend-yyy                 1/1     Running   0          1m
pod/frontend-xxx                1/1     Running   0          1m
pod/frontend-yyy                1/1     Running   0          1m
pod/postgres-xxx                1/1     Running   0          1m
```

---

## Install Observability Stack

### Prerequisites — Install Helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

### Add Helm Repositories

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### Create Monitoring Namespace

```bash
kubectl create namespace monitoring
```

### Install Prometheus (kube-prometheus-stack)

```bash
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  --set prometheus.prometheusSpec.scrapeInterval="15s" \
  --set prometheus.prometheusSpec.evaluationInterval="15s"
```

### Install Loki + Promtail

Promtail automatically collects logs from **all pods** and ships them to Loki.

```bash
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set loki.enabled=true \
  --set promtail.enabled=true \
  --set grafana.enabled=false
```

### Install Grafana

Create a values file with both datasources pre-configured:

```bash
cat <<EOF > grafana-values.yaml
adminPassword: "admin123"

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

service:
  type: NodePort
  nodePort: 32000
EOF
```

Install:

```bash
helm install grafana grafana/grafana \
  --namespace monitoring \
  --values grafana-values.yaml
```

### Verify All Monitoring Pods

```bash
kubectl get pods -n monitoring
```

Wait until all pods are `Running` (takes 2–3 minutes):

```
NAME                                                        READY   STATUS    
alertmanager-prometheus-kube-prometheus-alertmanager-0      2/2     Running   
grafana-xxxx                                                1/1     Running   
loki-0                                                      1/1     Running   
loki-promtail-xxxx                                          1/1     Running   
prometheus-kube-prometheus-operator-xxxx                   1/1     Running   
prometheus-kube-state-metrics-xxxx                          1/1     Running   
prometheus-prometheus-kube-prometheus-prometheus-0          2/2     Running   
prometheus-prometheus-node-exporter-xxxx                    1/1     Running   
```

---

## Access Grafana & Import Dashboard

### Open Security Group Port (AWS Console)

1. Go to **EC2 → Your Instance → Security → Security Groups**
2. Click **Edit Inbound Rules**
3. Add rule: Type `Custom TCP`, Port `32000`, Source `0.0.0.0/0`
4. Save rules

### Get EC2 Public IP

```bash
curl ifconfig.me
```

### Open Grafana in Browser

```
http://<YOUR_EC2_PUBLIC_IP>:32000
```

Login credentials:
- **Username:** `admin`
- **Password:** `admin123`

### Import the Sample Dashboard

A pre-built dashboard `sample-grafana-dashboard.json` is included in this repo covering:
- Backend CPU & Memory per pod
- Frontend CPU & Memory per pod
- Backend & Frontend live logs

**To import:**

1. In Grafana → Left sidebar → click **"+"** → **"Import"**
2. Click **"Upload JSON file"**
3. Select `sample-grafana-dashboard.json` from this repo
4. Select **Prometheus** as the datasource when prompted
5. Click **Import**

---

## Dashboard Reference

The included `sample-grafana-dashboard.json` uses these queries. You can also build panels manually using them.

### Backend CPU Usage

```promql
sum(rate(container_cpu_usage_seconds_total{namespace="user-management", pod=~"backend-.*", container!="", container!="POD"}[5m])) by (pod)
```

### Backend Memory Usage

```promql
sum(container_memory_working_set_bytes{namespace="user-management", pod=~"backend-.*", container!="", container!="POD"}) by (pod)
```

### Frontend CPU Usage

```promql
sum(rate(container_cpu_usage_seconds_total{namespace="user-management", pod=~"frontend-.*", container!="", container!="POD"}[5m])) by (pod)
```

### Frontend Memory Usage

```promql
sum(container_memory_working_set_bytes{namespace="user-management", pod=~"frontend-.*", container!="", container!="POD"}) by (pod)
```

### Backend Logs (Loki)

```logql
{namespace="user-management", pod=~"backend-.*"}
```

### Frontend Logs (Loki)

```logql
{namespace="user-management", pod=~"frontend-.*"}
```

### Pod Restart Count (Bonus stat panel)

```promql
sum(kube_pod_container_status_restarts_total{namespace="user-management"}) by (pod)
```

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────┐
│  🔴 Backend Health                                  │
│  ┌───────────────────────┬───────────────────────┐  │
│  │   Backend CPU Usage   │  Backend Memory Usage │  │
│  └───────────────────────┴───────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  🔵 Frontend Health                                 │
│  ┌───────────────────────┬───────────────────────┐  │
│  │  Frontend CPU Usage   │ Frontend Memory Usage │  │
│  └───────────────────────┴───────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  📋 Logs                                            │
│  ┌───────────────────────┬───────────────────────┐  │
│  │     Backend Logs      │    Frontend Logs      │  │
│  └───────────────────────┴───────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Quick Troubleshooting

| Problem | Fix |
|---|---|
| `kubectl get nodes` shows `NotReady` | Wait for Calico pods to be Running: `kubectl get pods -A` |
| Grafana shows "No Data" | Check `kubectl get pods -n monitoring` — all must be Running |
| CPU panel shows 0 | Use `* 100` at end of CPU query and set unit to `percent (0-100)` |
| Loki shows no logs | Check Promtail: `kubectl logs -n monitoring -l app=promtail --tail=20` |
| Port 32000 unreachable | Add inbound rule for TCP 32000 in EC2 Security Group |
| `kubeadm init` fails | Re-run kernel module steps and `sudo sysctl --system` |

---

## Tech Stack Summary

| Component | Purpose |
|---|---|
| **kubeadm** | Bootstrap Kubernetes cluster |
| **Calico** | Pod networking (CNI) |
| **containerd** | Container runtime |
| **Backend** | Application backend (user-management namespace) |
| **Frontend** | Application frontend (user-management namespace) |
| **PostgreSQL** | Database (user-management namespace) |
| **Prometheus** | Scrapes CPU/Memory/pod metrics every 15s |
| **Loki** | Stores logs from all pods |
| **Promtail** | DaemonSet that ships pod logs to Loki |
| **Grafana** | Visualizes metrics and logs on port 32000 |

---

> Made with ❤️ by [dev-krishan-dhaka](https://github.com/dev-krishan-dhaka)
