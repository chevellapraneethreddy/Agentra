# @agentra/cli

Agentra Command Line Interface (CLI) is an interactive developer tool designed to manage autonomous AI Employees and trigger operational workflows from your console.

## Local Preview Installation

Until this package is published to the public npm registry, install it locally:

```bash
# Navigate to the CLI directory
cd agentra-cli

# Install dependencies
npm install

# Compile the TypeScript files
npm run build

# Link the package globally
npm link
```

## Running the CLI

After linking, invoke the CLI from any terminal workspace:

```bash
agentra
```

Available commands:

- `agentra login`: Authenticate against your workspace tenant.
- `agentra logout`: Disconnect CLI and clear credentials.
- `agentra init`: Setup local directory environment.
- `agentra chat`: Send message logs to reasoning engine.
- `agentra employee`: Create, list, or manually trigger background agents.
- `agentra workflow`: Create and execute operational automations.
- `agentra prompt`: Manage studio instruction versions.
- `agentra knowledge`: Synchronize RAG folder records.
- `agentra memory`: Search long-term vectors.
- `agentra deploy`: Deploy workspace blueprints to Agentra Cloud.
- `agentra doctor`: Run health diagnostics checklist.
- `agentra update`: Check for CLI updates.
