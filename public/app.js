import { STORAGE_KEY, seedData, escapeHTML as e, safeURL, loadData, reportCSV } from './data.js';

const $ = selector => document.querySelector(selector);
let data;
let storageError = '';
// # API_GET_DATA: Replace the local load below with authenticated resource requests.
// GET /api/articles, /api/listings, /api/reflections, /api/questions, /api/completions.
// Load after login succeeds; merge responses into data, then render. See README.
try { data = loadData(localStorage); }
catch { data = seedData(); storageError = 'Saved browser data could not be loaded. You can explore, but saving is disabled so existing data is preserved. Check browser storage settings or use a new browser profile.'; }
const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  learn: '<path d="M12 5c-3-2-7-2-10 0v15c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-2-7-2-10 0Zm0 0v15"/>',
  activity: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18m-12 5h6"/>',
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  admin: '<path d="m12 3 8 4v6c0 5-8 9-8 9s-8-4-8-9V7Z"/><path d="m8 12 3 3 5-6"/>',
};
const icon = key => `<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[key] || icons.activity}</svg></span>`;
const link = (href, text, secondary = false) => `<a class="button${secondary ? ' secondary' : ''}" href="#${href}">${text}</a>`;
const textLink = (href, text) => `<a class="text-link" href="#${href}">${text} <span aria-hidden="true">→</span></a>`;
const back = (href, text) => `<div class="back">${textLink(href, `← ${text}`)}</div>`;
const pill = text => `<span class="pill">${e(text)}</span>`;
const empty = (title, description, href = '', action = '') => `<div class="empty"><h3>${e(title)}</h3><p>${e(description)}</p>${href ? link(href, action) : ''}</div>`;
const note = (text, warning = false) => `<div class="note${warning ? ' warning' : ''}">${icon('about')}<p>${text}</p></div>`;
const dateLabel = date => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(date + 'T12:00:00'));
const entryDate = date => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
const dateBox = date => { const d = new Date(date + 'T12:00:00'); return `<div class="date-box"><small>${d.toLocaleDateString(undefined, { month: 'short' })}</small><strong>${d.getDate()}</strong></div>`; };
const publishedArticles = () => data.articles.filter(x => x.published);
const publishedListings = () => data.listings.filter(x => x.published).sort((a, b) => a.date.localeCompare(b.date));
const id = () => crypto.randomUUID();
const navItems = [['/', 'Home', 'home'], ['/learn', 'Learn', 'learn'], ['/activities', 'Activities', 'activity'], ['/classes', 'Classes & events', 'calendar'], ['/about', 'About the program', 'about'], ['/admin', 'Admin demo', 'admin']];
const activities = [
  { id: 'check-in', title: 'Emotion check-in', description: 'Make a little space for how you feel today.', duration: '1 minute', action: 'Check in', icon: 'activity' },
  { id: 'good-things', title: 'Three good things', description: 'Notice small moments that went well.', duration: '3 minutes', action: 'Start reflecting', icon: 'home' },
  { id: 'gratitude', title: 'Three gratitudes', description: 'Write about people or things you appreciate.', duration: '3 minutes', action: 'Practice gratitude', icon: 'activity' },
  { id: 'mindfulness', title: 'Mindfulness practice', description: 'Pause and notice the present moment.', duration: '1–5 minutes', action: 'Take a pause', icon: 'learn' },
  { id: 'qa', title: 'Mental health Q&A', description: 'Explore answers or leave a general question.', duration: 'At your pace', action: 'Explore Q&A', icon: 'about' },
];
let route = [];
// Demo state only. Reloading returns to login; no credentials are stored.
let loggedIn = false;
let catalogFilter = 'All';
let catalogSearch = '';
let learnSearch = '';
let toastTimeout;
let timer = { duration: 60, remaining: 60, end: null, interval: null, done: false };

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 5000);
}
function commit(change, message) {
  if (storageError) { toast(storageError); return false; }
  const next = structuredClone(data);
  change(next);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
  catch { toast('Your changes could not be saved. Browser storage may be full or disabled. Your form is still available to copy.'); return false; }
  data = next;
  if (message) toast(message);
  return true;
}
function heading(title, description, action = '') {
  return `<div class="page-heading"><div><h1>${e(title)}</h1><p>${e(description)}</p></div>${action}</div>`;
}
function login() {
  return `<section class="login-card"><p class="login-brand">Community Care</p><h1>Log in</h1><p class="muted">Welcome back.</p>
    <form data-form="login" class="login-form" aria-describedby="login-help">
      <div class="form-group"><label for="account">Account</label><input id="account" name="account" type="text" autocomplete="username" required maxlength="200" autofocus></div>
      <div class="form-group"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
      <button class="button" type="submit">Log in</button>
      <p class="help" id="login-help" role="status">Demo: use any account and password.</p>
    </form></section>`;
}
function articleCard(article) {
  return `<article class="card"><div class="meta">${pill(article.category)}${data.completed.includes(article.id) ? '<span>✓ Read</span>' : '<span>Short read</span>'}</div><h3>${e(article.title)}</h3><p>${e(article.summary)}</p>${textLink('/learn/' + article.id, 'Read article')}</article>`;
}
function listingRow(item) {
  return `<article class="row-card">${dateBox(item.date)}<div><div class="meta">${pill(item.type)}<span>${e(item.location)}</span></div><h3>${e(item.title)}</h3><p>${e(dateLabel(item.date))} · ${e(item.time)} · ${e(item.provider)}</p></div>${textLink('/classes/' + item.id, 'View details')}</article>`;
}
function activityCard(activity) {
  return `<article class="card"><div class="card-icon">${icon(activity.icon)}</div><div class="meta">${e(activity.duration)}</div><h3>${e(activity.title)}</h3><p>${e(activity.description)}</p>${textLink('/activities/' + activity.id, activity.action)}</article>`;
}
function home() {
  const listings = publishedListings().filter(x => x.date >= new Date().toLocaleDateString('en-CA')).slice(0, 2);
  return `${heading('A small step for your wellbeing', 'Learn something new, check in with yourself, or connect with your community.')}
    <section class="hero"><div><div class="eyebrow">A MOMENT FOR YOU</div><h2>How are you feeling today?</h2><p>You don’t need to have it all figured out. Start with a quick check-in, at your own pace.</p>${link('/activities/check-in', 'Check in with yourself <span aria-hidden="true">→</span>')}</div></section>
    <section class="section"><div class="section-heading"><div><h2>Where would you like to begin?</h2><p class="section-caption">There’s more than one way to take care of yourself.</p></div></div><div class="grid">
      <article class="card"><div class="card-icon">${icon('learn')}</div><h3>Understand mental health</h3><p>Short, approachable articles to help you build your understanding.</p>${textLink('/learn', 'Explore learning')}</article>
      <article class="card"><div class="card-icon">${icon('activity')}</div><h3>Take time for yourself</h3><p>A check-in, a little gratitude, or a mindful moment. Choose what feels right.</p>${textLink('/activities', 'Try an activity')}</article>
      <article class="card"><div class="card-icon">${icon('calendar')}</div><h3>Connect with community</h3><p>Find classes, public lectures, and charity events in one place.</p>${textLink('/classes', 'Browse classes & events')}</article>
    </div></section>
    <section class="section"><div class="section-heading"><div><h2>Coming up in the community</h2><p class="section-caption">Sample listings · Organizers can add real details in Admin demo.</p></div>${textLink('/classes', 'View all')}</div>${listings.length ? listings.map(listingRow).join('') : empty('No upcoming listings', 'Check back when the organizer adds new activities.')}</section>
    ${note('Start wherever you feel comfortable. Your reflections are stored only in this browser. If you share this device or browser profile, others using it may be able to read them.')}`;
}
function learn() {
  return `${heading('A little understanding goes a long way', 'Explore the basics, one short article at a time.')}<div class="filters"><span class="muted small">${publishedArticles().length} articles</span><input class="search" id="learn-search" type="search" aria-label="Search articles" placeholder="Search learning topics…" value="${e(learnSearch)}"></div><div class="grid two" id="article-results">${articleResults()}</div>${note('These introductory articles are educational and cannot diagnose a condition. Each article links to a public health source for further reading.')}`;
}
function articleResults() {
  const items = publishedArticles().filter(x => `${x.title} ${x.category} ${x.summary}`.toLowerCase().includes(learnSearch.toLowerCase()));
  return items.length ? items.map(articleCard).join('') : empty('No matching articles', 'Try a different word or clear your search.');
}
function articleDetail(article) {
  const source = safeURL(article.source);
  return `${back('/learn', 'All learning topics')}<article class="panel"><div class="meta">${pill(article.category)}<span>Short read</span></div><h1>${e(article.title)}</h1><div class="article-body">${e(article.body)}</div>${source ? `<p class="small">Further reading: <a href="${e(source)}" target="_blank" rel="noopener noreferrer">Original health resource ↗ <span class="small">(opens in a new tab)</span></a></p>` : ''}<div class="actions"><button class="button" data-action="read-article" data-id="${e(article.id)}" ${data.completed.includes(article.id) ? 'disabled' : ''}>${data.completed.includes(article.id) ? '✓ Marked as read' : 'Mark as read'}</button>${link('/activities', 'Try an activity', true)}</div></article>`;
}
function activityHome() {
  return `${heading('Make a little time for yourself', 'Choose something that fits your day.', link('/activities/history', 'My saved reflections', true))}<div class="grid">${activities.map(activityCard).join('')}</div>${note('Reflections stay in this browser and are not sent to the organizer. You can review or delete them in My saved reflections. Activities are optional; stop whenever you want.')}`;
}
function reflectionForm(type) {
  const activity = activities.find(x => x.id === type);
  const fields = type === 'check-in' ? `<fieldset><legend>How are you feeling right now?</legend><div class="moods">${[['Low', '☁'], ['Unsettled', '〰'], ['Okay', '○'], ['Good', '☀'], ['Great', '✧']].map(([name, symbol]) => `<label class="mood"><input type="radio" name="mood" value="${name}" required><span><b aria-hidden="true">${symbol}</b>${name}</span></label>`).join('')}</div></fieldset><div class="form-group"><label for="reflection-note">Anything you’d like to add? <span class="muted">(optional)</span></label><textarea id="reflection-note" name="note" maxlength="3000" placeholder="What has been on your mind?"></textarea></div>` : [1, 2, 3].map(i => `<div class="form-group"><label for="reflection-${i}">${type === 'gratitude' ? `Something I appreciate #${i}` : `A good thing from today #${i}`}</label><textarea id="reflection-${i}" name="item${i}" maxlength="1500" placeholder="${type === 'gratitude' ? 'It can be a person, a place, or a small everyday comfort.' : 'Something small counts, too.'}" required rows="2"></textarea></div>`).join('');
  return `${back('/activities', 'All activities')}${heading(activity.title, activity.description)}<form class="panel" data-form="reflection" data-type="${type}">${fields}<p class="help">Saved only in this browser. Avoid including information you would not want someone using this device to see.</p><div class="actions"><button class="button" type="submit">Save reflection</button>${textLink('/activities', 'Back to activities')}</div></form>`;
}
function history() {
  return `${back('/activities', 'All activities')}${heading('Your saved reflections', 'Only available in this browser. You can delete an entry at any time.')}${data.entries.length ? `<div class="stack">${[...data.entries].reverse().map(entry => `<article class="panel"><div class="meta">${pill(activities.find(x => x.id === entry.type)?.title || 'Reflection')}<time>${e(entryDate(entry.created))}</time></div><h3>${e(entry.mood || (entry.type === 'mindfulness' ? `${entry.minutes}-minute mindful pause` : 'A moment from your day'))}</h3>${entry.note ? `<p class="question">${e(entry.note)}</p>` : ''}${entry.items ? `<ol>${entry.items.map(item => `<li class="question">${e(item)}</li>`).join('')}</ol>` : ''}<div class="actions"><button class="button danger small" data-action="delete-entry" data-id="${e(entry.id)}">Delete reflection</button></div></article>`).join('')}</div>` : empty('Your space for small moments', 'When you save a reflection or finish a mindful pause, it will appear here.', '/activities/check-in', 'Start with a check-in')}`;
}
function saveEntry(entry) {
  // # API_POST_REFLECTION: POST /api/reflections with entry as JSON.
  // Replace the local commit; show success only after the server accepts the entry.
  if (!commit(next => next.entries.push({ ...entry, id: id(), created: new Date().toISOString() }))) return false;
  $('#main').innerHTML = `${back('/activities', 'All activities')}<section class="panel success"><div class="eyebrow">A MOMENT WELL SPENT</div><h1>Your moment is saved.</h1><p>Thank you for making a little time for yourself. You can come back to this reflection whenever you like.</p><div class="actions">${link('/activities/history', 'View my reflections')}${link('/activities', 'Choose another activity', true)}</div><p class="help">Saved in this browser only.</p></section>`;
  $('#main').focus();
  toast('Saved to your reflections.');
  return true;
}
function timerPage() {
  return `${back('/activities', 'All activities')}${heading('A mindful pause', 'There is nothing to achieve. Just make a little space.')}<section class="panel"><p>Feel the support of the chair or floor beneath you. Notice a sound around you, or let your attention rest on your natural breathing. If your mind wanders, gently return to what you notice.</p><div class="timer"><label for="timer-duration">How much time would you like?</label><select id="timer-duration" style="max-width:180px;display:block;margin:10px auto" ${timer.end ? 'disabled' : ''}>${[1, 3, 5].map(n => `<option value="${n * 60}" ${timer.duration === n * 60 ? 'selected' : ''}>${n} minute${n > 1 ? 's' : ''}</option>`).join('')}</select><div class="timer-circle"><span id="timer-display" class="timer-display" role="timer" aria-label="Time remaining">${timerText()}</span><span class="small muted" id="timer-label">${timer.done ? 'Your pause is complete' : timer.end ? 'Take this time for yourself' : 'At your own pace'}</span></div><div class="actions"><button class="button" id="timer-toggle" data-action="timer-toggle" ${timer.done ? 'disabled' : ''}>${timer.end ? 'Pause' : timer.remaining < timer.duration ? 'Continue' : 'Start pause'}</button><button class="button secondary" data-action="timer-reset">Reset</button><button class="button" id="save-timer" data-action="save-timer" ${timer.done ? '' : 'hidden'}>Save completed practice</button></div></div><p class="help">Keep your eyes open if you like. Pause or leave at any time. Leaving this page stops the timer.</p><p id="timer-status" role="status" class="small muted"></p></section>`;
}
function timerText() { return `${Math.floor(timer.remaining / 60)}:${String(timer.remaining % 60).padStart(2, '0')}`; }
function stopTimer() { clearInterval(timer.interval); timer.interval = null; timer.end = null; }
function tick() {
  timer.remaining = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
  if ($('#timer-display')) $('#timer-display').textContent = timerText();
  if (timer.remaining === 0) {
    stopTimer(); timer.done = true;
    $('#timer-label').textContent = 'Your pause is complete';
    $('#timer-status').textContent = 'Your mindful pause is complete. You can save this practice or start again.';
    $('#timer-toggle').disabled = true; $('#save-timer').hidden = false;
    $('#timer-duration').disabled = false;
  }
}
function qa() {
  const answered = data.questions.filter(x => x.status === 'published');
  return `${back('/activities', 'All activities')}${heading('Questions are a good place to start', 'Read general answers or leave a question for the program organizer.')}<div class="grid two"><section class="panel"><h2>Community Q&A</h2><p>This prototype does not send questions to a real team. Use Admin demo in this browser to try the review workflow.</p><details><summary>Where can I start learning?</summary><p>Our learning section is a starting point. Articles include links to public health resources for further reading.</p>${textLink('/learn', 'Explore the learning section')}</details>${answered.map(q => `<details><summary class="question">${e(q.question)}</summary><p class="question">${e(q.answer)}</p><p class="help">Answered by the program organizer in this demo.</p></details>`).join('')}</section><form class="panel" data-form="question"><h2>Leave a general question</h2><p>Questions are reviewed before they appear here. Please leave out names and private health information.</p><div class="form-group"><label for="question">Your question</label><textarea id="question" name="question" maxlength="2000" required placeholder="What would you like to understand better?"></textarea></div><label class="small"><input type="checkbox" name="consent" required> I understand my question and its answer can be published after review.</label><div class="actions"><button class="button" type="submit">Submit for review</button></div></form></div>${note('Q&A is for general education. It is not monitored for urgent requests or personal medical advice. In immediate danger, contact local emergency services.', true)}`;
}
function classes() {
  return `${heading('Find your next community connection', 'Browse classes, public lectures, and charity events.')}<div class="filters" aria-label="Filter listings">${['All', 'Class', 'Public lecture', 'Charity event'].map(type => `<button class="filter ${catalogFilter === type ? 'active' : ''}" data-action="filter-listings" data-filter="${type}" aria-pressed="${catalogFilter === type}">${type === 'All' ? 'All activities' : type === 'Class' ? 'Classes' : type + 's'}</button>`).join('')}<input class="search" id="listing-search" type="search" aria-label="Search classes and events" placeholder="Search classes & events…" value="${e(catalogSearch)}"></div><div id="listing-results">${listingResults()}</div>${note('The initial listings are examples. Registration becomes available when an organizer adds a real provider link. Registration takes place on the provider’s website.')}`;
}
function listingResults() {
  const items = publishedListings().filter(x => (catalogFilter === 'All' || x.type === catalogFilter) && `${x.title} ${x.description} ${x.provider} ${x.location}`.toLowerCase().includes(catalogSearch.toLowerCase()));
  return items.length ? items.map(listingRow).join('') : empty('No matching activities', 'Try another category or clear your search.');
}
function listingDetail(item) {
  const url = safeURL(item.url);
  return `${back('/classes', 'All classes & events')}<article class="panel"><div class="meta">${pill(item.type)}</div><h1>${e(item.title)}</h1><p class="question">${e(item.description)}</p><dl><dt>Date & time</dt><dd>${e(dateLabel(item.date))}, ${e(item.time)}</dd><dt>Location / time zone</dt><dd>${e(item.location)}</dd><dt>Provider</dt><dd>${e(item.provider)}</dd></dl>${url ? `${note('Next step: open the provider’s website to check availability, cost, eligibility, and registration details. This site does not collect registrations.')}<div class="actions"><a href="${e(url)}" target="_blank" rel="noopener noreferrer" class="button">Register on provider website ↗</a></div><p class="help">Opens in a new tab. You’ll keep your place here.</p>` : `${note('This is a sample listing. No registration link has been added yet. An organizer can add one in Admin demo.', true)}<div class="actions">${link('/classes', 'Browse other activities', true)}</div>`}</article>`;
}
function about() {
  return `${heading('A community that starts with care', 'A simple place to learn, reflect, and find opportunities to connect.')}<section class="panel wide"><div class="eyebrow">ABOUT THE PROGRAM</div><h2>Small steps. Shared understanding.</h2><p>Community Care is a prototype for a mental health community service website. It brings learning content, personal reflection activities, and community class information together in one place.</p><p>After the demo login, browse an article, choose an activity, or find a class.</p><div class="grid section"><div><h3>Learn</h3><p>Understand mental health through short introductory articles and public health resources.</p></div><div><h3>Reflect</h3><p>Try an emotion check-in, gratitude, good things, or a mindful pause.</p></div><div><h3>Connect</h3><p>Explore program listings and continue to the provider for registration.</p></div></div><div class="actions">${link('/learn', 'Explore learning')}${link('/classes', 'Find a class', true)}</div></section>${note('Prototype details: all changes are saved in this browser, including sample organizer changes. The demo login does not authenticate users or secure the admin workspace. Personal reflections are excluded from admin screens and reports.')}<section class="section panel wide"><h2>When you need personal support</h2><p>These activities and articles offer general education. For personal concerns, talk with a qualified health professional. In immediate danger, contact local emergency services.</p><a href="https://www.nimh.nih.gov/health/find-help" target="_blank" rel="noopener noreferrer">Explore NIMH guidance on finding help ↗</a></section>`;
}
function adminTabs(tab) {
  return `<nav class="tabs" aria-label="Admin sections">${[['overview', 'Overview'], ['listings', 'Classes & events'], ['articles', 'Articles'], ['questions', 'Q&A review']].map(([key, label]) => `<a href="#/admin/${key}" class="tab ${tab === key ? 'active' : ''}" ${tab === key ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}
function admin(tab = 'overview') {
  const pending = data.questions.filter(x => x.status === 'pending').length;
  let content = '';
  if (tab === 'overview') {
    content = `<div class="grid"><div class="card stat"><strong>${publishedArticles().length}</strong><span>Published articles</span></div><div class="card stat"><strong>${publishedListings().length}</strong><span>Published classes & events</span></div><div class="card stat"><strong>${pending}</strong><span>Questions awaiting review</span></div></div><section class="panel wide section"><h2>Keep your community information up to date</h2><p>Manage listings and provider links, edit articles, and review general questions before publishing answers.</p><div class="actions">${link('/admin/listings', 'Manage listings')}${link('/admin/articles', 'Manage articles', true)}${link('/admin/questions', 'Review questions', true)}</div></section><section class="panel wide section"><h2>Program report</h2><p>Download counts of published content and question review status as CSV. Personal reflections and question text are excluded.</p><button class="button secondary" data-action="export">Download report (.csv)</button></section>`;
  } else if (tab === 'listings' || tab === 'articles') {
    const isArticle = tab === 'articles';
    const items = data[tab];
    content = `<div class="section-heading"><h2>${isArticle ? 'Learning articles' : 'Classes, events & registration links'}</h2><button class="button" data-action="edit" data-kind="${tab}">+ Add ${isArticle ? 'article' : 'listing'}</button></div>${items.length ? `<div class="table-wrap"><table><thead><tr><th>Title</th><th>${isArticle ? 'Topic' : 'Type / date'}</th><th>Status</th><th>Actions</th></tr></thead><tbody>${items.map(item => `<tr><td><strong>${e(item.title)}</strong>${!isArticle && !item.url ? '<div class="help">No registration link</div>' : ''}</td><td>${e(isArticle ? item.category : item.type)}${isArticle ? '' : `<br>${e(dateLabel(item.date))}`}</td><td>${pill(item.published ? 'Published' : 'Draft')}</td><td><div class="table-actions"><button class="button secondary small" data-action="edit" data-kind="${tab}" data-id="${e(item.id)}">Edit<span class="sr-only"> ${e(item.title)}</span></button><button class="button danger small" data-action="delete-content" data-kind="${tab}" data-id="${e(item.id)}">Delete<span class="sr-only"> ${e(item.title)}</span></button></div></td></tr>`).join('')}</tbody></table></div>` : empty('No content yet', 'Add your first item using the button above.')}`;
  } else if (tab === 'questions') {
    content = `<div class="section-heading"><h2>Review community questions</h2><span class="muted small">${pending} pending</span></div>${data.questions.length ? `<div class="stack">${[...data.questions].reverse().map(q => `<article class="panel wide"><div class="meta">${pill(q.status === 'published' ? 'Published' : 'Awaiting review')}<span>${e(entryDate(q.created))}</span></div><h3 class="question">${e(q.question)}</h3>${q.status === 'published' ? `<p class="question">${e(q.answer)}</p>` : ''}<div class="actions"><button class="button secondary small" data-action="answer" data-id="${e(q.id)}">${q.status === 'published' ? 'Edit answer' : 'Review & answer'}</button>${q.status === 'published' ? `<button class="button secondary small" data-action="unpublish-question" data-id="${e(q.id)}">Unpublish</button>` : ''}<button class="button danger small" data-action="delete-question" data-id="${e(q.id)}">Delete question</button></div></article>`).join('')}</div>` : empty('The review queue is clear', 'Questions submitted in this browser will appear here.', '/activities/qa', 'Try the Q&A flow')}`;
  } else return notFound();
  return `${heading('Organizer workspace', 'Manage the information visitors see.', link('/', 'View visitor home', true))}${note('Demo admin · The login is a preview. Changes affect this browser only. A real service needs a secured backend and organizer accounts.', true)}<div class="section">${adminTabs(tab)}${content}</div>`;
}
function field(name, label, value = '', type = 'text', required = true, extra = '') {
  return `<div class="form-group"><label for="edit-${name}">${label}</label>${type === 'textarea' ? `<textarea id="edit-${name}" name="${name}" ${required ? 'required' : ''} maxlength="12000" ${extra}>${e(value)}</textarea>` : `<input id="edit-${name}" name="${name}" type="${type}" value="${e(value)}" ${required ? 'required' : ''} maxlength="2000" ${extra}>`}</div>`;
}
function openEditor(kind, itemId) {
  const item = data[kind]?.find(x => x.id === itemId) || {};
  const isArticle = kind === 'articles';
  const fields = isArticle ? `${field('title', 'Article title', item.title)}${field('category', 'Topic', item.category)}${field('summary', 'Short description', item.summary)}${field('body', 'Article text', item.body, 'textarea')}${field('source', 'Source URL (optional)', item.source, 'url', false)}<p class="help">Use a public health source and review educational content before publishing.</p>` : `${field('title', 'Listing title', item.title)}<div class="form-group"><label for="edit-type">Type</label><select name="type" id="edit-type">${['Class', 'Public lecture', 'Charity event'].map(type => `<option ${item.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select></div>${field('description', 'Description', item.description, 'textarea')}<div class="form-grid">${field('date', 'Date', item.date, 'date')}${field('time', 'Time', item.time, 'time')}</div>${field('location', 'Location & time zone', item.location, 'text', true, 'placeholder="Online · Pacific time"')}${field('provider', 'Provider / organizer', item.provider)}${field('url', 'Provider registration URL (optional)', item.url, 'url', false)}<p class="help">Use a complete http:// or https:// link. Leave blank if registration is not available.</p>`;
  $('#editor').innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${itemId ? 'Edit' : 'Add'} ${isArticle ? 'article' : 'listing'}</h2><button class="close" aria-label="Close editor" data-action="close-dialog">×</button></div><form data-form="content" data-kind="${kind}" data-id="${e(itemId || '')}">${fields}<label class="small"><input type="checkbox" name="published" ${item.published !== false ? 'checked' : ''}> Published and visible to visitors</label><div class="actions"><button class="button" type="submit">Save ${isArticle ? 'article' : 'listing'}</button><button class="button secondary" type="button" data-action="close-dialog">Cancel</button></div></form>`;
  $('#editor').showModal();
}
function openAnswer(itemId) {
  const q = data.questions.find(x => x.id === itemId);
  if (!q) return;
  $('#editor').innerHTML = `<div class="dialog-head"><h2 id="dialog-title">Review & answer</h2><button class="close" aria-label="Close editor" data-action="close-dialog">×</button></div><p class="question">${e(q.question)}</p><form data-form="answer" data-id="${e(itemId)}" class="section">${field('answer', 'General educational answer', q.answer, 'textarea')}<label class="small"><input type="checkbox" name="reviewed" required> I reviewed the question and answer for private information and suitability for public display.</label><div class="actions"><button class="button" type="submit">Publish answer</button><button class="button secondary" type="button" data-action="close-dialog">Cancel</button></div></form>`;
  $('#editor').showModal();
}
function confirmDelete(kind, itemId) {
  const item = data[kind].find(x => x.id === itemId);
  if (!item) return;
  const title = item.title || (kind === 'entries' ? 'this reflection' : 'this question');
  $('#editor').innerHTML = `<div class="dialog-head"><h2 id="dialog-title">Delete ${kind === 'entries' ? 'reflection' : kind === 'questions' ? 'question' : 'content'}?</h2><button class="close" aria-label="Close dialog" data-action="close-dialog">×</button></div><p class="question">${e(title)}</p><p class="muted small">This removes the item from this browser. This cannot be undone.</p><div class="actions"><button class="button danger" data-action="confirm-delete" data-kind="${kind}" data-id="${e(itemId)}">Delete</button><button class="button secondary" data-action="close-dialog" autofocus>Keep it</button></div>`;
  $('#editor').showModal();
}
function notFound() { return `${heading('This page is not available', 'It may have been removed or unpublished.')}${link('/', 'Return home')}`; }
function render(focus = false) {
  if (timer.interval) stopTimer();
  if ($('#editor').open) $('#editor').close();
  document.body.classList.toggle('login-view', !loggedIn);
  if (!loggedIn) {
    $('#main').innerHTML = login();
    $('#navigation').innerHTML = '';
    document.title = 'Log in · Community Care';
    if (focus) $('#account').focus();
    return;
  }
  try { route = decodeURIComponent(location.hash.slice(1) || '/').split('/').filter(Boolean); } catch { route = ['missing']; }
  const [section, detail] = route;
  let content;
  if (!section) content = home();
  else if (section === 'about' && !detail) content = about();
  else if (section === 'learn') { const article = publishedArticles().find(x => x.id === detail); content = detail ? article ? articleDetail(article) : notFound() : learn(); }
  else if (section === 'classes') { const listing = publishedListings().find(x => x.id === detail); content = detail ? listing ? listingDetail(listing) : notFound() : classes(); }
  else if (section === 'activities') {
    content = !detail ? activityHome() : ['check-in', 'good-things', 'gratitude'].includes(detail) ? reflectionForm(detail) : detail === 'history' ? history() : detail === 'mindfulness' ? timerPage() : detail === 'qa' ? qa() : notFound();
  } else if (section === 'admin') content = admin(detail);
  else content = notFound();
  $('#main').innerHTML = (storageError ? note(e(storageError), true) : '') + content;
  const active = '/' + (section || '');
  $('#navigation').innerHTML = navItems.map(([href, label, key]) => `<a class="nav-link ${href === active ? 'active' : ''}" href="#${href}" ${href === active ? 'aria-current="page"' : ''}>${icon(key)}${label}</a>`).join('');
  const title = navItems.find(x => x[0] === active)?.[1] || 'Page not found';
  $('#breadcrumb').textContent = section ? `Your community space / ${title}` : 'Your community space';
  document.title = `${$('#main h1')?.textContent || title} · Community Care`;
  if (focus) { $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); }
}

document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('#main').focus(); $('#main').scrollIntoView(); return; }
  const anchor = event.target.closest('a[href^="#/"]');
  if (anchor && anchor.hash === location.hash) { event.preventDefault(); render(true); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id: itemId, kind } = button.dataset;
  if (action === 'logout') {
    // # API_DELETE_SESSION: DELETE /api/session; clear demo state after success.
    loggedIn = false;
    clearTimeout(toastTimeout);
    $('#toast').classList.remove('visible');
    render(true);
    return;
  }
  if (!loggedIn) return;
  if (action === 'close-dialog') $('#editor').close();
  if (action === 'edit') openEditor(kind, itemId);
  if (action === 'answer') openAnswer(itemId);
  if (action === 'delete-content') confirmDelete(kind, itemId);
  if (action === 'delete-question') confirmDelete('questions', itemId);
  if (action === 'delete-entry') confirmDelete('entries', itemId);
  // # API_DELETE_RESOURCE: DELETE /api/{kind}/{id}; entries maps to reflections.
  if (action === 'confirm-delete' && commit(next => { next[kind] = next[kind].filter(x => x.id !== itemId); }, 'Item deleted.')) render(true);
  // # API_PATCH_QUESTION: PATCH /api/questions/{id} with { status: 'pending' }.
  if (action === 'unpublish-question' && commit(next => { next.questions.find(x => x.id === itemId).status = 'pending'; }, 'Answer unpublished.')) render();
  // # API_POST_COMPLETION: POST /api/completions with { articleId: itemId }.
  if (action === 'read-article' && commit(next => { if (!next.completed.includes(itemId)) next.completed.push(itemId); }, 'Article marked as read.')) render();
  if (action === 'filter-listings') { catalogFilter = button.dataset.filter; render(); }
  if (action === 'timer-toggle') {
    if (timer.done) return;
    if (timer.end) { tick(); stopTimer(); $('#timer-toggle').textContent = 'Continue'; $('#timer-label').textContent = 'Paused'; $('#timer-duration').disabled = false; }
    else { timer.end = Date.now() + timer.remaining * 1000; timer.interval = setInterval(tick, 250); $('#timer-toggle').textContent = 'Pause'; $('#timer-label').textContent = 'Take this time for yourself'; $('#timer-duration').disabled = true; }
  }
  if (action === 'timer-reset') { stopTimer(); timer.remaining = timer.duration; timer.done = false; render(); }
  if (action === 'save-timer' && timer.done) { if (saveEntry({ type: 'mindfulness', minutes: timer.duration / 60 })) { timer.done = false; timer.remaining = timer.duration; } }
  if (action === 'export') {
    const blob = new Blob(['\uFEFF' + reportCSV(data)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'community-care-report.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Program report downloaded.');
  }
});
document.addEventListener('input', event => {
  if (event.target.id === 'listing-search') { catalogSearch = event.target.value; $('#listing-results').innerHTML = listingResults(); }
  if (event.target.id === 'learn-search') { learnSearch = event.target.value; $('#article-results').innerHTML = articleResults(); }
  event.target.setCustomValidity?.('');
});
document.addEventListener('change', event => {
  if (event.target.id === 'timer-duration') { stopTimer(); timer.duration = Number(event.target.value); timer.remaining = timer.duration; timer.done = false; render(); }
});
document.addEventListener('submit', event => {
  const form = event.target;
  if (!form.dataset.form) return;
  event.preventDefault();
  for (const input of form.querySelectorAll('input[required]:not([type=checkbox]):not([type=radio]),textarea[required]')) {
    if (!input.value.trim()) { input.setCustomValidity('Please enter more than spaces.'); input.reportValidity(); return; }
  }
  const mode = form.dataset.form;
  if (mode === 'login') {
    // # API_POST_LOGIN: POST /api/session with JSON { account, password }.
    // Read form.elements.account.value.trim() and form.elements.password.value.
    // Preserve password exactly; never save credentials in browser storage.
    // Backend developer: replace this demo block, await a successful response,
    // display errors in #login-help, and leave the form open on failure.
    // # API_GET_SESSION: GET /api/session to obtain the authenticated user/role.
    // Then load resources at # API_GET_DATA before rendering the app.
    loggedIn = true;
    form.reset();
    render(true);
    return;
  }
  if (!loggedIn) return;
  const fields = Object.fromEntries([...new FormData(form)].map(([key, value]) => [key, String(value).trim()]));
  if (mode === 'reflection') {
    if (form.dataset.type === 'check-in') saveEntry({ type: 'check-in', mood: fields.mood, note: fields.note });
    else saveEntry({ type: form.dataset.type, items: [fields.item1, fields.item2, fields.item3] });
  }
  // # API_POST_QUESTION: POST /api/questions with { question: fields.question }.
  // Server assigns the ID, pending status, and creation time.
  if (mode === 'question' && commit(next => next.questions.push({ id: id(), question: fields.question, answer: '', status: 'pending', created: new Date().toISOString() }))) {
    $('#main').innerHTML = `${back('/activities/qa', 'Back to Q&A')}<section class="panel success"><div class="eyebrow">SUBMITTED FOR REVIEW</div><h1>Thanks for your question.</h1><p>It is in this browser’s review queue. It will appear in community Q&A only after an organizer reviews it and publishes an answer.</p><div class="actions">${link('/activities', 'Explore other activities')}${link('/admin/questions', 'Try organizer review', true)}</div><p class="help">Demo only: no question was sent to a real team.</p></section>`;
    $('#main').focus(); toast('Question added to the review queue.');
  }
  if (mode === 'content') {
    for (const name of ['url', 'source']) {
      if (fields[name] && !safeURL(fields[name])) { form.elements[name].setCustomValidity('Enter an http:// or https:// website address.'); form.elements[name].reportValidity(); return; }
    }
    const kind = form.dataset.kind;
    const item = { ...fields, id: form.dataset.id || id(), published: fields.published === 'on' };
    // # API_SAVE_CONTENT: POST /api/{kind} for a new article/listing;
    // PATCH /api/{kind}/{id} for edits. Await success before closing the editor.
    if (commit(next => { const index = next[kind].findIndex(x => x.id === item.id); if (index < 0) next[kind].push(item); else next[kind][index] = item; }, 'Content saved.')) render(true);
  }
  // # API_PATCH_ANSWER: PATCH /api/questions/{id} with { answer, status: 'published' }.
  if (mode === 'answer' && commit(next => { const q = next.questions.find(x => x.id === form.dataset.id); q.answer = fields.answer; q.status = 'published'; }, 'Answer published to community Q&A.')) render(true);
});
window.addEventListener('hashchange', () => render(true));
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY) return;
  try { data = loadData(localStorage); storageError = ''; toast('Data changed in another tab. Your next page will show the update.'); }
  catch { storageError = 'Saved browser data could not be read. Saving is disabled to protect it.'; }
});
render();
