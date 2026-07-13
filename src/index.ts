import createNifkitModule, { type EmscriptenModule } from "./nifkit.generated.js";

/** Error returned when NIFKit rejects an input document. */
export class NifkitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NifkitError";
  }
}

/** Options for loading the WebAssembly binary. */
export interface CreateNifkitOptions {
  /**
   * URL of `nifkit.wasm`. Set this when a bundler or CDN serves the binary from
   * somewhere other than next to this package's JavaScript file.
   */
  wasmUrl?: string | URL;
}

/** TypeScript-friendly NIFKit WebAssembly API. */
export interface Nifkit {
  /** Encode NIF text into binary BIF data. */
  nifToBif(nif: string): Uint8Array;
  /** Decode binary BIF data into NIF text. */
  bifToNif(bif: Uint8Array): string;
  /** Throw `NifkitError` unless the supplied BIF data is valid. */
  validateBif(bif: Uint8Array): void;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function errorFrom(module: EmscriptenModule): NifkitError {
  const pointer = module._nifkit_last_error();
  return new NifkitError(pointer === 0 ? "NIFKit operation failed" : module.UTF8ToString(pointer));
}

function withInput<T>(module: EmscriptenModule, bytes: Uint8Array, operation: (pointer: number) => T): T {
  if (bytes.byteLength === 0) return operation(0);
  const pointer = module._malloc(bytes.byteLength);
  if (pointer === 0) throw new NifkitError("unable to allocate WebAssembly memory");
  try {
    module.HEAPU8.set(bytes, pointer);
    return operation(pointer);
  } finally {
    module._free(pointer);
  }
}

function convert(
  module: EmscriptenModule,
  input: Uint8Array,
  nativeOperation: (inputPointer: number, inputLength: number, outputPointer: number, outputLengthPointer: number) => number
): Uint8Array {
  // The Wasm32 C ABI writes a pointer and csize_t, both 32-bit values.
  const result = module._malloc(8);
  if (result === 0) throw new NifkitError("unable to allocate WebAssembly memory");
  try {
    module.HEAPU32[result >>> 2] = 0;
    module.HEAPU32[(result >>> 2) + 1] = 0;
    return withInput(module, input, (inputPointer) => {
      const status = nativeOperation(inputPointer, input.byteLength, result, result + 4);
      if (status !== 0) throw errorFrom(module);

      const outputPointer = module.HEAPU32[result >>> 2];
      const outputLength = module.HEAPU32[(result >>> 2) + 1];
      try {
        return module.HEAPU8.slice(outputPointer, outputPointer + outputLength);
      } finally {
        if (outputPointer !== 0) module._nifkit_free(outputPointer);
      }
    });
  } finally {
    module._free(result);
  }
}

/** Load the NIFKit WebAssembly module. Call once and reuse the returned API. */
export async function createNifkit(options: CreateNifkitOptions = {}): Promise<Nifkit> {
  const wasmUrl = options.wasmUrl?.toString() ?? new URL("./nifkit.wasm", import.meta.url).toString();
  const module = await createNifkitModule({
    locateFile(path, prefix) {
      return path.endsWith(".wasm") ? wasmUrl : prefix + path;
    }
  });

  return {
    nifToBif(nif) {
      return convert(module, encoder.encode(nif), module._nifkit_nif_to_bif.bind(module));
    },
    bifToNif(bif) {
      return decoder.decode(convert(module, bif, module._nifkit_bif_to_nif.bind(module)));
    },
    validateBif(bif) {
      withInput(module, bif, (pointer) => {
        if (module._nifkit_validate_bif(pointer, bif.byteLength) !== 0) throw errorFrom(module);
      });
    }
  };
}
