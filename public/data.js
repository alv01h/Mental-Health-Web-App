export const STORAGE_KEY = 'community-care:v1';
export const resources = {
  care: 'https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health',
  youth: 'https://www.nimh.nih.gov/health/publications/children-and-mental-health',
  wellness: 'https://www.nih.gov/health-information/your-healthiest-self-wellness-toolkits/emotional-wellness-toolkit',
};

export function seedData() {
  return {
    articles: [
      { id: 'basics', title: 'Mental health, in everyday life', category: 'The basics', summary: 'A simple starting point for understanding your wellbeing.', body: 'Mental health is part of how we feel, think, and connect with others.\n\nSmall routines, rest, and supportive relationships can help us look after ourselves. Different people need different kinds of support.\n\nTry noticing one thing that helps you feel supported today.', source: resources.care, published: true },
      { id: 'signs', title: 'Noticing when you need support', category: 'Recognizing symptoms', summary: 'Notice changes and start a conversation.', body: 'Changes in sleep, concentration, or interest in everyday activities can be reasons to check in with yourself. They do not establish a diagnosis.\n\nIf difficulties persist or affect daily life, consider talking to a qualified health professional. You do not need to wait until things feel overwhelming to ask for support.', source: resources.care, published: true },
      { id: 'teens', title: 'Growing up and finding support', category: 'Teen development', summary: 'A starting point for teens, families, and supporters.', body: 'Growing up can bring changes in feelings, friendships, and responsibilities. Listening without judgment can make it easier to talk.\n\nWhen difficulties persist, cause distress, or affect school, home, or friendships, a qualified professional can help. A trusted adult can help a young person find support.', source: resources.youth, published: true },
      { id: 'connections', title: 'Seeing the whole picture', category: 'Bio-psycho-social factors', summary: 'Explore physical, emotional, and social wellbeing.', body: 'It can be useful to consider your physical routines, emotional experiences, and relationships together.\n\nReflect on these questions: Have I had time to rest? What has been on my mind? Who could I connect with?\n\nThese prompts are for reflection. A professional can help you understand personal concerns.', source: resources.wellness, published: true },
      { id: 'mindful', title: 'Making room for a mindful moment', category: 'Mindfulness & positivity', summary: 'Bring a little attention to the present.', body: 'Mindfulness involves noticing the present moment. You might pay attention to sounds around you or the feeling of your feet on the ground.\n\nTry a short pause in our activities area. Keep your eyes open if you prefer, and stop whenever you want. You do not need to feel a particular way afterward.', source: resources.wellness, published: true },
    ],
    listings: [
      { id: 'class-1', type: 'Class', title: 'An introduction to everyday mindfulness', description: 'A sample beginner session with a short guided practice and time for questions.', date: '2026-11-12', time: '17:00', location: 'Online · Pacific time', provider: 'Sample community program', url: '', published: true },
      { id: 'lecture-1', type: 'Public lecture', title: 'Starting a conversation about mental health', description: 'A sample public talk about listening, checking in, and finding support in your community.', date: '2026-11-18', time: '18:00', location: 'Community room · Pacific time', provider: 'Sample community program', url: '', published: true },
      { id: 'event-1', type: 'Charity event', title: 'A walk for community wellbeing', description: 'A sample community gathering to connect with neighbors and learn about the program.', date: '2026-11-22', time: '10:00', location: 'Community park · Pacific time', provider: 'Sample community program', url: '', published: true },
    ],
    questions: [], entries: [], completed: [],
  };
}

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
export function safeURL(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function loadData(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return seedData();
  const parsed = JSON.parse(raw);
  if (!parsed || !['articles', 'listings', 'questions', 'entries', 'completed'].every(key => Array.isArray(parsed[key]))) throw new Error('Saved data has an unsupported format.');
  return parsed;
}
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function reportCSV(data) {
  const rows = [['Category', 'Metric', 'Count'], ['Content', 'Published articles', data.articles.filter(x => x.published).length], ['Content', 'Published listings', data.listings.filter(x => x.published).length], ['Questions', 'Awaiting review', data.questions.filter(x => x.status === 'pending').length], ['Questions', 'Published answers', data.questions.filter(x => x.status === 'published').length]];
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
}
