import { unique } from './collections.js';

const VAR_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}|\$\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}|\{\$\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g;
const GENERIC_TOKEN_PATTERN = /\{\{\s*([^}]+)\s*\}\}|\$\{\s*([^}]+)\s*\}|\{\$\s*([^}]+)\s*\}/g;

export function extractTemplateVariables(template) {
  const source = String(template || '');
  const names = [];
  for (const match of source.matchAll(TOKEN_PATTERN)) {
    const name = match[1] || match[2] || match[3];
    if (name) {
      names.push(name);
    }
  }
  return unique(names);
}

export function validateTemplate(template, allowedVariables = ['item']) {
  const source = String(template || '');
  const allowed = new Set(allowedVariables);
  const unknownVariables = [];
  const invalidTokens = [];

  for (const match of source.matchAll(GENERIC_TOKEN_PATTERN)) {
    const raw = (match[1] || match[2] || match[3] || '').trim();
    if (!raw) {
      continue;
    }
    if (!VAR_NAME_PATTERN.test(raw)) {
      invalidTokens.push(raw);
      continue;
    }
    if (!allowed.has(raw)) {
      unknownVariables.push(raw);
    }
  }

  const usedVariables = extractTemplateVariables(source);

  return {
    ok: unknownVariables.length === 0 && invalidTokens.length === 0,
    usedVariables,
    unknownVariables: unique(unknownVariables),
    invalidTokens: unique(invalidTokens)
  };
}

export function renderTemplate(template, variables) {
  const source = String(template || '');
  const vars = variables || {};
  const unresolvedVariables = [];

  const rendered = source.replace(TOKEN_PATTERN, (_, a, b, c) => {
    const name = a || b || c;
    if (Object.hasOwn(vars, name)) {
      return String(vars[name] ?? '');
    }
    unresolvedVariables.push(name);
    return '';
  });

  return {
    text: rendered,
    unresolvedVariables: unique(unresolvedVariables)
  };
}
