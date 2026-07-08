# Agentra Prompt Management Architecture

This package provides a production-grade, modular, and decoupled prompt management subsystem for Agentra's AI Employee workforce.

---

## 📂 Subsystem Structure

### 1. `templates/`
Stores predefined base system prompts for default AI Employees:
- Operations Agent
- Marketing Agent
- Sales Agent
- Customer Support Agent
- HR Agent
- Finance Agent

### 2. `builders/`
Exposes the dynamic compilation layers. The `PromptBuilder` class merges:
- Base system templates
- User instruction payloads
- Memory (short-term & long-term)
- RAG Knowledge context (PDFs, FAQs)
- Available tools list and usage instructions

### 3. `versions/`
Provides configuration versioning and prompt registry rolling back logs. Tracks author metadata, description, creation timestamps, and raw strings.

### 4. `memory/`
Standardizes memory retrieval interfaces. Separates conversation logs, user preferences, and short-term or long-term recall providers.

### 5. `knowledge/`
Exposes document chunk registry mappings, document category indices (PDFs, sites, FAQs), and placeholders for semantic embedding retrieval.

### 6. `registry/`
Acts as a central service locator, keeping track of registered templates, active builders, and memory or knowledge source providers.

### 7. `analytics/`
Logs metadata of compiled LLM prompt runs: latency, input/output token usage counts, computed execution costs, and run results (success/failure rates).

### 8. `testing/`
Contains testing suites to perform prompts regression testing, comparing output variations across templates versions.

### 9. `utils/`
Provides string sanitization, token length estimators, and common formatting template utilities.

---

## ⚡ Integration Guide
1. Retrieve base template from `PromptRegistry`.
2. Construct final prompt string via `PromptBuilder`.
3. Track executions logs via `PromptAnalytics`.
