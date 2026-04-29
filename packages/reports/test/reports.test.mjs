import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReportSection } from '../dist/index.js';

const baseValue = { id:'v1', projectId:'p1', key:'flow', label:'Flow', value:100, valueType:'number', unit:'L/min', sourceReferences:[{documentId:'d1',pageNumber:2}], status:'approved', createdAt:'2026-01-01', updatedAt:'2026-01-01' };

test('report generator includes approved values', () => {
  const section = generateReportSection({ projectId:'p1', sectionType:'component_summary', engineeringValues:[baseValue] });
  assert.match(section.bodyMarkdown, /Flow/);
});

test('report generator includes user_entered values and excludes unreviewed by default', () => {
  const section = generateReportSection({ projectId:'p1', sectionType:'component_summary', engineeringValues:[baseValue, {...baseValue,id:'v2',status:'user_entered',label:'Pressure'}, {...baseValue,id:'v3',status:'ai_extracted',label:'AI'}, {...baseValue,id:'v4',status:'needs_review',label:'Review'}] });
  assert.match(section.bodyMarkdown, /Pressure/);
  assert.doesNotMatch(section.bodyMarkdown, /AI/);
  assert.doesNotMatch(section.bodyMarkdown, /Review/);
});

test('report generator includes assumptions warnings and source references', () => {
  const section = generateReportSection({ projectId:'p1', sectionType:'assumptions_and_warnings', engineeringValues:[baseValue], assumptions:['Ambient at 25C'], warnings:['Efficiency estimated'], sourceReferences:[{documentId:'d2'}] });
  assert.match(section.bodyMarkdown, /Ambient/);
  assert.match(section.bodyMarkdown, /Efficiency/);
  assert.equal(section.sourceReferences.length, 2);
});
