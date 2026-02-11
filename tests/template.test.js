import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractTemplateVariables,
  renderTemplate,
  validateTemplate
} from '../src/template.js';

test('extractTemplateVariables supports {{item}}, ${item}, and {$item}', () => {
  const template = 'A {{item}} B ${item} C {$item}';
  const vars = extractTemplateVariables(template);
  assert.deepEqual(vars, ['item']);
});

test('validateTemplate reports unknown variables and invalid tokens', () => {
  const template = 'A {{item}} B {{background}} C {{invalid-name}}';
  const result = validateTemplate(template, ['item']);

  assert.equal(result.ok, false);
  assert.deepEqual(result.unknownVariables, ['background']);
  assert.deepEqual(result.invalidTokens, ['invalid-name']);
});

test('renderTemplate substitutes known variable values', () => {
  const template = 'Subject={{item}}';
  const rendered = renderTemplate(template, { item: 'cat' });

  assert.equal(rendered.text, 'Subject=cat');
  assert.deepEqual(rendered.unresolvedVariables, []);
});

test('renderTemplate drops unresolved placeholders and reports them', () => {
  const template = 'A {{item}} B {{missing}}';
  const rendered = renderTemplate(template, { item: 'x' });

  assert.equal(rendered.text, 'A x B ');
  assert.deepEqual(rendered.unresolvedVariables, ['missing']);
});
