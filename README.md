# Technical Documentation

## Overview

This project provides a framework for deploying and managing **CBA Processors** - nano services written in TypeScript - to cloud environments. Currently supports Azure deployments with automated deployment scripts.

A CBA Processor is a lightweight, single-purpose service designed to perform specific tasks. The architecture uses a monorepo workspace structure with automated deployment scripts.

**CBA Processor Skeleton:** https://github.com/corebapp-tech/cba-processor-skeleton

## Prerequisites

### Required Tools

- **Node.js** (v14 or higher recommended)
- **npm** (v7 or higher for workspace support)
- **Azure CLI** (`az`) - Required for Azure deployments
  - Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
  - Login before deployment: `az login`

## Initial Setup

### 1. Install Dependencies

First, install all project dependencies including workspace packages:

```bash
npm run install-dependencies
```

This command installs dependencies for all workspaces, including both development and production dependencies.

### 2. Environment Configuration

The project uses a two-level environment configuration:

#### Root `.env` (Project-level)

Create a `.env` file in the project root with deployment configuration:

```env
DEPLOY_STAGE=prod
DEPLOY_REGION=West Europe
DEPLOY_PROCESSOR=processor-name
```

**Environment Variables:**

- `DEPLOY_STAGE`: Deployment environment (e.g., `prod`, `dev`, `staging`)
- `DEPLOY_REGION`: Azure region for deployment (e.g., `West Europe`, `East US`)
- `DEPLOY_PROCESSOR`: Name of the processor to deploy from `src/processor/processor-name`

#### Processor `.env` (Processor-level)

Each processor has its own `.env` file with processor-specific configuration:

```
src/processor/processor-name/.env
```

This file contains environment variables specific to the processor's functionality (API keys, connection strings, etc.).

## Available Commands

### Build

Compile TypeScript and build all workspace packages:

```bash
npm run build
```

### Azure Deployment

#### Deploy to Azure

Deploy the specified processor to Azure cloud:

```bash
npm run deploy:azure
```

This command:

1. Builds the project
2. Deploys using the serverless configuration
3. Runs post-deployment setup

#### Local Development (Azure)

Run the processor locally with Azure environment simulation:

```bash
npm run dev:azure
```

This builds the project and starts a local development server.

#### Remove Deployment

Remove the deployed processor from Azure:

```bash
npm run remove:azure
```

## Workflow

### Deploying a New Processor

1. Ensure Azure CLI is installed and authenticated:

   ```bash
   az login
   ```

2. Install dependencies (first time only):

   ```bash
   npm run install-dependencies
   ```

3. Configure your `.env` file with the target processor name

4. Deploy to Azure:
   ```bash
   npm run deploy:azure
   ```

### Local Development

1. Set up your `.env` file with the processor you want to test

2. Run the local development server:
   ```bash
   npm run dev:azure
   ```

### Cleanup

To remove a deployed processor:

```bash
npm run remove:azure
```

## Architecture

The project uses a workspace-based monorepo structure, allowing multiple processors to coexist and share common dependencies. Each processor in `src/processor/` can be independently deployed to Azure using the serverless framework.

## Support

For issues and questions, please refer to the project's GitHub repository issue tracker.
