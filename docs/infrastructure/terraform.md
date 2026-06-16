# Infrastructure as Code (Terraform)

This document describes the Terraform setup used to manage the `your-gcp-project-id` GCP project.

## Directory Structure
All Terraform files are located in the `terraform/` directory.

- `main.tf`: Provider configuration (Google) and backend setup.
- `variables.tf`: Input variable definitions.
- `terraform.tfvars`: Project-specific variable values.
- `*.tf`: Resource-specific files (e.g., `cloud_run.tf`, `storage.tf`).

## Backend & State
- **State Location**: Terraform state is stored in a GCS bucket to enable team collaboration and consistency.
- **Locking**: State locking is handled automatically by GCS.

## Module Organization
The infrastructure is organized into functional files rather than nested modules for simplicity:
- `network.tf`: Sets up the VPC, subnets, and VPC connector.
- `iam_secrets.tf`: Manages Service Accounts, IAM roles, and Secret Manager entries.
- `cloud_run.tf`: Defines the Cloud Run service, traffic splitting, and environment variables.
- `load_balancer.tf`: Configures the Global HTTPS Load Balancer and SSL certificates.

## Deployment Workflow
1. **Change**: Modify `.tf` files in `terraform/`.
2. **Plan**: Run `terraform plan` to preview changes.
3. **Apply**: Terraform changes are typically applied via the CI/CD pipeline when changes are merged into the main branch.

## CI/CD Integration
GitHub Actions are configured to:
- Authenticate with GCP via Workload Identity Federation.
- Run `terraform plan` on Pull Requests.
- Run `terraform apply` on pushes to the main branch.
