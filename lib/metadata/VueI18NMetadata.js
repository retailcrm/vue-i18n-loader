module.exports = class VueI18NMetadata {
  constructor () {
    this.paths = new Map()
  }

  getPaths (id) {
    if (this.paths.has(id)) {
      return this.paths.get(id)
    }

    return []
  }

  addPaths (id, paths) {
    const _knownPaths = this.getPaths(id)

    this.paths.set(id, _knownPaths.concat(paths.filter(p => !_knownPaths.includes(p))))
  }
}
