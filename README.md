# UserM Monitoring Stack

A fully Dockerized monitoring solution with frontend/backend services, PostgreSQL, Prometheus, Grafana, Loki, Blackbox uptime monitoring, and cAdvisor container metrics.

---

## Features

- **Dockerized Frontend & Backend** — containerized application services
- **PostgreSQL** — persistent relational database
- **Prometheus** — metrics collection and alerting
- **Grafana** — interactive dashboards and visualization
- **Loki** — centralized log aggregation
- **Blackbox Exporter** — uptime and endpoint monitoring
- **cAdvisor** — container resource and performance metrics

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/dev-krishan-dhaka/userm-monitoring-stack
cd userm-monitoring-stack

```
### 2. setup .env
```bash
cp .env.example .env
```


### 3. Start All Containers

```bash
docker compose up -d
```

---

## Service URLs

| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000      |
| Backend    | http://localhost:5000      |
| Grafana    | http://localhost:3001      |
| Prometheus | http://localhost:9090      |

---

## Import Grafana Dashboard

1. Open Grafana at [http://localhost:3001](http://localhost:3001) and log in
2. In the left sidebar, go to **Dashboards → Import**
3. Click **Upload dashboard JSON file** and select `grafana-dashboard.json`
4. Under **Prometheus**, select your Prometheus datasource from the dropdown
5. Click **Import**

Your dashboard will now be available under **Dashboards**.

### Add DATASOURCE in GRAFANA
1. Prometheus - http://prometheus:9090
2. Loki - http://loki:3100

---

## Project Structure

```
.
├── docker-compose.yml
├── grafana-dashboard.json
├── frontend/
├── backend/
└── README.md
```

---

## License

MIT
