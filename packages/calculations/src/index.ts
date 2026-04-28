export interface CalculationInputSpec {
  key: string;
  value: number;
  unit: string;
}

export interface DeterministicCalculationResult {
  value: number;
  unit: string;
  inputsUsed: CalculationInputSpec[];
  warnings: string[];
  assumptions: string[];
  formulaName: string;
  createdAt: string;
}

const PERCENT_MIN = 1;
const PERCENT_MAX = 100;

export function validateFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

export function validateNonNegativeNumber(value: number, label: string): void {
  validateFiniteNumber(value, label);
  if (value < 0) {
    throw new Error(`${label} must be non-negative.`);
  }
}

export function validatePositiveNumber(value: number, label: string): void {
  validateFiniteNumber(value, label);
  if (value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
}

export function normalizeEfficiency(efficiency: number, label: string): number {
  validatePositiveNumber(efficiency, label);
  if (efficiency <= 1) {
    return efficiency;
  }

  if (efficiency >= PERCENT_MIN && efficiency <= PERCENT_MAX) {
    return efficiency / 100;
  }

  throw new Error(`${label} must be a decimal between 0 and 1, or a percentage between 1 and 100.`);
}

export function mmToM(mm: number, label = 'millimeters'): number {
  validatePositiveNumber(mm, label);
  return mm / 1000;
}

export function createCalculationResult(
  value: number,
  unit: string,
  inputsUsed: CalculationInputSpec[],
  warnings: string[],
  assumptions: string[],
  formulaName: string
): DeterministicCalculationResult {
  validateFiniteNumber(value, `${formulaName} result`);
  return {
    value,
    unit,
    inputsUsed,
    warnings,
    assumptions,
    formulaName,
    createdAt: new Date().toISOString()
  };
}

export function hydraulicPowerKw(flowLpm: number, pressureBar: number, efficiency: number): DeterministicCalculationResult {
  validatePositiveNumber(flowLpm, 'flowLpm');
  validatePositiveNumber(pressureBar, 'pressureBar');
  const normalizedEfficiency = normalizeEfficiency(efficiency, 'efficiency');

  const value = (flowLpm * pressureBar) / 600 * normalizedEfficiency;

  return createCalculationResult(
    value,
    'kW',
    [
      { key: 'flowLpm', value: flowLpm, unit: 'L/min' },
      { key: 'pressureBar', value: pressureBar, unit: 'bar' },
      { key: 'efficiency', value: normalizedEfficiency, unit: 'ratio' }
    ],
    [],
    ['Steady-state operation.', 'No transient losses beyond provided efficiency.'],
    'hydraulicPowerKw'
  );
}

export function pumpFlowLpm(displacementCcPerRev: number, rpm: number, volumetricEfficiency: number): DeterministicCalculationResult {
  validatePositiveNumber(displacementCcPerRev, 'displacementCcPerRev');
  validatePositiveNumber(rpm, 'rpm');
  const normalizedEfficiency = normalizeEfficiency(volumetricEfficiency, 'volumetricEfficiency');

  const value = (displacementCcPerRev * rpm) / 1000 * normalizedEfficiency;

  return createCalculationResult(
    value,
    'L/min',
    [
      { key: 'displacementCcPerRev', value: displacementCcPerRev, unit: 'cc/rev' },
      { key: 'rpm', value: rpm, unit: 'rev/min' },
      { key: 'volumetricEfficiency', value: normalizedEfficiency, unit: 'ratio' }
    ],
    [],
    ['Pump displacement remains constant across the operating point.'],
    'pumpFlowLpm'
  );
}

export function motorTorqueNm(pressureBar: number, displacementCcPerRev: number, mechanicalEfficiency: number): DeterministicCalculationResult {
  validatePositiveNumber(pressureBar, 'pressureBar');
  validatePositiveNumber(displacementCcPerRev, 'displacementCcPerRev');
  const normalizedEfficiency = normalizeEfficiency(mechanicalEfficiency, 'mechanicalEfficiency');

  const value = (pressureBar * displacementCcPerRev) / (20 * Math.PI) * normalizedEfficiency;

  return createCalculationResult(
    value,
    'Nm',
    [
      { key: 'pressureBar', value: pressureBar, unit: 'bar' },
      { key: 'displacementCcPerRev', value: displacementCcPerRev, unit: 'cc/rev' },
      { key: 'mechanicalEfficiency', value: normalizedEfficiency, unit: 'ratio' }
    ],
    [],
    ['Hydraulic motor torque follows ideal displacement relation adjusted by efficiency.'],
    'motorTorqueNm'
  );
}

export function winchLinePullKn(torqueNm: number, gearboxRatio: number, drumRadiusMm: number, drivetrainEfficiency: number): DeterministicCalculationResult {
  validatePositiveNumber(torqueNm, 'torqueNm');
  validatePositiveNumber(gearboxRatio, 'gearboxRatio');
  const drumRadiusM = mmToM(drumRadiusMm, 'drumRadiusMm');
  const normalizedEfficiency = normalizeEfficiency(drivetrainEfficiency, 'drivetrainEfficiency');

  const value = (torqueNm * gearboxRatio * normalizedEfficiency) / drumRadiusM / 1000;

  return createCalculationResult(
    value,
    'kN',
    [
      { key: 'torqueNm', value: torqueNm, unit: 'Nm' },
      { key: 'gearboxRatio', value: gearboxRatio, unit: 'ratio' },
      { key: 'drumRadiusMm', value: drumRadiusMm, unit: 'mm' },
      { key: 'drivetrainEfficiency', value: normalizedEfficiency, unit: 'ratio' }
    ],
    ['Line pull is computed at the nominated drum radius only.'],
    ['Rope layer buildup is not included.', 'No dynamic shock load factor is applied.'],
    'winchLinePullKn'
  );
}

export function ropeSpeedMPerMin(flowLpm: number, motorDisplacementCcPerRev: number, gearboxRatio: number, drumDiameterMm: number): DeterministicCalculationResult {
  validatePositiveNumber(flowLpm, 'flowLpm');
  validatePositiveNumber(motorDisplacementCcPerRev, 'motorDisplacementCcPerRev');
  validatePositiveNumber(gearboxRatio, 'gearboxRatio');
  const drumDiameterM = mmToM(drumDiameterMm, 'drumDiameterMm');

  const motorRpm = (flowLpm * 1000) / motorDisplacementCcPerRev;
  const drumRpm = motorRpm / gearboxRatio;
  const value = Math.PI * drumDiameterM * drumRpm;

  return createCalculationResult(
    value,
    'm/min',
    [
      { key: 'flowLpm', value: flowLpm, unit: 'L/min' },
      { key: 'motorDisplacementCcPerRev', value: motorDisplacementCcPerRev, unit: 'cc/rev' },
      { key: 'gearboxRatio', value: gearboxRatio, unit: 'ratio' },
      { key: 'drumDiameterMm', value: drumDiameterMm, unit: 'mm' }
    ],
    ['No slip between rope and drum is assumed.'],
    ['Speed reflects ideal kinematics without leakage correction.'],
    'ropeSpeedMPerMin'
  );
}

export function toSharedCalculationResult(
  moduleId: string,
  projectId: string,
  outputKey: string,
  outputLabel: string,
  result: DeterministicCalculationResult
) {
  const inputsUsed = result.inputsUsed.map((input) => ({
    key: input.key,
    label: input.key,
    value: input.value,
    valueType: 'number',
    unit: input.unit
  }));

  return {
    moduleId,
    projectId,
    inputsUsed,
    outputs: [
      {
        key: outputKey,
        label: outputLabel,
        value: result.value,
        valueType: 'number',
        unit: result.unit
      }
    ],
    warnings: result.warnings,
    assumptions: result.assumptions,
    createdAt: result.createdAt
  };
}
