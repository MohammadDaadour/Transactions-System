#  High-Performance Transactional Ledger & Remittance Engine

> A robust, fault-tolerant financial ledger and money transfer system, automated CI/CD pipelines, and a production-grade containerized infrastructure.

---

##  Architectural Overview & System Design

```
[ Client / Web App ]
        │
        ▼
[ NGINX Reverse Proxy + Certbot SSL / WAF ]
        │
        ▼
[ Linux VPS ──► Docker Engine ]
    └── [ Next.js App Container ] (Standalone / Production Mode)
        │
        ▼ (Secure Connection via SSL)
[ Neon Serverless PostgreSQL ]
        │
        ▲
[ Automated GitHub Actions CI/CD Pipeline ] ──► [ Push to Master ]
```

---

## DevOps & Infrastructure Stack

This project is built with a heavy emphasis on **Infrastructure Automation**, **Zero-Downtime Container Deployments**, and **Cloud-Native Persistence**:

*   **Containerization:** The Next.js application is fully containerized using a multi-stage **Dockerfile** to optimize image size, eliminate build tools in production, and guarantee absolute environment parity.
*   **Cloud Database Architecture:** Utilizes **Neon (Serverless PostgreSQL)** for robust, enterprise-grade ACID compliance and connection pooling without managing local database instances.
*   **Web Server & SSL/TLS:** Configured with **NGINX** acting as a high-performance reverse proxy, routing traffic directly to the Docker container, integrated with **Certbot (Let's Encrypt)** for automated SSL management.
*   **CI/CD Automation:** Integrated with **GitHub Actions** to automate the build, image pushing/pulling, and container rolling deployment directly to a remote **Linux VPS**.

---

## CI/CD Deployment Pipeline (`.github/workflows/deploy.yml`)

The deployment pipeline is fully automated. Upon pushing to the main branch, the workflow executes the following phases:

1. **Checkout & Setup:** Pulls the latest source code on a secure runner.
2. **Build & Compile:** Runs type-checking, compiles the Next.js assets, and prepares the production build.
3. **SSH Remote Deployment:** Securely connects to the target Linux VPS via SSH.
4. **Container Rolling Update:** Pulls the latest Docker image, executes deployment commands, and performs a graceful container restart with zero downtime.

---

## Security & Reliability Engineering

*   **Atomic Transactions:** Enforces strict database-level isolation and managed transactions to guarantee that all debit, credit, and ledger entries happen atomically (all-or-nothing), preventing financial discrepancies.
*   **Environment Segregation:** All sensitive credentials (Neon DB connection strings, JWT secrets, API keys) are strictly injected via environment variables (`.env`) and excluded from version control.
*   **Reverse Proxy Hardening:** NGINX is configured with secure SSL ciphers, HTTP-to-HTTPS redirects, and security headers against common web vulnerabilities.

---

## Getting Started & Local Development

### Prerequisites
*   Docker & Docker Compose installed on your machine.
*   A connection string to a PostgreSQL database (e.g., Neon).

### 1. Clone the Repository
```bash
git clone [https://github.com/MohammadDaadour/Transactions-System.git](https://github.com/MohammadDaadour/Transactions-System.git)
cd transactional-ledger