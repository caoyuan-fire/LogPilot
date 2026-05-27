# LogPilot Implementation Plan

> **For Qoder / human implementers:** Implement this plan task-by-task. Each task must output human verification items. The project is competition-Demo oriented, so visual effect and successful local run matter more than exhaustive engineering hardening.

**Goal:** Build a demo-ready LogPilot prototype that extracts PID lifecycle, dynamic Tags, timeline evidence, and AI triage reports from Android/seat-cockpit logs.

**Architecture:** Deterministic parsing and evidence extraction first; AI report generation second. HealthMonitor/Jira integration is demonstrated through a mock workflow unless real permissions are granted.

**Tech Stack:** Recommended default is Vite + React + TypeScript for the browser UI, Node.js + Express/Fastify for the local backend, Vitest for basic tests, and an `AiProvider` abstraction for mock/DeepSeek calls. The DeepSeek API key must live only in backend `.env.local`.

---

## Role and Package Contract

This package is the execution contract for Qoder and human implementers.

Actual coding is expected to be done by Qoder. Final acceptance is done by a human operator running the verification items locally.

Do not bypass dependencies, forbidden files, safety rules, or human verification items.

Before executing any task, the executor must read:

- `README.md`
- `00_agent_manual/agent_operation_manual.md`
- `04_jobs/JOB_INDEX.md`
- The specific `04_jobs/JOB-*.md` file for the task

If this plan and a Job file conflict, the stricter rule wins and the package should be revised before continuing.

## File Structure

Recommended implementation layout:

```text
src/
  web/
    App.tsx
    apiClient.ts
  server/
    index.ts
    ai/
      aiProvider.ts
      mockProvider.ts
    deepseekProvider.ts
    pipeline/
      logParser.ts
      timeWindow.ts
      pidTracker.ts
      tagAnalyzer.ts
      systemEventExtractor.ts
      timelineBuilder.ts
      reportInputBuilder.ts
    demoWorkflow.ts
  shared/
    types.ts
tests/
  fixtures/
  logParser.test.ts
  pidTracker.test.ts
  tagAnalyzer.test.ts
  timelineBuilder.test.ts
  reportInputBuilder.test.ts
  aiProvider.test.ts
prompts/
  triage_report_prompt.md
demo/
  hm_event_sample.json
  jira_comment_sample.md
```

## Task 0：Local Web Dev Environment

Package gate：may be executed by an execution Agent because it creates the local project skeleton only. Must not configure real API keys.

**Files:**

- Create: `package.json`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/web/App.tsx`
- Create: `src/server/index.ts`
- Create: `src/shared/types.ts`

- [ ] Create Vite React TypeScript project skeleton.
- [ ] Add local backend entry with `/health` endpoint.
- [ ] Add `.env.example` with `AI_PROVIDER=mock`, DeepSeek base URL, `AI_MODEL=deepseek-chat`, and empty key fields.
- [ ] Add `.env.local` to `.gitignore`.
- [ ] Add scripts: `dev:web`, `dev:server`, `test`, `build`.
- [ ] Run `npm install`.
- [ ] Run `npm run build`.
- [ ] Run backend and frontend locally.

## Task 1：LogParser and TimeWindow

Package gate：may be executed only after JOB-000 is implemented and human-verified.

**Files:**

- Create: `src/server/pipeline/logParser.ts`
- Create: `src/server/pipeline/timeWindow.ts`
- Create: `tests/logParser.test.ts`
- Create: `tests/fixtures/basic_logcat.log`

- [ ] Write failing test for parsing one standard logcat line.
- [ ] Run test and confirm it fails for missing parser.
- [ ] Implement minimal `parse_log_line`.
- [ ] Run test and confirm pass.
- [ ] Write failing test for unparsed line retention.
- [ ] Implement unparsed-line handling.
- [ ] Write failing test for inclusive time window filtering.
- [ ] Implement time window filter.
- [ ] Run all parser tests.

## Task 2：PidTracker

Package gate：may be executed only after JOB-001 is implemented and human-verified.

**Files:**

- Create: `src/server/pipeline/pidTracker.ts`
- Create: `tests/pidTracker.test.ts`
- Create: `tests/fixtures/pid_lifecycle.log`

- [ ] Write failing test for one package mapping to one PID.
- [ ] Implement minimal PID matching.
- [ ] Write failing test for package restart with two PID segments.
- [ ] Implement lifecycle segmentation.
- [ ] Write failing test for two packages.
- [ ] Implement multi-package support.
- [ ] Run PID tracker tests.

## Task 3：Dynamic Tags and Timeline

Package gate：may be executed only after JOB-001 and JOB-002 are implemented and human-verified.

**Files:**

- Create: `src/server/pipeline/tagAnalyzer.ts`
- Create: `src/server/pipeline/systemEventExtractor.ts`
- Create: `src/server/pipeline/timelineBuilder.ts`
- Create: `tests/tagAnalyzer.test.ts`
- Create: `tests/timelineBuilder.test.ts`

- [ ] Write failing test for Tag frequency and level distribution.
- [ ] Implement Tag statistics.
- [ ] Write failing test for system ANR event extraction.
- [ ] Implement system event extractor.
- [ ] Write failing test for cross-package chronological timeline.
- [ ] Implement timeline builder.
- [ ] Run timeline tests.

## Task 4：AI Report Input and Prompt

Package gate：may be executed only after JOB-003 is implemented and human-verified. Real AI provider is predefined as DeepSeek.

**Files:**

- Create: `src/server/pipeline/reportInputBuilder.ts`
- Create: `src/server/ai/aiProvider.ts`
- Create: `src/server/ai/mockProvider.ts`
- Create: `src/server/ai/deepseekProvider.ts`
- Create: `src/server/ai/providerFactory.ts`
- Create: `prompts/triage_report_prompt.md`
- Create: `tests/reportInputBuilder.test.ts`
- Create: `tests/aiProvider.test.ts`
- Modify: `.env.example`

- [ ] Write failing test that report input contains PID lifecycle, Tag statistics, timeline, and evidence ids.
- [ ] Implement report input builder.
- [ ] Write failing test that `AI_PROVIDER=mock` returns a deterministic report without API key.
- [ ] Implement `AiProvider` interface and `MockAiProvider`.
- [ ] Write verification item that `deepseek` provider without `AI_API_KEY` returns a clear config error.
- [ ] Implement provider factory reading `AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, `AI_TIMEOUT_MS` from backend env.
- [ ] Write prompt requiring facts, hypotheses, missing information, evidence ids, and Jira summary.
- [ ] Add backend `/api/triage-report` route that calls provider through server-side code only.
- [ ] Run report tests.

## Task 5：HM/Jira Demo Workflow

Package gate：may be executed only after JOB-004 is implemented and human-verified. Real HM/Jira access must not be used unless explicitly authorized.

**Files:**

- Create: `src/server/demoWorkflow.ts`
- Create: `demo/hm_event_sample.json`
- Create: `demo/jira_comment_sample.md`
- Create: `docs/demo_script.md`

- [ ] Write sample HM event JSON.
- [ ] Implement workflow reading event JSON and calling analysis pipeline.
- [ ] Generate Jira comment Markdown.
- [ ] Write Demo script explaining the closed loop.
- [ ] Run end-to-end sample.

## Task 6：Final Verification

Package gate：human final acceptance. Qoder should not self-declare final competition readiness.

- [ ] Run all automated tests.
- [ ] Run end-to-end sample analysis.
- [ ] Check report evidence references.
- [ ] Check safety notes for model/log data.
- [ ] Update `05_records/assumptions_and_decisions.md` with deviations.
- [ ] Run human verification checklist for all Jobs.
- [ ] Record known issues and decide whether they block the competition Demo.

## Execution Choice

Default execution:

1. Qoder implements Jobs in order.
2. Qoder generates verification items for each Job.
3. Human operator runs local verification.
4. Failures are returned to Qoder for fixes.
5. Final readiness is judged by human competition owner.
