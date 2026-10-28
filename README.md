# Capy: a mental wellness webapp

A simple, responsive interface prototype for the mental health community service website in the reference diagram. Built with HTML, CSS, and JavaScript, without a framework or installation step. Node.js 20+ serves the files locally.

## Run it

```sh
npm run dev
```

Open **http://localhost:3000**. Stop the server with `Ctrl+C`. If that port is busy, run `PORT=3001 npm run dev`.

```sh
npm run check
npm test
```

## Try the user flows

Start with **Log in**. Enter any nonblank account and password to open the demo. **Log out** or reload to return to login. Credentials are not stored or sent anywhere; this is a frontend preview until another developer connects authentication.

1. **Home → Check in with yourself:** choose a feeling, optionally add a note, and save. The confirmation links to saved reflections or another activity.
2. **Learn → Article:** browse or search five introductory topic groups, read an article, follow its public health source, and mark it as read.
3. **Activities → Three good things / Three gratitudes:** fill in three short reflections and save. **My saved reflections** lets you review or delete entries.
4. **Activities → Mindfulness:** select 1, 3, or 5 minutes, start, pause, or reset. When the timer completes, save the practice. Leaving the page stops the timer.
5. **Classes & events → Details → Provider website:** filter or search listings, review date/time/location, then open registration in a new tab. Initial listings are explicitly samples; add a real registration URL in Admin demo to enable registration.
6. **Activities → Q&A → Submit:** the question goes into the local review queue. Open **Admin demo → Q&A review**, write an answer, complete the review checkbox, and publish. Only published questions appear in visitor Q&A. Organizers can unpublish answers.
7. **Admin demo → Classes & events / Articles:** create, edit, publish, draft, and delete content. **Overview → Download report** exports content and question-status counts as CSV.

After login, screens share the same navigation. The interface uses gray, black, and white. Detail screens have a clear return link. Forms validate required fields, show a success state, and retain their contents if saving fails. Deleting an entry requires a confirmation.

## REST API integration markers

Search for `# API_` in `public/app.js` to find the exact integration points. These are comments for the backend developer; no HTTP request functions or backend endpoints have been implemented. Replace local demo reads/writes with requests at those locations.

| Marker | Proposed REST request | Data / purpose |
| --- | --- | --- |
| `# API_POST_LOGIN` | `POST /api/session` | JSON `{ account, password }`; open the app only after success. |
| `# API_GET_SESSION` | `GET /api/session` | Get the signed-in user and role after login. |
| `# API_DELETE_SESSION` | `DELETE /api/session` | End the session before returning to login. |
| `# API_GET_DATA` | `GET /api/articles`, `/api/listings`, `/api/reflections`, `/api/questions`, `/api/completions` | Load resource arrays after login and before rendering. |
| `# API_POST_REFLECTION` | `POST /api/reflections` | Create a check-in, gratitude, good-things, or mindfulness entry. |
| `# API_POST_QUESTION` | `POST /api/questions` | Submit `{ question }` for review. |
| `# API_POST_COMPLETION` | `POST /api/completions` | Save `{ articleId }` as read. |
| `# API_SAVE_CONTENT` | `POST /api/articles` or `/api/listings`; `PATCH /api/articles/{id}` or `/api/listings/{id}` | Create or edit organizer content. |
| `# API_PATCH_QUESTION` / `# API_PATCH_ANSWER` | `PATCH /api/questions/{id}` | Update review status or publish an answer. |
| `# API_DELETE_RESOURCE` | `DELETE /api/{resource}/{id}` | Delete a reflection, question, article, or listing; frontend `entries` maps to `reflections`. |

`# API_ROUTES` in `server.mjs` marks where backend routing goes before the static file handler. Use JSON bodies for POST/PATCH requests with `Content-Type: application/json`. A proposed response contract is `{ user: { id, account, role } }` for session requests, arrays for collection GETs, created/updated objects for POST/PATCH, and `204 No Content` for DELETE. Map reflection responses to `data.entries` and completion responses to `data.completed` (article IDs); other collections match their resource names.

The backend developer should use a server-managed session cookie (`HttpOnly`, `Secure`, appropriate `SameSite`) and enforce per-user access and organizer permissions on the server. Keep password values unchanged and out of browser storage. On failed requests, display the error and retain the form; update the UI only after success. The frontend login flag is only demo state.

## How it works

| File | Responsibility |
| --- | --- |
| `public/index.html` | Application shell, navigation container, main content, status messages, and edit dialog. |
| `public/styles.css` | Simple layout, readable forms, focus indicators, and phone/tablet layouts. No external fonts or image assets are required. |
| `public/app.js` | Pages, hash-based navigation, form handling, timer, organizer editing, and Q&A review. |
| `public/data.js` | Initial sample content, browser storage, safe text/URL handling, and CSV reports. |
| `server.mjs` | Dependency-free local static server. It exposes only the `public` directory. |
| `tests/data.test.mjs` | Checks storage loading, unsafe content handling, sample data, and report privacy. |

Navigation uses URLs such as `/#/learn` and `/#/activities/check-in`, so browser Back/Forward and direct links work. The selected page renders inside the same shell. Keyboard focus moves to the page when navigating.

The app saves a JSON object under `community-care:v1` in this browser's `localStorage`. Content changes, read progress, reflections, and questions survive refreshes on the same origin. Other browsers, devices, and ports have separate data. Nothing is sent to a server. If saving fails, the app reports the problem without clearing the form; unreadable stored data is preserved and saving is disabled.

The admin UI and exports do not include personal reflection content. This is a UI boundary only: all prototype data is in one browser profile and can be accessed by other users of that profile or browser developer tools.

To start over, clear site data for `localhost:3000` in your browser settings. **This deletes all local reflections and organizer changes.**

## Prototype scope

- There is **no backend, user authentication, or secured admin role**. Admin demo is intentionally accessible for trying the organizer flow.
- Questions are **not delivered to a real team**. Review and publication work only within this browser's data.
- Listings are sample content with no invented registration URLs. Organizers need to supply real dates, locations, time zones, and provider links.
- Before a real launch, add a secured backend, organizer authentication/authorization, a database, and appropriate privacy/consent and content-review processes. Private reflections require per-user access controls if stored on a server.

## Educational sources

The introductory articles link to [NIMH: Caring for Your Mental Health](https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health), [NIMH: Children and Mental Health](https://www.nimh.nih.gov/health/publications/children-and-mental-health), and the [NIH Emotional Wellness Toolkit](https://www.nih.gov/health-information/your-healthiest-self-wellness-toolkits/emotional-wellness-toolkit). Content is general education, not diagnosis or personal medical advice.
