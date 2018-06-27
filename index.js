(function(scope) {
  const runner = scope.__PSPDFKIT_BENCHMARK__RUN;
  const utils = scope.__PSPDFKIT_BENCHMARK__UTILS;
  const total = {
    load: 0,
    rest: 0
  };

  const { writeResults, ...pspdfkitConfig } = utils.getConfigOptionsFromURL();

  // We prefetch some assets to not affect the benchmark results.
  const prefetchAssets = [
    pspdfkitConfig.disableWebAssembly && "./vendor/pspdfkit/pspdfkit-lib/pspdfkit.asm.js",
    pspdfkitConfig.disableWebAssembly && "./vendor/pspdfkit/pspdfkit-lib/pspdfkit.asm.js.mem",

    !pspdfkitConfig.disableWebAssembly && "./vendor/pspdfkit/pspdfkit-lib/pspdfkit.wasm.js",
    !pspdfkitConfig.disableWebAssembly && "./vendor/pspdfkit/pspdfkit-lib/pspdfkit.wasm"
  ]
    .filter(Boolean)
    .map(asset => fetch(asset));

  Promise.all(
    [fetch("./license-key").then(response => response.text())].concat(prefetchAssets)
  ).then(async ([licenseKey]) => {
    const render = utils.createRenderer(document.querySelector("#tests"));

    if (utils.isIE11) {
      render(`
        <div class="IEWarn">Unfortunately this benchmark is not transpiled to work on IE. However PSPDFKit for Web support this browser https://pspdfkit.com/blog/2017/pspdfkit-web-2017-6-1/</div>
      `);
    }

    render(`
      <div class="Description">
        <p>
          Welcome to the ${pspdfkitConfig.disableWebAssembly ? "asm.js" : "WebAssembly"}
          Benchmark by PSPDFKit, a real world, open source benchmark for
          ${pspdfkitConfig.disableWebAssembly ? "asm.js" : "WebAssembly"}
          based on <a href="https://pspdfkit.com/pdf-sdk/web/">PSPDFKit for Web</a>.
          Want to know more about the benchmark? Read the
          <a href="https://pspdfkit.com/blog/2018/an-open-webassembly-benchmark/">announcement blog post</a>.
        </p>
      </div>
    `);

    if (pspdfkitConfig.disableWebAssembly) {
      render(`
        <div class="Switch">
          <p>PSPDFKit for Web is also available for browsers that support WebAssembly.</p>
          <p>Want to see how this version performs instead? Go to the
            <a href="?disableWebAssembly=false">WebAssembly benchmark</a>.
          </p>
        </div>
      `);
    } else {
      render(`
        <div class="Switch">
          <p>PSPDFKit for Web is also available for browsers that don't support WASM thanks to asm.js</p>
          <p>
            Want to see how this version performs instead? Go to the
            <a href="?disableWebAssembly=true">asm.js benchmark</a>.
          </p>
        </div>
      `);
    }

    const results = {};

    // Run the test for each PDF
    const files = ["./assets/default.pdf", "./assets/heavy.pdf"];

    for (let i = 0, path; (path = files[i]); i++) {
      render(`
        <h2 class="Title">Testing with <a href="${path}" target="_blank">${path}</h2></a>
      `);
      window.scrollTo(0, document.body.scrollHeight);

      // Load PDF
      let pdf = await fetch(path).then(r => r.arrayBuffer());

      // Start to benchmark
      const gen = runner(pdf, licenseKey, { utils, conf: pspdfkitConfig });
      let next = gen.next();

      while (!next.done) {
        const bench = next.value;
        const benchInfo = `
          <div>
            ${bench.description
              .split(/\n\n+/g)
              .map(d => `<p>${d.replace(/<a/g, '<a target="_blank"')}</p>`)
              .join("")}
          </div>
        `

        // Render placeholder while the benchmark is running
        const placeholder = render(`
          <div class="Container">
            <h3>${bench.name}</h3>
            ${benchInfo}
            <div class="Benchmarking">benchmarking <span>...</span></div>
          </div>
        `);
        window.scrollTo(0, document.body.scrollHeight);

        // Run the benchmark
        const { measurements } = await bench.run();

        // Collect the averages
        const averages = Object.keys(measurements).reduce((avgs, name) => {
          avgs.push([name, utils.average(measurements[name].map(m => m.duration))]);
          return avgs;
        }, []);

        // Replace the placeholder with the benchmark results
        render(
          `
          <div class="Container">
            <details>
              <summary>${bench.name}</summary>
              ${benchInfo}
            </details>

            <div class="Result">
            ${averages
              .map(
                avg => `
              <div>[<strong>${utils.toFixed(avg[1], 4)}ms</strong>] average <strong>${
                  avg[0]
                }</strong> duration</div>
            `
              )
              .join("")}
            </div>
          </div>
        `,
          placeholder
        );
        window.scrollTo(0, document.body.scrollHeight);

        // Collect the benchmark time
        if (total.hasOwnProperty(bench.bucket)) {
          if (bench.bucket !== "load" || total.load === 0) {
            total[bench.bucket] += utils.average(averages.map(a => a[1]));
          }
        }

        next = gen.next();
      }

      results[path] = next.value;

      pdf = null;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const pspdfkitScore = parseInt(total.load + total.rest);
    const loadTimeInPspdfkitScore = (100 * total.load) / pspdfkitScore;

    render(
      `<div class="FinalResult">
        <h2 class="Title">Done!</h2>
        <h3><strong>PSPDFKit Score</strong>: ${pspdfkitScore}</h3>
        <p>The score is the toal benchmark time. The lower the score the better.</p>
        <p>
          In this benchmark we defined two buckets to measure
          <em>compilation/instantiation</em> time and less expensive operations. This allows to get a better picture and
          do a more fair comparison between vendors since loading time can make a difference.
        </p>
        <div class="LoadTime">
          <div class="LoadTime-bar" style="width: ${loadTimeInPspdfkitScore}%"></div>
        </div>
        <p>Compilation/Instantiation time is ${utils.toFixed(
          loadTimeInPspdfkitScore,
          3
        )}% of the total PSPDFKit Score.</p>
      `
    );

    window.scrollTo(0, document.body.scrollHeight);
    console.log(JSON.stringify(results, null, 2));

    // Our server will write the result to disk
    if (writeResults) {
      fetch("/", {
        body: JSON.stringify(results, null, 2),
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });
    }
  });
})(window);
