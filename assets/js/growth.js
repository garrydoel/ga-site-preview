// Growth Readiness pages (v2 new pages, 2 Nov 2026): the details form, the 12-question survey and the result profile.
// Scoring, routing and the profile rules copy the original GoHighLevel survey and result-page code
// (see /workspace/vicit-new-pages-source/survey-page/content.md).
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const motion = matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const store = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } };

  // 1. Details form (new-contact.html). site.js validates it and shows the sent state; then, like the original funnel,
  // it moves on to the survey. It does not mark the Let's Talk pop-up as already sent.
  const gate = $(".gate [data-form]");
  if (gate) document.addEventListener("ga-sent", () => {
    if (!gate.hidden) return;
    store("ga-sent", null);
    setTimeout(() => { location.href = "growth-survey.html"; }, 1800);
  });

  // 2. Survey (growth-survey.html): six steps, every question required.
  const sv = $("#survey");
  if (sv) {
    const steps = $$(".sv-step", sv), back = $("[data-back]", sv), next = $("[data-forward]", sv), submit = $("[data-submit]", sv);
    const count = $("[data-count]", sv), fill = $(".sv-prog b", sv), sum = $("[data-sum]", sv);
    let i = 0;
    const show = (n, focus = true) => {
      steps[i].classList.remove("on"); i = n; steps[i].classList.add("on");
      back.hidden = i === 0; next.hidden = i === steps.length - 1; submit.hidden = !next.hidden;
      count.textContent = `Showing ${i + 1} of ${steps.length}`;
      fill.style.transform = `scaleX(${(i + 1) / steps.length})`;
      if (focus) {
        const h = $("h2", steps[i]); h.tabIndex = -1; h.focus({ preventScroll: true });
        const top = sv.getBoundingClientRect().top + scrollY - ($(".site-head")?.offsetHeight || 0) - 16;
        if (scrollY > top) scrollTo({ top, behavior: motion ? "smooth" : "auto" });
      }
    };
    const check = (step) => {
      const bad = $$(".sv-q", step).filter((q) => {
        const ok = !!$("input:checked", q);
        q.setAttribute("aria-invalid", String(!ok)); $(".fe", q).textContent = ok ? "" : "Choose an answer.";
        return !ok;
      });
      sum.hidden = !bad.length;
      if (bad.length) $("input", bad[0]).focus();
      return !bad.length;
    };
    sv.addEventListener("change", (e) => {
      const q = e.target.closest(".sv-q");
      if (q && q.getAttribute("aria-invalid") === "true") { q.setAttribute("aria-invalid", "false"); $(".fe", q).textContent = ""; }
      if (!$$('.sv-q[aria-invalid="true"]', steps[i]).length) sum.hidden = true;
    });
    next.addEventListener("click", () => { if (check(steps[i])) show(i + 1); });
    back.addEventListener("click", () => { sum.hidden = true; show(i - 1); });
    sv.addEventListener("submit", (e) => {
      e.preventDefault();
      if (i < steps.length - 1) { if (check(steps[i])) show(i + 1); return; }
      const gap = steps.findIndex((s) => $$(".sv-q", s).some((q) => !$("input:checked", q)));
      if (gap >= 0) { show(gap); check(steps[gap]); return; }
      // Yes, Consistently = 0, Sometimes = 1, No, Not Yet = 2; area = sum of its 3 answers; total = sum of the 4 areas.
      const a = [1, 2, 3, 4].map((n) => $$(`input[data-area="${n}"]:checked`, sv).reduce((t, el) => t + Number(el.value), 0));
      const total = a.reduce((x, y) => x + y, 0);
      const page = total <= 7 ? "result-strong-growth-foundations.html" : total <= 15 ? "result-growth-model-under-pressure.html" : "result-structural-constraints-limiting-scale.html";
      store("ga-scores", JSON.stringify(a));
      location.href = `${page}?a1=${a[0]}&a2=${a[1]}&a3=${a[2]}&a4=${a[3]}`;
    });
    steps.forEach((s, n) => s.classList.toggle("on", n === 0));
    show(0, false);
  }

  // 3. Result pages: band per area (0–1 Strong Foundation, 2–3 Worth Attention, 4–6 Likely Constraint) and the priority
  // area(s), the highest score. Scores come from ?a1..a4, then from this visit's survey. Without scores the profile
  // stays hidden and the page offers the diagnostic instead.
  const gp = $("[data-profile]");
  if (gp) {
    const ok = (v) => v !== null && v !== undefined && /^[0-6]$/.test(String(v));
    const q = new URLSearchParams(location.search);
    let a = [1, 2, 3, 4].map((n) => q.get("a" + n));
    if (!a.every(ok)) { try { const s = JSON.parse(store("ga-scores") || "null"); if (Array.isArray(s)) a = s; } catch (e) {} }
    if (a.length === 4 && a.every(ok)) {
      a = a.map(Number);
      const band = (s) => (s <= 1 ? 0 : s <= 3 ? 1 : 2);
      $$(".gp-area", gp).forEach((el, k) => $$(".gp-bands li", el).forEach((li, b) => {
        const on = b === band(a[k]); li.classList.toggle("on", on);
        if (on) { li.setAttribute("aria-current", "true"); li.insertAdjacentHTML("beforeend", '<span class="vh"> (your result)</span>'); }
      }));
      const worst = Math.max(...a), pri = a.map((s, k) => (s === worst ? k : -1)).filter((k) => k >= 0), tied = pri.length > 1;
      const box = $(".gp-pri", gp), names = $$(".gp-area h3", gp).map((h) => h.textContent);
      $("h3", box).textContent = tied ? "Your Priority Areas" : "Your Priority Area";
      $("[data-intro]", box).hidden = tied; $("[data-tie]", box).hidden = !tied;
      $$("[data-insight]", box).forEach((d, k) => { d.hidden = tied || k !== pri[0]; });
      const chips = $(".chips", box); chips.textContent = "";
      pri.forEach((k) => chips.append(Object.assign(document.createElement("span"), { textContent: names[k] })));
      if (tied) $("[data-tie]", box).after(chips); else $("[data-intro]", box).after(chips);
      gp.hidden = false; $("[data-noscores]").hidden = true;
    }
  }
})();
