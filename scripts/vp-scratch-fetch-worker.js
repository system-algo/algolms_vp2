// Replacement for the fetch worker chunk missing from the prebuilt scratch-gui (same message protocol as
// scratch-storage's FetchWorkerTool). Also redirects scratch.mit.edu requests to the captured VP files.
var ROOT = '/vp-assets/scratch/';
function rewrite(u) {
  var m = u.match(/^https?:\/\/projects\.scratch\.mit\.edu\/(\d+)(?:[/?#].*)?$/);
  if (m) return ROOT + 'projects/' + m[1] + '.json';
  m = u.match(/^https?:\/\/(?:cdn\.)?assets\.scratch\.mit\.edu\/internalapi\/asset\/([^/]+)\/get\/?/);
  if (m) return ROOT + 'assets/' + m[1];
  return u;
}
self.postMessage({ support: { fetch: true } });
self.onmessage = function (e) {
  var d = e.data;
  var opts = d.options ? Object.assign({}, d.options) : {};
  if (opts.headers) opts.headers = new Headers(opts.headers);
  fetch(rewrite(d.url), opts).then(function (r) {
    if (r.status === 404) { self.postMessage([{ id: d.id, buffer: null }]); return; }
    if (!r.ok) { self.postMessage([{ id: d.id, error: 'HTTP ' + r.status }]); return; }
    return r.arrayBuffer().then(function (b) { self.postMessage([{ id: d.id, buffer: b }], [b]); });
  }).catch(function (err) { self.postMessage([{ id: d.id, error: String(err) }]); });
};
