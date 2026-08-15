import assert from "node:assert/strict";
import { createNifkit, NifkitError } from "../dist/index.js";

const nifkit = await createNifkit();

const fixtures = [
  ["empty document", "", ""],
  ["JSON tag vocabulary", "(.nif27)\n(.lang \"json\" (oconstr (kv name \"nifkit\") (kv ok (true))))", "(.nif27)\n(.lang \"json\" (oconstr (kv name \"nifkit\") (kv ok (true))))"],
  ["line info and comments", "(module@1,0,file.nim#root# (proc#declaration# name@2,0 \"main\"))", "(module@1,0,file.nim#root# (proc#declaration# name@2,0 \"main\"))"],
  ["escaped atom data", "(record key\\20with\\20spaces value\\23with\\23hash thing\\2E0.module)", "(record key\\20with\\20spaces value\\23with\\23hash thing.0.module)"],
  ["numeric atoms", "(numbers -1 -34359738368 0u 18446744073709551615u 1.5 1E3)", "(numbers -1 -34359738368 0u 18446744073709551615u 1.5 1000.0)"],
  ["nested tags", "(root (child name \"one\") (child name \"two\"))", "(root (child name \"one\") (child name \"two\"))"],
  ["Unicode strings", "(record \"こんにちは😀\")", "(record \"こんにちは😀\")"]
];

for (const [name, source, expected] of fixtures) {
  const bif = nifkit.nifToBif(source);
  assert.ok(bif instanceof Uint8Array, name);
  nifkit.validateBif(bif);
  assert.equal(nifkit.bifToNif(bif), expected, name);
}

const largeNif = `(record "${"x".repeat(128 * 1024)}")`;
assert.equal(nifkit.bifToNif(nifkit.nifToBif(largeNif)), largeNif);

const limits = {
  maxInputBytes: 1024,
  maxOutputBytes: 1024,
  maxNestingDepth: 32,
  maxTokens: 128,
  maxPoolEntries: 64,
  maxPoolBytes: 1024,
  maxStringBytes: 256,
  maxIndexEntries: 64
};
const limitedBif = nifkit.nifToBif('(record "safe")', limits);
nifkit.validateBif(limitedBif, limits);
assert.equal(nifkit.bifToNif(limitedBif, limits), '(record "safe")');
assert.throws(() => nifkit.nifToBif(`(record "${"x".repeat(1024)}")`, limits), NifkitError);
assert.throws(() => nifkit.nifToBif("(ok)", { ...limits, maxTokens: -1 }), TypeError);

assert.throws(() => nifkit.nifToBif("(unclosed"), NifkitError);
assert.throws(() => nifkit.validateBif(new Uint8Array([0])), NifkitError);

const explicitUrl = new URL("../dist/nifkit.wasm", import.meta.url);
const explicitlyLoaded = await createNifkit({ wasmUrl: explicitUrl });
assert.equal(explicitlyLoaded.bifToNif(explicitlyLoaded.nifToBif("(hello \"world\")")), "(hello \"world\")");

console.log("nifkit-wasm Node API test passed");
