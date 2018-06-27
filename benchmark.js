(function(scope) {
  scope.__PSPDFKIT_BENCHMARK__RUN = function*(pdf, licenseKey, { utils, conf }) {
    const { PSPDFKit } = scope;
    const runner = new utils.Runner(licenseKey);
    const { load, run } = runner;

    // You can skip benchmarks by replacing `run` with `run`

    yield run(
      conf.disableWebAssembly
        ? "Initialization of PSPDFKit"
        : "Initialization: compilation + instantiation of the WASM module",
      conf.disableWebAssembly
        ? `PSPDFKit loads the core PDF engine that is compiled to asm.js.`
        : `The initialization process consists of three steps: download, compile, and instantiation.
In this benchmark we ignore download time.` +
          `

Read about how you can
<a href="https://pspdfkit.com/blog/2018/optimize-webassembly-startup-performance">optimize startup time</a>.`,
      async function() {
        performance.mark("loadStart");
        const { unload } = await load(pdf.slice(0), conf);
        performance.mark("loadEnd");
        performance.measure("load", "loadStart", "loadEnd");

        const measurements = performance.getEntriesByType("measure");
        unload();
        return measurements;
      },
      {
        times: 5,
        bucket: "load"
      }
    );

    yield run(
      "Time to first paint",
      `In this benchmark we measure initialization + time to render the first page to determine when the browser has everything necessary to do the first paint.

After loading PSPDFKit, we use our <a href="https://pspdfkit.com/api/web/PSPDFKit.Instance.html#renderPageAsArrayBuffer">Instance#renderPageAsArrayBuffer API</a> to programmatically render the first page.`,
      async function() {
        performance.mark("loadStart");
        const { instance, unload } = await load(pdf.slice(0), conf);
        const { height } = await instance.pageInfoForIndex(0);

        await instance.renderPageAsArrayBuffer({ height }, 0);
        performance.mark("renderingEnd");

        performance.measure("time to first paint", "loadStart", "renderingEnd");

        const measurements = performance.getEntriesByType("measure");
        unload();
        return measurements;
      },
      {
        times: 5,
        bucket: "load"
      }
    );

    yield run(
      "Time to interactive",
      `This benchmark is similar to the previous one except that we also load interactive annotations and text lines for the page.
PSPDFKit loads the interactive bits only once the page is rendered, by splitting this process in two steps we can render pages faster when for example we scroll the document.

In this benchmark we use two APIs:

* <a href="https://pspdfkit.com/api/web/PSPDFKit.Instance.html#getAnnotations">Instance#getAnnotations</a>

* <a href="https://pspdfkit.com/api/web/PSPDFKit.Instance.html#textLinesForPageIndex">Instance#textLinesForPageIndex</a>`,
      async function() {
        performance.mark("loadStart");
        const { instance, unload } = await load(pdf.slice(0), conf);
        const { height } = await instance.pageInfoForIndex(0);
        await instance.renderPageAsArrayBuffer({ height }, 0);
        await Promise.all([instance.getAnnotations(0), instance.textLinesForPageIndex(0)]);
        performance.mark("pageReady");

        performance.measure("time to interactive", "loadStart", "pageReady");

        const measurements = performance.getEntriesByType("measure");
        unload();
        return measurements;
      },
      {
        times: 5,
        bucket: "load"
      }
    );

    let instance, unload;

    yield run(
      "Render tiles for a page",
      `Like in a maps application, pages in PSPDFKit are made up of multiple images (tiles). This technique allows us to deliver a sharp document at any zoom level and resolution.

In this benchmark we measure the rendering of the tiles for a page.
To simulate tiling we split the height of our page in 100 pieces and render it 100 times using the <a href="https://pspdfkit.com/api/web/PSPDFKit.Instance.html#renderPageAsArrayBuffer">Instance#renderPageAsArrayBuffer API</a>.`,
      async function() {
        if (!instance) {
          const loaded = await load(pdf.slice(0), conf);
          instance = loaded.instance;
          unload = loaded.unload;
        }

        const { height } = await instance.pageInfoForIndex(0);

        const numberOfTiles = 100;
        const tileHeight = height / numberOfTiles;
        const range = [...new Array(numberOfTiles)];

        performance.mark("renderStart");
        const tilesPromises = range.map(() =>
          instance.renderPageAsArrayBuffer({ height: tileHeight }, 0)
        );
        await Promise.all(tilesPromises);
        performance.mark("renderEnd");

        performance.measure("render tiles for a page", "renderStart", "renderEnd");

        return performance.getEntriesByType("measure");
      },
      {
        times: 20,
        bucket: "rest"
      }
    );

    yield run(
      "Search a term",
      `In this benchmark we use our <a href="https://pspdfkit.com/api/web/PSPDFKit.Instance.html#search">search API</a> to search some text programatically.`,
      async function() {
        performance.mark("searchStart");
        for (let i = 0; i < 100; i++) {
          await instance.search("the");
        }
        performance.mark("searchEnd");

        performance.measure("search text", "searchStart", "searchEnd");

        return performance.getEntriesByType("measure");
      },
      {
        times: 20,
        bucket: "rest"
      }
    );

    yield run(
      "Export",
      `In this benchmark we export a PDF document to file, InstantJSON and to XFDF.

PSPDFKit developed a proprietary JSON spec for PDF annotations and form fields called <a href="https://pspdfkit.com/guides/web/current/importing-exporting/instant-json/">InstantJSON</a>.
This is a modern and clean JSON spec that all the PSPDFKit products use to import and export meta data.

PSPDFKit also comes with full <a href="https://pspdfkit.com/guides/web/current/importing-exporting/xfdf-support/">XFDF support</a>.`,
      async function() {
        performance.mark("exportPDFStart");
        for (let i = 0; i < 3; i++) {
          await instance.exportPDF();
        }
        performance.mark("exportPDFEnd");

        performance.mark("exportPDFFlattenStart");
        for (let i = 0; i < 3; i++) {
          await instance.exportPDF({ flatten: true });
        }
        performance.mark("exportPDFFlattenEnd");

        performance.mark("exportXFDFStart");
        for (let i = 0; i < 3; i++) {
          await instance.exportXFDF();
        }
        performance.mark("exportXFDFEnd");

        performance.measure("exportPDF", "exportPDFStart", "exportPDFEnd");
        performance.measure(
          "exportPDF with flatten annotations",
          "exportPDFFlattenStart",
          "exportPDFFlattenEnd"
        );
        performance.measure("exportXFDF", "exportXFDFStart", "exportXFDFEnd");

        return performance.getEntriesByType("measure");
      },
      {
        times: 20,
        bucket: "rest"
      }
    );

    yield run(
      "Create 1000 annotations",
      `In this benchmark we use our <a href="https://pspdfkit.com/guides/web/current/annotations/introduction-to-annotations">annotations API</a> to programatically create 500 annotations.`,
      async function() {
        const annotation = new PSPDFKit.Annotations.TextAnnotation({
          pageIndex: 0,
          text: "test"
        });
        const range = [...new Array(1000)];

        performance.mark("createAnnotationStart");
        const createPromises = range.map(() => instance.createAnnotation(annotation));
        await Promise.all(createPromises);
        performance.mark("createAnnotationEnd");

        performance.measure("create annotation", "createAnnotationStart", "createAnnotationEnd");

        return performance.getEntriesByType("measure");
      },
      {
        times: 20,
        bucket: "rest"
      }
    );

    unload();

    return runner.results;
  };
})(window);
