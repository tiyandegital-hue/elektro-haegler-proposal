/* Elektro Hägler GmbH — site interactions
   Business name is a single constant (ELEKTRO_HAEGLER) in the build script;
   this file handles only behaviour: nav, FAQ, count-up, assistant wizard. */
(function () {
  "use strict";

  /* ---------- mobile nav ---------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var mobileNav = document.getElementById("mobile-nav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { mobileNav.classList.remove("open"); });
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(function (o) {
        o.classList.remove("open");
        o.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        q.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- count-up numerals ---------- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduced) { el.textContent = target.toFixed(decimals).replace(".", ",") + suffix; return; }
    var start = null, dur = 1200;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = val.toFixed(decimals).replace(".", ",") + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { io.observe(c); });
  } else {
    counters.forEach(countUp);
  }

  /* ---------- hero mini-assistant (step 1 only, hands off to /anfrage) ---------- */
  var heroPanel = document.querySelector("[data-hero-assistant]");
  if (heroPanel) {
    var selected = null;
    heroPanel.querySelectorAll(".opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        heroPanel.querySelectorAll(".opt").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        selected = btn.getAttribute("data-value");
      });
    });
    var next = heroPanel.querySelector("[data-hero-next]");
    if (next) {
      next.addEventListener("click", function () {
        var url = "/anfrage";
        if (selected) url += "?vorhaben=" + encodeURIComponent(selected);
        window.location.href = url;
      });
    }
  }

  /* ---------- full wizard (/anfrage) ---------- */
  var wizard = document.querySelector("[data-wizard]");
  if (wizard) {
    var steps = Array.prototype.slice.call(wizard.querySelectorAll(".w-step"));
    var bars = Array.prototype.slice.call(wizard.querySelectorAll(".wizard-progress span"));
    var label = wizard.querySelector("[data-wizard-label]");
    var stepNames = ["Vorhaben", "Objekt & Größe", "Dringlichkeit", "Ihre Daten"];
    var current = 0;
    var state = { vorhaben: "", objekt: "", flaeche: "", dringlichkeit: "", name: "", kontakt: "" };

    // Prefill step 1 from ?vorhaben= (matches data-key, case-insensitive, else data-value)
    var params = new URLSearchParams(window.location.search);
    var pre = params.get("vorhaben");
    if (pre) {
      var key = pre.toLowerCase();
      var preBtn = wizard.querySelector('.opt[data-key="' + key + '"]')
        || wizard.querySelector('.opt[data-value="' + pre + '"]');
      if (preBtn) { selectOpt(preBtn); }
    }

    function show(i, scroll) {
      current = i;
      steps.forEach(function (s, idx) { s.classList.toggle("active", idx === i); });
      bars.forEach(function (b, idx) {
        b.classList.toggle("done", idx < i);
        b.classList.toggle("now", idx === i);
      });
      if (label) label.textContent = "Schritt " + (i + 1) + " von 4 — " + stepNames[i];
      if (scroll) {
        window.scrollTo({ top: wizard.getBoundingClientRect().top + window.scrollY - 90, behavior: reduced ? "auto" : "smooth" });
      }
    }

    function selectOpt(btn) {
      var group = btn.closest("[data-opt-group]");
      group.querySelectorAll(".opt").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      btn.setAttribute("aria-pressed", "true");
      state[group.getAttribute("data-opt-group")] = btn.getAttribute("data-value");
    }

    wizard.querySelectorAll(".opt").forEach(function (btn) {
      btn.addEventListener("click", function () { selectOpt(btn); });
    });

    function validateStep(i) {
      if (i === 0 && !state.vorhaben) { markGroup("vorhaben"); return false; }
      if (i === 1 && !state.objekt) { markGroup("objekt"); return false; }
      if (i === 2 && !state.dringlichkeit) { markGroup("dringlichkeit"); return false; }
      if (i === 3) {
        var ok = true;
        var nameF = wizard.querySelector('[data-field="name"]');
        var kontaktF = wizard.querySelector('[data-field="kontakt"]');
        var consent = wizard.querySelector("#consent");
        if (!nameF.querySelector("input").value.trim()) { nameF.classList.add("invalid"); ok = false; } else { nameF.classList.remove("invalid"); }
        var k = kontaktF.querySelector("input").value.trim();
        if (!k || (k.indexOf("@") === -1 && k.replace(/[^0-9]/g, "").length < 6)) { kontaktF.classList.add("invalid"); ok = false; } else { kontaktF.classList.remove("invalid"); }
        if (consent && !consent.checked) { consent.closest(".checkline").style.color = "var(--red)"; ok = false; }
        else if (consent) { consent.closest(".checkline").style.color = ""; }
        if (ok) {
          state.name = nameF.querySelector("input").value.trim();
          state.kontakt = k;
        }
        return ok;
      }
      return true;
    }
    function markGroup(name) {
      var g = wizard.querySelector('[data-opt-group="' + name + '"]');
      if (g) {
        g.style.outline = "2px solid var(--red)";
        setTimeout(function () { g.style.outline = ""; }, 1600);
      }
    }

    wizard.querySelectorAll("[data-next]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (validateStep(current) && current < steps.length - 1) show(current + 1, true);
      });
    });
    wizard.querySelectorAll("[data-back]").forEach(function (btn) {
      btn.addEventListener("click", function () { if (current > 0) show(current - 1, true); });
    });

    // Area input
    var area = wizard.querySelector("#flaeche");
    if (area) area.addEventListener("input", function () { state.flaeche = area.value.trim(); });

    // Submit -> confirmation
    var form = wizard.querySelector("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!validateStep(3)) return;
        var summary = document.getElementById("confirm-summary");
        if (summary) {
          var rows = [
            ["Vorhaben", state.vorhaben],
            ["Objekt", state.objekt + (state.flaeche ? " · ca. " + state.flaeche + " m²" : "")],
            ["Dringlichkeit", state.dringlichkeit],
            ["Name", state.name],
            ["Kontakt", state.kontakt]
          ];
          summary.innerHTML = rows.map(function (r) {
            return "<div><dt>" + r[0] + "</dt><dd>" + r[1].replace(/</g, "&lt;") + "</dd></div>";
          }).join("");
        }
        document.getElementById("wizard-steps").style.display = "none";
        document.getElementById("wizard-confirm").style.display = "block";
        document.getElementById("wizard-confirm").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      });
    }
    show(0, false);
  }

  /* ---------- contact form (demo mock) ---------- */
  var cform = document.querySelector("[data-contact-form]");
  if (cform) {
    cform.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      cform.querySelectorAll("[required]").forEach(function (f) {
        var wrap = f.closest(".field");
        if (!f.value.trim()) { wrap.classList.add("invalid"); ok = false; } else { wrap.classList.remove("invalid"); }
      });
      if (!ok) return;
      var note = document.getElementById("contact-ok");
      if (note) note.classList.add("show");
      cform.reset();
      if (note) note.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    });
  }
})();
