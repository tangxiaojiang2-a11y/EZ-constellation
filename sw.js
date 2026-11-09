/* 星六 PWA · 轻量缓存，保证可安装与二次打开更快 */
var CACHE = "xingliu-v1";
var PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // 函数与配置接口始终走网络，不缓存密钥相关响应
  if (url.pathname.indexOf("/.netlify/functions/") !== -1) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var fetched = fetch(req).then(function (res) {
        if (res && res.ok && (url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".webmanifest") || url.pathname.indexOf("/icons/") !== -1 || url.pathname === "/" || url.pathname.endsWith("/"))) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return cached || caches.match("./index.html");
      });
      return cached || fetched;
    })
  );
});
