# Attention Monitoring Design

## Summary

Add optional, privacy-preserving attention monitoring to StudyRythms. While an active focus interval is running, the browser camera and an on-device MediaPipe Face Landmarker model estimate whether the user's head is facing the laptop. Five continuous seconds of looking away or having no face visible plays one attention sound. The system rearms only after the user faces the screen again.

This feature performs face detection and head-pose estimation, not identity recognition. Camera frames, landmarks, pose readings, and attention events remain in the browser and are never recorded, uploaded, or stored.

## Goals

- Help a user notice when their attention has drifted during an active focus interval.
- Keep camera use explicit, visible, local, and easy to disable.
- Avoid false alarms from ordinary short glances away.
- Keep monitoring independent from timer and session-recording reliability.
- Release the camera immediately whenever monitoring is no longer needed.

## Non-goals

- Identifying or recognizing a person.
- Tracking eye gaze, emotion, identity, or productivity scores.
- Recording video, screenshots, landmarks, pose data, or attention history.
- Uploading any camera-derived data or adding database tables.
- Monitoring during breaks, paused timers, idle timers, or the Home screen.
- Supporting multiple simultaneous faces or adding a live camera preview.
- Providing per-user calibration in the first version.

## User Experience

### Preference

The Focus Timer settings section gains an `Attention monitoring` toggle. It is off by default. The supporting copy explains that processing stays on the device and the camera is used only while a focus interval is actively running.

Turning the toggle on saves the preference but does not keep the camera running. When the next focus interval starts, the browser requests camera permission if permission has not already been granted. Turning the preference off while monitoring is active stops monitoring and releases the camera immediately.

### Monitoring lifecycle

Monitoring is active only when all of these conditions are true:

1. Attention monitoring is enabled.
2. The workspace is in Focus mode.
3. The timer phase is `focus`.
4. The timer status is `running`.

Pausing, stopping, completing the focus interval, moving into a break, leaving Focus mode, disabling the preference, or unmounting the component stops frame analysis and every camera track.

### Status feedback

When the preference is enabled, the focus card shows a compact status badge:

- `Camera starting` while the camera or model initializes.
- `Focused` when a face is present and its head pose is within the focus thresholds.
- `Look back` when the current reading is away, including when no face is visible.
- `Camera blocked` when browser permission is denied.
- `Unavailable` when camera access or the model cannot run.

The timer continues normally for every camera and model status. Monitoring failures are non-fatal enhancements, not timer failures.

## Detection Behavior

Use the official `@mediapipe/tasks-vision` Face Landmarker package in `VIDEO` mode with one face and facial transformation matrices enabled. Store the compatible model and runtime assets with the application so inference does not depend on uploading frames or calling a remote inference service. The implementation follows Google's Web Face Landmarker guidance: <https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js>.

Convert the facial transformation matrix into yaw and pitch angles. Classify a reading as away when either condition is true:

- absolute yaw exceeds 25 degrees; or
- absolute pitch exceeds 20 degrees.

No detected face is also an away reading. Model initialization and camera startup are neutral states and cannot start the away timer.

Analyze a modest-resolution camera stream, targeting 640 by 480 pixels, at approximately four inference samples per second. Frame analysis is throttled independently of rendering. The thresholds, away duration, resolution, and sampling interval live in one attention-monitoring configuration object so later tuning does not affect the state-machine code.

## Alert Rules

The attention state machine accepts timestamped `focused`, `away`, and `inactive` observations.

- A transition to `away` starts an away episode.
- Returning to `focused` before five continuous seconds resets the episode without an alert.
- Remaining away for at least five continuous seconds emits one alert and marks the episode as alerted.
- Additional away readings in the same episode emit nothing.
- A focused reading ends the episode and rearms a future alert.
- An inactive reading clears the episode and rearms the monitor for the next eligible focus interval.

The attention alert uses Web Audio and has a recognizable pattern distinct from the timer-completion sound. Audio is primed from the focus timer's user-initiated Start or Resume action. A blocked or unavailable audio context is ignored without affecting the timer or camera cleanup.

## Architecture

### Pure domain logic

A focused module owns:

- conversion of MediaPipe transformation matrices to head-pose angles;
- focus/away classification against configured thresholds; and
- the timestamp-based attention episode state machine.

This code has no React, browser, camera, MediaPipe runtime, or audio dependencies. It is deterministic and covered by Node unit tests.

### MediaPipe adapter

A browser-only adapter owns model initialization, video-mode inference, result normalization, and model cleanup. It returns only the normalized pose observation needed by the domain layer. MediaPipe-specific result types do not leak into the state machine or UI.

### React orchestration hook

A client hook owns:

- deciding whether monitoring should be active;
- requesting and attaching the camera stream to a hidden video element;
- starting throttled inference after both video and model are ready;
- feeding normalized observations to the state machine;
- playing the attention alert when the state machine emits it;
- mapping errors to user-facing statuses; and
- cancelling scheduled work, closing the detector, clearing the hidden video, and stopping every media track during cleanup.

The hook accepts narrow detector and alert boundaries so lifecycle behavior can be tested without real camera hardware.

### Existing application integration

- Extend `FocusPreferences` with `attentionMonitoringEnabled`.
- Default and migrate the preference to `false` in the existing focus-preference migration.
- Add the toggle to the existing Focus Timer settings behavior list.
- Pass timer phase, timer status, workspace mode, and the preference into the attention hook near the focus-card integration.
- Render the hook's status in the focus card.
- Add the distinct alert generator alongside existing browser audio helpers without changing timer-completion alerts.

No API route, Supabase schema, account data, or session-history record changes.

## Error Handling and Privacy

- `NotAllowedError` and browser-denied permission map to `Camera blocked`.
- Missing `mediaDevices.getUserMedia`, missing WebAssembly support, model initialization failure, or camera-device failure map to `Unavailable`.
- An error stops pending inference and releases all acquired tracks.
- The timer and session recorder never wait for monitoring initialization and never stop because monitoring failed.
- A stale asynchronous camera or model result cannot reactivate monitoring after cleanup; each start uses cancellation guards.
- The hidden video has no recording pipeline, canvas export, network transport, persistence, or server integration.
- The browser's normal camera-use indicator remains the authoritative operating-system signal that the camera is active.

## Testing and Verification

### Automated tests

- Preference migration defaults missing or invalid attention settings to disabled and preserves an explicit enabled value.
- A focused reading produces no alert.
- Less than five seconds away produces no alert.
- Five continuous seconds away produces exactly one alert.
- Continued away readings after the alert do not repeat it.
- Refocusing rearms a later away episode.
- Missing-face readings follow the same away timing rules.
- Inactive observations clear pending away time and rearm the monitor.
- Representative forward, left, right, up, and down transformation matrices produce the expected classifications.
- Lifecycle tests with injected camera, detector, scheduler, and alert boundaries verify activation conditions, permission/model errors, cancellation, and track cleanup.
- UI contract tests verify the off-by-default settings toggle, privacy copy, and focus status badge.

### Repository checks

Run the complete project gates after implementation:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

### Browser acceptance check

On a supported browser with a camera:

1. Confirm monitoring remains off by default and no permission is requested.
2. Enable monitoring and start a focus interval.
3. Grant camera permission and confirm the status becomes `Focused` when facing the laptop.
4. Look away briefly and confirm no alert before five seconds.
5. Stay away for five seconds and confirm one attention sound.
6. Remain away and confirm the sound does not repeat.
7. Refocus, look away again, and confirm a new alert after five seconds.
8. Pause, stop, finish, switch to a break, leave Focus mode, and disable the toggle; confirm each action releases the camera.
9. Deny permission and confirm `Camera blocked` appears while the timer continues.

## Acceptance Criteria

- Monitoring is opt-in and disabled by default.
- Camera analysis runs only during an actively running focus interval in Focus mode.
- A continuous five-second away episode produces one attention sound.
- The same episode never repeats the sound; refocusing rearms it.
- Looking away briefly does not alert.
- Camera/model/audio failure never breaks the timer or session recording.
- All camera-derived processing is local and ephemeral.
- Camera tracks and inference work stop promptly for every lifecycle exit.
- Automated repository checks pass, and the live browser acceptance flow is verified where camera hardware is available.
