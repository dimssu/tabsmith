// In-page reminder banner. Injected directly into the focused tab so the
// user gets a visible signal even when OS notification permission is missing.

export interface BannerSnoozePreset {
  label: string;
  minutes: number;
}

export interface BannerPayload {
  reminderId: string;
  title: string;
  body: string;
  accentRgb: string; // e.g. "90 84 220"
  presets: BannerSnoozePreset[];
  // Pre-filled when the user has a saved custom value
  lastCustomMinutes?: number;
  // Whether the reminder has a navigable source URL — controls the
  // "Open tab" action's visibility.
  hasSource?: boolean;
}

// The injected function MUST be serializable for chrome.scripting.executeScript.
// Don't reference outer-scope variables; everything comes via `args`.
export function bannerInjector(payload: BannerPayload) {
  const BANNER_ID = "quarto-reminder-banner-v2";
  const STYLE_ID = "quarto-reminder-banner-style-v2";

  document.getElementById(BANNER_ID)?.remove();

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes quarto-slide-in {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes quarto-slide-out {
        to { opacity: 0; transform: translateY(-8px); }
      }
    `;
    document.documentElement.appendChild(style);
  }

  const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const bg = dark ? "#15161c" : "#ffffff";
  const fg = dark ? "#f0f0f4" : "#121216";
  const muted = dark ? "#a8aab6" : "#52545e";
  const border = dark ? "#2c2d36" : "#e1e2e8";
  const surfaceMuted = dark ? "#1c1d24" : "#f4f4f7";
  const accent = `rgb(${payload.accentRgb})`;

  const root = document.createElement("div");
  root.id = BANNER_ID;
  root.setAttribute("role", "alertdialog");
  root.setAttribute("aria-live", "assertive");
  root.setAttribute("aria-label", "Quarto reminder");
  Object.assign(root.style, {
    all: "initial",
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "2147483647",
    maxWidth: "380px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif",
    animation: "quarto-slide-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: bg,
    color: fg,
    border: `1px solid ${border}`,
    borderRadius: "12px",
    padding: "14px 16px",
    boxShadow:
      "0 18px 44px rgba(15, 15, 20, 0.22), 0 2px 8px rgba(15, 15, 20, 0.08)",
    fontSize: "13px",
    lineHeight: "1.5",
  });

  // --- Header row -----------------------------------------------------------
  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: payload.body ? "8px" : "12px",
  });
  // Small Quarto mark — same geometry as the action icon so the brand reads
  // continuously from chrome's toolbar to the page surface.
  const mark = document.createElement("span");
  mark.setAttribute("aria-hidden", "true");
  Object.assign(mark.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    flexShrink: "0",
  });
  mark.innerHTML =
    '<svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">' +
    `<rect x="6" y="5" width="9" height="9" rx="2" fill="${fg}" opacity="0.22"/>` +
    `<rect x="17" y="5" width="9" height="9" rx="2" fill="${fg}" opacity="0.22"/>` +
    `<rect x="6" y="16" width="9" height="9" rx="2" fill="${fg}" opacity="0.22"/>` +
    `<rect x="17" y="16" width="10" height="10" rx="2.5" fill="${accent}"/>` +
    `<line x1="5" y1="29.5" x2="27" y2="29.5" stroke="${fg}" stroke-width="1.25" stroke-linecap="round" opacity="0.5"/>` +
    "</svg>";
  header.appendChild(mark);

  const titleEl = document.createElement("strong");
  titleEl.textContent = payload.title;
  Object.assign(titleEl.style, {
    fontSize: "13px",
    fontWeight: "600",
    flex: "1",
    minWidth: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  });
  header.appendChild(titleEl);

  const closeBtn = document.createElement("button");
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.setAttribute("data-quarto-action", "close");
  closeBtn.textContent = "×";
  Object.assign(closeBtn.style, {
    background: "transparent",
    border: "0",
    color: fg,
    opacity: "0.55",
    cursor: "pointer",
    fontSize: "20px",
    lineHeight: "1",
    padding: "0 4px",
    fontFamily: "inherit",
  });
  header.appendChild(closeBtn);
  card.appendChild(header);

  // --- Body -----------------------------------------------------------------
  if (payload.body) {
    const bodyEl = document.createElement("div");
    bodyEl.textContent = payload.body;
    Object.assign(bodyEl.style, {
      color: muted,
      marginBottom: "12px",
      maxHeight: "5em",
      overflow: "hidden",
      display: "-webkit-box",
      WebkitLineClamp: "3",
      WebkitBoxOrient: "vertical",
    });
    card.appendChild(bodyEl);
  }

  // --- Button row -----------------------------------------------------------
  const buttonRow = document.createElement("div");
  Object.assign(buttonRow.style, {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    position: "relative",
  });

  const makeBtn = (
    label: string,
    action: string,
    opts: { primary?: boolean; ghost?: boolean } = {},
  ) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.setAttribute("data-quarto-action", action);
    Object.assign(b.style, {
      background: opts.primary ? accent : "transparent",
      border: opts.primary ? "0" : `1px solid ${border}`,
      color: opts.primary ? "#ffffff" : fg,
      padding: "6px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      cursor: "pointer",
      fontFamily: "inherit",
      fontWeight: opts.primary ? "600" : "500",
      lineHeight: "1",
      opacity: opts.ghost ? "0.85" : "1",
    });
    return b;
  };

  // Top-2 presets as quick buttons (matches the OS notification button row).
  const quickPresets = payload.presets.slice(0, 2);
  for (const p of quickPresets) {
    const btn = makeBtn(p.label, `snooze-${p.minutes}`);
    buttonRow.appendChild(btn);
  }

  // "More…" dropdown for the rest plus Custom.
  const moreBtn = makeBtn("More ▾", "more", { ghost: true });
  buttonRow.appendChild(moreBtn);

  const spacer = document.createElement("div");
  spacer.style.flex = "1";
  buttonRow.appendChild(spacer);

  // "Open tab" — navigates to the reminder's source URL. Only shown if the
  // reminder has a source. Without this, users on a different tab had no
  // obvious path to reach the tab they wanted to be reminded about.
  if (payload.hasSource) {
    const openBtn = makeBtn("Open tab", "open");
    buttonRow.appendChild(openBtn);
  }

  buttonRow.appendChild(makeBtn("Got it", "ack", { primary: true }));
  card.appendChild(buttonRow);

  // --- More menu (hidden until More is clicked) -----------------------------
  const moreMenu = document.createElement("div");
  Object.assign(moreMenu.style, {
    display: "none",
    position: "absolute",
    bottom: "100%",
    left: "0",
    marginBottom: "6px",
    minWidth: "220px",
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
    padding: "4px 0",
    zIndex: "10",
  });

  // Remaining presets (skip the two already in the button row).
  for (const p of payload.presets.slice(2)) {
    const item = document.createElement("button");
    item.setAttribute("data-quarto-action", `snooze-${p.minutes}`);
    Object.assign(item.style, {
      display: "flex",
      justifyContent: "space-between",
      width: "100%",
      background: "transparent",
      border: "0",
      color: fg,
      padding: "7px 12px",
      fontSize: "12.5px",
      fontFamily: "inherit",
      cursor: "pointer",
      textAlign: "left",
    });
    const labelSpan = document.createElement("span");
    labelSpan.textContent = p.label;
    const minSpan = document.createElement("span");
    minSpan.textContent = `${p.minutes}m`;
    Object.assign(minSpan.style, { color: muted, fontSize: "10px" });
    item.appendChild(labelSpan);
    item.appendChild(minSpan);
    item.onmouseenter = () => (item.style.background = surfaceMuted);
    item.onmouseleave = () => (item.style.background = "transparent");
    moreMenu.appendChild(item);
  }

  // Custom row at the bottom.
  const customSeparator = document.createElement("div");
  Object.assign(customSeparator.style, {
    height: "1px",
    background: border,
    margin: "4px 0",
  });
  moreMenu.appendChild(customSeparator);

  const customRow = document.createElement("div");
  Object.assign(customRow.style, {
    padding: "8px 12px",
    background: surfaceMuted,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  });
  const customLabel = document.createElement("div");
  customLabel.textContent = "Custom snooze";
  Object.assign(customLabel.style, {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: muted,
  });
  customRow.appendChild(customLabel);

  const inputRow = document.createElement("div");
  Object.assign(inputRow.style, { display: "flex", gap: "4px", alignItems: "center" });

  // Pre-fill from lastCustomMinutes if present.
  const last = payload.lastCustomMinutes ?? 60;
  let initialValue = last;
  let initialUnit: "minutes" | "hours" | "days" | "weeks" = "minutes";
  if (last >= 60 * 24 * 7 && last % (60 * 24 * 7) === 0) {
    initialUnit = "weeks";
    initialValue = last / (60 * 24 * 7);
  } else if (last >= 60 * 24 && last % (60 * 24) === 0) {
    initialUnit = "days";
    initialValue = last / (60 * 24);
  } else if (last >= 60 && last % 60 === 0) {
    initialUnit = "hours";
    initialValue = last / 60;
  }

  const valueInput = document.createElement("input");
  valueInput.type = "number";
  valueInput.min = "0.1";
  valueInput.value = String(initialValue);
  Object.assign(valueInput.style, {
    width: "70px",
    background: bg,
    color: fg,
    border: `1px solid ${border}`,
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "12px",
    fontFamily: "inherit",
    textAlign: "right",
  });

  const unitSelect = document.createElement("select");
  for (const u of ["minutes", "hours", "days", "weeks"]) {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    if (u === initialUnit) opt.selected = true;
    unitSelect.appendChild(opt);
  }
  Object.assign(unitSelect.style, {
    flex: "1",
    background: bg,
    color: fg,
    border: `1px solid ${border}`,
    borderRadius: "6px",
    padding: "5px 8px",
    fontSize: "12px",
    fontFamily: "inherit",
  });

  const setBtn = document.createElement("button");
  setBtn.textContent = "Set";
  setBtn.setAttribute("data-quarto-action", "snooze-custom");
  Object.assign(setBtn.style, {
    background: accent,
    border: "0",
    color: "#ffffff",
    padding: "5px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
  });
  inputRow.appendChild(valueInput);
  inputRow.appendChild(unitSelect);
  inputRow.appendChild(setBtn);
  customRow.appendChild(inputRow);
  moreMenu.appendChild(customRow);
  buttonRow.appendChild(moreMenu);

  // --- Footer attribution ---------------------------------------------------
  const footer = document.createElement("div");
  footer.textContent = "quarto · reminder";
  Object.assign(footer.style, {
    color: muted,
    fontSize: "10px",
    marginTop: "12px",
    opacity: "0.75",
    letterSpacing: "0.02em",
    fontWeight: "500",
  });
  card.appendChild(footer);

  root.appendChild(card);
  document.documentElement.appendChild(root);

  function dismiss() {
    root.style.animation = "quarto-slide-out 180ms ease-out forwards";
    setTimeout(() => root.remove(), 220);
  }

  function snoozeCustomFromInput() {
    const raw = Number(valueInput.value);
    if (!isFinite(raw) || raw <= 0) return;
    const unitToMin: Record<string, number> = {
      minutes: 1,
      hours: 60,
      days: 60 * 24,
      weeks: 60 * 24 * 7,
    };
    const minutes = raw * unitToMin[unitSelect.value];
    if (minutes < 0.1 || minutes > 60 * 24 * 365) return;
    try {
      // Snooze and remember as the user's preferred default — two messages
      // so the prefs:update doesn't block the snooze on a slow worker.
      chrome.runtime.sendMessage({
        type: "reminders:snoozeFromBanner",
        id: payload.reminderId,
        deltaMinutes: minutes,
      });
      chrome.runtime.sendMessage({
        type: "prefs:update",
        patch: { lastSnoozeMinutes: minutes },
      });
    } catch {
      // worker may be suspended; ignore
    }
    dismiss();
  }

  root.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    const actionEl = target?.closest<HTMLElement>("[data-quarto-action]");
    const action = actionEl?.dataset.quartoAction;
    if (!action) return;

    if (action === "more") {
      e.stopPropagation();
      moreMenu.style.display = moreMenu.style.display === "block" ? "none" : "block";
      return;
    }

    if (action === "snooze-custom") {
      e.stopPropagation();
      snoozeCustomFromInput();
      return;
    }

    if (action.startsWith("snooze-")) {
      const minutes = Number(action.slice("snooze-".length));
      if (isFinite(minutes) && minutes > 0) {
        try {
          chrome.runtime.sendMessage({
            type: "reminders:snoozeFromBanner",
            id: payload.reminderId,
            deltaMinutes: minutes,
          });
        } catch {
          // ignore
        }
        dismiss();
      }
      return;
    }

    if (action === "open") {
      // Navigate to the source tab. Acknowledgment happens server-side as
      // part of the open flow so the badge clears too.
      try {
        chrome.runtime.sendMessage({
          type: "reminders:openSource",
          id: payload.reminderId,
        });
      } catch {
        // ignore
      }
      dismiss();
      return;
    }

    // ack, close
    try {
      chrome.runtime.sendMessage({
        type: "reminders:acknowledge",
        id: payload.reminderId,
      });
    } catch {
      // ignore
    }
    dismiss();
  });

  // Stop dropdown from closing on input focus
  valueInput.addEventListener("click", (e) => e.stopPropagation());
  unitSelect.addEventListener("click", (e) => e.stopPropagation());
  valueInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      snoozeCustomFromInput();
    }
  });
}
