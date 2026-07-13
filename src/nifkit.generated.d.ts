export interface EmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _nifkit_nif_to_bif(input: number, inputLength: number, output: number, outputLength: number): number;
  _nifkit_bif_to_nif(input: number, inputLength: number, output: number, outputLength: number): number;
  _nifkit_validate_bif(input: number, inputLength: number): number;
  _nifkit_free(pointer: number): void;
  _nifkit_last_error(): number;
  UTF8ToString(pointer: number): string;
}

export interface EmscriptenModuleOptions {
  locateFile?(path: string, prefix: string): string;
}

declare function createNifkitModule(options?: EmscriptenModuleOptions): Promise<EmscriptenModule>;

export default createNifkitModule;
