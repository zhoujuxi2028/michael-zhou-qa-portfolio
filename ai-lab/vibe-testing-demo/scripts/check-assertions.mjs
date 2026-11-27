import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

function filesIn(directory, relative = '') {
  const files = [];
  for (const entry of readdirSync(join(directory, relative), { withFileTypes: true })) {
    const name = join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unsupported symlink: ${name}`);
    if (entry.isDirectory()) files.push(...filesIn(directory, name));
    else if (entry.isFile() && name.endsWith('.spec.ts')) files.push(name);
  }
  return files.sort();
}

function staticValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return ['string', node.text];
  }
  if (ts.isNumericLiteral(node)) return ['number', Number(node.text)];
  if (node.kind === ts.SyntaxKind.TrueKeyword) return ['boolean', true];
  if (node.kind === ts.SyntaxKind.FalseKeyword) return ['boolean', false];
  if (node.kind === ts.SyntaxKind.NullKeyword) return ['null'];
  if (ts.isRegularExpressionLiteral(node)) return ['regex', node.text];
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(node.operand)) return ['number', -Number(node.operand.text)];
  if (ts.isArrayLiteralExpression(node)) return ['array', node.elements.map(staticValue)];
  if (ts.isObjectLiteralExpression(node)) {
    return ['object', node.properties.map(property => {
      if (!ts.isPropertyAssignment(property) ||
          !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
        throw new Error('Unsupported dynamic object property');
      }
      return [property.name.text, staticValue(property.initializer)];
    })];
  }
  throw new Error(`Unsupported dynamic assertion argument: ${node.getText()}`);
}

function assertion(node) {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return null;
  const matcher = node.expression.name.text;
  const modifiers = [];
  let base = node.expression.expression;
  while (ts.isPropertyAccessExpression(base)) {
    modifiers.unshift(base.name.text);
    base = base.expression;
  }
  if (!ts.isCallExpression(base) || !ts.isIdentifier(base.expression) ||
      base.expression.text !== 'expect') return null;
  if (!matcher.startsWith('to') || modifiers.some(value => !['not', 'resolves', 'rejects'].includes(value))) {
    throw new Error('Unsupported assertion matcher or modifier');
  }
  return { base, signature: [matcher, modifiers, node.arguments.map(staticValue)] };
}

function analyze(file, contents) {
  const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if (source.parseDiagnostics.length) throw new Error(`Parse error in ${file}`);
  const tests = new Map();
  const matched = new Set();
  const allExpectCalls = new Set();

  function visit(node, path, active) {
    if (ts.isImportDeclaration(node)) {
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const binding of bindings.elements) {
          if (binding.propertyName && ['test', 'expect'].includes(binding.propertyName.text)) {
            throw new Error('Unsupported test or expect alias');
          }
        }
      }
      return;
    }
    if (ts.isCallExpression(node)) {
      const target = node.expression;
      let root = target;
      const properties = [];
      while (ts.isPropertyAccessExpression(root)) {
        properties.unshift(root.name.text);
        root = root.expression;
      }
      if (ts.isIdentifier(root) && root.text === 'test' &&
          properties.some(name => ['skip', 'only', 'fixme', 'fail'].includes(name))) {
        throw new Error('Unsupported test modifier');
      }
      const isTest = ts.isIdentifier(target) && target.text === 'test';
      const isDescribe = ts.isPropertyAccessExpression(target) &&
        ts.isIdentifier(target.expression) && target.expression.text === 'test' &&
        target.name.text === 'describe';
      if (isTest || isDescribe) {
        if (active) throw new Error('Unsupported nested test');
        const [name, callback] = node.arguments;
        if (node.arguments.length !== 2 || !name || !ts.isStringLiteral(name) || !callback ||
            !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
          throw new Error('Unsupported dynamic test name or callback');
        }
        const fullName = [...path, name.text];
        if (isTest) {
          const key = JSON.stringify(fullName);
          if (tests.has(key)) throw new Error(`Duplicate test name: ${key}`);
          const signatures = [];
          tests.set(key, signatures);
          visit(callback.body, fullName, signatures);
        } else {
          visit(callback.body, fullName, null);
        }
        return;
      }
      const parsed = assertion(node);
      if (parsed) {
        if (!active) throw new Error('Unsupported assertion outside a test');
        active.push(parsed.signature);
        matched.add(parsed.base);
      }
      if (ts.isIdentifier(target) && target.text === 'expect') allExpectCalls.add(node);
    }
    if (ts.isIdentifier(node) && node.text === 'expect' &&
        !(ts.isCallExpression(node.parent) && node.parent.expression === node)) {
      throw new Error('Unsupported expect syntax');
    }
    ts.forEachChild(node, child => visit(child, path, active));
  }

  visit(source, [], null);
  if (!tests.size) throw new Error(`No tests found in ${file}`);
  for (const call of allExpectCalls) {
    if (!matched.has(call)) throw new Error('Unsupported expect syntax');
  }
  return Object.fromEntries([...tests.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function main(beforeDir, afterDir) {
  if (!beforeDir || !afterDir || process.argv.length !== 4) {
    throw new Error('Usage: node scripts/check-assertions.mjs <before-dir> <after-dir>');
  }
  const beforeFiles = filesIn(beforeDir);
  const afterFiles = filesIn(afterDir);
  if (!beforeFiles.length || JSON.stringify(beforeFiles) !== JSON.stringify(afterFiles)) {
    throw new Error('Missing or changed test files');
  }
  for (const file of beforeFiles) {
    const before = analyze(file, readFileSync(join(beforeDir, file), 'utf8'));
    const after = analyze(file, readFileSync(join(afterDir, file), 'utf8'));
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error(`Assertions or tests changed: ${file}`);
    }
  }
  console.log(`Assertion guard passed: ${beforeFiles.length} file(s)`);
}

try {
  main(process.argv[2], process.argv[3]);
} catch (error) {
  console.error(`Assertion guard failed: ${error.message}`);
  process.exitCode = 1;
}
