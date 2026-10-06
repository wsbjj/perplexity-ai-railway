import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

export type Lang = 'en' | 'zh'

const STORAGE_KEY = 'pplx_admin_lang'

/**
 * 轻量 i18n（不引入第三方依赖）：
 * - 以英文原文本身作为 key，中文只登记译文，未命中的 key 原样返回，
 *   因此上游新增文案无需改动即可正常显示英文。
 * - 含 "." 的 key 是命名空间 key（同一英文词在不同位置需要不同译文时使用），
 *   需要在 en / zh 两侧同时登记。
 * - {name} 占位符由 t(key, vars) 替换。
 */
const en: Record<string, string> = {
  'state.PRO': 'PRO',
  'state.DOWNGRADE': 'DOWNGRADE',
  'state.READY': 'READY',
  'state.OFFLINE': 'OFFLINE',
  'state.BACKOFF': 'BACKOFF',
  'logs.ERROR': 'ERROR',
}

const zh: Record<string, string> = {
  // ---- 顶部 / 导航 ----
  'API Playground': 'API 调试台',
  'LAST_SYNC: {time}': '上次同步: {time}',
  'SYNCING...': '同步中...',
  'SYSTEM_STATUS: ONLINE': '系统状态: 在线',
  'Update Available: {version}': '有新版本: {version}',
  'Token Pool': '账号池',
  Logs: '日志',

  // ---- 认证栏 ----
  AUTHENTICATED: '已认证',
  GUEST_MODE: '访客模式',
  'ADMIN_TOKEN...': '管理员密钥...',
  AUTH: '认证',
  'VERIFYING...': '验证中...',
  LOGOUT: '退出',
  'TOKEN: ****{tail}': '密钥: ****{tail}',
  'Invalid admin token': '管理员密钥无效',
  'Failed to verify token': '密钥验证失败',

  // ---- 统计卡片 ----
  'Total Clients': '账号总数',
  Pro: 'Pro 账号',
  Downgrade: '降级账号',
  'Auto Renew Cookie': 'Cookie 自动续期',
  UNKNOWN: '未知',
  DISABLED: '已禁用',
  ACTIVE: '运行中',

  // ---- 账号表 ----
  'Active Tokens': '活跃账号',
  INCOGNITO: '隐私模式',
  NORMAL: '普通模式',
  DOWNGRADE: '降级模式',
  PRO: 'Pro 模式',
  '+ NEW TOKEN': '+ 新增账号',
  'NO_DATA_FOUND // INJECT_NEW_TOKEN': '暂无数据 // 请注入新账号',
  Identifier: '标识',
  State: '状态',
  'Dynamic Weight': '动态权重',
  Reqs: '请求数',
  'Last Check': '最近检查',
  Controls: '操作',
  'state.PRO': 'Pro',
  'state.DOWNGRADE': '降级',
  'state.READY': '就绪',
  'state.OFFLINE': '离线',
  'state.BACKOFF': '退避中',
  'Download Config': '下载配置',
  Disable: '停用',
  Enable: '启用',
  'Renew Cookie': '续期 Cookie',
  Remove: '删除',
  'action.ONLINE': '已上线',
  'action.OFFLINE': '已离线',
  'action.RESET': '已重置',

  // ---- 弹窗 ----
  Warning: '警告',
  EXECUTE: '执行',
  CANCEL: '取消',

  // ---- 注入账号弹窗 ----
  'Inject Token': '注入账号',
  'IMPORT CONFIG': '导入配置',
  'CONFIRM UPLOAD': '确认提交',
  'Manual Input': '手动输入',
  'Upload Config': '上传配置',
  'Session Cookies': '会话 Cookies',
  'Legacy Tokens': '旧版 Token',
  Cookies: 'Cookies',
  'Paste the Cookie header (DevTools → Network) or a JSON object. Only Perplexity session cookies are kept.':
    '粘贴 Cookie 请求头（开发者工具 → 网络）或 JSON 对象，只会保留 Perplexity 会话 cookie。',
  'Detected: {list}': '已识别: {list}',
  'No __Secure-pplx.session.* cookie found': '未找到 __Secure-pplx.session.* cookie',
  'CSRF Token': 'CSRF Token',
  'Session Token': 'Session Token',
  'Upload Config File (JSON)': '上传配置文件 (JSON)',
  'Config loaded: {count} token(s)': '已载入 {count} 个账号',
  'Click to select tokens.json': '点击选择 tokens.json',
  'ERROR: {msg}': '错误: {msg}',
  Tokens: '账号数',
  'IDs: {list}': 'ID: {list}',
  'Invalid format: expected array of tokens': '格式错误：应为账号数组',
  'Invalid token entry: id plus csrf_token/session_token or cookies required':
    '账号条目无效：需要 id 以及 csrf_token/session_token 或 cookies',
  'Failed to parse config file': '配置文件解析失败',
  'Failed to read file': '文件读取失败',

  // ---- 自动续期面板 ----
  '♥ Auto Renew Cookie': '♥ Cookie 自动续期',
  'RENEW INTERVAL: {n}H': '续期间隔: {n} 小时',
  Config: '配置',
  'Hide Config': '收起配置',
  'Renew All Cookies': '续期全部 Cookie',
  'Renewing...': '续期中...',
  Enabled: '启用',
  Disabled: '禁用',
  'Interval (Hours)': '间隔（小时）',
  'Health Check Question': '健康检查问题',
  'Telegram Bot Token': 'Telegram Bot Token',
  'Telegram Chat ID': 'Telegram Chat ID',
  'Optional...': '可选...',
  'Save Config': '保存配置',

  // ---- 日志面板 ----
  'Auto_Refresh:': '自动刷新:',
  ON: '开',
  OFF: '关',
  'Filter logs...': '过滤日志...',
  Refresh: '刷新',
  'Loading...': '加载中...',
  RETRY: '重试',
  'LOADING_LOGS...': '日志加载中...',
  NO_MATCHING_LOGS: '没有匹配的日志',
  NO_LOGS_FOUND: '暂无日志',
  'logs.ERROR': '错误',
  'SHOWING: {shown} / {total} lines': '显示: {shown} / {total} 行',
  '(filtered)': '（已过滤）',
  'FILE_SIZE: {size} KB': '文件大小: {size} KB',
  'LAST_UPDATE: {time}': '更新时间: {time}',

  // ---- 提示条（Toast）----
  LOGGED_OUT: '已退出登录',
  MISSING_FIELDS: '请填写必填项',
  TOKEN_INJECTED: '账号已注入',
  TOKEN_DELETED: '账号已删除',
  AUTH_REQUIRED: '需要管理员权限',
  ERROR: '出错了',
  IMPORT_FAILED: '导入失败',
  CONFIG_DOWNLOADED: '配置已下载',
  DOWNLOAD_FAILED: '下载失败',
  TEST_FAILED: '测试失败',
  CONFIG_SAVED: '配置已保存',
  SAVE_FAILED: '保存失败',
  'Client {id}: {state}': '账号 {id}: {state}',
  'Account {id} renewed': '账号 {id} 续期成功',
  'Auto renew test OK': 'Cookie 续期测试完成',
  'Imported {count} token(s)': '已导入 {count} 个账号',
  'Downgrade mode active. If req fail, Perplexity free model will auto use.':
    '降级模式已开启：请求失败时自动改用 Perplexity 免费模型。',
  'Pro mode active. If req fail, will throw error.':
    'Pro 模式已开启：请求失败将直接报错。',
  'Incognito mode ON. All queries will not save history.':
    '隐私模式已开启：所有对话不保存历史。',
  'Incognito mode OFF. Queries will save history normally.':
    '隐私模式已关闭：对话正常保存历史。',
  'Are you sure you want to permanently delete token "{id}"? This action is irreversible.':
    '确定要永久删除账号「{id}」吗？此操作不可恢复。',
  Confirm: '确认',
}

const dictionaries: Record<Lang, Record<string, string>> = { en, zh }

export function detectLang(): Lang {
  if (typeof navigator !== 'undefined') {
    const nav = (navigator.language || '').toLowerCase()
    if (nav.startsWith('zh')) return 'zh'
  }
  return 'en'
}

export function readStoredLang(): Lang | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch {
    // localStorage 不可用时忽略
  }
  return null
}

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TranslateFn
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>) {
  let out = dictionaries[lang][key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      out = out.split(`{${name}}`).join(String(value))
    }
  }
  return out
}

const fallback: I18nValue = {
  lang: 'en',
  setLang: () => {},
  t: (key, vars) => translate('en', key, vars),
}

const I18nContext = createContext<I18nValue>(fallback)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang() ?? detectLang())

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 忽略写入失败
    }
  }, [])

  const t = useCallback<TranslateFn>((key, vars) => translate(lang, key, vars), [lang])

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  return useContext(I18nContext)
}
