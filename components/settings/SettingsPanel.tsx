"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/supabase/client";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { KEYS } from "@/lib/constants";
import { DEFAULT_FOCUS_PREFERENCES, migrateFocusPreferences } from "@/lib/migrations";
import { COZY_THEMES, THEME_ORDER } from "@/lib/themeConfig";
import { removeCustomTheme, saveCustomTheme, type CustomThemeMetadata } from "@/lib/customThemeStore";
import { getNotificationState, playTimerAlert, requestNotificationPermission, type NotificationState } from "@/lib/browserFeatures";
import type { CozyAnimeTheme, ThemeGroup } from "@/types/theme";
import type { ThemeSlot } from "@/types/workspace";
import type { LearningSession } from "@/types/tracker";
import type { TaskItem } from "@/types";
import { Button } from "../ui/Button";
import { OverlayPanel } from "../ui/OverlayPanel";
import { DailyStats } from "../stats/DailyStats";
import { WeeklyHeatmap } from "../stats/WeeklyHeatmap";
import { HistoryPanel } from "../history/HistoryPanel";
import { CheckIcon } from "../icons";

type SettingsSection =
  | "themes" | "account" | "history"
  | "focus-timer" | "stats" | "clock" | "home" | "about";

interface SettingsPanelProps {
  open: boolean;
  initialSection?: SettingsSection;
  onClose: () => void;
  activeThemeSlot: ThemeSlot;
  onThemeSlotChange: (slot: ThemeSlot) => void;
  themePreferences: Record<ThemeSlot, CozyAnimeTheme>;
  onThemeChange: (theme: CozyAnimeTheme) => void;
  customThemeIds: Record<ThemeSlot, string | null>;
  onCustomThemeChange: (id: string | null) => void;
  themeOverlays: Record<ThemeSlot, number>;
  onThemeOverlayChange: (value: number) => void;
  use24Hour: boolean;
  onUse24HourChange: (value: boolean) => void;
  showSeconds: boolean;
  onShowSecondsChange: (value: boolean) => void;
  accountEmail?: string;
  accountProvider?: string;
  tasks: TaskItem[];
  sessions: LearningSession[];
  today: string;
}

const sections: Array<[SettingsSection, string]> = [
  ["themes", "Themes"],
  ["account", "Account"], ["history", "History"],
  ["focus-timer", "Focus Timer"], ["stats", "Stats"], ["clock", "Clock"], ["home", "Home"], ["about", "About"],
];

const timerDurations = [
  { key: "focusMinutes", label: "Focus", max: 120 },
  { key: "breakMinutes", label: "Break", max: 120 },
] as const;

const slots: Record<ThemeSlot, { label: string }> = {
  home: { label: "Home" },
  focus: { label: "Focus" },
};

export function SettingsPanel({
  open,
  initialSection,
  onClose,
  activeThemeSlot,
  onThemeSlotChange,
  themePreferences,
  onThemeChange,
  customThemeIds,
  onCustomThemeChange,
  themeOverlays,
  onThemeOverlayChange,
  use24Hour,
  onUse24HourChange,
  showSeconds,
  onShowSecondsChange,
  accountEmail,
  accountProvider,
  tasks,
  sessions,
  today,
}: SettingsPanelProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [section, setSection] = useState<SettingsSection>(initialSection ?? "themes");
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ThemeGroup | "All">("All");
  const [uploadError, setUploadError] = useState("");
  const [customMeta, setCustomMeta] = useLocalStorage<CustomThemeMetadata[]>(KEYS.customThemeMeta, []);
  const [storedPreferences, setStoredPreferences] = useLocalStorage(KEYS.focusPreferences, DEFAULT_FOCUS_PREFERENCES);
  const [notificationState, setNotificationState] = useState<NotificationState>(() => getNotificationState());
  const [dashboardName, setDashboardName] = useLocalStorage(KEYS.dashboardName, "");
  const [greetingStyle, setGreetingStyle] = useLocalStorage<"dynamic" | "generic" | "hidden">(KEYS.greetingStyle, "dynamic");
  const preferences = migrateFocusPreferences(storedPreferences);
  const themeSlot = activeThemeSlot;
  const selectedTheme = themePreferences[themeSlot];
  const customId = customThemeIds[themeSlot];

  useEffect(() => {
    const refreshNotificationState = () => setNotificationState(getNotificationState());
    window.addEventListener("focus", refreshNotificationState);
    document.addEventListener("visibilitychange", refreshNotificationState);
    return () => {
      window.removeEventListener("focus", refreshNotificationState);
      document.removeEventListener("visibilitychange", refreshNotificationState);
    };
  }, []);

  const filteredThemes = useMemo(() => THEME_ORDER.filter((id) => {
    const theme = COZY_THEMES[id];
    return (!query || `${theme.name} ${theme.jpName} ${theme.description}`.toLowerCase().includes(query.toLowerCase()))
      && (group === "All" || theme.group === group);
  }), [group, query]);

  const selectSection = (next: SettingsSection) => {
    setSection(next);
  };

  const handleSignOut = async () => {
    setSignOutError("");
    setSigningOut(true);
    const result = await signOut();
    if (result.error) {
      setSignOutError(result.error.message);
      setSigningOut(false);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const metadata = await saveCustomTheme(file, file.name.replace(/\.[^.]+$/, ""));
      setCustomMeta((items) => items.some((item) => item.id === metadata.id) ? items : [...items, metadata]);
      onCustomThemeChange(metadata.id);
      setUploadError("");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not save this image.");
    }
    event.target.value = "";
  };

  const renderThemes = () => (
    <div className="settings-content settings-themes">
      <div className="settings-content__heading"><div><p className="eyebrow">{slots[themeSlot].label} scene</p><h3>Make the room yours.</h3><p>Original local anime-inspired scenery, assigned independently to each dashboard mode.</p></div><button type="button" className="settings-randomize" onClick={() => { const id = filteredThemes[Math.floor(Math.random() * filteredThemes.length)] ?? THEME_ORDER[0]; onThemeChange(id); }}>Randomize</button></div>
      <div className="settings-slot-tabs" role="tablist" aria-label="Theme mode">
        {(Object.keys(slots) as ThemeSlot[]).map((slot) => <button key={slot} type="button" role="tab" aria-selected={themeSlot === slot} className={themeSlot === slot ? "settings-slot-tab settings-slot-tab--active" : "settings-slot-tab"} onClick={() => onThemeSlotChange(slot)}><span>{slots[slot].label}</span><small className="settings-slot-tab__theme">{COZY_THEMES[themePreferences[slot]].name}</small></button>)}
      </div>
      <div className="settings-theme-filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search scenes" aria-label="Search themes" />
        <select value={group} onChange={(event) => setGroup(event.target.value as ThemeGroup | "All")} aria-label="Filter theme group"><option>All</option><option>Anime Rooms</option><option>Ambient Worlds</option><option>Gradients &amp; Colors</option></select>
      </div>
      <div className="settings-theme-grid">
        {filteredThemes.map((id) => { const theme = COZY_THEMES[id]; const selected = !customId && selectedTheme === id; return <button key={id} type="button" aria-pressed={selected} className={`settings-theme-card ${selected ? "settings-theme-card--active" : ""}`} onClick={() => onThemeChange(id)}><span className="settings-theme-card__preview" style={{ backgroundImage: `url(${theme.backgroundUrl})` }} /><span className="settings-theme-card__copy"><strong>{theme.name}</strong><small>{theme.description}</small></span>{selected && <span className="settings-theme-card__mark" aria-label="Selected theme" title="Selected theme"><CheckIcon aria-hidden="true" /></span>}</button>; })}
      </div>
      <div className="settings-custom-theme">
        <div><p className="eyebrow">Custom scene</p><p>JPG, PNG, or WEBP · max 5MB · minimum 800px wide.</p></div>
        <label className="settings-upload">Upload image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} /></label>
        {customMeta.map((meta) => <div key={meta.id} className={`settings-custom-row ${customId === meta.id ? "is-active" : ""}`}><button type="button" onClick={() => onCustomThemeChange(meta.id)}>{meta.name}<small>{meta.width}×{meta.height}</small></button><button type="button" onClick={() => { void removeCustomTheme(meta.id); setCustomMeta((items) => items.filter((item) => item.id !== meta.id)); if (customId === meta.id) onCustomThemeChange(null); }} aria-label={`Remove ${meta.name}`}>Remove</button></div>)}
        {customId && <button type="button" className="settings-clear-custom" onClick={() => onCustomThemeChange(null)}>Use built-in scene</button>}
        {uploadError && <p className="audio-panel__error" role="alert">{uploadError}</p>}
      </div>
      <label className="settings-range"><span>Scene overlay <output>{themeOverlays[themeSlot]}%</output></span><input type="range" min="0" max="90" value={themeOverlays[themeSlot]} onChange={(event) => onThemeOverlayChange(Number(event.target.value))} /></label>
    </div>
  );

  const renderContent = () => {
    if (section === "themes") return renderThemes();
    if (section === "account") return (
      <div className="settings-content settings-account">
        <p className="eyebrow">Signed-in account</p>
        <h3>Your tracker, tied to you.</h3>
        <p className="settings-copy">Tasks, subtasks, sessions, breaks, and session notes belong to this account.</p>
        <div className="settings-info-grid">
          <div className="settings-info-card"><p className="eyebrow">Email</p><strong className="settings-account__email">{accountEmail || "Unavailable"}</strong><p>Your authenticated account email.</p></div>
          <div className="settings-info-card"><p className="eyebrow">Sign-in method</p><strong>{accountProvider ? accountProvider.charAt(0).toUpperCase() + accountProvider.slice(1) : "Email"}</strong></div>
        </div>
        <div className="settings-extras-actions settings-account__actions">
          <Button type="button" variant="secondary" onClick={() => selectSection("history")}>Open session History</Button>
          <Button type="button" variant="danger" className="settings-account__sign-out" onClick={() => { void handleSignOut(); }} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
        {signOutError && <p className="settings-account__error" role="alert">{signOutError}</p>}
      </div>
    );
    if (section === "history") return <div className="settings-content settings-history"><HistoryPanel tasks={tasks} /></div>;
    if (section === "focus-timer") return (
      <div className="settings-content settings-timer-recipe">
        <header className="settings-content__heading">
          <div>
            <p className="eyebrow">Timer recipe</p>
            <h3>Set the pace.</h3>
            <p>Choose the rhythm that keeps one useful thing moving.</p>
          </div>
        </header>

        <section className="settings-duration-list" aria-labelledby="timer-durations-title">
          <h4 id="timer-durations-title">Session lengths</h4>
          {timerDurations.map(({ key, label, max }) => (
            <label className="settings-recipe-row" data-duration={key} key={key}>
              <span>{label}</span>
              <span className="settings-number-field">
                <input
                  type="number"
                  min="1"
                  max={max}
                  value={preferences[key]}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setStoredPreferences({ ...preferences, [key]: value });
                  }}
                  aria-label={label + " minutes"}
                />
                <small>min</small>
              </span>
            </label>
          ))}
          <label className="settings-recipe-row">
            <span>Countdown</span>
            <span className="settings-number-field">
              <input
                type="number"
                min="1"
                max="480"
                value={preferences.countdownMinutes}
                onChange={(event) => setStoredPreferences({ ...preferences, countdownMinutes: Number(event.target.value) })}
                aria-label="Countdown minutes"
              />
              <small>min</small>
            </span>
          </label>
        </section>

        <section className="settings-behavior-list" aria-label="Timer behavior">
          <label className="settings-toggle settings-recipe-toggle">
            <span><strong>Auto-start breaks</strong><small>Move into the break immediately after focus ends.</small></span>
            <input type="checkbox" checked={preferences.autoStartBreaks} onChange={(event) => setStoredPreferences({ ...preferences, autoStartBreaks: event.target.checked })} />
          </label>
          <label className="settings-toggle settings-recipe-toggle">
            <span><strong>Browser notifications</strong><small>{notificationState === "denied" ? "Allow notifications for this site in browser settings, then return here." : notificationState === "unsupported" ? "Not supported in this browser." : "Notify when an interval completes."}</small></span>
            <input type="checkbox" checked={preferences.notificationEnabled && notificationState === "granted"} disabled={notificationState === "unsupported" || notificationState === "denied"} onChange={async (event) => { const next = event.target.checked; const permission = next ? await requestNotificationPermission() : notificationState; setNotificationState(permission); setStoredPreferences({ ...preferences, notificationEnabled: next && permission === "granted" }); }} />
          </label>
        </section>

        <section className="settings-signal" aria-labelledby="timer-signal-title">
          <h4 id="timer-signal-title">Signal</h4>
          <label>Alert sound<select value={preferences.alertSound} onChange={(event) => setStoredPreferences({ ...preferences, alertSound: event.target.value as typeof preferences.alertSound })}><option value="soft">Soft</option><option value="level-up">Level Up</option><option value="none">No alert</option></select></label>
          <label><span>Alert volume <output>{preferences.alertVolume}%</output></span><input type="range" min="0" max="100" value={preferences.alertVolume} onChange={(event) => setStoredPreferences({ ...preferences, alertVolume: Number(event.target.value) })} /></label>
          <button type="button" className="settings-quiet-action" onClick={() => { playTimerAlert(preferences.alertSound, preferences.alertVolume); }}>Preview</button>
        </section>

      </div>
    );
    if (section === "clock") return <div className="settings-content"><p className="eyebrow">Home clock</p><h3>Let the time stay quiet.</h3><div className="settings-toggle-list"><label className="settings-toggle"><span><strong>24-hour clock</strong><small>Use 18:30 instead of 6:30 PM.</small></span><input type="checkbox" checked={use24Hour} onChange={(event) => onUse24HourChange(event.target.checked)} /></label><label className="settings-toggle"><span><strong>Show seconds</strong><small>Show the precise second on Home.</small></span><input type="checkbox" checked={showSeconds} onChange={(event) => onShowSecondsChange(event.target.checked)} /></label></div></div>;
    if (section === "home") return <div className="settings-content"><p className="eyebrow">Home presentation</p><h3>Keep the greeting personal.</h3><label className="settings-field">Dashboard name<input value={dashboardName} onChange={(event) => setDashboardName(event.target.value)} placeholder="Your name" /></label><label className="settings-field">Greeting<select value={greetingStyle} onChange={(event) => setGreetingStyle(event.target.value as typeof greetingStyle)}><option value="dynamic">Dynamic</option><option value="generic">Generic</option><option value="hidden">Hidden</option></select></label></div>;
    if (section === "stats") return <div className="settings-content space-y-4"><DailyStats sessions={sessions} today={today} /><WeeklyHeatmap sessions={sessions} /></div>;
    if (section === "about") return <div className="settings-content"><p className="eyebrow">StudyRythms</p><h3>An app specifically designed to track your learning progress</h3><p className="settings-copy">Use StudyRythms to plan one useful study session at a time. Add a priority, split it into smaller sub-tasks, choose Pomodoro, Animedoro, 52/17, countdown, or stopwatch, and work with an anime scene plus optional music or ambient sound. Sign in to save your tasks, notes, and session history, then check your daily totals, streaks, and progress when you come back.</p></div>;
    return null;
  };

  return (
    <OverlayPanel open={open} onClose={onClose} title="Settings" description="Personalize each focus mode." className="settings-panel">
      <div className="settings-folio">
        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Settings sections">
            {sections.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={section === id ? "settings-nav__item settings-nav__item--active" : "settings-nav__item"}
                aria-current={section === id ? "page" : undefined}
                onClick={() => selectSection(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <select className="settings-select" value={section} onChange={(event) => selectSection(event.target.value as SettingsSection)} aria-label="Settings section">
            {sections.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <main className="settings-main" data-section={section}>{renderContent()}</main>
        </div>
      </div>
    </OverlayPanel>
  );
}
