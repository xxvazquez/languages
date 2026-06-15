import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  Check,
  Flame,
  GraduationCap,
  LogOut,
  RotateCcw,
  Search,
  Sparkles,
  Timer,
  X,
} from 'lucide-react'
import curriculum from './data/curriculum.json'
import { supabase } from './lib/supabase'
import {
  cardWeight,
  commonConfusion,
  isCorrectAnswer,
  levelFromXp,
  normalizeAnswer,
  pickWeighted,
  todayKey,
  updateMastery,
} from './lib/utils'
import type { Attempt, Curriculum, GrammarCard, Mastery, Profile, VocabularyCard } from './types/curriculum'

const data = curriculum as Curriculum
const STORAGE_KEY = 'sakura-study-state-v1'
const USER_ID = 'local-user'

type AppState = {
  profile: Profile
  attempts: Attempt[]
  mastery: Record<string, Mastery>
}

type Mode = 'learn' | 'grammar' | 'self' | 'review' | 'challenge' | 'analytics' | 'search'
type ExerciseKind = 'english-kana' | 'kana-english' | 'kana-romaji' | 'english-japanese'

const exerciseLabels: Record<ExerciseKind, string> = {
  'english-kana': 'English to kana',
  'kana-english': 'Kana to English',
  'kana-romaji': 'Kana to romaji',
  'english-japanese': 'English to Japanese',
}

const defaultState: AppState = {
  profile: {
    id: USER_ID,
    email: 'local@sakura.study',
    xp: 0,
    currentStreak: 0,
    longestStreak: 0,
  },
  attempts: [],
  mastery: {},
}

function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultState
  try {
    return { ...defaultState, ...JSON.parse(raw) } as AppState
  } catch {
    return defaultState
  }
}

function getPrompt(card: VocabularyCard, kind: ExerciseKind) {
  if (kind === 'english-kana') return { question: card.english, expected: card.kana, hint: 'Type the kana.' }
  if (kind === 'kana-english') return { question: card.kana, expected: card.english, hint: 'Type the English meaning.' }
  if (kind === 'kana-romaji') return { question: card.kana, expected: card.romaji, hint: 'Type romaji.' }
  return { question: card.english, expected: card.japanese, hint: 'Type Japanese.' }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <div className="text-xs font-bold uppercase tracking-wide text-moss">{label}</div>
      <div className="mt-2 text-2xl font-bold text-ink">{value}</div>
    </div>
  )
}

    <section className="paper-panel rounded-lg p-5">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-sakura/20 text-sakuraDark">
          <GraduationCap size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Account</h2>
          <p className="text-sm text-sumi">Email login keeps XP, streaks, and review history attached to a user.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input className="rounded-md border border-line bg-white/80 px-3 py-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input className="rounded-md border border-line bg-white/80 px-3 py-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
      </div>
      {message && <p className="mt-3 text-sm text-sakuraDark">{message}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="primary-button" onClick={() => submit('login')}>Login</button>
        <button className="secondary-button" onClick={() => submit('signup')}>Sign up</button>
      </div>
    </section>
  )
}

function LearningCard({
  card,
  mode,
  onAttempt,
  onNext,
  compact = false,
}: {
  card: VocabularyCard
  mode: ExerciseKind
  onAttempt: (attempt: Omit<Attempt, 'userId' | 'timestamp'>) => void
  onNext: () => void
  compact?: boolean
}) {
  const prompt = getPrompt(card, mode)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong'>('idle') 

  useEffect(() => {
    setAnswer('')
    setResult('idle')
  }, [card.id, mode])

  function submit(event: FormEvent) {
    event.preventDefault()
    const correct = isCorrectAnswer(answer, prompt.expected)
    setResult(correct ? 'correct' : 'wrong')
    onAttempt({
      cardId: card.id,
      correct,
      answer,
      expected: prompt.expected,
      mode,
      category: card.category,
      xp: correct ? (cardWeight(card) > 3 ? 15 : 10) : 0,
    })
  }

  return (
    <form onSubmit={submit} className="paper-panel rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-md bg-matcha px-3 py-1 text-xs font-bold uppercase text-moss">{card.category}</span>
        <span className="text-sm text-sumi">{exerciseLabels[mode]}</span>
      </div>
      <div className={`jp mt-6 font-bold ${compact ? 'text-3xl' : 'text-5xl'}`}>{prompt.question}</div>
      <p className="mt-2 text-sm text-sumi">{prompt.hint}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          className="min-h-12 flex-1 rounded-md border border-line bg-white/85 px-4 text-lg"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          autoComplete="off"
          placeholder="Type your answer"
        />
        <button className="primary-button" type="submit">
          <Check size={18} />
          Check
        </button>
      </div>
      {result !== 'idle' && (
        <div className={`mt-4 rounded-md border p-3 ${result === 'correct' ? 'border-moss bg-matcha/70' : 'border-sakura bg-sakura/10'}`}>
          <div className="flex items-center gap-2 font-bold">{result === 'correct' ? <Check size={18} /> : <X size={18} />} {result === 'correct' ? 'Correct' : 'Review this one'}</div>
          <div className="jp mt-1 text-sm">Expected: {prompt.expected}</div>

          <button
            type="button"
            className="primary-button mt-3"
            onClick={onNext}
          >
            Next Question →
          </button>
        </div>
      )}
    </form>
  )
}

function GrammarPractice({ cards, onAttempt }: { cards: GrammarCard[]; onAttempt: (attempt: Omit<Attempt, 'userId' | 'timestamp'>) => void }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const card = cards[index % cards.length]
  const blank = card.exampleJapanese.replace(/です。?$/, '＿＿。').replace(/できます。?$/, '＿＿。')
  const expected = card.exampleJapanese.includes('できます') ? 'できます' : card.exampleJapanese.endsWith('です。') ? 'です' : card.exampleJapanese

  function submit(event: FormEvent) {
    event.preventDefault()
    const correct = isCorrectAnswer(answer, expected) || isCorrectAnswer(answer, card.exampleJapanese)
    onAttempt({ cardId: card.id, correct, answer, expected, mode: card.pattern, category: 'Grammar', xp: correct ? 10 : 0 })
    setAnswer('')
    setIndex((value) => value + 1)
  }

  return (
    <form onSubmit={submit} className="paper-panel rounded-lg p-5">
      <span className="rounded-md bg-matcha px-3 py-1 text-xs font-bold uppercase text-moss">{card.pattern}</span>
      <div className="jp mt-6 text-4xl font-bold">{blank}</div>
      <p className="mt-3 text-sumi">{card.exampleEnglish}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input className="min-h-12 flex-1 rounded-md border border-line bg-white/85 px-4 text-lg" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Fill the blank or type sentence" />
        <button className="primary-button" type="submit">Check</button>
      </div>
    </form>
  )
}

function Analytics({ state }: { state: AppState }) {
  const total = state.attempts.length
  const correct = state.attempts.filter((attempt) => attempt.correct).length
  const accuracy = total ? Math.round((correct / total) * 100) : 0
  const byCard = Object.values(state.mastery).sort((a, b) => b.difficulty - a.difficulty).slice(0, 6)
  const byCategory = data.vocabulary.reduce<Record<string, { total: number; correct: number }>>((acc, card) => {
    const attempts = state.attempts.filter((attempt) => attempt.cardId === card.id)
    if (!acc[card.category]) acc[card.category] = { total: 0, correct: 0 }
    acc[card.category].total += attempts.length
    acc[card.category].correct += attempts.filter((attempt) => attempt.correct).length
    return acc
  }, {})
  const mistakes = state.attempts.filter((attempt) => !attempt.correct).slice(-8).reverse()
  const recentDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const key = todayKey(date)
    const attempts = state.attempts.filter((attempt) => attempt.timestamp.slice(0, 10) === key)
    const dayCorrect = attempts.filter((attempt) => attempt.correct).length
    return { key: key.slice(5), accuracy: attempts.length ? Math.round((dayCorrect / attempts.length) * 100) : 0, xp: attempts.reduce((sum, attempt) => sum + attempt.xp, 0) }
  })

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="XP" value={state.profile.xp} />
        <Stat label="Level" value={levelFromXp(state.profile.xp)} />
        <Stat label="Current streak" value={state.profile.currentStreak} />
        <Stat label="Longest streak" value={state.profile.longestStreak} />
        <Stat label="Answers" value={total} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="paper-panel rounded-lg p-5">
          <h2 className="font-bold">Difficult Vocabulary</h2>
          <div className="mt-4 space-y-3">
            {byCard.map((mastery) => {
              const card = data.vocabulary.find((item) => item.id === mastery.cardId)
              const score = mastery.attempts ? Math.round((mastery.correct / mastery.attempts) * 100) : 0
              return card ? <ProgressRow key={card.id} label={`${card.japanese} · ${card.english}`} value={score} /> : null
            })}
          </div>
        </section>
        <section className="paper-panel rounded-lg p-5">
          <h2 className="font-bold">Difficult Categories</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(byCategory).map(([category, stats]) => <ProgressRow key={category} label={category} value={stats.total ? Math.round((stats.correct / stats.total) * 100) : 0} />)}
          </div>
        </section>
      </div>
      <section className="paper-panel rounded-lg p-5">
        <h2 className="font-bold">Progress Over Time</h2>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {recentDays.map((day) => (
            <div key={day.key} className="rounded-md border border-line bg-white/70 p-2 text-center">
              <div className="flex h-28 items-end justify-center">
                <div className="w-8 rounded-t bg-sakura" style={{ height: `${Math.max(4, day.accuracy)}%` }} />
              </div>
              <div className="mt-2 text-xs font-bold">{day.key}</div>
              <div className="text-xs text-sumi">{day.accuracy}% · {day.xp} XP</div>
            </div>
          ))}
        </div>
      </section>
      <section className="paper-panel rounded-lg p-5">
        <h2 className="font-bold">Error Analysis</h2>
        <div className="mt-4 grid gap-3">
          {mistakes.map((attempt) => (
            <div key={`${attempt.cardId}-${attempt.timestamp}`} className="rounded-md border border-line bg-white/70 p-3">
              <div className="jp text-sm">Expected: <b>{attempt.expected}</b></div>
              <div className="jp text-sm">Typed: <b>{attempt.answer || 'blank'}</b></div>
              <div className="mt-1 text-xs text-sakuraDark">{commonConfusion(attempt.expected, attempt.answer)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm"><span>{label}</span><b>{value}%</b></div>
      <div className="mt-1 h-2 rounded-full bg-line"><div className="h-2 rounded-full bg-moss" style={{ width: `${value}%` }} /></div>
    </div>
  )
}

function SearchView() {
  const [query, setQuery] = useState('')
  const results = data.vocabulary.filter((card) => normalizeAnswer(`${card.japanese}${card.kana}${card.romaji}${card.english}`).includes(normalizeAnswer(query))).slice(0, 40)
  return (
    <section className="paper-panel rounded-lg p-5">
      <div className="flex items-center gap-3 rounded-md border border-line bg-white/80 px-3">
        <Search size={18} />
        <input className="min-h-12 flex-1 bg-transparent" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Japanese, kana, romaji, or English" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((card) => (
          <div key={card.id} className="rounded-lg border border-line bg-white/70 p-4">
            <div className="jp text-2xl font-bold">{card.japanese}</div>
            <div className="jp text-sumi">{card.kana}</div>
            <div className="text-sm text-sumi">{card.romaji}</div>
            <div className="mt-2 font-semibold">{card.english}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [mode, setMode] = useState<Mode>('learn')
  const [kind, setKind] = useState<ExerciseKind>('english-kana')
  const [card, setCard] = useState(() => data.vocabulary[0])
  const [authed, setAuthed] = useState(false)
  const [challengeLeft, setChallengeLeft] = useState(10)
  const [challengeScore, setChallengeScore] = useState(0)
  const [challengeStreak, setChallengeStreak] = useState(0)

  const weakCards = useMemo(() => {
    const weak = data.vocabulary.filter((item) => {
      const mastery = state.mastery[item.id]
      return !mastery || mastery.wrong > 0 || mastery.difficulty > 0.45
    })
    return weak.length ? weak : data.vocabulary
  }, [state.mastery])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data: sessionData }) => {
      const user = sessionData.session?.user
      if (!user) return
      setAuthed(true)
      setState((current) => ({
        ...current,
        profile: {
          ...current.profile,
          id: user.id,
          email: user.email ?? current.profile.email,
        },
      }))
    })
  }, [])

  useEffect(() => {
    const source = mode === 'review' ? weakCards : data.vocabulary
    setCard(pickWeighted(source, (item) => cardWeight(item, state.mastery[item.id])))
  }, [kind, mode])

  function chooseNext() {
    const source = mode === 'review' ? weakCards : data.vocabulary
    setCard(pickWeighted(source, (item) => cardWeight(item, state.mastery[item.id])))
  }

  function recordAttempt(input: Omit<Attempt, 'userId' | 'timestamp'>) {
    const timestamp = new Date().toISOString()
    const attempt: Attempt = { ...input, userId: state.profile.id, timestamp }
    const date = todayKey()
    const last = state.profile.lastActiveDate
    const continued = last === date ? state.profile.currentStreak : last && new Date(`${date}T00:00:00`).getTime() - new Date(`${last}T00:00:00`).getTime() === 86400000 ? state.profile.currentStreak + 1 : 1
    const sessionBonus = input.correct && state.attempts.slice(-9).every((item) => item.correct) && state.attempts.length >= 9 ? 50 : 0
    const nextXp = state.profile.xp + input.xp + sessionBonus
    const nextMastery = updateMastery(state.mastery[input.cardId], attempt)

    const nextProfile = {
      ...state.profile,
      xp: nextXp,
      currentStreak: continued,
      longestStreak: Math.max(state.profile.longestStreak, continued),
      lastActiveDate: date,
    }

    setState((current) => ({
      profile: nextProfile,
      attempts: [...current.attempts, attempt],
      mastery: { ...current.mastery, [input.cardId]: nextMastery },
    }))
    void persistLearning(nextProfile, attempt, nextMastery)

    if (mode === 'challenge') {
      const streak = input.correct ? challengeStreak + 1 : 0
      const multiplier = streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1
      setChallengeStreak(streak)
      setChallengeScore((score) => score + Math.round(input.xp * multiplier))
      setChallengeLeft((left) => Math.max(0, left - 1))
    }
    window.setTimeout(chooseNext, 600)
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut()
    setAuthed(false)
  }

  async function persistLearning(profile: Profile, attempt: Attempt, mastery: Mastery) {
    if (!supabase || profile.id === USER_ID) return
    await supabase.from('users').upsert({
      id: profile.id,
      email: profile.email,
      xp: profile.xp,
      current_streak: profile.currentStreak,
      longest_streak: profile.longestStreak,
      last_active_date: profile.lastActiveDate,
      updated_at: new Date().toISOString(),
    })
    await supabase.from('streaks').upsert({
      user_id: profile.id,
      current_streak: profile.currentStreak,
      longest_streak: profile.longestStreak,
      last_active_date: profile.lastActiveDate,
      updated_at: new Date().toISOString(),
    })
    await supabase.from('attempts').insert({
      user_id: profile.id,
      card_id: attempt.cardId,
      correct: attempt.correct,
      answer: attempt.answer,
      expected: attempt.expected,
      mode: attempt.mode,
      category: attempt.category,
      xp: attempt.xp,
      created_at: attempt.timestamp,
    })
    await supabase.from('mastery').upsert({
      user_id: profile.id,
      card_id: mastery.cardId,
      attempts: mastery.attempts,
      correct: mastery.correct,
      wrong: mastery.wrong,
      last_reviewed: mastery.lastReviewed,
      difficulty: mastery.difficulty,
      updated_at: new Date().toISOString(),
    })
  }

  const nav = [
    ['learn', BookOpen, 'Vocabulary'],
    ['grammar', GraduationCap, 'Sentence Practice'],
    ['review', RotateCcw, 'Review'],
    ['challenge', Timer, 'Challenge'],
    ['analytics', BarChart3, 'Analytics'],
    ['search', Search, 'Search'],
  ] as const

  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-md bg-sakura/20 text-sakuraDark"><Sparkles size={24} /></span>
              <div>
                <h1 className="text-3xl font-black text-ink sm:text-4xl">Sakura Study</h1>
                <p className="mt-1 max-w-2xl text-sumi">Typed-answer Japanese practice with adaptive review and mistake analytics.</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-md border border-line bg-white/70 px-3 py-2 text-sm font-bold"><Flame className="mr-1 inline" size={16} /> {state.profile.currentStreak} day streak</div>
            <div className="rounded-md border border-line bg-white/70 px-3 py-2 text-sm font-bold">Level {levelFromXp(state.profile.xp)}</div>
            <div className="rounded-md border border-line bg-white/70 px-3 py-2 text-sm font-bold">Level {levelFromXp(state.profile.xp)} · {state.profile.xp} XP</div>
            <button className="secondary-button min-h-10 px-3" onClick={logout} title="Logout"><LogOut size={17} /></button>
          </div>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {nav.map(([id, Icon, label]) => (
            <button key={id} className={`tab-button ${mode === id ? 'tab-button-active' : ''}`} onClick={() => setMode(id)}>
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        false && (<div />)

        <section className="mt-5">
          {(mode === 'learn' || mode === 'review' || mode === 'challenge') && (
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <div>
                <LearningCard
                    card={card}
                    mode={kind}
                    onAttempt={recordAttempt}
                    onNext={chooseNext}
                    compact={mode === 'challenge'}
                  />
                <div className="mt-4 flex flex-wrap gap-2">
                  {(Object.keys(exerciseLabels) as ExerciseKind[]).map((item) => (
                    <button key={item} className={`tab-button ${kind === item ? 'tab-button-active' : ''}`} onClick={() => setKind(item)}>{exerciseLabels[item]}</button>
                  ))}
                  <button className="secondary-button min-h-10" onClick={chooseNext}>Skip</button>
                </div>
              </div>
              <aside className="paper-panel rounded-lg p-5">
                <h2 className="font-bold">{mode === 'challenge' ? 'Challenge Mode' : mode === 'review' ? 'Review Mode' : 'Notebook'}</h2>
                <p className="mt-2 text-sm text-sumi">{mode === 'review' ? 'Only weak, incorrect, or overdue cards are prioritized.' : 'Frequently missed cards appear more often through weighted review.'}</p>
                {mode === 'challenge' && (
                  <div className="mt-5 grid gap-3">
                    <Stat label="Questions left" value={challengeLeft} />
                    <Stat label="Score" value={challengeScore} />
                    <Stat label="Multiplier" value={challengeStreak >= 5 ? '2.0x' : challengeStreak >= 3 ? '1.5x' : '1.0x'} />
                    <button className="secondary-button" onClick={() => { setChallengeLeft(10); setChallengeScore(0); setChallengeStreak(0); chooseNext() }}>Restart</button>
                  </div>
                )}
                <div className="mt-5 text-sm text-sumi">
                  <div>Cards: {data.vocabulary.length}</div>
                  <div>Weak cards: {weakCards.length}</div>
                  <div>Current category: {card.category}</div>
                </div>
              </aside>
            </div>
          )}
          {mode === 'grammar' && <GrammarPractice cards={data.grammar} onAttempt={recordAttempt} />}
          {mode === 'analytics' && <Analytics state={state} />}
          {mode === 'search' && <SearchView />}
        </section>
      </main>
    </div>
  )
}
