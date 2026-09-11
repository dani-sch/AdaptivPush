import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
