# nifkit-wasm

Standalone WebAssembly and TypeScript distribution of
[NIFKit](https://github.com/puffball1567/nifkit).

NIFKit core repository: <https://github.com/puffball1567/nifkit>

NIFKit converts between NIF 2027 text and BIF v5 binary data entirely on the
client. The published package includes the compiled WebAssembly binary, so
applications using it do not need Nim or Emscripten installed.

## NIF and BIF

**NIF** is a compact, textual tree format. A compound node is written as a tag
followed by zero or more child nodes in parentheses:

```nif
(record title "NIFKit" enabled (true) version 1u)
```

**BIF** is the binary representation of the same NIF tree. It is useful for
storage and transport; application code should keep it as a `Uint8Array`.
`bifToNif` renders valid BIF into canonical NIF text. It preserves the data
model, but not whitespace choices from the original source.

This package is a codec and validator. It does not interpret NIF semantics or
execute NIF code.

## NIF syntax at a glance

```nif
(record
  title "NIFKit"
  count -5
  version 12u
  ratio 1.5
  initial 'N'
  :pkg.0.public
  .
)
```

- Compound nodes use `(tag child ...)`.
- Strings use double quotes; character literals use single quotes.
- Bare atoms can be identifiers, numbers, or symbols. Use NIF escapes such as
  `\20` for a space and `\2E` for a literal dot in an identifier.
- `.` is an empty node. Adjacent empty nodes may be written compactly as `...`.
- Directives are ordinary tags beginning with a dot, such as `(.nif27)`.
- Comments and source positions are suffix metadata, for example
  `name#field#` or `name@1,0,file.nim`; standalone comments are not valid NIF.

## Install

After the package is published to npm:

```sh
npm install nifkit-wasm
```

## TypeScript quick start

```ts
import { createNifkit } from "nifkit-wasm";

const nifkit = await createNifkit();
const bif = nifkit.nifToBif("(hello \"world\")");
nifkit.validateBif(bif);
console.log(nifkit.bifToNif(bif));
```

Call `createNifkit()` once during application startup and reuse the returned
object. Invalid NIF or BIF input throws `NifkitError`.

## Browser use

No Vite-specific integration is required. `createNifkit()` loads `nifkit.wasm`
from the same directory as the package JavaScript. If a bundler or CDN puts the
binary elsewhere, provide its URL explicitly:

```ts
const nifkit = await createNifkit({ wasmUrl: "https://cdn.example/nifkit.wasm" });
```

The web server must serve `.wasm` files with the `application/wasm` MIME type.

## Development

Requirements: Nim 2.2+, Emscripten (`emcc`), Node.js 18+, TypeScript, and
Google Chrome for the browser integration test.

```sh
git clone --recurse-submodules https://github.com/puffball1567/nifkit-wasm.git
cd nifkit-wasm
npm install
npm test
```

`npm test` validates the public API against representative NIF/BIF fixtures,
malformed input, Unicode, a 128 KiB document, explicit Wasm URLs, and an actual
headless-browser load. To run only the non-browser tests, use `npm run test:node`.

`npm run build` creates the distributable `dist/index.js`, `dist/index.d.ts`,
`dist/nifkit.generated.js`, and `dist/nifkit.wasm`. The generated `dist/`
directory is intentionally not committed; it is included when the package is
published to npm.

## License

NIFKit Wasm is MIT licensed. See [LICENSE](./LICENSE). The package also ships
[third-party notices](./THIRD_PARTY_NOTICES.md) for the Nim and Emscripten
components included in the generated output.
