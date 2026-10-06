import { useI18n, type Lang } from 'lib/i18n'

const OPTIONS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中文' },
]

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n()

  return (
    <div className="inline-flex border-2 border-gray-600 font-mono text-xs uppercase">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLang(opt.value)}
          aria-pressed={lang === opt.value}
          className={`px-3 py-1 transition-colors ${
            lang === opt.value
              ? 'bg-acid text-black font-bold'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
