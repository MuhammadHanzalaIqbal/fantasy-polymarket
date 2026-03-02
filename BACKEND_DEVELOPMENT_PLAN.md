# Fantasy Polymarket Backend Development Plan

## 1. Purpose

This document defines a comprehensive backend plan for Fantasy Polymarket, including:

- target architecture,
- service boundaries,
- implementation phases,
- security and reliability controls,
- delivery milestones.

Design principle: the backend must be operationally useful but not custodial. Smart contracts remain the source of truth for balances, permissions, and settlement.

---

## 2. Product Context and Constraints

## 2.1 Protocol context

On-chain contracts provide:

- `FantasyToken` (`FTK`) mint/burn and role controls,
- `DepositRouter` and `WithdrawalRouter` on/off-ramps,
- `PlayerMarket` share trading and fee capture,
- `PlayerShareManager` tokenized player exposure,
- `ContestManager` contest lifecycle and payouts,
- `OracleAdapter` signed score ingestion with replay/timestamp controls,
- `Treasury` fee and reserve storage.

## 2.2 Backend trust model

Backend responsibilities:

- provide low-latency read APIs,
- compute deterministic fantasy scores off-chain,
- sign and relay oracle payloads,
- monitor and trigger operational transactions (such as contest resolution),
- expose analytics and monitoring signals.

Backend must not:

- custody user funds,
- bypass or override smart-contract permissions,
- become mandatory for regular protocol operation.

---

## 3. Target Architecture (Schematic)

## 3.1 High-level diagram

```text
                         +------------------------------+
                         |     Sports Data Providers    |
                         | (Opta/Sportradar/etc future) |
                         +--------------+---------------+
                                        |
                                        v
 +------------+    +---------------------------+    +-------------------+
 |   Clients  |--->| API Gateway (FastAPI)     |<---|  Redis Cache      |
 | Web/Mobile |    | - contest/portfolio APIs  |    | hot read models   |
 +-----+------+    | - auth/rate limiting      |    +-------------------+
       |           +-------------+-------------+
       |                         |
       |                         v
       |             +--------------------------+
       |             | PostgreSQL (Read Models) |
       |             | indexed entities/events  |
       |             +------------+-------------+
       |                          ^
       |                          |
       |             +------------+-------------+
       |             | Indexer Service          |
       |             | - chain event ingestion  |
       |             | - projections/upserts    |
       |             +------------+-------------+
       |                          |
       |                          v
       |             +--------------------------+
       |             | EVM RPC (Sepolia/Mainnet)|
       |             +------------+-------------+
       |                          |
       |                          v
       |        +-------------------------------------------+
       +------->| Smart Contracts                           |
                | FTK / Routers / Market / Contest / Oracle |
                +----------------+--------------------------+
                                 ^
                                 |
               +-----------------+------------------+
               | Oracle Engine + Signer + Relayer   |
               | - score compute                     |
               | - payload signing                   |
               | - submit to OracleAdapter           |
               +-----------------+------------------+
                                 |
                                 v
                      +------------------------+
                      | Worker Orchestrator    |
                      | - contest resolution   |
                      | - retries/scheduling   |
                      +------------------------+
```

## 3.2 Service map

1. `api-gateway` (FastAPI): user-facing read APIs and lightweight write helpers.
2. `indexer`: event consumer + projection writer to Postgres.
3. `oracle-engine`: deterministic score computation pipeline.
4. `relayer`: submits signed oracle payloads and administrative ops.
5. `worker`: scheduled and event-driven orchestration (contest resolution, recovery jobs).
6. `monitoring`: metrics, logs, traces, alerts, risk signals.

---

## 4. Backend Components in Detail

## 4.1 API Gateway

Primary role: low-latency access to protocol state with normalized schemas.

Core endpoints (initial):

- `GET /health`
- `GET /contests`
- `GET /contests/{contest_id}`
- `GET /contests/{contest_id}/leaderboard`
- `GET /players`
- `GET /players/{player_id}`
- `GET /markets/{player_id}/quote`
- `GET /users/{address}/portfolio`
- `GET /users/{address}/activity`

Optional helper endpoints:

- `POST /simulate/buy`
- `POST /simulate/sell`
- `POST /validate/roster`

Non-functional requirements:

- strict request validation with Pydantic,
- response caching for heavy read routes,
- per-IP and per-wallet rate limits,
- chain-aware error envelopes (reorg/stale/index lag states).

## 4.2 Indexer Service

Role: consume contract events and build queryable read models.

Ingestion scope:

- deposits/withdrawals,
- market buys/sells and pool updates,
- share token creation and balances (derived),
- contest creation/entry/resolution,
- oracle matchweek submissions and player scores.

Indexing model:

- block-range catchup,
- realtime tailing,
- reorg-safe confirmation window,
- idempotent upserts keyed by `(chain_id, tx_hash, log_index)`.

## 4.3 Oracle Engine

Role: deterministic, auditable fantasy score computation.

Pipeline:

1. ingest raw provider payloads,
2. normalize and deduplicate events,
3. compute deterministic player scores by versioned ruleset,
4. build per-matchweek score payload,
5. sign payload hash with oracle key,
6. hand off to relayer for submission.

Key guarantees:

- deterministic outputs from same inputs,
- full replayability with immutable input snapshots,
- scoring version tags stored with output records.

## 4.4 Relayer Service

Role: isolated transaction sender with queue semantics.

Responsibilities:

- submit signed oracle data to `OracleAdapter`,
- trigger contest resolution transactions when ready,
- enforce nonce and gas strategy,
- retry transient failures,
- emit detailed tx lifecycle telemetry.

Security:

- relayer key separated from signer key,
- signer key usage restricted to signature operations only.

## 4.5 Worker Orchestrator

Role: protocol operations automation.

Jobs:

- monitor contest states and lock windows,
- call resolution when oracle data is finalized,
- backfill missing projections,
- reconcile on-chain and indexed state,
- trigger alerts on stuck contests or stale oracle data.

Execution model:

- async task queue (e.g., Celery/Arq/RQ),
- per-job idempotency keys,
- dead-letter queue for manual intervention.

## 4.6 Monitoring and Risk Layer

Metrics to track:

- API p95/p99 latency and error rate,
- indexer lag in blocks and seconds,
- oracle submission freshness,
- contest resolution delays,
- unusual withdrawal/trading bursts,
- relayer tx failure/retry rates.

Observability stack:

- Prometheus + Grafana metrics,
- centralized structured logs,
- distributed traces for API/indexer/worker paths,
- alert routing (PagerDuty/Opsgenie/Slack).

---

## 5. Data Architecture

## 5.1 Storage strategy

- `PostgreSQL`: canonical backend read models and analytics tables.
- `Redis`: cache, short-lived counters, rate limits, idempotency locks.
- object storage (optional): raw oracle provider snapshots and audit artifacts.

## 5.2 Suggested relational model

Core entities:

- `chains`
- `blocks`
- `transactions`
- `events`
- `users`
- `players`
- `player_pools`
- `player_scores`
- `trades`
- `contests`
- `contest_entries`
- `contest_results`
- `oracle_submissions`
- `treasury_flows`
- `system_jobs`

Indexing recommendations:

- unique `(chain_id, tx_hash, log_index)` for events,
- btree indexes for `(contest_id)`, `(user_address)`, `(player_id)`,
- time-series indexes for monitoring/analytics tables.

---

## 6. End-to-End Operational Flows

## 6.1 Deposit and market participation

1. User deposits through `DepositRouter`.
2. Indexer captures deposit event and updates portfolio read model.
3. User buys/sells in `PlayerMarket`.
4. API serves market quotes and updated portfolio from indexed state.

## 6.2 Oracle and contest resolution

1. Oracle engine computes scores for matchweek `N`.
2. Signer signs payload; relayer submits to `OracleAdapter`.
3. Indexer records matchweek finalization and score updates.
4. Worker detects contests ready for resolution.
5. Relayer calls `resolveContest`.
6. Indexer updates leaderboard and payout records.

## 6.3 Withdrawal

1. User calls `WithdrawalRouter.withdraw`.
2. Router checks limits/reserves and burns FTK.
3. Treasury-backed asset transfer completes.
4. Indexer and API update balances/activity.

---

## 7. Security Architecture

## 7.1 Key management

- use dedicated keys for:
  - oracle signer,
  - relayer sender,
  - admin operations.
- production signer key in HSM/KMS-backed signing flow.

## 7.2 Access control and hardening

- role-based access for internal APIs and job triggers,
- mTLS or signed service-to-service requests for privileged actions,
- strict secrets management (no plaintext in repo),
- egress restrictions on signing service.

## 7.3 Protocol safety checks

- replay protection respected end-to-end,
- stale data rejection mirrored in backend validation,
- configurable kill switches for relayer submission,
- anomaly detectors for withdrawals and oracle silence.

---

## 8. Reliability and Scalability Plan

## 8.1 Availability targets (initial)

- API uptime target: `99.5%` (MVP), `99.9%` (production).
- indexer lag target: `< 30s` p95 in steady state.
- oracle publication SLA: matchweek output within agreed window.

## 8.2 Scaling strategy

- horizontal API workers behind load balancer,
- partitioned indexer consumers by block ranges/topics,
- separate queues by job criticality,
- read replicas for analytics-heavy queries.

## 8.3 Failure handling

- automatic retries with exponential backoff,
- idempotent job design everywhere,
- circuit breakers around RPC/provider dependencies,
- operational runbooks for signer/relayer/indexer outages.

---

## 9. Implementation Roadmap (Phased)

## Phase 0: Foundations

Deliverables:

- monorepo layout for services,
- shared config module and environment policy,
- CI skeleton (lint, tests, type-check, security scans),
- local stack via Docker Compose (Postgres, Redis, observability).

Exit criteria:

- local developer can boot all baseline infra and run smoke checks.

## Phase 1: Indexer MVP + Core Read APIs

Deliverables:

- event ingestion for all core contracts,
- Postgres schema v1 and migration pipeline,
- contest/player/portfolio endpoints,
- cache layer for hot routes.

Exit criteria:

- API answers from indexed data with bounded lag and reorg safety.

## Phase 2: Oracle Engine + Relayer

Deliverables:

- deterministic scoring module (versioned),
- raw input snapshotting and audit logs,
- signer integration and payload hashing,
- relayer with tx queue and retry strategy.

Exit criteria:

- complete matchweek data path to `OracleAdapter` on testnet.

## Phase 3: Contest Operations Worker

Deliverables:

- contest readiness detection,
- automated resolution execution,
- stuck-flow recovery jobs and alerting.

Exit criteria:

- contests consistently resolve without manual intervention.

## Phase 4: Security, Observability, and Hardening

Deliverables:

- key separation and secret rotation process,
- full dashboards and actionable alerts,
- load/performance tests and chaos drills,
- incident runbooks and escalation policy.

Exit criteria:

- production-readiness review passed with documented SLOs.

## Phase 5: Production Launch and Post-Launch

Deliverables:

- staged rollout (shadow -> canary -> full),
- post-launch monitoring cadence,
- weekly reliability/security review loop.

Exit criteria:

- stable production operation with on-call confidence.

---

## 10. Testing Strategy

## 10.1 Test layers

- unit tests for all business logic (scoring, normalization, validation),
- integration tests with local chain/RPC mocks,
- end-to-end tests for deposit -> trade -> score -> resolve -> withdraw,
- regression tests for historical matchweeks.

## 10.2 Determinism and reproducibility

- fixed fixtures for score rules,
- snapshot-based test vectors for oracle payloads,
- hash verification tests for signed submissions.

## 10.3 Performance and resilience

- API load tests (steady and burst),
- indexer catch-up benchmarks,
- failure injection for RPC/provider downtime,
- queue backlog and recovery validation.

---

## 11. Suggested Repository Layout (Backend)

```text
backend/
├── api/
│   ├── main.py
│   ├── routes/
│   ├── deps/
│   └── schemas/
├── indexer/
│   ├── consumer.py
│   ├── projections/
│   └── models/
├── oracle/
│   ├── ingest/
│   ├── scoring/
│   ├── payloads/
│   └── signer/
├── relayer/
│   ├── tx_queue.py
│   └── sender.py
├── worker/
│   ├── jobs/
│   └── scheduler.py
├── common/
│   ├── config.py
│   ├── logging.py
│   └── metrics.py
└── tests/
```

---

## 12. Immediate Next Actions (Next 2 Weeks)

1. Finalize backend stack decisions (FastAPI, SQLAlchemy, Celery/Arq, Redis, Postgres).
2. Implement schema migration setup and base models.
3. Build indexer MVP for `ContestManager`, `PlayerMarket`, `OracleAdapter` events.
4. Expose initial read APIs (`/contests`, `/players`, `/portfolio`).
5. Define scoring rules v1 and deterministic test vectors.
6. Implement signer/relayer proof-of-concept on Sepolia.
7. Create first dashboard: API latency, index lag, oracle freshness.

---

## 13. Definition of Done for Backend MVP

Backend MVP is done when:

- indexed read APIs are stable and documented,
- oracle matchweek publication is automated and auditable,
- contest resolution trigger loop is functional,
- monitoring detects lag/failures in near real time,
- security controls for keys/secrets are enforced,
- end-to-end flow tests pass on testnet.

