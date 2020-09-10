// This function takes a `duration` and subtracts the time to load chunks
// (WASM artifacts) which otherwise would influence the final benchmark
// result.
const ignoredResourceRegex = /.*pspdfkit.w?asm.*/;
export function cleanupMeasurement(duration) {
  const ignoredResources = performance
    .getEntriesByType("resource")
    .filter(r => ignoredResourceRegex.test(r.name));

  const noise = ignoredResources.reduce((time, resource) => {
    time += resource.duration;
    return time;
  }, 0);

  if (noise >= duration) {
    console.warn(
      "An error occurred while calculating the network noise. Including network noise in this example.",
      {
        duration,
        noise,
        ignoredResources
      }
    );

    return duration;
  }

  return duration - noise;
}

export function clearAllTimings() {
  performance.clearMarks();
  performance.clearMeasures();
  performance.clearResourceTimings();
}

// Given an array of numbers it calculates the median value.
export function median(arr) {
  arr = arr.slice(0);

  arr.sort((a, b) => a - b);

  const half = Math.floor(arr.length / 2);

  if (arr.length % 2) {
    return arr[half];
  } else {
    return (arr[half - 1] + arr[half]) / 2.0;
  }
}

// Parses the url to retrieve the configuration options for PSPDFKit for Web.
export function getConfigOptionsFromURL() {
  const params = {};
  window.location.search
    .substring(1)
    .replace(/([^=&]+)=([^&]*)/g, (m, key, value) => {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    });

  const standaloneInstancesPoolSize = parseInt(
    params.standaloneInstancesPoolSize,
    10
  );
  return {
    pspdfkitConfig: {
      disableWebAssembly: params.disableWebAssembly === "true",
      disableIndexedDBCaching:
        params.disableIndexedDBCaching === "false" ? false : true,
      disableWebAssemblyStreaming:
        params.disableWebAssemblyStreaming === "false" ? false : true,
      standaloneInstancesPoolSize: isNaN(standaloneInstancesPoolSize)
        ? 0
        : standaloneInstancesPoolSize
    },
    writeResults: params.writeResults === "true"
  };
}

// The same WASM test that is used in PSPDFKit for Web
export function isWASMSupported() {
  try {
    // iOS ~11.2.2 has a known WASM problem.
    // See: https://github.com/kripken/emscripten/issues/6042
    if (
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      /11_2_\d+/.test(navigator.userAgent)
    ) {
      return false;
    }
  } catch (_) {
    // In case of an error, we simply continue to the regular feature check
  }

  return (
    typeof window.WebAssembly === "object" &&
    typeof window.WebAssembly.instantiate === "function"
  );
}

// We don't want to show the final PSPDFKit for Web view if we're on a mobile
// browser and only have limited resources available.
export function isMobileOS() {
  const { userAgent } = navigator;
  if (/windows phone/i.test(userAgent)) {
    return true;
  }
  if (/android/i.test(userAgent)) {
    return true;
  }
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return true;
  }
  return false;
}
