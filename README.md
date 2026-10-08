# Errands Reminder

A small, local-first errands checklist built with plain HTML, CSS, and JavaScript. It is installable as a Progressive Web App and keeps working after the first successful load, including offline.

## Folder structure

```text
errands-reminder/
├── index.html
├── style.css
├── app.js
├── manifest.json
├── service-worker.js
├── README.md
└── icons/
    ├── icon.svg
    ├── icon-192.png
    ├── icon-512.png
    └── icon-maskable-512.png
```

## Run locally

Service workers and install prompts require a secure context. Use `localhost` for local testing; opening `index.html` directly as a `file://` URL will not enable PWA features.

With Python installed, run this from the project folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000> in a modern browser.

## Deploy to GitHub Pages

1. Create a GitHub repository and upload the contents of this folder to the repository root (or place them in a folder if you intend to publish from that folder).
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Wait for the Pages deployment to finish and open the published HTTPS URL. The app's relative asset paths support both root domains and project pages such as `https://username.github.io/errands-reminder/`.
5. Open the URL once while online so the service worker can cache the app shell.

If you publish from a repository subfolder rather than its root, configure Pages to use that folder. Keep `index.html`, the manifest, service worker, CSS, JS, and `icons/` together.

## Install on a phone

### iPhone / iPad

1. Open the published HTTPS URL in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Launch Errands Reminder from its home-screen icon. Allow notifications if iOS offers the prompt. Notification support and delivery can vary by iOS version and installation state.

### Android

1. Open the published HTTPS URL in Chrome (or another browser with PWA install support).
2. Use the browser's **Install app** prompt, or open the menu and tap **Install app** / **Add to Home screen**.
3. Launch from the new app icon and allow notifications when prompted.

## Using the app

- Add a task with **Add task**. A title is required; notes, due date, and reminder time are optional.
- Check the box to complete a task. Use the pencil to edit and × to delete.
- Tasks due today or earlier appear under **Today's tasks**; future-dated tasks appear under **Upcoming**. Incomplete past-due tasks and tasks whose due time has passed show an **OVERDUE** badge.
- The completed list can be collapsed. The moon/sun control switches between light and dark themes.
- Tasks, theme, completed-list state, and reminder delivery markers are stored in this browser's `localStorage`. This app has no account or cloud sync. Clearing site data or using another browser/device will not carry tasks over.

## Reminder behavior and browser limits

The app asks for notification permission automatically on first visit when the browser permits it, and the status banner always provides an **Enable** action. Browsers increasingly require a user gesture for permission prompts; if no prompt appears at startup, tap **Enable**.

A scheduled task notification fires when its date and reminder time arrive while the app is open (including a foreground PWA window). If the app was closed or suspended, the app checks on the next launch/focus and can show a notification for a reminder that became due within the previous 24 hours. A static PWA cannot reliably wake itself to run a timer in the background. Reliable closed-app delivery requires a push service plus a server or managed push backend; this project intentionally has no such backend.

Notifications require HTTPS (except localhost), browser permission, and operating-system notification settings. The notification title is **Errands Reminder** and the message contains the task title plus its notes, when present.

## Privacy and support

All task data remains in the browser's local storage on the device. Offline support is provided by the service worker's app-shell cache. To reset the app, clear its site storage in browser settings.
