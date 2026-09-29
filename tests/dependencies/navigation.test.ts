import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('React Navigation is a resolvable direct Expo dependency', () => {
  const appPackage = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { dependencies?: Record<string, string> };
  const declaredVersion = appPackage.dependencies?.['@react-navigation/native'];

  assert.ok(declaredVersion, '@react-navigation/native must be declared directly');

  const resolvedPackage = require.resolve('@react-navigation/native/package.json');
  const installed = JSON.parse(readFileSync(resolvedPackage, 'utf8')) as { version: string };

  assert.match(installed.version, /^7\./, 'Expo SDK 57 must resolve React Navigation 7');
});

test('completed editor imports navigation guards through the SDK 57 Expo Router entry point', () => {
  assert.ok(require.resolve('expo-router/react-navigation'));
  const editor = readFileSync(new URL('../../app/edit-workout.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(editor, /from\s+['"]@react-navigation\//, 'SDK 57 rejects external navigation imports when bundling');
});

test('four tab destinations and one intentional workout action have no accidental component route', () => {
  const entries = readdirSync(new URL('../../app/(tabs)/', import.meta.url), { withFileTypes: true });
  assert.deepEqual(entries.filter(entry => entry.isDirectory()).map(entry => entry.name), ['profile']);
  assert.deepEqual(entries.filter(entry => entry.isFile() && entry.name.endsWith('.tsx'))
    .map(entry => entry.name).sort(), ['_layout.tsx', 'history.tsx', 'home.tsx', 'plan.tsx']);
  const layout = readFileSync(new URL('../../app/(tabs)/_layout.tsx', import.meta.url), 'utf8');
  assert.equal((layout.match(/<Tabs\.Screen/g) ?? []).length, 4);
  assert.match(layout, /<WorkoutLauncher>/);
});
