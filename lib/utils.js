const hash = require('hash-sum')
const path = require('path')

const createId = (rootPath, resourcePath) => hash(
    path
        .relative(rootPath, resourcePath)
        .replace(/^(\.\.[\/\\])+/, '')
        .replace(/\\/g, '/')
)

module.exports = {
    createId,
}
