# WebAssembly Benchmark by PSPDFKit

A Benchmark for WebAssembly that uses [PSPDFKit for Web](https://pspdfkit.com/web/) Standalone.

The rendering engine of [PSPDFKit for Web](https://pspdfkit.com/web/) Standalone is written in C/C++ and compiled to WASM.

## Prerequisites

- MacOS/\*nix machine
- Python and `wget` installed on your machine
- A PSPDFKit for Web license. If you don't already have one
  you can [request a free trial here](https://pspdfkit.com/try/).

## Getting Started

When requesting a new license you get a download key and a license key.

Use the download key to setup the benchmark:

```
PSPDFKIT_DOWNLOAD_KEY=YOUR_KEY_GOES_HERE ./setup
```

This will download PSPDFKit for Web and store it in the `vendor` folder.

## Running the Benchmark

Now that PSPDFKit for Web is installed, you need to copy your product (license) key to the `license-key` file.

We can now run the benchmark server:

```
./server
```

This will spawn a SimpleHTTPServer server for us. The server is available at `http://localhost:8081`.
The port is configurable via the `PSPDFKIT_BENCHMARK_PORT` environment variable.

```
PSPDFKIT_BENCHMARK_PORT=5000 ./server
```

Visit `http://localhost:8081` on your browser of choice. The benchmark results are printed on screen as the benchmark runs,
and when the `writeResults` URL parameter is set the final result is written to disk to `benchmark-result.json`.

## Optimizations

The following optimizations can be enabled via URL parameter:

- `disableWebAssemblyStreaming`, `true` by default
- `disableIndexedDBCaching`, `true` by default
- `standaloneInstancesPoolSize`, `0` by default

## Contributing

Please ensure
[you have signed our CLA](https://pspdfkit.com/guides/web/current/miscellaneous/contributing/) so that we can
accept your contributions.
