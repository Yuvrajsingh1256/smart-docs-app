import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkText } from '../src/services/chunker.js';

test('returns an empty array for empty text', () => {
  const result = chunkText('');

  assert.deepEqual(result, []);
});

test('removes unnecessary whitespace', () => {
  const result = chunkText('Hello    world\n\nthis is a test.');

  assert.equal(result.length, 1);
  assert.equal(result[0], 'Hello world this is a test.');
});

test('creates multiple chunks for long text', () => {
  const text = 'word '.repeat(1000);

  const result = chunkText(text, 100, 20);

  assert.ok(result.length > 1);
});

test('does not return empty chunks', () => {
  const text = 'This is some sample document text.';

  const result = chunkText(text, 10, 2);

  for (const chunk of result) {
    assert.ok(chunk.length > 0);
  }
});