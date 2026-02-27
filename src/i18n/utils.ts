import ko from './ko.json';
import en from './en.json';

export type Lang = 'ko' | 'en';

const translations: Record<Lang, typeof ko> = { ko, en };

export const defaultLang: Lang = 'ko';

export function t(lang: Lang, key: string): string {
  const keys = key.split('.');
  let result: any = translations[lang];
  for (const k of keys) {
    result = result?.[k];
  }
  return result ?? key;
}

export function getLangFromStorage(): Lang {
  if (typeof window === 'undefined') return defaultLang;
  return (localStorage.getItem('lang') as Lang) || defaultLang;
}

export function setLangToStorage(lang: Lang): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('lang', lang);
}

export function getOppositeLang(lang: Lang): Lang {
  return lang === 'ko' ? 'en' : 'ko';
}

export function formatDate(dateStr: string, lang: Lang): string {
  const date = new Date(dateStr);
  if (lang === 'ko') {
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
