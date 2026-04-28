import test from 'node:test';
import assert from 'node:assert/strict';
import { calculationResultSchema } from '@ommatidia/shared';
import {
  hydraulicPowerKw,
  motorTorqueNm,
  normalizeEfficiency,
  pumpFlowLpm,
  ropeSpeedMPerMin,
  toSharedCalculationResult,
  winchLinePullKn
} from '../dist/index.js';

const EPSILON = 1e-9;

function assertClose(actual, expected, tolerance = EPSILON) {
  assert.ok(Math.abs(actual - expected) < tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('hydraulicPowerKw computes expected value', () => {
  const result = hydraulicPowerKw(120, 210, 0.9);
  assertClose(result.value, 37.8);
  assert.equal(result.unit, 'kW');
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.assumptions));
});

test('pumpFlowLpm supports percentage efficiency', () => {
  const decimal = pumpFlowLpm(45, 1800, 0.92);
  const percent = pumpFlowLpm(45, 1800, 92);
  assertClose(decimal.value, percent.value);
});

test('motorTorqueNm computes expected value', () => {
  const result = motorTorqueNm(250, 80, 0.9);
  assertClose(result.value, (250 * 80) / (20 * Math.PI) * 0.9);
  assert.equal(result.unit, 'Nm');
});

test('winchLinePullKn computes expected value', () => {
  const result = winchLinePullKn(500, 30, 250, 85);
  assertClose(result.value, 51);
  assert.ok(result.warnings.length > 0);
  assert.ok(result.assumptions.length > 0);
});

test('ropeSpeedMPerMin computes expected value', () => {
  const result = ropeSpeedMPerMin(100, 80, 20, 400);
  assertClose(result.value, Math.PI * 0.4 * (100000 / 80 / 20));
  assert.equal(result.unit, 'm/min');
});

test('invalid values throw clear errors', () => {
  assert.throws(() => hydraulicPowerKw(Number.NaN, 200, 0.9), /finite number/);
  assert.throws(() => hydraulicPowerKw(-10, 200, 0.9), /greater than zero/);
  assert.throws(() => winchLinePullKn(100, 30, 0, 0.9), /greater than zero/);
  assert.throws(() => normalizeEfficiency(150, 'efficiency'), /decimal between 0 and 1/);
});

test('can map deterministic result into shared CalculationResult shape', () => {
  const result = hydraulicPowerKw(60, 180, 90);
  const sharedResult = toSharedCalculationResult(
    'mod_hydraulic_power_001',
    'proj_001',
    'hydraulic_power',
    'Hydraulic power',
    result
  );

  assert.equal(sharedResult.moduleId, 'mod_hydraulic_power_001');
  assert.equal(sharedResult.outputs[0].unit, 'kW');
  assert.equal(sharedResult.outputs[0].valueType, 'number');
  assert.equal(sharedResult.warnings.length, result.warnings.length);
  const parsed = calculationResultSchema.parse(sharedResult);
  assert.equal(parsed.projectId, 'proj_001');
});
