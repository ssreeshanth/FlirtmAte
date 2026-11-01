function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function privacyPolicy(contactEmail) {
  const contact = escapeHtml(contactEmail || 'Configure PRIVACY_CONTACT_EMAIL before deployment.');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>FlirtMate Privacy Policy</title>
</head>
<body>
<main>
  <h1>FlirtMate Privacy Policy</h1>
  <p><strong>Last updated:</strong> November 1, 2026</p>
  <h2>Information this app handles</h2>
  <p>FlirtMate processes the message you submit to generate replies. The submitted message and up to five prior exchanges (the incoming messages and replies you mark as sent) are sent to the AI provider selected by the operator (OpenAI or Google Gemini). They are not stored in FlirtMate's database. The conversation is kept in this browser tab's session storage until you start a new conversation or close the tab. Generated replies, language, vibe, favorite status, timestamps, and normalized reply text for duplicate prevention are stored to show your history and avoid repeating replies.</p>
  <h2>Sessions and storage</h2>
  <p>A random guest session is held in a server-signed, HttpOnly, Secure (in production), SameSite=Strict cookie. The session expires after 30 days. Clearing the cookie or ending the session prevents access to that browser's history; it does not delete that history.</p>
  <h2>Retention and deletion</h2>
  <p>Unstarred replies are automatically deleted after 90 days. The app also removes older unstarred replies when a browser's history exceeds 500. Starred replies are exempt from automatic retention limits. Use Clear all history while signed in to delete your saved replies.</p>
  <h2>Service providers</h2>
  <p>The selected AI provider processes the submitted message and conversation context to generate replies under its own terms and privacy practices. FlirtMate does not control provider retention. Review the selected provider's current privacy information before submitting sensitive content.</p>
  <h2>Your choices and contact</h2>
  <p>Do not submit information you do not want processed by the selected provider. For privacy questions or deletion help, contact: <a href="mailto:${contact}">${contact}</a>.</p>
  <p>This notice describes the app's current behavior. The operator should review it for the regions where the service is offered.</p>
</main>
</body>
</html>`;
}
