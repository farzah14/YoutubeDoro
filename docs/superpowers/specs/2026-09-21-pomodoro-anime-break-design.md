# Pomodoro 50-Minute Anime Break Design

**Date:** 2026-09-21  
**Status:** Ready for user review

## Goal

Make Pomodoro a fixed 50-minute focus method, then let the user paste a supported anime or video link and watch it inside StudyRythms. The break duration comes from the loaded video's real duration rather than the standard break preference.

## User experience

### Focus phase

- Selecting Pomodoro always creates a 50:00 focus interval.
- The Pomodoro duration is fixed and is not changed by the general flexible-focus preference.
- Other methods retain their current duration rules.
- The standard break preference remains available for non-video breaks.

### Transition to Anime Break

- When a Pomodoro focus interval completes, StudyRythms opens the Break tools inside the application.
- Anime Break is the selected break mode for this transition.
- The panel initially shows a link field, saved break links, and supported-provider guidance.
- Loading a link does not begin the break until the player has returned valid media metadata and playback starts.

### Playback and timing

- The embedded player is the source of truth for Anime Break elapsed time.
- When metadata is available, the video's duration becomes the planned break duration.
- Starting or resuming playback starts or resumes break tracking.
- Pausing playback pauses break tracking.
- Seeking updates the displayed break progress to the player's current position.
- When the video ends, StudyRythms records the watched break duration, completes the session, closes or completes the Anime Break surface, and returns to an idle 50:00 Pomodoro.
- If the user stops early, StudyRythms records only the watched duration and returns to an idle 50:00 Pomodoro.
- Buffering time is not counted as watched break time when the provider exposes a buffering state.

## Supported links

The first version supports provider-aware playback for:

- YouTube watch, share, Shorts, and video-ID inputs.
- Vimeo video links.
- Direct HTTPS video files ending in `.mp4` or `.webm`.

Provider parsing returns a small normalized media descriptor containing the provider, canonical source URL, provider media ID when applicable, and safe playback URL. Player components consume this descriptor instead of interpreting arbitrary URLs themselves.

StudyRythms does not promise that every web page can be embedded. Sites that require DRM, a separate login, unsupported cookies, or that deny framing cannot satisfy automatic in-app duration tracking and are rejected.

## Validation and security

- Only supported provider URLs and direct HTTPS video files are accepted.
- `javascript:`, `data:`, non-HTTPS remote URLs, arbitrary iframe markup, and unknown hosts are rejected.
- YouTube and Vimeo embed URLs are constructed by StudyRythms from validated IDs; user-provided embed HTML is never rendered.
- Direct files are passed only to a native `<video>` element.
- A rejected or unplayable link shows: `This video cannot be played inside StudyRythms. Try another supported link.`
- A metadata timeout or invalid duration leaves the break idle and does not create watched time.

## Architecture

### Pomodoro duration contract

A named Pomodoro duration constant defines 50 minutes. The focus timer engine uses that constant whenever the active method is Pomodoro. Tests assert the engine result directly, so a stored legacy preference cannot silently restore the old 25-minute Pomodoro.

The Focus Timer settings distinguish the fixed Pomodoro duration from durations used by flexible methods. The UI must not show an editable value that appears to change Pomodoro while the engine ignores it.

### Media link parser

A pure media-link module:

- validates and normalizes user input;
- identifies YouTube, Vimeo, or direct-file media;
- returns a typed descriptor;
- rejects unsupported or unsafe inputs without touching the DOM.

This module is independently testable and has no React or storage dependency.

### Player adapters

Anime Break owns one adapter per supported provider:

- the existing YouTube integration continues to use the YouTube player API;
- Vimeo uses its provider player API so duration, progress, pause, end, and errors are observable;
- direct files use native HTML video events and metadata.

Each adapter exposes the same small event contract: ready with duration, play, pause, progress, buffering, ended, stopped, and error. The parent Anime Break surface does not contain provider-specific timing logic.

### Timer and session integration

The focus timer gains an explicit externally driven break path. The Anime Break surface sends duration and playback events into that path. The timer exposes the current break duration and progress to the focus UI while the session recorder continues to store actual watched seconds.

Only one component owns finalization. Ending or stopping a video must not double-count break seconds through both the player and the timer transition.

### Saved links and migration

The existing saved YouTube breaks are preserved. Stored entries are migrated into a provider-neutral saved-media shape containing the provider and canonical source URL. New Vimeo and direct-video links use the same list and can be removed with the existing bookmark controls.

## UI changes

- Rename the current `YouTube` break tab to `Anime video`.
- Rename `YouTube Break` to `Anime Break`.
- Change the input hint to mention YouTube, Vimeo, MP4, and WebM.
- Show the detected provider next to the loaded title.
- Keep the player, timing, pause/resume, stop, bookmark, progress, and total-rest information inside StudyRythms.
- Keep `Standard` break available for users who do not want a video break.
- On small screens, the player remains within the existing responsive Break tools surface and does not launch a new browser tab.

## Error handling

- Unsupported link: show the supported-link message and do not begin a break.
- Provider metadata failure: reset the player to link-entry state and keep the break idle.
- Playback restriction or regional error: show a provider error and let the user choose another link.
- Session persistence failure: retain the existing tracker error/retry behavior; playback errors must not fabricate completed break time.
- Closing the panel while a video is playing stops playback and records the watched duration once.

## Testing

Automated coverage will include:

- Pomodoro creates a fixed 3,000-second focus interval regardless of stored legacy focus minutes.
- Other timer modes retain their existing duration behavior.
- The parser accepts supported YouTube, Vimeo, MP4, and WebM examples.
- The parser rejects unsafe schemes, unsupported hosts, malformed IDs, iframe markup, and non-video direct URLs.
- A player-ready event sets the break duration.
- Play, pause, seek/progress, stop, and end events update break timing correctly.
- Ending and stopping finalize the break exactly once.
- Old saved YouTube entries migrate without data loss.
- The Break tools copy and provider labels reflect Anime Break.
- The full unit suite, typecheck, lint for touched files, and production build pass before completion.

Manual browser verification will confirm:

1. Pomodoro shows 50:00 before starting.
2. Finishing focus opens Anime Break inside StudyRythms.
3. A supported link loads without opening another tab.
4. The displayed break duration matches the media duration.
5. Pause, resume, stop, and natural completion produce the expected timer and session state.
6. Unsupported links show the designed error and never start a break.

## Non-goals

- Circumventing DRM, authentication, paywalls, geographic restrictions, or third-party framing policies.
- Downloading or proxying copyrighted anime video through StudyRythms.
- Scraping arbitrary streaming pages to discover their hidden media streams.
- Opening unsupported links in a new browser tab as an automatic fallback.
- Changing Countdown, Stopwatch, or 52/17 timing rules.

## Acceptance criteria

The feature is complete when a user can finish a fixed 50-minute Pomodoro, paste a supported anime/video link, watch it entirely inside StudyRythms, have the break duration follow the video's metadata and playback, and return to an idle 50-minute Pomodoro without duplicate session accounting. Unsupported links must fail safely and clearly.
