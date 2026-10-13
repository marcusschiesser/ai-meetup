'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import {
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Code2,
  Hash,
  LockKeyhole,
  MessageCircle,
  Plus,
  Radio,
  Trash2,
  X,
} from 'lucide-react';
import {
  addDemo,
  addTopic,
  deleteEntry,
  organizerLogin,
  organizerLogout,
  setVote,
} from '@/app/actions';
import type { ActionResult, Board, Demo, Topic } from '@/lib/types';

type Modal =
  | 'demo'
  | 'topic'
  | 'organizer'
  | { kind: 'demo' | 'topic'; id: string; description: string }
  | null;
async function fetchBoard(url: string): Promise<Board> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok)
    throw new Error('The board is temporarily unavailable. Please try again.');
  return response.json();
}
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`),
  );

export function MeetupBoard({ tab }: { tab: 'demos' | 'topics' }) {
  const { data, error, isLoading, mutate } = useSWR<Board>(
    '/api/board',
    fetchBoard,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    },
  );
  const [modal, setModal] = useState<Modal>(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyVote, setBusyVote] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const upcoming = data?.demos.filter((d) => d.date >= data.today) ?? [];
  const past =
    data?.demos.filter((d) => d.date < data.today).toReversed() ?? [];
  const dates = [...new Set(upcoming.map((d) => d.date))];

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function vote(topic: Topic) {
    if (busyVote) return;
    setBusyVote(topic.id);
    setActionError('');
    try {
      const result = await setVote(topic.id, !topic.voted);
      if (!result.ok) setActionError(result.error);
      else {
        await mutate();
        setNotice(topic.voted ? 'Upvote removed.' : 'Your vote is in.');
      }
    } catch {
      setActionError('Your vote couldn’t be saved. Please try again.');
    } finally {
      setBusyVote(null);
    }
  }
  async function logout() {
    setLoggingOut(true);
    try {
      const result = await organizerLogout();
      if (!result.ok) setActionError(result.error);
      else {
        await mutate();
        setNotice('Organizer mode closed.');
      }
    } catch {
      setActionError('Couldn’t sign out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  }
  function toggleDescription(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function demoRow(demo: Demo) {
    return (
      <article className="demo-row" key={demo.id}>
        <div className="demo-marker">
          <Code2 size={20} strokeWidth={1.6} />
        </div>
        <div className="demo-content">
          <p className="demo-description">{demo.description}</p>
          <p className="demo-presenter">
            {demo.firstName
              ? `Presented by ${demo.firstName}`
              : 'Presenter not recorded'}
          </p>
        </div>
        <span className="demo-tag">Community demo</span>
        {data?.organizer ? (
          <button
            className="icon-button danger"
            aria-label={`Delete demo: ${demo.description}`}
            onClick={() =>
              setModal({
                kind: 'demo',
                id: demo.id,
                description: demo.description,
              })
            }
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </article>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link
          className="brand"
          href="/demos"
          aria-label="AI Engineering Meetup home"
        >
          <span className="brand-mark">
            <Hash size={24} strokeWidth={1.8} />
          </span>
          AI Engineering Meetup<span className="brand-dot">.</span>
        </Link>
        <span className="header-note">
          <span className="status-dot" />A community in the making
        </span>
      </header>
      <main id="main">
        <section className="intro" aria-labelledby="intro-title">
          <div>
            <p className="eyebrow">
              <span className="small-line" /> BUILT BY CURIOSITY
            </p>
            <h1 id="intro-title">
              Good things start
              <br />
              with a conversation<span className="accent">.</span>
            </h1>
            <p className="intro-copy">
              A place for what you’re building and what’s on your mind.
              <br className="desktop-break" /> Help shape our next meetup.
            </p>
            <div className="meetup-details" aria-label="Meetup details">
              <p>
                <CalendarDays size={16} aria-hidden="true" />
                <span>
                  Every Saturday at <strong>10 am</strong> · Chiang Mai time
                </span>
              </p>
              <a
                href="https://maps.app.goo.gl/8UnHC1PKQNnJm1S2A"
                target="_blank"
                rel="noopener noreferrer"
              >
                The Kannas Hotel, Chiang Mai{' '}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <a
                href="https://www.meetup.com/coding-in-bangkok/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Meeting info on Meetup{' '}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="orbit-art" aria-hidden="true">
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
            <span className="orbit orbit-three" />
            <span className="orbit-center">
              <Hash size={42} strokeWidth={1} />
            </span>
            <span className="orbit-point point-one" />
            <span className="orbit-point point-two" />
            <span className="orbit-label">IDEAS MEET HERE</span>
          </div>
        </section>
        <nav className="tabs" aria-label="Meetup boards">
          <Link
            href="/demos"
            className={tab === 'demos' ? 'tab active' : 'tab'}
            aria-current={tab === 'demos' ? 'page' : undefined}
          >
            <Code2 size={18} /> Demos{' '}
            {data ? (
              <span className="tab-count">{data.demos.length}</span>
            ) : null}
          </Link>
          <Link
            href="/topics"
            className={tab === 'topics' ? 'tab active' : 'tab'}
            aria-current={tab === 'topics' ? 'page' : undefined}
          >
            <MessageCircle size={18} /> Topics{' '}
            {data ? (
              <span className="tab-count">{data.topics.length}</span>
            ) : null}
          </Link>
          <span className="tab-aside">YOUR MEETUP. YOUR INPUT.</span>
        </nav>
        <section className="board-section" aria-labelledby="board-title">
          <div className="section-header">
            <div>
              <p className="eyebrow section-kicker">
                {tab === 'demos'
                  ? 'SHOW, DON’T JUST TELL'
                  : 'LET’S TALK ABOUT IT'}
              </p>
              <h2 id="board-title">
                {tab === 'demos'
                  ? 'What are you working on?'
                  : 'What’s on your mind?'}
              </h2>
              <p className="section-copy">
                {tab === 'demos'
                  ? 'Kick off the meetup with a short demo. Work in progress welcome.'
                  : 'Suggest a conversation. Upvote the topics you’d like to explore.'}
              </p>
            </div>
            <button
              className="button primary add-button"
              onClick={() => setModal(tab === 'demos' ? 'demo' : 'topic')}
            >
              <Plus size={18} />
              {tab === 'demos' ? 'Add a demo' : 'Suggest a topic'}
            </button>
          </div>
          {actionError ? (
            <div className="error-banner" role="alert">
              {actionError}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setActionError('')}
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
          {error ? (
            <div className="error-banner" role="alert">
              <span>
                {data
                  ? 'Couldn’t refresh the board. Showing the last update.'
                  : error.message}
              </span>
              <button className="text-button" onClick={() => void mutate()}>
                Try again
              </button>
            </div>
          ) : null}
          {isLoading ? (
            <div className="loading-state" role="status">
              <span className="spinner" />
              Loading the board…
            </div>
          ) : null}
          {data && tab === 'demos' ? (
            <>
              {upcoming.length ? (
                dates.map((date) => (
                  <section
                    className="date-group"
                    key={date}
                    aria-label={dateLabel(date, { dateStyle: 'full' })}
                  >
                    <div className="list-heading">
                      <span>
                        <CalendarDays size={15} />
                        {dateLabel(date, {
                          weekday: 'short',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span>
                        {upcoming.filter((d) => d.date === date).length}{' '}
                        {upcoming.filter((d) => d.date === date).length === 1
                          ? 'DEMO'
                          : 'DEMOS'}
                      </span>
                    </div>
                    {upcoming.filter((d) => d.date === date).map(demoRow)}
                  </section>
                ))
              ) : (
                <div className="empty-state">
                  <span className="empty-symbol">
                    <Code2 size={28} strokeWidth={1.3} />
                  </span>
                  <h3>The first demo could be yours.</h3>
                  <p>
                    A tiny experiment. A side project. Something that surprised
                    you. <br />
                    Bring it along and show us how it works.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setModal('demo')}
                  >
                    Share what you’re building <ArrowUpRight size={16} />
                  </button>
                </div>
              )}
              {past.length ? (
                <details className="past-demos">
                  <summary>
                    Past demos <span>{past.length}</span>
                    <ChevronDown size={16} />
                  </summary>
                  {past.map((d) => (
                    <div key={d.id}>
                      <div className="past-date">
                        {dateLabel(d.date, { dateStyle: 'medium' })}
                      </div>
                      {demoRow(d)}
                    </div>
                  ))}
                </details>
              ) : null}
              <div className="board-note">
                <LockKeyhole size={15} />
                <p>
                  Have something to share? Ask the organizer for the demo code.
                </p>
              </div>
            </>
          ) : null}
          {data && tab === 'topics' ? (
            <>
              {data.topics.length ? (
                <div className="topic-list">
                  <div className="list-heading">
                    <span>THE CONVERSATION STARTERS</span>
                    <span>TOP VOTED FIRST</span>
                  </div>
                  {data.topics.map((topic, index) => (
                    <article className="topic-row" key={topic.id}>
                      <button
                        className={`vote-button ${topic.voted ? 'voted' : ''}`}
                        disabled={!!busyVote}
                        aria-pressed={topic.voted}
                        aria-label={`${topic.voted ? 'Remove upvote from' : 'Upvote'} topic by ${topic.firstName}: ${topic.description.slice(0, 60)}`}
                        onClick={() => void vote(topic)}
                      >
                        <ArrowUp size={18} strokeWidth={2} />
                        <span>{topic.voteCount}</span>
                      </button>
                      <div className="topic-content">
                        <p
                          className={`topic-description ${topic.description.length > 500 && !expanded.has(topic.id) ? 'clamped' : ''}`}
                        >
                          {topic.description}
                        </p>
                        {topic.description.length > 500 ? (
                          <button
                            className="text-button expand"
                            aria-expanded={expanded.has(topic.id)}
                            onClick={() => toggleDescription(topic.id)}
                          >
                            {expanded.has(topic.id) ? 'Show less' : 'Read more'}
                          </button>
                        ) : null}
                        <div className="topic-meta">
                          <span className="avatar">
                            {topic.firstName.slice(0, 1).toUpperCase()}
                          </span>
                          <span>{topic.firstName}</span>
                          {index === 0 && topic.voteCount > 0 ? (
                            <span className="popular">
                              <span />
                              Top of mind
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {data.organizer ? (
                        <button
                          className="icon-button danger"
                          aria-label={`Delete topic by ${topic.firstName}`}
                          onClick={() =>
                            setModal({
                              kind: 'topic',
                              id: topic.id,
                              description: topic.description,
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-symbol">
                    <MessageCircle size={28} strokeWidth={1.3} />
                  </span>
                  <h3>Every good discussion starts somewhere.</h3>
                  <p>
                    What are you curious about in AI?
                    <br />
                    Add a question, an idea, or a challenge to explore together.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setModal('topic')}
                  >
                    Start the conversation <ArrowUpRight size={16} />
                  </button>
                </div>
              )}
              <div className="board-note">
                <ArrowUp size={16} />
                <p>
                  See something interesting? Give it a vote. No account needed.
                </p>
              </div>
            </>
          ) : null}
        </section>
        <aside className="community-strip">
          <span className="strip-symbol">
            <Radio size={23} strokeWidth={1.5} />
          </span>
          <div>
            <strong>Curiosity is the only prerequisite.</strong>
            <p>
              Builders, beginners, and everyone in between. You belong here.
            </p>
          </div>
          <span className="strip-arrow" aria-hidden="true">
            ↗
          </span>
        </aside>
      </main>
      <footer>
        <span>
          AI Engineering Meetup <span className="footer-separator">/</span> Made
          for the conversation.
        </span>
        <div>
          {data?.organizer ? (
            <>
              <span className="organizer-status">
                <span className="status-dot" />
                Organizer mode
              </span>
              <button
                className="footer-button"
                disabled={loggingOut}
                onClick={() => void logout()}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              className="footer-button"
              onClick={() => setModal('organizer')}
            >
              <LockKeyhole size={13} />
              Organizer
            </button>
          )}
        </div>
      </footer>
      <div
        className={`toast ${notice ? 'visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        {notice ? (
          <>
            <Check size={16} />
            {notice}
          </>
        ) : null}
      </div>
      {modal ? (
        <EntryDialog
          modal={modal}
          onClose={() => setModal(null)}
          onSuccess={async (message) => {
            setModal(null);
            setNotice(message);
            await mutate();
          }}
        />
      ) : null}
    </div>
  );
}

function EntryDialog({
  modal,
  onClose,
  onSuccess,
}: {
  modal: Exclude<Modal, null>;
  onClose: () => void;
  onSuccess: (message: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [count, setCount] = useState(0);
  const deleting = typeof modal === 'object';
  const title = deleting
    ? `Delete this ${modal.kind}?`
    : modal === 'demo'
      ? 'Bring something to show.'
      : modal === 'topic'
        ? 'Start a conversation.'
        : 'Hello, organizer.';
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    setFields({});
    const form = new FormData(event.currentTarget);
    try {
      let result: ActionResult;
      if (deleting) result = await deleteEntry(modal.kind, modal.id);
      else if (modal === 'demo')
        result = await addDemo(Object.fromEntries(form));
      else if (modal === 'topic')
        result = await addTopic(Object.fromEntries(form));
      else result = await organizerLogin(form.get('code'));
      if (!result.ok) {
        setError(result.error);
        setFields(result.fields ?? {});
      } else
        await onSuccess(
          deleting
            ? 'Entry removed.'
            : modal === 'demo'
              ? 'Your demo is on the board.'
              : modal === 'topic'
                ? 'Your topic is on the board.'
                : 'Organizer mode unlocked.',
        );
    } catch {
      setError('Couldn’t connect. Your text is still here—please try again.');
    } finally {
      setPending(false);
    }
  }
  const fieldError = (name: string) =>
    fields[name] ? (
      <span className="field-error" id={`${name}-error`}>
        {fields[name]}
      </span>
    ) : null;
  return (
    <dialog
      ref={dialog}
      className="entry-dialog"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current && !pending) {
          const r = dialog.current.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <button
        className="icon-button dialog-close"
        type="button"
        aria-label="Close dialog"
        disabled={pending}
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <p className="eyebrow">
        {deleting
          ? 'ORGANIZER'
          : modal === 'organizer'
            ? 'BEHIND THE SCENES'
            : 'OVER TO YOU'}
      </p>
      <h2 id="dialog-title">{title}</h2>
      <p id="dialog-description" className="dialog-description">
        {deleting
          ? 'This permanently removes the entry and any votes. This can’t be undone.'
          : modal === 'demo'
            ? 'Small experiments and unfinished ideas are welcome.'
            : modal === 'topic'
              ? 'A question, an idea, or something worth figuring out together.'
              : 'Enter your organizer code to manage the board.'}
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={pending}>
          {deleting ? (
            <blockquote className="delete-preview">
              {modal.description}
            </blockquote>
          ) : null}
          {modal === 'demo' ? (
            <label htmlFor="date">
              Meetup date
              <input
                autoFocus
                id="date"
                name="date"
                type="date"
                required
                aria-invalid={!!fields.date}
                aria-describedby={fields.date ? 'date-error' : undefined}
              />
              {fieldError('date')}
            </label>
          ) : null}
          {modal === 'topic' || modal === 'demo' ? (
            <label htmlFor="firstName">
              Your first name
              <input
                autoFocus={modal === 'topic'}
                id="firstName"
                name="firstName"
                placeholder="What should we call you?"
                autoComplete="given-name"
                required
                maxLength={80}
                aria-invalid={!!fields.firstName}
                aria-describedby={
                  fields.firstName ? 'firstName-error' : undefined
                }
              />
              {fieldError('firstName')}
            </label>
          ) : null}
          {modal === 'demo' || modal === 'topic' ? (
            <label htmlFor="description">
              {modal === 'demo'
                ? 'What will you demo?'
                : 'What would you like to discuss?'}
              <textarea
                id="description"
                name="description"
                placeholder={
                  modal === 'demo'
                    ? 'A little about what you’re building…'
                    : 'Tell us a little more about your topic…'
                }
                required
                maxLength={modal === 'demo' ? 300 : 5000}
                rows={modal === 'demo' ? 4 : 7}
                onChange={(e) => setCount(e.target.value.length)}
                aria-invalid={!!fields.description}
                aria-describedby={
                  fields.description ? 'description-error' : undefined
                }
              />
              {fieldError('description')}
              <span className="field-hint counter">
                {count.toLocaleString()} / {modal === 'demo' ? '300' : '5,000'}
              </span>
            </label>
          ) : null}
          {modal === 'demo' || modal === 'organizer' ? (
            <label htmlFor="code">
              {modal === 'demo' ? 'Demo code' : 'Organizer code'}
              <input
                autoFocus={modal === 'organizer'}
                id="code"
                name="code"
                type="password"
                placeholder="Enter the code"
                autoComplete="off"
                required
                maxLength={128}
                aria-invalid={!!fields.code}
                aria-describedby="code-hint"
              />
              {fieldError('code')}
              <span id="code-hint" className="field-hint">
                {modal === 'demo'
                  ? 'Get this from the meetup organizer.'
                  : 'This is separate from the code for adding demos.'}
              </span>
            </label>
          ) : null}
        </fieldset>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="dialog-actions">
          <button
            className="button secondary"
            type="button"
            disabled={pending}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`button ${deleting ? 'destructive' : 'primary'}`}
            disabled={pending}
            type="submit"
          >
            {pending ? (
              <>
                <span className="spinner" />
                Saving…
              </>
            ) : deleting ? (
              'Delete entry'
            ) : modal === 'demo' ? (
              'Add demo'
            ) : modal === 'topic' ? (
              'Add topic'
            ) : (
              'Unlock organizer mode'
            )}
            {!pending && !deleting ? <ArrowUpRight size={16} /> : null}
          </button>
        </div>
      </form>
    </dialog>
  );
}
