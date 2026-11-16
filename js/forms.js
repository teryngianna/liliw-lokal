/* =========================================================
   LILIW: forms (Apply page steps + About page contact form)
   ========================================================= */

/* ---------------------------------------------------------
   GOOGLE SHEETS CONNECTION
   Paste your Google Apps Script "Web app URL" between the quotes.
   While this is empty, the forms still work for testing:
   they check the fields and show the success screen,
   but nothing is saved anywhere.
   --------------------------------------------------------- */
const SHEET_URL = "https://script.google.com/macros/s/AKfycby5vKxTJihxEKuO6fvNEGd3W9ExbPK5yHxjM7u-r6jgCDcMzj7Bfol2Ro9phKlAGCow0w/exec";

const MAX_FILE_MB = 10;
const ALLOWED_FILES = ["jpg", "jpeg", "png", "pdf", "docx"];

/* ---------- Small helpers ---------- */
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const isPhone = (v) => v.replace(/[^\d]/g, "").length >= 7;

function showError(field, message) {
  const wrap = field.closest(".field") || field.closest(".line-field");
  if (!wrap) return;
  wrap.classList.add("has-error");
  let msg = wrap.querySelector(".field-error");
  if (!msg) {
    msg = document.createElement("p");
    msg.className = "field-error";
    wrap.appendChild(msg);
  }
  msg.textContent = message;
}
function clearError(field) {
  const wrap = field.closest(".field") || field.closest(".line-field");
  if (!wrap) return;
  wrap.classList.remove("has-error");
  const msg = wrap.querySelector(".field-error");
  if (msg) msg.remove();
}

/* ---------- Dropdowns (Get Featured form) ----------
   A button shows the current choice; clicking it opens a list.
   Works with mouse, touch, and keyboard (arrows, Enter, Esc, or type the first letters). */
function setupDropdown(dd) {
  const btn = dd.querySelector(".dropdown__btn");
  const list = dd.querySelector(".dropdown__list");
  const input = dd.querySelector("input[type=hidden]");
  const valueEl = btn.querySelector(".dropdown__value");
  const placeholder = valueEl.textContent;
  const options = [...list.querySelectorAll("[role=option]")];
  let hi = -1; // highlighted option
  let typed = "", typedAt = 0;

  const highlight = (i, scroll = true) => {
    hi = Math.max(0, Math.min(options.length - 1, i));
    options.forEach((o, k) => o.classList.toggle("is-highlighted", k === hi));
    list.setAttribute("aria-activedescendant", options[hi].id);
    if (scroll) options[hi].scrollIntoView({ block: "nearest" });
  };
  const open = () => {
    document.querySelectorAll(".dropdown.is-open").forEach((o) => o !== dd && o.closeDropdown());
    dd.classList.add("is-open");
    list.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    let cur = options.findIndex((o) => o.dataset.value === input.value);
    if (cur < 0 && dd.dataset.start) cur = options.findIndex((o) => o.dataset.value === dd.dataset.start);
    highlight(cur >= 0 ? cur : 0, false);
    // put the current choice in the middle of the list, like the design
    const o = options[hi];
    list.scrollTop = o.offsetTop - list.clientHeight / 2 + o.offsetHeight / 2;
    list.focus({ preventScroll: true });
  };
  const close = (focusBtn = true) => {
    if (!dd.classList.contains("is-open")) return;
    dd.classList.remove("is-open");
    list.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (focusBtn) btn.focus({ preventScroll: true });
  };
  const choose = (i) => {
    const o = options[i];
    input.value = o.dataset.value;
    valueEl.textContent = o.textContent;
    valueEl.classList.remove("is-placeholder");
    options.forEach((x) => x.setAttribute("aria-selected", String(x === o)));
    close();
    dd.dispatchEvent(new CustomEvent("dropdown-change", { bubbles: true }));
  };
  dd.closeDropdown = () => close(false);
  dd.resetDropdown = () => {
    input.value = "";
    valueEl.textContent = placeholder;
    valueEl.classList.add("is-placeholder");
    options.forEach((x) => x.setAttribute("aria-selected", "false"));
  };

  btn.addEventListener("click", () => (dd.classList.contains("is-open") ? close() : open()));
  btn.addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); open(); }
  });
  options.forEach((o, i) => {
    o.addEventListener("click", () => choose(i));
    o.addEventListener("mousemove", () => hi !== i && highlight(i, false));
  });
  list.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(hi + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(hi - 1); }
    else if (e.key === "Home") { e.preventDefault(); highlight(0); }
    else if (e.key === "End") { e.preventDefault(); highlight(options.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(hi); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "Tab") close(false);
    else if (e.key.length === 1) {
      const now = Date.now();
      typed = (now - typedAt > 700 ? "" : typed) + e.key.toLowerCase();
      typedAt = now;
      const k = options.findIndex((o) => o.textContent.toLowerCase().startsWith(typed));
      if (k >= 0) highlight(k);
    }
  });
  document.addEventListener("pointerdown", (e) => { if (!dd.contains(e.target)) close(false); });
}
document.querySelectorAll("[data-dropdown]").forEach(setupDropdown);

/* Checks every field inside "area". Returns true if all good. */
function validateArea(area) {
  let ok = true;
  let firstBad = null;
  const fail = (el, msg) => { showError(el, msg); ok = false; if (!firstBad) firstBad = el; };

  // Text, email, phone, textarea, file
  area.querySelectorAll("input:not([type=radio]):not([type=checkbox]):not([type=hidden]), textarea").forEach((el) => {
    if (el.closest("[hidden]")) return; // a part of the form that is not showing right now
    clearError(el);
    const v = el.type === "file" ? "" : el.value.trim();

    if (el.type === "file") {
      const file = el.files[0];
      if (el.required && !file) return fail(el, "Please upload your proof of registration.");
      if (file) {
        const ext = file.name.split(".").pop().toLowerCase();
        if (!ALLOWED_FILES.includes(ext)) return fail(el, "Please upload a JPG, PNG, DOCX, or PDF file.");
        if (file.size > MAX_FILE_MB * 1024 * 1024) return fail(el, `The file is larger than ${MAX_FILE_MB}MB.`);
      }
      return;
    }
    if (el.required && !v) return fail(el, "This field is required.");
    if (v && el.type === "email" && !isEmail(v)) return fail(el, "Please enter a valid email address.");
    if (v && el.hasAttribute("data-phone") && !isPhone(v)) return fail(el, "Please enter a valid contact number.");
    if (v && el.hasAttribute("data-year")) {
      const y = Number(v), now = new Date().getFullYear();
      if (!/^\d{4}$/.test(v) || y < 1500 || y > now) return fail(el, `Please enter a year between 1500 and ${now}.`);
    }
  });

  // Dropdowns marked as required need a choice
  area.querySelectorAll(".dropdown[data-required]").forEach((dd) => {
    if (dd.closest("[hidden]")) return;
    const btn = dd.querySelector(".dropdown__btn");
    if (!dd.querySelector("input[type=hidden]").value) {
      dd.classList.add("has-error");
      fail(btn, "Please choose an option.");
    } else dd.classList.remove("has-error");
  });

  // Consent (all three must be ticked)
  area.querySelectorAll('[data-required-group="consent"]').forEach((group) => {
    clearError(group);
    const boxes = group.querySelectorAll("input[type=checkbox]");
    const allTicked = [...boxes].every((b) => b.checked);
    if (!allTicked) fail(group, "Please tick all three boxes to continue.");
  });

  if (firstBad) {
    // jump to the problem that comes first on the page
    const all = [...area.querySelectorAll(".has-error")];
    if (all.length) { const w = all[0]; firstBad = w.matches("fieldset") ? w : (w.querySelector(".dropdown__btn, input:not([type=hidden]), textarea") || w); }
    const target = firstBad.matches("fieldset") ? firstBad.querySelector("input") : firstBad;
    target.focus({ preventScroll: true });
    firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return ok;
}

/* Turns a file into text so it can be sent to Google */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* Sends the data to the Google Sheet (skipped while SHEET_URL is empty) */
async function sendToSheet(data) {
  if (!SHEET_URL) {
    await new Promise((r) => setTimeout(r, 600)); // short pause so it feels real
    return;
  }
  await fetch(SHEET_URL, {
    method: "POST",
    mode: "no-cors",
    body: new URLSearchParams(data),
  });
}

/* =========================================================
   APPLY PAGE
   ========================================================= */
const applyForm = document.getElementById("apply-form");
if (applyForm) {
  const steps = [...applyForm.querySelectorAll(".apply-step")];
  const dots = [...document.querySelectorAll(".stepper li")];
  const stepper = document.querySelector(".stepper");
  const note = document.getElementById("apply-note");

  /* Checks a section quietly (no red messages) to see if it's complete */
  function isComplete(section) {
    for (const el of section.querySelectorAll("input[required]:not([type=radio]):not([type=checkbox]), textarea[required]")) {
      if (el.closest("[hidden]")) continue;
      if (el.type === "file") { if (!el.files[0]) return false; continue; }
      const v = el.value.trim();
      if (!v) return false;
      if (el.type === "email" && !isEmail(v)) return false;
      if (el.hasAttribute("data-phone") && !isPhone(v)) return false;
    }
    for (const dd of section.querySelectorAll(".dropdown[data-required]")) {
      if (!dd.closest("[hidden]") && !dd.querySelector("input[type=hidden]").value) return false;
    }
    const consent = section.querySelector('[data-required-group="consent"]');
    if (consent && ![...consent.querySelectorAll("input[type=checkbox]")].every((b) => b.checked)) return false;
    return true;
  }

  /* Progress bar:
     - the section the person is answering lights up green
     - every section before it (and any completed section) stays green
     - the green line grows up to the section they're on */
  let active = 0;     // section being answered right now (0 = section 1)
  let furthest = 0;   // furthest section reached so far

  function updateProgress() {
    let lastLit = 0;
    steps.forEach((section, i) => {
      const lit = i <= furthest || isComplete(section);
      dots[i].classList.toggle("is-done", lit);
      dots[i].classList.toggle("is-current", i === active);
      if (lit) lastLit = Math.max(lastLit, i);
    });
    // line fills up to the last lit circle that has no gray circle before it
    let reach = 0;
    for (let i = 0; i < dots.length; i++) { if (dots[i].classList.contains("is-done")) reach = i; else break; }
    stepper.style.setProperty("--progress", reach / (dots.length - 1));
  }

  function setActive(i) {
    active = i;
    furthest = Math.max(furthest, i);
    updateProgress();
  }

  // Clicking or typing in a section makes it the active one
  steps.forEach((section, i) => {
    section.addEventListener("focusin", () => setActive(i));
    section.addEventListener("click", () => setActive(i));
  });

  applyForm.addEventListener("input", updateProgress);
  applyForm.addEventListener("change", updateProgress);

  /* Keep the progress bar visible: it sticks under the menu while scrolling the form */
  const bar = document.querySelector(".stepper-bar");
  const sentinel = document.createElement("div");
  bar.before(sentinel);
  new IntersectionObserver(([entry]) => {
    bar.classList.toggle("is-stuck", !entry.isIntersecting && entry.boundingClientRect.top < 0);
  }, { rootMargin: `-${(parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 82) + 2}px 0px 0px 0px` }).observe(sentinel);

  // Clicking a step circle scrolls to that section
  document.querySelectorAll(".stepper [data-goto]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.goto) - 1;
      steps[i].scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(i);
    })
  );

  // Clear an error as soon as the person fixes the field
  applyForm.addEventListener("input", (e) => {
    const t = e.target;
    if (t.type === "radio" || t.type === "checkbox") {
      const group = t.closest("[data-required-group]");
      if (group) clearError(group);
    } else clearError(t);
  });

  // Parts that appear or hide depending on a dropdown choice ("Other" boxes, opening times)
  function applyConditions() {
    const val = (name) => (applyForm.querySelector(`input[type=hidden][name="${name}"]`) || {}).value || "";
    applyForm.querySelectorAll("[data-show-when]").forEach((el) => {
      const [name, wanted] = el.dataset.showWhen.split("=");
      const show = wanted.split("|").includes(val(name));
      if (el.hidden === show) { el.hidden = !show; if (show) { const i = el.querySelector("input"); if (i) setTimeout(() => i.focus(), 30); } }
    });
    applyForm.querySelectorAll("[data-hide-when]").forEach((el) => {
      const [name, list] = el.dataset.hideWhen.split("=");
      el.hidden = list.split("|").includes(val(name));
    });
    updateProgress();
  }
  applyForm.addEventListener("dropdown-change", (e) => { clearError(e.target.querySelector(".dropdown__btn")); e.target.classList.remove("has-error"); applyConditions(); });

  // Upload box: show the chosen file name, support drag and drop
  const fileInput = document.getElementById("a-proof");
  const fileLabel = document.getElementById("upload-file");
  const uploadBox = document.getElementById("upload-box");
  fileInput.addEventListener("change", () => {
    fileLabel.textContent = fileInput.files[0] ? `Selected: ${fileInput.files[0].name}` : "";
    clearError(fileInput);
  });
  ["dragenter", "dragover"].forEach((ev) => uploadBox.addEventListener(ev, () => uploadBox.classList.add("is-dragover")));
  ["dragleave", "drop"].forEach((ev) => uploadBox.addEventListener(ev, () => uploadBox.classList.remove("is-dragover")));

  // Submit: check every section, jump to the first problem
  applyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateArea(applyForm)) {
      note.textContent = "Please complete the highlighted fields.";
      return;
    }

    const submitBtn = document.getElementById("apply-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    note.textContent = "";

    try {
      const fd = new FormData(applyForm);
      const data = {};
      fd.forEach((v, k) => { if (k !== "proof") data[k] = v; });
      // Put the dropdown answers together the same way the Google Sheet expects them
      if (data.category === "Other") data.category = `Other: ${data.categoryOther || ""}`;
      if (data.role === "Other") data.role = `Other: ${data.roleOther || ""}`;
      if (data.opDays === "Other schedule") data.operatingHours = data.opOther || "";
      else if (["Open 24 hours, daily", "By reservation only"].includes(data.opDays)) data.operatingHours = data.opDays;
      else data.operatingHours = `${data.opDays}, ${data.opOpen} – ${data.opClose}`;
      ["categoryOther", "roleOther", "opDays", "opOpen", "opClose", "opOther"].forEach((k) => delete data[k]);

      const file = fileInput.files[0];
      if (file && SHEET_URL) {
        data.fileName = file.name;
        data.fileType = file.type || "application/octet-stream";
        data.fileData = await fileToBase64(file);
      }

      await sendToSheet(data);
      openModal();
    } catch (err) {
      console.error(err);
      note.textContent = "Something went wrong while sending. Please check your internet connection and try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });

  // "Back" button (design): return to the previous page, or Home if there isn't one
  const backBtn = applyForm.querySelector("[data-back]");
  if (backBtn) backBtn.addEventListener("click", () => {
    if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) history.back();
    else location.href = "index.html";
  });

  /* "Application Submitted" pop-up: a small card over a blurred page */
  const modal = document.getElementById("submit-modal");
  const card = modal.querySelector(".submit-modal__card");
  function openModal() {
    modal.hidden = false;
    document.documentElement.classList.add("has-modal");
    requestAnimationFrame(() => modal.classList.add("is-open"));
    card.focus();
  }
  function closeModal() {
    modal.classList.remove("is-open");
    document.documentElement.classList.remove("has-modal");
    modal.hidden = true;
    // start fresh: empty form, back at the top
    applyForm.reset();
    applyForm.querySelectorAll(".dropdown").forEach((dd) => dd.resetDropdown && dd.resetDropdown());
    fileLabel.textContent = "";
    const submitBtn = document.getElementById("apply-submit");
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
    furthest = 0; active = 0;
    applyConditions();
    scrollTo({ top: 0, behavior: "smooth" });
  }
  modal.querySelectorAll("[data-close-modal]").forEach((el) => el.addEventListener("click", closeModal));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  card.addEventListener("keydown", (e) => { if (e.key === "Tab") { e.preventDefault(); modal.querySelector(".submit-modal__close").focus(); } });

  applyConditions();
}

/* =========================================================
   ABOUT PAGE: "Get in Touch"
   ========================================================= */
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  const status = contactForm.querySelector(".form-status");
  const btn = contactForm.querySelector("button[type=submit]");

  contactForm.addEventListener("input", (e) => clearError(e.target));
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    status.className = "form-status";
    if (!validateArea(contactForm)) return;

    btn.disabled = true;
    btn.textContent = "Sending...";
    try {
      await sendToSheet(Object.fromEntries(new FormData(contactForm)));
      contactForm.reset();
      status.textContent = "Thank you! Your message has been sent.";
      status.classList.add("is-success");
    } catch (err) {
      status.textContent = "Something went wrong. Please try again.";
      status.classList.add("is-error");
    }
    btn.disabled = false;
    btn.textContent = "Send";
  });
}
