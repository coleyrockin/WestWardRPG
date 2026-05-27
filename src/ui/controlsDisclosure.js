// Disclosure for controls sheet — vanilla, accessible, reduced-motion-safe.
// Moved out of index.html so the CSP can drop `unsafe-inline` for scripts.
(function () {
  const btn = document.querySelector(".disclosure");
  const sheet = document.getElementById("controls-sheet");
  if (!btn || !sheet) return;
  function close() {
    btn.setAttribute("aria-expanded", "false");
    sheet.setAttribute("aria-hidden", "true");
  }
  function open() {
    btn.setAttribute("aria-expanded", "true");
    sheet.setAttribute("aria-hidden", "false");
  }
  btn.addEventListener("click", function () {
    const expanded = btn.getAttribute("aria-expanded") === "true";
    if (expanded) close(); else open();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") close();
  });
})();
