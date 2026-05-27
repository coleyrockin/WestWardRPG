// Service worker registration + update-available banner.
// Moved out of index.html so the CSP can drop `unsafe-inline` for scripts.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => {
      const incoming = reg.installing;
      if (!incoming) return;
      incoming.addEventListener("statechange", () => {
        if (incoming.state === "installed" && navigator.serviceWorker.controller) {
          // New version available — surface a simple reload prompt.
          const banner = document.createElement("div");
          banner.style.cssText =
            "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);" +
            "background:#2a1a08;color:#f5e6c8;border:1px solid #c87941;" +
            "border-radius:8px;padding:10px 18px;font-family:monospace;" +
            "font-size:13px;z-index:9999;cursor:pointer;";
          banner.textContent = "Update available — click to reload";
          banner.addEventListener("click", () => {
            incoming.postMessage("skipWaiting");
            window.location.reload();
          });
          document.body.appendChild(banner);
        }
      });
    });
  }).catch(() => {});
}
