// In-page reminder banner. We inject this directly into the focused tab so
// the user gets a visible signal even when OS notification permission is
// missing (the #1 reason reminders feel like they're "silently failing").
//
// The injected function runs in the page's isolated world, so it has access
// to chrome.runtime for sending messages back to the service worker.

export interface BannerPayload {
  reminderId: string;
  title: string;
  body: string;
  accentRgb: string; // e.g. "90 84 220"
}

// Plain function — must be serializable for chrome.scripting.executeScript.
// Don't reference outer-scope variables; everything comes via `args`.
export function bannerInjector(payload: BannerPayload) {
  const BANNER_ID = "tabsmith-reminder-banner-v1";
  const STYLE_ID = "tabsmith-reminder-banner-style-v1";

  // If a previous banner is still up (e.g. recurring fire) replace it.
  document.getElementById(BANNER_ID)?.remove();

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes tabsmith-slide-in {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes tabsmith-slide-out {
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
  const accent = `rgb(${payload.accentRgb})`;

  const root = document.createElement("div");
  root.id = BANNER_ID;
  root.setAttribute("role", "alertdialog");
  root.setAttribute("aria-live", "assertive");
  root.setAttribute("aria-label", "Tabsmith reminder");
  Object.assign(root.style, {
    all: "initial",
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "2147483647",
    maxWidth: "380px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif",
    animation: "tabsmith-slide-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: bg,
    color: fg,
    border: `1px solid ${border}`,
    borderLeft: `4px solid ${accent}`,
    borderRadius: "12px",
    padding: "14px 16px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.08)",
    fontSize: "13px",
    lineHeight: "1.5",
  });

  // Header row
  const header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: payload.body ? "8px" : "12px",
  });
  const bell = document.createElement("span");
  bell.textContent = "⏰";
  bell.style.fontSize = "16px";
  bell.setAttribute("aria-hidden", "true");
  header.appendChild(bell);

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
  closeBtn.setAttribute("data-tabsmith-action", "close");
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

  // Body (note text), if any
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

  // Button row
  const buttonRow = document.createElement("div");
  Object.assign(buttonRow.style, {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  });

  const makeBtn = (label: string, action: string, primary = false) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.setAttribute("data-tabsmith-action", action);
    Object.assign(b.style, {
      background: primary ? accent : "transparent",
      border: primary ? "0" : `1px solid ${border}`,
      color: primary ? "#ffffff" : fg,
      padding: "6px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      cursor: "pointer",
      fontFamily: "inherit",
      fontWeight: primary ? "600" : "500",
      lineHeight: "1",
    });
    return b;
  };
  buttonRow.appendChild(makeBtn("Snooze 1h", "snooze-60"));
  buttonRow.appendChild(makeBtn("Tomorrow", "snooze-1440"));
  const spacer = document.createElement("div");
  spacer.style.flex = "1";
  buttonRow.appendChild(spacer);
  buttonRow.appendChild(makeBtn("Got it", "ack", true));
  card.appendChild(buttonRow);

  // Footer attribution
  const footer = document.createElement("div");
  footer.textContent = "Tabsmith reminder";
  Object.assign(footer.style, {
    color: muted,
    fontSize: "10px",
    marginTop: "10px",
    opacity: "0.7",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  });
  card.appendChild(footer);

  root.appendChild(card);
  document.documentElement.appendChild(root);

  function dismiss() {
    root.style.animation = "tabsmith-slide-out 180ms ease-out forwards";
    setTimeout(() => root.remove(), 220);
  }

  root.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    const actionEl = target?.closest<HTMLElement>("[data-tabsmith-action]");
    const action = actionEl?.dataset.tabsmithAction;
    if (!action) return;
    if (action === "snooze-60" || action === "snooze-1440") {
      const delta = action === "snooze-60" ? 60 : 24 * 60;
      try {
        chrome.runtime.sendMessage({
          type: "reminders:snoozeFromBanner",
          id: payload.reminderId,
          deltaMinutes: delta,
        });
      } catch {
        // service worker may have suspended; ignore
      }
    } else {
      try {
        chrome.runtime.sendMessage({
          type: "reminders:acknowledge",
          id: payload.reminderId,
        });
      } catch {
        // ignore
      }
    }
    dismiss();
  });
}
