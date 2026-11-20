/** 探测 Node global；使用 typeof 避免在没有该变量的浏览器环境中抛错。 */
export const freeGlobal = typeof global === 'object' && global !== null && global.Object === Object && global
