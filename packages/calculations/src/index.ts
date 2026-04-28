export interface CalculationResult {
  input: number;
  output: number;
  units: string;
}

export function estimateSafetyFactor(load: number, capacity: number): CalculationResult {
  const output = capacity === 0 ? 0 : load / capacity;
  return {
    input: load,
    output,
    units: 'ratio'
  };
}
