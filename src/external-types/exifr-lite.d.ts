declare module 'exifr/dist/lite.esm.js' {
  const exifr: {
    parse: (input: Blob, options?: unknown) => Promise<any>;
  };
  export default exifr;
}