const { ReplaceSource } = require('webpack-sources')
const NullDependency = require('webpack/lib/dependencies/NullDependency')

class VueI18NDependency extends NullDependency {
  /**
   * @param {string} id
   * @param {string} path
   * @param range
   * @param {VueI18NMetadata} metadata
   */
  constructor(id, path, range, metadata) {
    super()
    this._VueI18N_data = {
      id,
      path,
      range,
      metadata,
    }
  }
}

class VueI18NDependencyTemplate {
  /**
   * @param {VueI18NDependency} dep
   * @param {ReplaceSource} source
   */
  apply (dep, source) {
    const {
      id,
      path,
      range,
      metadata,
    } = dep._VueI18N_data

    const knownPaths = metadata.getPaths(id)

    if (knownPaths.includes(path)) {
      source.replace(range[0], range[1] - 1, `"${id}.${path.replace(/"/, '\\"')}"`)
    }
  }
}

VueI18NDependency.Template = VueI18NDependencyTemplate

module.exports = VueI18NDependency
