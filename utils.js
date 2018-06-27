(function(scope) {
  const { performance, PSPDFKit, document } = scope;

  /*
    This function takes a `duration` and subtracts the time to load chunks (eg. locale info) and PDFs,
    which otherwise would influence the final benchmark result.
  */
  function cleanupMeasurement(duration) {
    const noise = performance.getEntriesByType("resource").reduce((time, resource) => {
      if (/(chunk-[^.]+\.js|\.pdf)$/.test(resource.name)) {
        time += resource.duration;
      }
      return time;
    }, 0);

    return duration - noise;
  }

  /*
    Given an array of numbers it calculates the average value.
   */
  function average(arr) {
    return arr.reduce((total, val) => ((total += val), total), 0) / arr.length;
  }

  /*
    Simple renderer. It accepts an `html` string and renders it into `root`.
    When a `placeholder` is supplied it replace the placeholder with the new element instead.
   */
  function createRenderer(root) {
    return function render(html, placeholder = null) {
      const fragment = document.createElement("div");
      fragment.innerHTML = html;
      const child = fragment.children[0];
      if (placeholder) {
        placeholder.replaceWith(child);
      } else {
        root.appendChild(child);
      }
      return child;
    };
  }

  /*
    Parses the url to retrieve the configuration options for PSPDFKit for Web.
  */
  function getConfigOptionsFromURL() {
    const params = {};
    window.location.search.substring(1).replace(/([^=&]+)=([^&]*)/g, function(m, key, value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    });

    const standaloneInstancesPoolSize = parseInt(params.standaloneInstancesPoolSize, 10);
    return {
      disableWebAssembly: params.disableWebAssembly === "true",
      disableIndexedDBCaching: params.disableIndexedDBCaching === "false" ? false : true,
      disableWebAssemblyStreaming: params.disableWebAssemblyStreaming === "false" ? false : true,
      standaloneInstancesPoolSize: isNaN(standaloneInstancesPoolSize)
        ? 0
        : standaloneInstancesPoolSize,
      writeResults: params.writeResults === "true"
    };
  }

  /*
    Like Number.prototype.toFixed but only when there more than n decimal
  */
  function toFixed(number, n) {
    const num = String(number);
    const dec = num.split(".")[1];
    return dec && dec.length >= n ? String(number.toFixed(n)) : num;
  }

  /*
    Simple benchmark Runner class.
    Instances get:
    - `results` an array of the collected results
    - `run` runs a benchmark N `times`. Returns { name, measurements }
    - `load` loads PSPDFKit and returns an object with the PSPDFKit `instance` and an `unload` function
   */
  class Runner {
    constructor(licenseKey) {
      if (!PSPDFKit) {
        throw Error("global PSPDFKit not found");
      }
      this.results = [];
      this.licenseKey = licenseKey;
      this.load = this.load.bind(this);
      this.run = this.run.bind(this);

      // Helper to skip test use it as run.skip('testname', testFn, timesToRun)
      this.run.skip = (name, description) => ({
        name,
        description,
        run: () =>
          Promise.resolve({
            name,
            measurements: { skipped: [{ duration: 0 }] }
          })
      });
    }
    async load(pdf, conf = {}) {
      const { licenseKey } = this;
      // eslint-disable-next-line no-unused-vars
      const { writeResults, ...defaultConf } = getConfigOptionsFromURL();
      const configuration = {
        pdf,
        headless: true,
        licenseKey,
        defaultConf,
        ...conf
      };
      let instance = await PSPDFKit.load(configuration);

      return {
        instance,
        unload: function() {
          PSPDFKit.unload(instance);
          instance = null;
          pdf = null;
        }
      };
    }
    run(name, description, test, opts = {}) {
      let times = opts.times || 1;
      return {
        name,
        description,
        bucket: opts.bucket,
        run: async () => {
          const measurements = {};
          while (times--) {
            const results = await test();
            performance.clearMarks();
            performance.clearMeasures();
            results.forEach(r => {
              const { name } = r;
              if (!measurements[name]) {
                measurements[name] = [];
              }
              measurements[name].push(
                // remove time to load chunks and the pdf from `load`
                opts.bucket === "load"
                  ? { ...r.toJSON(), duration: cleanupMeasurement(r.duration) }
                  : r.toJSON()
              );
            });
          }

          const out = {
            name,
            bucket: opts.bucket,
            description,
            measurements
          };

          this.results.push(out);
          return out;
        }
      };
    }
  }

  scope.__PSPDFKIT_BENCHMARK__UTILS = {
    average,
    cleanupMeasurement,
    createRenderer,
    Runner,
    getConfigOptionsFromURL,
    isIE11: !!window.MSInputMethodContext && !!document.documentMode,
    toFixed
  };
})(window);
