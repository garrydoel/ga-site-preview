// Godwin Austen site, V1. One script for every page; each part runs only where its markup exists.
(() => {
  const root = document.documentElement;
  const motion = matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Headlines: each word rises in turn.
  $$("[data-split]").forEach((h) => {
    h.innerHTML = h.textContent.trim().split(/\s+/).map((w, i) => `<span class="w"><span style="--i:${i}">${w}</span></span>`).join(" ");
  });
  const go = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 900))]).then(go);

  // Links to pages or services that don't exist yet: stay put.
  $$("a[data-pending]").forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));

  // Header: transparent over the hero, solid after; hides on the way down, returns on the way up. Progress bar.
  const head = $("[data-head]"), prog = $(".progress"), hero = $(".hero, .phero, .banner"), menuEl = $("#menu");
  let lastY = scrollY, ticking = false, heroH = 0, maxY = 1, plx = [];
  // Layout is measured once (and on resize), never inside the scroll handler.
  const measure = () => {
    heroH = hero ? hero.offsetHeight : 400; maxY = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    plx = (motion ? $$("[data-parallax]") : []).map((el) => {
      const box = el.closest(".story-img") || el.parentElement, r = box.getBoundingClientRect();
      return { el, k: Number(el.dataset.parallax), top: r.top + scrollY, h: r.height };
    });
  };
  const onScroll = () => {
    ticking = false;
    const y = scrollY;
    prog.style.transform = `scaleX(${Math.min(1, y / maxY).toFixed(4)})`;
    head.classList.toggle("solid", y > 40);
    if (!menuEl.classList.contains("open") && !head.contains(document.activeElement)) head.classList.toggle("away", innerWidth <= 1100 && y > lastY && y > heroH * 0.6);
    if (y < lastY - 2 || y < 80) head.classList.remove("away");
    lastY = y;
    plx.forEach((p) => {
      if (p.k > 0) { if (y < heroH) p.el.style.translate = `0 ${(y * p.k).toFixed(1)}px`; return; }
      const mid = p.top + p.h / 2 - y - innerHeight / 2;
      if (Math.abs(mid) < innerHeight + p.h) p.el.style.translate = `0 ${(mid * p.k).toFixed(1)}px`;
    });
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", () => { measure(); onScroll(); });
  let roPending = false;
  if ("ResizeObserver" in window) new ResizeObserver(() => { if (roPending) return; roPending = true; requestAnimationFrame(() => { roPending = false; measure(); }); }).observe(document.body);
  addEventListener("load", () => { measure(); onScroll(); });
  if (document.fonts) document.fonts.ready.then(measure);
  measure(); onScroll();

  // Desktop dropdowns: open on hover (CSS) or with the arrow button; Escape or a click outside closes.
  const dds = $$(".dd");
  const closeDd = (except) => dds.forEach((d) => { if (d !== except) { d.classList.remove("open"); $(".dd-btn", d).setAttribute("aria-expanded", "false"); } });
  const hoverable = matchMedia("(hover: hover)").matches;
  dds.forEach((d) => {
    const b = $(".dd-btn", d);
    let t = null;
    if (hoverable) {
      d.addEventListener("pointerenter", (e) => { if (e.pointerType !== "mouse") return; clearTimeout(t); closeDd(d); if (!d.classList.contains("open")) d.dataset.hoverAt = Date.now(); d.classList.add("open"); b.setAttribute("aria-expanded", "true"); });
      d.addEventListener("pointerleave", (e) => { if (e.pointerType !== "mouse") return; t = setTimeout(() => { d.classList.remove("open"); b.setAttribute("aria-expanded", "false"); }, 180); });
    }
    b.addEventListener("click", () => { const on = !d.classList.contains("open") || Date.now() - (Number(d.dataset.hoverAt) || 0) < 600; closeDd(d); d.classList.toggle("open", on); b.setAttribute("aria-expanded", String(on)); });
    d.addEventListener("keydown", (e) => { if (e.key === "Escape" && d.classList.contains("open")) { closeDd(); b.focus(); } });
    d.addEventListener("focusout", (e) => { if (!d.contains(e.relatedTarget)) { d.classList.remove("open"); b.setAttribute("aria-expanded", "false"); } });
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".dd")) closeDd(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const open = $(".dd.open"); if (!open) return;
    const inside = open.contains(document.activeElement);
    closeDd(); if (inside) $(".dd-btn", open).focus();
  });

  // The call in the header (desktop) and the bottom bar (phones) appear once the page's first booking button
  // has gone, and step aside while another booking button is on screen.
  // The header call shows whenever the page's first booking button is off screen (above or still below);
  // the phone bar also waits until the visitor has scrolled. Both step aside while another booking button is on
  // screen, and stay away for the visit once the form has been sent.
  const heroGroup = $("[data-hero-cta]"), heroCta = heroGroup ? ($("[data-book]", heroGroup) || heroGroup) : null, bar = $("[data-bar]"), headCta = $(".head-cta"), isLost = !!$(".lost, [data-no-bar]");
  let ctaOff = !heroCta, ctaBelow = false, scrolled = false, zoneSeen = new Set();
  if (!heroCta) { const first = $$("main [data-book], .formbox .submit").find((b) => b.getClientRects().length); ctaBelow = !first || first.getBoundingClientRect().bottom > innerHeight; }
  const store = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };
  let sent = store("ga-sent") === "1" && !new URLSearchParams(location.search).has("book-new");
  const sync = () => {
    const show = ctaOff && !sent;
    const shown = bar && getComputedStyle(bar).display !== "none";
    const on = shown && show && (scrolled || ctaBelow) && zoneSeen.size === 0 && !isLost;
    head.classList.toggle("cta", show);
    if (headCta) headCta.tabIndex = show ? 0 : -1;
    if (bar) { bar.classList.toggle("on", on); bar.querySelector("a").tabIndex = on ? 0 : -1; root.style.scrollPaddingBottom = on ? `${bar.offsetHeight + 16}px` : ""; }
  };
  // The hero button counts as on screen only when all of it is.
  if (heroCta) new IntersectionObserver(([e]) => { const full = e.intersectionRatio > 0.99; ctaOff = !full; ctaBelow = !full && e.boundingClientRect.top > 0; sync(); }, { rootMargin: `-${head.offsetHeight}px 0px 0px 0px`, threshold: [0, 0.5, 1] }).observe(heroCta);
  addEventListener("scroll", () => { const s = scrollY > innerHeight * 0.5; if (s !== scrolled) { scrolled = s; sync(); } }, { passive: true });
  const zio = new IntersectionObserver((es) => { es.forEach((e) => e.isIntersecting ? zoneSeen.add(e.target) : zoneSeen.delete(e.target)); sync(); }, { rootMargin: "0px 0px -15% 0px" });
  // The bar steps aside for another booking button on screen (the button itself, not its section), any field or the
  // submit of the contact form (not the box around them, which can show on a first screen with no field in it), and
  // the footer.
  const zones = new Set($$("footer[data-cta-zone]"));
  $$("main [data-book], .formbox input, .formbox select, .formbox textarea, .formbox .submit").forEach((b) => { if (!b.closest("[data-hero-cta]")) zones.add(b); });
  $$("[data-hero-cta]").slice(1).forEach((g) => zones.add(g));
  zones.forEach((z) => zio.observe(z));
  addEventListener("resize", sync);
  sync();

  // Focus never sits under the fixed header or the bar, in the page or the footer.
  // Checked again once the browser's own (smooth) focus scroll has settled.
  document.addEventListener("focusin", (e) => {
    const el = e.target; if (!el.closest || !el.closest("main, footer") || el.getAttribute("tabindex") === "-1") return;
    if (!el.matches(":focus-visible")) return; // a mouse click never moves the page
    const nudge = () => {
      if (document.activeElement !== el) return;
      const r = el.getBoundingClientRect(), hb = head.offsetHeight, bt = bar && bar.classList.contains("on") && bar.getClientRects().length ? bar.getBoundingClientRect().top : innerHeight;
      if (r.bottom < 0 || r.top > innerHeight) return; // the browser is still scrolling to it
      if (r.top < hb + 8 || r.height > bt - hb - 32) scrollBy({ top: r.top - hb - 24, behavior: "auto" }); // too tall for the gap: its top wins
      else if (r.bottom > bt - 8) scrollBy({ top: r.bottom - bt + 24, behavior: "auto" });
    };
    let done = false;
    const once = () => { if (!done) { done = true; nudge(); } };
    if ("onscrollend" in window) addEventListener("scrollend", once, { once: true });
    setTimeout(once, motion ? 700 : 80);
  });

  // Reveals on scroll.
  const rio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  $$(".rv").forEach((el) => rio.observe(el));

  // Menu (tablet and phone).
  const menu = menuEl, menuBtn = $(".menu-btn");
  const setMenu = (on, back = true) => {
    menu.classList.toggle("open", on); menuBtn.setAttribute("aria-expanded", String(on));
    document.body.style.overflow = on ? "hidden" : "";
    if (on) setTimeout(() => $("nav a", menu).focus({ preventScroll: true }), 120);
    else if (back) menuBtn.focus({ preventScroll: true });
  };
  menuBtn.addEventListener("click", () => setMenu(true));
  $$(".sub-btn", menu).forEach((b) => b.addEventListener("click", () => {
    const sub = document.getElementById(b.getAttribute("aria-controls")), on = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(on)); sub.hidden = !on;
  }));
  $$("[data-close]", menu).forEach((b) => b.addEventListener("click", () => setMenu(false, false)));
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenu(false);
    if (e.key === "Tab") {
      const f = $$("a, button", menu).filter((x) => x.offsetParent), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // Cases: one at a time; arrows, arrow keys or a swipe move between them; the yellow bar shows which.
  const casesBox = $(".cases");
  if (casesBox && $("[data-next]")) {
    const cases = $$(".case", casesBox), cur = $("[data-cur]"), bar2 = $(".bar2");
    let ci = 0;
    const showCase = (n) => {
      const back = n < ci;
      n = (n + cases.length) % cases.length;
      if (n === ci) return;
      cases[ci].hidden = true; cases[ci].classList.remove("show", "back");
      ci = n; const c = cases[ci];
      c.hidden = false; c.classList.add("in"); c.classList.toggle("back", back);
      void c.offsetWidth; c.classList.add("show");
      cur.textContent = String(ci + 1).padStart(2, "0");
      const st = $("[data-case-status]"); if (st) st.textContent = `Case ${ci + 1} of ${cases.length}: ${$("h3, h2", c).textContent}`;
      bar2.style.transform = `translateX(${ci * 100}%)`;
    };
    $("[data-next]").addEventListener("click", () => showCase(ci + 1));
    $("[data-prev]").addEventListener("click", () => showCase(ci - 1));
    $(".case-nav").addEventListener("keydown", (e) => { if (e.key === "ArrowRight") showCase(ci + 1); if (e.key === "ArrowLeft") showCase(ci - 1); });
    let sx = null, sy = 0;
    casesBox.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") { sx = e.clientX; sy = e.clientY; } });
    casesBox.addEventListener("pointerup", (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) showCase(ci + (dx < 0 ? 1 : -1));
    });
    casesBox.addEventListener("pointercancel", () => { sx = null; });
  }

  // FAQ: smooth open and close.
  $$(".qa").forEach((d) => {
    const s = $("summary", d), a = $(".ans", d);
    s.addEventListener("click", (e) => {
      if (!motion) return;
      e.preventDefault();
      if (d.dataset.busy) return;
      d.dataset.busy = "1";
      if (!d.open) {
        d.open = true;
        const h = a.scrollHeight;
        a.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }).onfinish = () => delete d.dataset.busy;
      } else {
        const h = a.scrollHeight;
        a.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 360, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }).onfinish = () => { d.open = false; delete d.dataset.busy; };
      }
    });
  });

  // Resource filters: one primary tag per item; "All" shows everything. Newest first is the markup order.
  $$("[data-filters]").forEach((box) => {
    const list = $(box.dataset.filters), items = $$("[data-tag]", list), chips = $$(".chip", box), empty = $("[data-empty]", list.parentElement);
    chips.forEach((c) => c.addEventListener("click", () => {
      chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
      const t = c.dataset.f;
      let n = 0;
      items.forEach((it) => { const on = !t || it.dataset.tag === t; it.hidden = !on; if (on) n++; });
      if (empty) empty.hidden = n > 0;
      const st = $("[data-filter-status]"); if (st) st.textContent = `${n} ${n === 1 ? "item" : "items"}`;
      levelTitles();
    }));
  });

  // Forms: the pop-up booking form, and the same form inline on the contact page. Each required field gets its own
  // line; the document's summary line shows only while a required field is empty; a failed send has its own line.
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const problem = (el) => el.value.trim() === "" ? "empty" : (el.type === "email" && !emailOk(el.value) ? "format" : "");
  const mark = (el) => {
    const p = problem(el), fe = document.getElementById(el.getAttribute("aria-describedby"));
    el.setAttribute("aria-invalid", String(!!p));
    if (fe) fe.textContent = p === "empty" ? fe.dataset.empty : p === "format" ? fe.dataset.format : "";
    return p;
  };
  const picks = new Set();
  $$("[data-form]").forEach((form) => {
    form.noValidate = true;
    const box = form.parentElement, err = $("[data-err]", form), fail = $("[data-fail]", form), done = $("[data-done]", box), submit = $(".submit", form), fields = $$("[required]", form);
    const summary = () => err.classList.toggle("on", fields.some((el) => el.getAttribute("aria-invalid") === "true" && problem(el) === "empty"));
    fields.forEach((el) => {
      el.addEventListener("blur", () => { if (el.value || el.hasAttribute("aria-invalid")) { mark(el); summary(); } });
      el.addEventListener("input", () => { if (el.hasAttribute("aria-invalid")) { mark(el); summary(); } });
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      fail.classList.remove("on");
      const bad = fields.filter((el) => mark(el));
      summary();
      if (bad.length) { bad[0].focus(); return; }
      submit.classList.add("busy"); submit.disabled = true;
      // Placeholder send: the real endpoint (which emails contact@godwinausten.group) is still to be named.
      // ?send=fail shows the failure state.
      setTimeout(() => {
        submit.classList.remove("busy"); submit.disabled = false;
        if (new URLSearchParams(location.search).get("send") === "fail") { fail.classList.add("on"); fail.focus(); return; }
        form.hidden = true; done.hidden = false; done.classList.add("show"); done.focus();
        sent = true; store("ga-sent", "1"); sync(); document.dispatchEvent(new Event("ga-sent"));
      }, 1100);
    });
  });

  // Select what sounds familiar: each row or card has a toggle button labelled by its heading; a click anywhere on
  // the row presses it. The selection shows in the closing band, fills the form's first open question and is kept
  // for the visit (so it reaches the contact page too).
  const pickLines = $$("[data-picked]");
  try { (JSON.parse(store("ga-picks") || "[]")).forEach((p) => picks.add(p)); } catch (e) {}
  const showPicks = () => {
    const list = [...picks];
    store("ga-picks", JSON.stringify(list));
    pickLines.forEach((l) => { l.hidden = !list.length; l.textContent = list.length ? "You selected: " + list.join(", ") : ""; });
    // Under each selectable group, beside its Let's Talk button: how many of that group are selected.
    $$("[data-pick-count]").forEach((c) => {
      const box = c.closest(".pick-go").previousElementSibling, n = box ? $$("[data-pick]", box).filter((el) => picks.has(el.dataset.pick)).length : 0;
      c.textContent = n ? `${n} selected.` : "";
    });
    $$("textarea[name=achieve]").forEach((ta) => {
      const auto = ta.dataset.auto || "";
      if (ta.value === auto) { ta.value = list.length ? "Selected: " + list.join(", ") : ""; ta.dataset.auto = ta.value; }
    });
  };
  $$("[data-pick]").forEach((el) => {
    const btn = $(".tickbox", el), key = el.dataset.pick;
    const set = (on) => { btn.setAttribute("aria-pressed", String(on)); el.classList.toggle("is-picked", on); on ? picks.add(key) : picks.delete(key); };
    if (picks.has(key)) set(true);
    btn.addEventListener("click", (e) => { e.stopPropagation(); set(btn.getAttribute("aria-pressed") !== "true"); showPicks(); });
    el.addEventListener("click", (e) => { if (e.target.closest("a, button")) return; set(btn.getAttribute("aria-pressed") !== "true"); showPicks(); });
  });
  showPicks();

  // Mockup tag steps aside while the band explaining it is on screen.
  const mtag = $(".mock-tag"), mband = $(".mock-band");
  if (mtag && mband) {
    const seen = new Set();
    const mio = new IntersectionObserver((es) => { es.forEach((e) => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)); mtag.classList.toggle("away", seen.size > 0); });
    mio.observe(mband); mio.observe($("footer"));
  }

  // Booking form in a dialog.
  const dlg = $("#book");
  if (dlg) {
    const form = $("[data-form]", dlg), done = $("[data-done]", dlg);
    let opener = null, drafting = false;
    const openDlg = (e) => {
      e.preventDefault(); opener = e.currentTarget;
      if (menu.classList.contains("open")) setMenu(false, false);
      if (new URLSearchParams(location.search).has("book-new")) { form.hidden = false; done.hidden = true; form.reset(); }
      else if (sent && !drafting && form.hidden === false) { form.hidden = true; done.hidden = false; }
      const another = $("[data-another]", dlg); if (another) another.hidden = !sent;
      dlg.showModal(); document.body.style.overflow = "hidden";
      setTimeout(() => (form.hidden ? done : $("input", form)).focus(), 60);
    };
    const closeDlg = () => {
      if (!dlg.open) return;
      dlg.classList.add("closing");
      setTimeout(() => { dlg.classList.remove("closing"); dlg.close(); }, motion ? 240 : 0);
    };
    const seenNow = (el) => {
      if (!el || !el.isConnected) return false;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect(), top = head.offsetHeight + 8;
      if (cs.visibility === "hidden" || cs.display === "none" || r.width === 0) return false;
      if (el.closest(".dock") && !bar.classList.contains("on")) return false;
      return r.top >= top - 1 && r.bottom <= innerHeight;
    };
    dlg.addEventListener("close", () => {
      document.body.style.overflow = "";
      if (seenNow(opener)) return opener.focus({ preventScroll: true });
      const call = $$("main [data-book]").find(seenNow);
      if (call) return call.focus({ preventScroll: true });
      const hb = head.offsetHeight + 8;
      const h = $$("main h1, main h2, main h3").find((x) => { if (x.closest(".vh") || x.classList.contains("vh")) return false; const r = x.getBoundingClientRect(); return r.height > 2 && r.top >= hb && r.bottom <= innerHeight; });
      const target = h || document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest("section, footer") || $("main");
      target.tabIndex = -1; target.focus({ preventScroll: true });
    });
    document.addEventListener("ga-sent", () => { drafting = false; });
    const anotherBtn = $("[data-another] button", dlg);
    if (anotherBtn) anotherBtn.addEventListener("click", () => { drafting = true; form.reset(); $$("textarea[name=achieve]", form).forEach((t) => { t.dataset.auto = ""; }); form.hidden = false; done.hidden = true; showPicks(); setTimeout(() => $("input", form).focus(), 30); });
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeDlg(); });
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closeDlg(); });
    $("[data-dlg-close]", dlg).addEventListener("click", closeDlg);
    const inline = $(".formbox:not(.gate) [data-form]"); // the diagnostic details form (.gate) is not a Let's Talk form
    $$("[data-book]").forEach((b) => b.addEventListener("click", inline ? (e) => { e.preventDefault(); if (menu.classList.contains("open")) setMenu(false, false); inline.closest(".formbox").scrollIntoView({ behavior: motion ? "smooth" : "auto", block: "start" }); setTimeout(() => $("input", inline).focus({ preventScroll: true }), motion ? 500 : 0); } : openDlg));
  }
  // Our Clients carousel: a pause button (WCAG 2.2.2), shown only when the row is moving.
  const mq = $("[data-marquee]"), mqBtn = $("[data-marquee-toggle]");
  if (mq && mqBtn && motion) {
    mqBtn.hidden = false;
    mqBtn.addEventListener("click", () => { const p = mq.classList.toggle("paused"); $("[data-label]", mqBtn).textContent = p ? "Play" : "Pause"; });
  }
  // 23 Oct feedback 5: titles across a row of cards line up. If any title in a row runs to two lines, the others drop
  // their last word to a second line too, so the text under them starts level. Rechecked on resize and once fonts load.
  const gridOf = (h) => { for (let el = h.parentElement; el && el !== document.body; el = el.parentElement) { const p = el.parentElement; if (p && getComputedStyle(p).display.includes("grid") && p.children.length > 1) return el; } return null; };
  const lines = (h) => Math.round(h.getBoundingClientRect().height / (parseFloat(getComputedStyle(h).lineHeight) || 1));
  const levelTitles = () => {
    $$("main br.lw").forEach((b) => { const p = b.parentNode; b.remove(); p.normalize(); });
    $$("main h3[data-lv]").forEach((h) => { h.style.minHeight = ""; h.style.marginTop = ""; delete h.dataset.lv; });
    const rows = new Map();
    $$("main h3").forEach((h) => { const card = gridOf(h); if (!card || !h.getClientRects().length) return; const key = card.parentElement; const top = Math.round(card.getBoundingClientRect().top + scrollY); const k = rows.get(key) || new Map(); (k.get(top) || k.set(top, []).get(top)).push(h); rows.set(key, k); });
    rows.forEach((byTop) => byTop.forEach((hs) => {
      if (hs.length < 2) return;
      const top = (h) => h.getBoundingClientRect().top;
      const firstTop = Math.max(...hs.map(top));
      hs.forEach((h) => { const d = firstTop - top(h); if (d > 1) { h.dataset.lv = ""; h.style.marginTop = `${parseFloat(getComputedStyle(h).marginTop) + d}px`; } });
      const ht = (h) => h.getBoundingClientRect().height;
      const max = Math.max(...hs.map(ht));
      hs.forEach((h) => {
        if (ht(h) >= max - 1) return;
        // First choice (the client's): drop the last word to the next line, kept only if that matches the tallest title.
        const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); let t, last = null; while ((t = walker.nextNode())) if (t.textContent.trim()) last = t;
        const br = Object.assign(document.createElement("br"), { className: "lw" });
        const nw = last && last.parentElement.closest(".nw");
        const m = last && /\s+((?:&\s+)?\S+)\s*$/.exec(last.textContent); // never leave "&" at a line end
        if (nw && h.contains(nw) && nw.previousSibling) nw.parentNode.insertBefore(br, nw);
        else if (m) last.parentNode.insertBefore(br, last.splitText(m.index + m[0].indexOf(m[1])));
        if (br.parentNode && Math.abs(ht(h) - max) <= 1) return;
        if (br.parentNode) { const p = br.parentNode; br.remove(); p.normalize(); }
        // Otherwise (one word, or a bigger gap): hold the title at the tallest height.
        h.dataset.lv = ""; h.style.minHeight = `${max}px`;
      });
    }));
  };
  let lvT; addEventListener("resize", () => { clearTimeout(lvT); lvT = setTimeout(levelTitles, 150); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(levelTitles);
})();
