import arrayify from 'array-back'
import path from 'path'
import { pathToFileURL } from 'url'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

/**
 * @module load-module
 * @typicalname loadModule
 */

export async function loadModule (specifier, options = {}) {
  if (!(options.paths || (options.resolvedFromPaths && options.relativeToPaths))) {
    throw new Error('Must supply either options.paths or both options.resolvedFromPaths and options.relativeToPaths')
  }
  let mod = await loadModuleResolvedFrom(specifier, options.resolvedFromPaths || options.paths)
  if (mod === null) {
    mod = await loadModuleRelativeTo(specifier, options.relativeToPaths || options.paths)
  }
  if (mod === null) {
    throw new Error('Module not found: ' + specifier)
  }
  return mod
}


/**
 * @param {string} - A valid Node.js module specifier.
 */
export async function loadModuleSpecifier (specifier) {
  if (typeof specifier !== 'string') {
    throw new Error('specifier expected')
  }
  try {
    const mod = await import(specifier)
    return mod.default
  } catch (err) {
    if (['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'].includes(err.code)) {
      return null
    } else {
      throw err
    }
  }
}

/**
 * @param {string} - A valid Node.js module specifier.
 * @param {string|string[]} - One or more additional directories from which to resolve the supplied specifier from.
 */
export async function loadModuleResolvedFrom (specifier, paths) {
  if (!(specifier && paths && paths.length)) {
    throw new Error('specifier and paths expected')
  }
  try {
    specifier = require.resolve(specifier, { paths: arrayify(paths) })
    return loadModuleSpecifier(pathToFileURL(specifier).href)
  } catch (err) {
    if (['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'].includes(err.code)) {
      return null
    } else {
      throw err
    }
  }
}

/**
 * @param {string} - A valid module path.
 * @param {string|string[]} - One or more additional directories in which to search for the supplied module path.
 */
export async function loadModuleRelativeTo (specifier, paths) {
  if (!(specifier && paths && paths.length)) {
    throw new Error('specifier and paths expected')
  }
  let output = null
  for (const p of arrayify(paths)) {
    output = await loadModuleSpecifier(pathToFileURL(path.resolve(p, specifier)).href)
    if (output) break
  }
  return output
}
