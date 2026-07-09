import { createContext, useContext } from 'react'

export const EntitlementsContext = createContext(null)

const FEATURE_TIERS = {
  unlimited_products: ['pro', 'negocios', 'empresarial'],
  export_csv:         ['pro', 'negocios', 'empresarial'],
  ai_analysis:        ['pro', 'negocios', 'empresarial'],
  advanced_reports:   ['negocios', 'empresarial'],
  multi_device:       ['empresarial'],
}

export const FREE_PRODUCT_WARNING = 35
export const FREE_PRODUCT_HARD    = 40

export const DEFAULT_ENTS = {
  tier: 'gratis', plan: null, valid: false, grace: false, founder: false, expires_at: null,
}

export function can(ents, feature) {
  return (FEATURE_TIERS[feature] || []).includes(ents?.tier)
}

export function tierLabel(tier) {
  return { gratis: 'Gratis', pro: 'Pro', negocios: 'Negocios', empresarial: 'Empresarial' }[tier] || tier
}

/** Hook — use inside any component under EntitlementsProvider */
export function useEntitlements() {
  const ctx = useContext(EntitlementsContext)
  if (!ctx) throw new Error('useEntitlements must be used inside AppInner')
  return ctx
}
