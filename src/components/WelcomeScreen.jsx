import { LANGUAGES } from '../../shared/constants.js';

export default function WelcomeScreen({ choice, onChoice, onStart }) {
  return <main className="welcome" data-testid="welcome-screen">
    <div className="brand-mark" aria-hidden="true">💜</div>
    <p className="eyebrow">A little help with the right words</p>
    <h1>FlirtMate</h1>
    <p className="intro">Turn a received message into replies that sound like you.</p>
    <fieldset className="language-picker">
      <legend>Choose your language</legend>
      {LANGUAGES.map((language) => <label className={`language-option ${choice === language.id ? 'selected' : ''}`} key={language.id}>
        <input type="radio" name="language" value={language.id} checked={choice === language.id} onChange={() => onChoice(language.id)} />
        <span>{language.label}</span>
      </label>)}
    </fieldset>
    <button className="primary-button" type="button" disabled={!choice} onClick={onStart}>Start FlirtMate</button>
  </main>;
}
