# Module System (Stub)

## Package boundaries
- `apps/*` consume package APIs but should avoid duplicating domain logic.
- `packages/*` expose stable, documented TypeScript interfaces.

## Dependency direction
- `shared` is foundational and can be consumed by all other modules.
- Domain packages (`calculations`, `extraction`, `reports`) may depend on `shared`.
- Apps can depend on all packages.

## Coding conventions
- Prefer explicit interfaces for cross-package contracts.
- Keep packages framework-agnostic until runtime requirements are finalized.
- Keep tests colocated per package.

## Deterministic calculations
AI may extract candidate engineering inputs, but final engineering outputs must be produced by deterministic calculation functions in `packages/calculations`. These functions validate inputs, normalize efficiency terms, and return structured results with warnings, assumptions, and traceable input values.

### Formula catalog

1. **Hydraulic power (`hydraulicPowerKw`)**
   - Inputs: `flowLpm` (L/min), `pressureBar` (bar), `efficiency` (ratio 0..1 or percent 1..100)
   - Output: `value` in kW
   - Formula: `power kW = flow L/min × pressure bar / 600 × efficiency`
   - Assumptions: steady-state operation and efficiency captures aggregate losses.

2. **Pump flow (`pumpFlowLpm`)**
   - Inputs: `displacementCcPerRev` (cc/rev), `rpm` (rev/min), `volumetricEfficiency` (ratio or percent)
   - Output: `value` in L/min
   - Formula: `flow L/min = displacement cc/rev × rpm / 1000 × volumetric efficiency`
   - Assumptions: constant displacement and a representative volumetric efficiency at the operating point.

3. **Motor torque (`motorTorqueNm`)**
   - Inputs: `pressureBar` (bar), `displacementCcPerRev` (cc/rev), `mechanicalEfficiency` (ratio or percent)
   - Output: `value` in Nm
   - Formula: `torque Nm = pressure bar × displacement cc/rev / (20 × pi) × mechanical efficiency`
   - Assumptions: ideal displacement torque relationship corrected by mechanical efficiency.

4. **Winch line pull (`winchLinePullKn`)**
   - Inputs: `torqueNm` (Nm), `gearboxRatio` (ratio), `drumRadiusMm` (mm), `drivetrainEfficiency` (ratio or percent)
   - Output: `value` in kN
   - Formula:
     - `drum radius m = drumRadiusMm / 1000`
     - `line pull kN = torque Nm × gearbox ratio × drivetrain efficiency / drum radius m / 1000`
   - Assumptions: static pull at the nominated drum radius; rope layer buildup and dynamic factors excluded.

5. **Rope speed (`ropeSpeedMPerMin`)**
   - Inputs: `flowLpm` (L/min), `motorDisplacementCcPerRev` (cc/rev), `gearboxRatio` (ratio), `drumDiameterMm` (mm)
   - Output: `value` in m/min
   - Formula:
     - `motor rpm = flow L/min × 1000 / motorDisplacementCcPerRev`
     - `drum rpm = motor rpm / gearbox ratio`
     - `drum diameter m = drumDiameterMm / 1000`
     - `rope speed m/min = pi × drum diameter m × drum rpm`
   - Assumptions: no rope slip and ideal kinematic transfer through the drive train.
