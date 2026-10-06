import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageSwitcher } from 'components/ui/LanguageSwitcher'
import { I18nProvider, translate, useI18n } from './i18n'

function Probe() {
  const { t } = useI18n()
  return (
    <div>
      <span data-testid="label">{t('Active Tokens')}</span>
      <span data-testid="template">{t('LAST_SYNC: {time}', { time: '12:00' })}</span>
      <span data-testid="unknown">{t('Some Untranslated String')}</span>
    </div>
  )
}

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('默认使用英文，未登记的文案原样回退', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    )
    expect(screen.getByTestId('label').textContent).toBe('Active Tokens')
    expect(screen.getByTestId('unknown').textContent).toBe('Some Untranslated String')
  })

  it('切换到中文后固定文案与占位符都被替换，并记住选择', () => {
    render(
      <I18nProvider>
        <LanguageSwitcher />
        <Probe />
      </I18nProvider>
    )
    expect(screen.getByTestId('label').textContent).toBe('Active Tokens')

    fireEvent.click(screen.getByRole('button', { name: '中文' }))

    expect(screen.getByTestId('label').textContent).toBe('活跃账号')
    expect(screen.getByTestId('template').textContent).toBe('上次同步: 12:00')
    expect(screen.getByTestId('unknown').textContent).toBe('Some Untranslated String')
    expect(localStorage.getItem('pplx_admin_lang')).toBe('zh')
    expect(document.documentElement.lang).toBe('zh-CN')
  })

  it('切回英文', () => {
    render(
      <I18nProvider>
        <LanguageSwitcher />
        <Probe />
      </I18nProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: '中文' }))
    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByTestId('label').textContent).toBe('Active Tokens')
    expect(localStorage.getItem('pplx_admin_lang')).toBe('en')
  })

  it('启动时读取已保存的语言偏好', () => {
    localStorage.setItem('pplx_admin_lang', 'zh')
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    )
    expect(screen.getByTestId('label').textContent).toBe('活跃账号')
  })

  it('translate 对未知 key 回退原文', () => {
    expect(translate('zh', 'Nope')).toBe('Nope')
    expect(translate('en', 'Active Tokens')).toBe('Active Tokens')
  })
})
