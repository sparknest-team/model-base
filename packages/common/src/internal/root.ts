/** 跨环境全局对象探测；最后的 Function 回退可能受严格 CSP 限制，保留现有兼容策略。 */
/* global globalThis, self */
import { freeGlobal } from './freeGlobal'

/** Detect free variable `globalThis` */
const freeGlobalThis =
  typeof globalThis === 'object' && globalThis !== null && globalThis.Object == Object && globalThis

/** Detect free variable `self`. */
const freeSelf = typeof self === 'object' && self !== null && self.Object === Object && self

/** Used as a reference to the global object. */
export const root = freeGlobalThis || freeGlobal || freeSelf || Function('return this')()
