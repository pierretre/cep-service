# Machine Telemetry & Incident Live-Feedback — Backend Requirements and Mapping

## Summary

This report maps frontend live-feedback requirements to the backend features present in the repository, identifies data contracts, and highlights functional gaps and recommended next steps to fully hydrate the frontend for live machine state rendering and incident notifications.

## Quick conclusions

- Frontend consumes two real-time channels:
  - Machine state SSE at `/api/machines/stream` (events: `connected`, `machine-update`).
  - Incident SSE at `/api/incidents/stream` (events: `connected`, `incident`).
- Backend implements SSE endpoints, a machine state registry, Kafka intake, CEP-based incident creation, and broadcast logic.
- Backend emits full machine state snapshots; frontend expects snapshots (not raw deltas).
- Live positional (x/y) updates are not emitted — positions are static in the frontend SVG/layout.

## Key backend components (entry points)

- SSE endpoints:
  - Machine telemetry SSE: `src/main/java/gemoc/mbdo/cep/api/controller/MachineTelemetryController.java`
  - Incidents SSE & REST: `src/main/java/gemoc/mbdo/cep/api/controller/IncidentController.java`
- Kafka → telemetry pipeline:
  - Kafka consumer: `src/main/java/gemoc/mbdo/cep/api/kafka/KafkaEventConsumer.java`
  - Machine telemetry SSE service: `src/main/java/gemoc/mbdo/cep/api/service/MachineTelemetrySseService.java`
  - Machine state registry: `src/main/java/gemoc/mbdo/cep/api/service/MachineStateRegistryService.java`
  - Machine state DTO: `src/main/java/gemoc/mbdo/cep/api/dto/MachineStateUpdateResponse.java`
- CEP / incidents pipeline:
  - Esper CEP engine: `src/main/java/gemoc/mbdo/cep/api/esper/EsperCepEngineImpl.java`
  - Incident SSE broadcast: `src/main/java/gemoc/mbdo/cep/api/service/IncidentSseService.java`
  - Incident persistence & REST: `src/main/java/gemoc/mbdo/cep/api/service/IncidentServiceImpl.java` and `src/main/java/gemoc/mbdo/cep/api/dto/IncidentResponse.java`

## Live data call chain (trace)

- Telemetry
  1. External events arrive on Kafka topic `events` → handled by `KafkaEventConsumer.consumeEvents`.
  2. Consumer forwards event to `MachineTelemetrySseService.onKafkaEvent(...)` and to CEP engine (`engine.sendEvent(...)`).
  3. `MachineTelemetrySseService.onKafkaEvent(...)` calls `MachineStateRegistryService.applyEvent(event)`.
  4. `MachineStateRegistryService.applyEvent(...)`:
     - Extracts `machineId`, attribute name and value.
     - Creates or updates the machine-specific `MachineState` (see per-type classes).
     - If machine state is ready, builds a `MachineStateUpdateResponse` (full snapshot).
  5. `MachineTelemetrySseService` broadcasts `MachineStateUpdateResponse` to SSE clients as `machine-update` events.
- Incidents
  1. CEP engine (Esper) listens to events and deployed rules; on rule match `createIncident(...)` constructs and saves an `Incident`.
  2. Saved incident is converted to `IncidentResponse` and broadcast via `IncidentSseService.broadcastIncident(...)`.
  3. Frontend receives `incident` events and also uses REST `GET /api/incidents` for initial load.

## Frontend consumers and expected contracts

- Machine telemetry client:
  - File: `frontend/src/app/services/machine-telemetry.service.ts`
  - Connects to: `${environment.apiUrl}/machines/stream`
  - Listens for SSE event name `machine-update`, JSON payload parsed into `MachineStateUpdate`:
    - MachineStateUpdate shape (frontend model): `{ machineId: string, machineType: string, state: Record<string, unknown>, timestamp: string }`.
  - Store: `frontend/src/app/stores/machine-telemetry.store.ts` converts to `ShopfloorMachineUpdate` and calls each machine model's `update({ attribute: 'state', value: state, timestamp })` and then `render(...)`.

- Incident client:
  - File: `frontend/src/app/services/incident.service.ts`
  - Initial load via `GET /api/incidents` then SSE to `${environment.apiUrl}/incidents/stream`.
  - Listens for SSE event name `incident`, payload mapped to `Incident` model; store: `frontend/src/app/stores/incident.store.ts`.

## Machine-type state keys consumed by frontend (examples)

- Vacuum Gripper (`vacuum-gripper`):
  - `armExtension` (number), `armRotation` (number), `gripperExtension` (number), `gripperState` (boolean), `isArmElevated` (boolean), `isArmExtended` (boolean)
  - Source: `src/main/java/gemoc/mbdo/cep/api/telemetry/state/VacuumGripperState.java`
- Conveyor Belt (`conveyor-belt`):
  - `direction` (string), `isExecuting` (boolean), `sensorFeed` (boolean), `sensorSwap` (boolean), `sensorImpulse` (boolean)
  - Source: `src/main/java/gemoc/mbdo/cep/api/telemetry/state/ConveyorBeltState.java`
- Sorting Line, MultiProcessingStation, HighBayWarehouse: each exposes a typed set of booleans/numbers mapped in `toState()`.
- All machine states include common keys: `isOperational`, `isInitialized` (from `AbstractMachineState.withCommonState(...)`) — frontend uses these to render "not operational" or "not initialized" visuals.

## Data contract summary

- Machine snapshot: `MachineStateUpdateResponse` = `{ machineId, machineType, state: Map<String,Object>, timestamp }`. See `src/main/java/gemoc/mbdo/cep/api/dto/MachineStateUpdateResponse.java`.
- Incident snapshot: `IncidentResponse` includes `id, message, rule, severity, startTime, createdAt, updatedAt`. See `src/main/java/gemoc/mbdo/cep/api/dto/IncidentResponse.java`.

## Gaps & risks

- Positions (x/y, rotation transform for machine placement) are not emitted by backend; the frontend uses static SVG element positions defined in its layout config (`RENNES_FACTORY_MACHINE_MODELS_BY_ID`) and model constructors. If live x/y positioning is required, the backend must include explicit `position` or `transform` fields in the machine state and the frontend must apply them in `render()`.
- Initial machine state snapshot endpoint: frontend seeds initial models from local configuration, not from a backend `/api/machines` REST snapshot. If you want server-state-first hydration, add a REST endpoint returning current `MachineStateUpdateResponse[]` for all machines.
- SSE resilience: backend uses infinite-timeout `SseEmitter` (0L) — ensure proxy/load-balancer supports long-lived connections.
- Timestamps: backend uses `Instant` for machine updates and `LocalDateTime` for incidents; frontend expects ISO parseable timestamp strings. Confirm format consistency (ISO-8601) across emitters.

## Recommendations (short)

1. Keep using server-side registry (good): `MachineStateRegistryService` guarantees consistent snapshots.
2. Add optional REST endpoint `GET /api/machines` to return the latest `MachineStateUpdateResponse[]` for initial hydration (frontend currently loads static models).
3. If live positions are required, extend `MachineState.toState()` to include `position: { x, y }` or `transform` and update models to apply transforms in `render()`.
4. Document the `state` keys per machine-type (the report above partially documents them). Consider a machine-state schema file or OpenAPI schema for `MachineStateUpdateResponse`.
5. Add health/connection count endpoint for observability (e.g., active SSE clients) — `IncidentSseService` already has `getActiveConnectionCount()`.

## Next steps (I can do)

- Save this report to `docs/machine-telemetry-backend-report.md` (done).
- Add `GET /api/machines` endpoint returning current registry snapshot.
- Add schema docs (OpenAPI additions) for `MachineStateUpdateResponse`.

Tell me which of the next steps you want me to perform (implement endpoint, add schema), or I can open a PR with the report included.
