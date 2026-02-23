import { createContext, useContext } from 'react'
import zh from './zh'
import en from './en'
import ja from './ja'
import type { TranslationKeys } from './zh'

export type Language = 'zh' | 'en' | 'ja'

const translations: Record<Language, Record<TranslationKeys, string>> = { zh, en, ja }

type TranslateFn = (key: TranslationKeys, params?: Record<string, string | number>) => string

const I18nContext = createContext<TranslateFn>((key) => key)

export function createT(lang: Language): TranslateFn {
  const dict = translations[lang] || translations.zh
  return (key, params) => {
    let text = dict[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }
}

export const I18nProvider = I18nContext.Provider

export function useT(): TranslateFn {
  return useContext(I18nContext)
}
