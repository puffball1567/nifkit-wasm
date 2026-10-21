import assert from "node:assert/strict";
import { createNifkit, NifkitError } from "../dist/index.js";

const nifkit = await createNifkit();

const fixtures = [
  ["empty document", "", ""],
  ["JSON tag vocabulary", "(.nif27)\n(.lang \"json\" (oconstr (kv name \"nifkit\") (kv ok (true))))", "(.nif27)\n(.lang \"json\" (oconstr (kv name \"nifkit\") (kv ok (true))))"],
  ["line info and comments", "(module@1,0,file.nim#root# (proc#declaration# name@2,0 \"main\"))", "(module@1,0,file.nim#root# (proc#declaration# name@2,0 \"main\"))"],
  ["escaped atom data", "(record key\\20with\\20spaces value\\23with\\23hash thing\\2E0.module)", "(record key\\20with\\20spaces value\\23with\\23hash thing.0.module)"],
  ["numeric atoms", "(numbers -1 -34359738368 0u 18446744073709551615u 1.5 1E3)", "(numbers -1 -34359738368 0u 18446744073709551615u 1.5 1000.0)"],
  ["current numeric syntax", "(numbers 0xFF 0o377 0b1111_1111 1_000 1_2.5E+0_1)", "(numbers 255 255 255 1000 125.0)"],
  ["64-bit numeric boundaries", "(numbers -0x8000_0000_0000_0000 0xFFFF_FFFF_FFFF_FFFFu)", "(numbers -9223372036854775808 18446744073709551615u)"],
  ["quoted punctuation", "\"key: #value\"#note#", "\"key\\3A \\23value\"#note#"],
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
for (const source of ["0x1_0000_0000_0000_0000u", "1__2", "0b102"]) {
  assert.throws(() => nifkit.nifToBif(source), NifkitError);
}
assert.throws(() => nifkit.validateBif(new Uint8Array([0])), NifkitError);

const explicitUrl = new URL("../dist/nifkit.wasm", import.meta.url);
const explicitlyLoaded = await createNifkit({ wasmUrl: explicitUrl });
assert.equal(explicitlyLoaded.bifToNif(explicitlyLoaded.nifToBif("(hello \"world\")")), "(hello \"world\")");

console.log("nifkit-wasm Node API test passed");
