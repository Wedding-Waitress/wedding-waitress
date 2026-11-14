import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertBrowserEnvironment} from './check-browser-environment.mjs';
test('rejects a build without browser connection configuration',()=>{
  assert.throws(()=>assertBrowserEnvironment({}),/missing browser configuration/);
  assert.throws(()=>assertBrowserEnvironment({VITE_SUPABASE_URL:'https://example.test',VITE_SUPABASE_PUBLISHABLE_KEY:'  '}),/VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.throws(()=>assertBrowserEnvironment({VITE_SUPABASE_PUBLISHABLE_KEY:'test-public-key'}),/VITE_SUPABASE_URL/);
});
test('accepts configured builds without displaying configuration values',()=>{
  assert.doesNotThrow(()=>assertBrowserEnvironment({VITE_SUPABASE_URL:'https://example.test',VITE_SUPABASE_PUBLISHABLE_KEY:'test-public-key'}));
});
