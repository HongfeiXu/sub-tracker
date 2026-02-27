import type { Category, BillingCycle } from './types'

export const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'subtracker_subscriptions',
  CATEGORIES: 'subtracker_categories',
  THEME: 'subtracker_theme',
} as const

export const DEFAULT_CATEGORIES: Category[] = [
  { name: '影音娱乐', color: '#FF6B8A' },
  { name: '工具软件', color: '#5B9EF4' },
  { name: '云存储', color: '#47D4A0' },
  { name: '会员服务', color: '#FFB74D' },
  { name: '其他', color: '#A78BFA' },
]

export const COLOR_PALETTE = ['#FF6B8A', '#5B9EF4', '#47D4A0', '#FFB74D', '#A78BFA', '#F472B6', '#34D399', '#FBBF24', '#818CF8', '#FB923C']

export const BRAND_COLORS: Record<string, string> = {
  netflix: '#E50914',
  spotify: '#1DB954',
  icloud: '#3693F3',
  apple: '#555555',
  youtube: '#FF0000',
  chatgpt: '#10A37F',
  openai: '#10A37F',
  claude: '#D97757',
  notion: '#000000',
  github: '#24292E',
  figma: '#A259FF',
  adobe: '#FF0000',
  bilibili: '#FB7299',
  b站: '#FB7299',
  爱奇艺: '#00BE06',
  腾讯视频: '#FF6A1E',
  优酷: '#1EBFFF',
  网易云音乐: '#C20C0C',
  qq音乐: '#31C27C',
  百度网盘: '#06A7FF',
  wps: '#1B6DF1',
  微信读书: '#2A8745',
  京东: '#E4393C',
}

export const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: '月付',
  quarterly: '季付',
  yearly: '年付',
  custom: '自定义',
}
