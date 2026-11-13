/* =========================================================
   LILIW LOKAL: interactions used on every page
   ========================================================= */
document.documentElement.classList.add("js");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");

  /* ---- 1. Phone menu ---- */
  const burger = document.querySelector(".nav__burger");
  if (burger) burger.addEventListener("click", () => {
    const open = header.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open);
  });

  /* ---- 2. Search: the icon expands into a search box ---- */
  document.querySelectorAll(".search").forEach((form) => {
    const toggle = form.querySelector(".search__toggle");
    const input = form.querySelector(".search__input");
    const list = form.querySelector(".search__results");
    const data = window.SEARCH_INDEX || [];
    let results = [], picked = -1;
    const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "");

    const open = () => { form.classList.add("is-open"); toggle.setAttribute("aria-expanded", "true"); input.tabIndex = 0; setTimeout(() => input.focus(), 50); };
    const close = () => { form.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); input.tabIndex = -1; list.hidden = true; };

    function search(q) {
      const words = norm(q).split(/\s+/).filter(Boolean);
      if (!words.length) return [];
      return data.map((item) => {
        const title = norm(item.title), type = norm(item.type), text = norm(item.text);
        let score = 0;
        for (const w of words) {
          if (title.startsWith(w)) score += 6; else if (title.includes(w)) score += 4;
          else if (type.includes(w)) score += 3; else if (text.includes(w)) score += 1; else return null;
        }
        return { item, score };
      }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 6).map((r) => r.item);
    }
    function render() {
      list.innerHTML = "";
      if (!input.value.trim()) { list.hidden = true; return; }
      if (!results.length) list.innerHTML = '<li class="search__empty">No results found</li>';
      results.forEach((r, i) => {
        const li = document.createElement("li");
        li.className = i === picked ? "is-picked" : "";
        li.innerHTML = '<a><span class="search__title"></span><span class="search__type"></span></a>';
        li.querySelector("a").href = r.url;
        li.querySelector(".search__title").textContent = r.title;
        li.querySelector(".search__type").textContent = r.type;
        list.appendChild(li);
      });
      list.hidden = false;
    }
    toggle.addEventListener("click", () => {
      if (!form.classList.contains("is-open")) return open();
      if (input.value.trim()) return form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit"));
      close();
    });
    input.addEventListener("input", () => { results = search(input.value); picked = -1; render(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" && results.length) { e.preventDefault(); picked = (picked + 1) % results.length; render(); }
      if (e.key === "ArrowUp" && results.length) { e.preventDefault(); picked = (picked - 1 + results.length) % results.length; render(); }
      if (e.key === "Escape") { close(); toggle.focus(); }
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const target = results[picked >= 0 ? picked : 0];
      if (target) window.location.href = target.url;
    });
    document.addEventListener("click", (e) => { if (!form.contains(e.target) && !input.value.trim()) close(); else if (!form.contains(e.target)) list.hidden = true; });
  });

  /* ---- 3. Fade-in rise: sections and gallery photos rise into view ---- */
  const revealEls = document.querySelectorAll("[data-reveal], .g-tile");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        // gallery photos rise one after another
        if (el.classList.contains("g-tile")) {
          const visible = [...el.parentElement.querySelectorAll(".g-tile:not([hidden]):not(.is-in)")];
          el.style.transitionDelay = Math.min(visible.indexOf(el), 5) * 80 + "ms";
        }
        el.classList.add("is-in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add("is-in"));

  /* ---- 4. Parallax: background photos move slower than the page ---- */
  const layers = [...document.querySelectorAll("[data-parallax]")];
  if (layers.length && !reduceMotion) {
    let ticking = false;
    const update = () => {
      layers.forEach((el) => {
        const box = el.parentElement.getBoundingClientRect();
        if (box.bottom < 0 || box.top > innerHeight) return;
        const speed = parseFloat(el.dataset.parallax) || 0.3;
        const center = box.top + box.height / 2 - innerHeight / 2;
        el.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("resize", update);
    update();
  }

  /* ---- 5. Back to top ---- */
  document.querySelectorAll(".back-to-top").forEach((b) => {
    b.addEventListener("click", () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
    // stays on screen once you have scrolled past the first part of the page
    const check = () => {
      b.classList.toggle("is-visible", scrollY > Math.min(500, innerHeight * 0.6));
    };
    addEventListener("scroll", check, { passive: true });
    addEventListener("resize", check);
    check();
  });

  /* ---- 6. FAQ accordion ---- */
  document.querySelectorAll(".faq__q").forEach((btn) => btn.addEventListener("click", () => {
    const open = btn.closest(".faq").classList.toggle("is-open");
    btn.setAttribute("aria-expanded", open);
  }));

  /* ---- 7. About: slideshow on a loop ---- */
  document.querySelectorAll(".slideshow").forEach((show) => {
    const slides = show.querySelectorAll(".slideshow__img");
    if (slides.length < 2) return;
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove("is-active");
      i = (i + 1) % slides.length;
      slides[i].classList.add("is-active");
    }, 3500);
  });

  /* ---- 8. Discover: category filter (also reads ?cat=food in the link) ---- */
  const chips = document.querySelectorAll(".chip");
  if (chips.length) {
    const cards = document.querySelectorAll(".discover__grid .biz-card");
    const empty = document.querySelector(".discover__empty");
    const apply = (cat) => {
      chips.forEach((c) => { const on = c.dataset.filter === cat; c.classList.toggle("is-active", on); c.setAttribute("aria-pressed", on); });
      let shown = 0;
      cards.forEach((card) => { const show = cat === "all" || card.dataset.cat === cat; card.hidden = !show; if (show) { shown++; card.classList.add("is-in"); } });
      if (empty) empty.hidden = shown > 0;
      const url = new URL(location.href);
      if (cat === "all") url.searchParams.delete("cat"); else url.searchParams.set("cat", cat);
      history.replaceState(null, "", url);
    };
    chips.forEach((c) => c.addEventListener("click", () => apply(c.dataset.filter)));
    const start = new URLSearchParams(location.search).get("cat");
    if (["food", "crafts", "hospitality"].includes(start)) apply(start);
  }

  /* ---- 9. Pressed state: buttons turn green the moment they are clicked or tapped (phones too) ---- */
  const pressable = ".pill, .btn--green, .nav__cta, .chip, .tabs__btn, .btn-back, .btn-next, .biz-card";
  addEventListener("touchstart", () => {}, { passive: true }); // lets phones show :active
  addEventListener("pointerdown", (e) => {
    const el = e.target.closest(pressable);
    if (!el) return;
    el.classList.add("is-pressed");
    const release = () => setTimeout(() => el.classList.remove("is-pressed"), 220);
    el.addEventListener("pointerup", release, { once: true });
    el.addEventListener("pointercancel", release, { once: true });
    el.addEventListener("pointerleave", release, { once: true });
  });
  // coming back with the browser's Back button: clear any leftover pressed look
  addEventListener("pageshow", () => document.querySelectorAll(".is-pressed").forEach((el) => el.classList.remove("is-pressed")));

  /* ---- 10. Campaign gallery: filter tabs ---- */
  const tabs = document.querySelectorAll(".tabs__btn");
  if (tabs.length) {
    const tiles = document.querySelectorAll(".gallery .g-tile");
    tabs.forEach((t) => t.addEventListener("click", () => {
      const f = t.dataset.gfilter;
      tabs.forEach((x) => { const on = x === t; x.classList.toggle("is-active", on); x.setAttribute("aria-pressed", on); });
      tiles.forEach((tile, k) => {
        const show = f === "all" || tile.dataset.type === f;
        tile.hidden = !show;
        if (show && !reduceMotion) { tile.classList.remove("is-in"); tile.style.transitionDelay = (k % 6) * 60 + "ms"; requestAnimationFrame(() => requestAnimationFrame(() => tile.classList.add("is-in"))); }
      });
      justifyGallery();
    }));
  }

  /* ---- 10b. Campaign gallery: line every row up edge to edge.
     Tiles in a row share one height and together fill the full width, on any screen size. ---- */
  function justifyGallery() {
    document.querySelectorAll(".gallery").forEach((gal) => {
      const W = gal.clientWidth;
      if (!W) return;
      const gap = parseFloat(getComputedStyle(gal).columnGap) || 0;
      const target = innerWidth <= 600 ? 200 : innerWidth <= 900 ? 260 : 340; // ideal row height
      const tiles = [...gal.querySelectorAll(".g-tile")].filter((t) => !t.hidden);
      const rows = [];
      let row = [];
      const heightOf = (r) => (W - gap * (r.length - 1)) / r.reduce((n, x) => n + parseFloat(x.style.getPropertyValue("--n")), 0);
      tiles.forEach((t) => {
        const before = row.length ? heightOf(row) : Infinity;
        row.push(t);
        const after = heightOf(row);
        if (after <= target) {
          // end the row where its height comes closest to the ideal height
          if (row.length > 1 && Math.abs(before - target) < Math.abs(after - target)) { row.pop(); rows.push(row); row = [t]; }
          else { rows.push(row); row = []; }
        }
      });
      if (row.length) {
        const sum = row.reduce((n, x) => n + parseFloat(x.style.getPropertyValue("--n")), 0);
        const h = (W - gap * (row.length - 1)) / sum;
        // a short last row would come out too tall: join it to the row above instead
        if (h > target * 1.5 && rows.length) rows[rows.length - 1].push(...row); else rows.push(row);
      }
      rows.forEach((r) => {
        const sum = r.reduce((n, x) => n + parseFloat(x.style.getPropertyValue("--n")), 0);
        const h = (W - gap * (r.length - 1)) / sum;
        r.forEach((t) => { t.style.flex = "0 0 auto"; t.style.width = (h * parseFloat(t.style.getPropertyValue("--n"))) - 0.01 + "px"; });
      });
    });
  }
  if (document.querySelector(".gallery")) {
    justifyGallery();
    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(justifyGallery, 80); });
  }

  /* ---- 11. Lightbox: click a photo to see it full screen; videos play only when clicked ---- */
  const tileBtns = [...document.querySelectorAll(".g-tile__btn")];
  if (tileBtns.length) {
    const box = document.createElement("div");
    box.className = "lightbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Gallery viewer");
    const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    box.innerHTML = `<div class="lightbox__stage"></div>
      <button class="lightbox__btn lightbox__close" type="button" aria-label="Close">${icon("M6 6l12 12M18 6 6 18")}</button>
      <button class="lightbox__btn lightbox__prev" type="button" aria-label="Previous">${icon("M15 5l-7 7 7 7")}</button>
      <button class="lightbox__btn lightbox__next" type="button" aria-label="Next">${icon("M9 5l7 7-7 7")}</button>
      <p class="lightbox__count"></p>`;
    document.body.appendChild(box);
    const stage = box.querySelector(".lightbox__stage"), count = box.querySelector(".lightbox__count");
    let list = [], idx = 0, lastFocus = null;

    function show(i) {
      idx = (i + list.length) % list.length;
      const btn = list[idx];
      stage.innerHTML = "";
      if (btn.dataset.video !== undefined) {
        if (btn.dataset.video) {
          const v = document.createElement("video");
          v.src = btn.dataset.video; v.controls = true; v.playsInline = true; v.poster = btn.dataset.full;
          stage.appendChild(v); v.play().catch(() => {});
        } else {
          const img = document.createElement("img"); img.src = btn.dataset.full; img.alt = btn.querySelector("img").alt; img.style.maxHeight = "60vh";
          const p = document.createElement("p"); p.className = "lightbox__msg"; p.textContent = "Video coming soon.";
          stage.append(img, p); stage.style.gap = "18px";
        }
      } else {
        const img = document.createElement("img"); img.src = btn.dataset.full; img.alt = btn.querySelector("img").alt;
        stage.appendChild(img);
      }
      count.textContent = `${idx + 1} / ${list.length}`;
    }
    function openBox(btn) {
      list = tileBtns.filter((b) => !b.closest(".g-tile").hidden);
      lastFocus = btn; show(list.indexOf(btn));
      box.classList.add("is-open"); document.body.classList.add("no-scroll");
      box.querySelector(".lightbox__close").focus();
    }
    function closeBox() {
      box.classList.remove("is-open"); document.body.classList.remove("no-scroll");
      stage.querySelectorAll("video").forEach((v) => v.pause());
      setTimeout(() => { if (!box.classList.contains("is-open")) stage.innerHTML = ""; }, 300);
      if (lastFocus) lastFocus.focus();
    }
    tileBtns.forEach((b) => b.addEventListener("click", () => openBox(b)));
    box.querySelector(".lightbox__close").addEventListener("click", closeBox);
    box.querySelector(".lightbox__prev").addEventListener("click", () => show(idx - 1));
    box.querySelector(".lightbox__next").addEventListener("click", () => show(idx + 1));
    box.addEventListener("click", (e) => { if (e.target === box) closeBox(); });
    document.addEventListener("keydown", (e) => {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") closeBox();
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
    let sx = null;
    box.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", (e) => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
  }
});
