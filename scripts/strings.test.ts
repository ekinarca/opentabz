/**
 * Every user-facing string lives in apps/web/src/strings.ts (FEATURE_MATRIX UX-022): components
 * may not contain visible text or accessible names as literals.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const TEXT_ATTRIBUTES = new Set(['aria-label', 'aria-description', 'title', 'placeholder', 'alt', 'label']);

function tsxFiles(dir: string): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.tsx') && !name.endsWith('.test.tsx')) found.push(path);
    }
  };
  walk(join(root, dir));
  return found;
}

function literalTexts(path: string): string[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const problems: string[] = [];
  const where = (node: ts.Node) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    return `${relative(root, path)}:${line + 1}`;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && /\p{L}/u.test(node.text)) {
      problems.push(`${where(node)} text "${node.text.trim()}"`);
    }
    if (ts.isJsxAttribute(node) && TEXT_ATTRIBUTES.has(node.name.getText(source))) {
      const value = node.initializer;
      if (value !== undefined && ts.isStringLiteral(value) && /\p{L}/u.test(value.text)) {
        problems.push(`${where(node)} ${node.name.getText(source)}="${value.text}"`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return problems;
}

describe('user-facing strings', () => {
  it('are never written as literals in components', () => {
    const files = [...tsxFiles('apps/web/src'), ...tsxFiles('packages/ui/src')];
    expect(files.length).toBeGreaterThan(20);
    expect(files.flatMap(literalTexts)).toEqual([]);
  });
});
