export type VocabularyCard = {
  id: string
  japanese: string
  kana: string
  romaji: string
  english: string
  category: string
}

export type GrammarCard = {
  id: string
  pattern: string
  meaning: string
  exampleJapanese: string
  exampleEnglish: string
}

export type Attempt = {
  userId: string
  cardId: string
  correct: boolean
  answer: string
  expected: string
  mode: string
  category: string
  timestamp: string
  xp: number
}

export type Mastery = {
  cardId: string
  attempts: number
  correct: number
  wrong: number
  lastReviewed?: string
  difficulty: number
}

export type Profile = {
  id: string
  email: string
  xp: number
  currentStreak: number
  longestStreak: number
  lastActiveDate?: string
}

export type Curriculum = {
  vocabulary: VocabularyCard[]
  grammar: GrammarCard[]
  selfIntroduction: GrammarCard[]
}
