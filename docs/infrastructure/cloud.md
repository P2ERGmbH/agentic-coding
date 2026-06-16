# Cloud Infrastructure (GCP)

This document provides an overview of the Google Cloud Platform (GCP) infrastructure for the Next.js application.

## Overview
- **Project ID**: `your-gcp-project-id`
- **Project Console**: [GCP Cloud Hub](https://console.cloud.google.com/cloud-hub?project=your-gcp-project-id)
- **Primary Region**: `europe-west3` (Frankfurt)

## Primary Services

### 1. Compute (Cloud Run)
The Next.js application is deployed as a containerized service on **Cloud Run**.
- It scales automatically based on request volume.
- Configuration is found in `terraform/cloud_run.tf`.

### 2. Storage (Cloud Storage)
GCS buckets are used for:
- Static assets and image optimization cache.
- Configuration is found in `terraform/storage.tf`.

### 3. Networking
- **VPC**: A dedicated Virtual Private Cloud network.
- **Load Balancer**: Global HTTPS Load Balancer with SSL certificates.

### 4. Secrets (Secret Manager)
Sensitive environment variables (API keys, integration credentials) are stored in **Secret Manager** and injected into the Cloud Run service at runtime.

## Utility Commands
Use the `gcloud` CLI to interact with the project:
```bash
# Set current project
gcloud config set project your-gcp-project-id

# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=your-application-service" --limit 10
```

## Performance Monitoring & Debugging

When identifying performance bottlenecks in the production environment:
1. **Analyze Cloud Run Logs for Latency**: Look for `httpRequest.latency` in the logs to pinpoint slow endpoints.
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=your-application-service AND httpRequest.latency > \"10s\"" --limit 50 --format="json(timestamp, httpRequest.latency, httpRequest.status, httpRequest.requestUrl)"
   ```
2. **Review Internal Timing Traces**: Our integrations emit `performance.now()` traces in the logs. Identify the exact step causing the delay.
3. **Common Bottlenecks**:
   - **External Partner APIs**: Slow partner response times without concurrency limits.
   - **Cold Starts**: Uncached external mapping lookups.

**Agentic Workflow**: Use the `review-performance` Gemini skill to autonomously identify and resolve these issues.
