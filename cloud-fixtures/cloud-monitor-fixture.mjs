// ISOLATED SYNTHETIC FIXTURE. Not an application bug or production classifier.
// Run: node cloud-fixtures/cloud-monitor-fixture.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';

export function isFailure(status) {
  return status === 0 || status >= 400;
}

test('synthetic API failure boundaries, including 600+', () => {
  for (const status of [0, 400, 499, 500, 599, 600, 699]) {
    assert.equal(isFailure(status), true, `status ${status}`);
  }
  for (const status of [200, 204, 301, 399]) {
    assert.equal(isFailure(status), false, `status ${status}`);
  }
});
