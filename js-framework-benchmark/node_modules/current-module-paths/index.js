import { fileURLToPath } from 'url'
import path from 'path'

function getModulePaths (fileURL) {
  const __filename = fileURLToPath(fileURL)
  const __dirname = path.dirname(__filename)
  return { __filename, __dirname }
}

export default getModulePaths
