# @agentra-a/cli

Agentra Command Line Interface (CLI) is an interactive developer tool designed to manage autonomous AI Employees and trigger operational workflows from your console.

## Local Installation

Until this package is published to the public npm registry, install it locally depending on your operating system:

---

### Windows (PowerShell)

Run each command line-by-line:

```powershell
cd agentra-cli
npm install
npm run build
npm link
agentra --help
```

*Note: If you get a PowerShell script execution policy error, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` to allow execution of local npm command scripts.*

---

### Windows (CMD)

```cmd
cd agentra-cli && npm install && npm run build && npm link && agentra --help
```

---

### Windows (Git Bash) / macOS / Linux / WSL / GitHub Codespaces

```bash
cd agentra-cli && npm install && npm run build && npm link && agentra --help
```

---

## Troubleshooting

### 1. Command Not Found (`agentra: command not found`)
- Ensure npm's global bin directory is registered in your environment `PATH` variable.
- On Windows PowerShell, verify the path: `$env:APPDATA\npm`.
- On Unix/macOS, verify the path: `/usr/local/bin` or `~/.npm-global/bin`.

### 2. Permissions Error (`EPERM` / `EACCES`)
- If running `npm link` fails with permission errors on macOS or Linux, run:
  ```bash
  sudo npm link
  ```
- Alternatively, check filesystem permissions on your configuration workspace directory `~/.agentra/`.

### 3. PowerShell Execution Policy Block
- If PowerShell blocks running the `agentra` script, run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

---

## Available Commands

- `agentra login`: Authenticate against your workspace tenant.
- `agentra logout`: Disconnect CLI and clear credentials.
- `agentra init`: Setup local directory environment.
- `agentra chat`: Ping AI Workforce reasoning engines.
- `agentra employee`: Create, list, or manually trigger background agents.
- `agentra workflow`: Create and execute operational automations.
- `agentra prompt`: Manage studio instruction versions.
- `agentra knowledge`: Synchronize RAG folder records.
- `agentra memory`: Search long-term vectors.
- `agentra deploy`: Deploy workspace blueprints to Agentra Cloud.
- `agentra doctor`: Run health diagnostics checklist.
- `agentra update`: Check for CLI updates.
