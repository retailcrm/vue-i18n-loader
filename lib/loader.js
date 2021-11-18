const qs = require('querystring')

const JSON5 = require('json5')
const yaml = require('js-yaml')

const { createId } = require('./utils')

/**
 * @typedef {T|Record<string, T>} SelfSimilar
 * @typedef {string} Locale
 * @typedef {SelfSimilar<string>} Messages
 * @typedef {Record<Locale, Messages>} Translations
 * @template T
 */

/**
 * @type {webpack.loader.Loader}
 * @param {string|Buffer} source
 * @param sourceMap
 */
const loader = function (source, sourceMap) {
    /** @type {webpack.loader.LoaderContext} */
    const loaderContext = this

    const {
        rootContext,
        resourcePath,
        resourceQuery,
        version,
        /** @type {VueI18NMetadata|undefined} */
        __vueI18NMetadata
    } = loaderContext

    const rootPath = rootContext || process.cwd()

    const query = qs.parse(resourceQuery)

    if (version && Number(version) >= 2) {
        try {
            loaderContext.cacheable && loaderContext.cacheable()

            const translations = parse(source, query)

            if (typeof __vueI18NMetadata !== 'undefined') {
                const id = createId(rootPath, resourcePath)

                /** @type {Translations} */
                const prefixed = Object.keys(translations).reduce((prefixed, locale) => {
                    return Object.assign({}, prefixed, { [locale]: { [id]: translations[locale] } })
                }, {})

                __vueI18NMetadata.addPaths(id, getPaths(translations))

                loaderContext.callback(
                    null,
                    `module.exports = ${getCode(prefixed)}`,
                    sourceMap,
                )
            } else {
                loaderContext.callback(
                    null,
                    `module.exports = ${getCode(translations)}`,
                    sourceMap,
                )
            }
        } catch (err) {
            loaderContext.emitError(err.message)
            loaderContext.callback(err)
        }
    } else {
        const message = 'supports loader API version 2 and later'
        loaderContext.emitError(message)
        loaderContext.callback(new Error(message))
    }
}

/**
 * @param {Translations} translations
 * @return {string}
 */
function getCode(translations) {
    const value = JSON.stringify(translations)
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029')
        .replace(/\\/g, '\\\\')
        .replace(/\u0027/g, '\\u0027')

    return `function (component) {
  component.options.__i18n = component.options.__i18n || []
  component.options.__i18n.push('${value}')
  delete component.options._Ctor
}\n`
}

/**
 * @param {Translations} translations
 * @return {string[]}
 */
function getPaths (translations) {
    const paths = []

    Object.values(translations).forEach(messages => {
        const extract = (messages, prevPath) => {
            Object.keys(messages).forEach(key => {
                const currPath = prevPath ? prevPath + '.' + key : key

                if (typeof messages[key] === 'string' && !paths.includes(currPath)) {
                    paths.push(currPath)
                } else if (typeof messages[key] === 'object') {
                    extract(messages[key], currPath)
                }
            })
        }

        extract(messages)
    })

    return paths
}

/**
 * @param {string|Buffer} source
 * @param {Record<string, unknown>} query
 * @return {Translations}
 */
function parse (source, query) {
    const value = JSON.parse(convert(source, query.lang))

    if (query.locale && typeof query.locale === 'string') {
        return Object.assign({}, { [query.locale]: value })
    }

    return value
}

/**
 * @param {string|Buffer} source
 * @param {string} lang
 * @return {string}
 */
function convert(source, lang) {
    const value = Buffer.isBuffer(source) ? source.toString() : source

    switch (lang) {
        case 'yaml':
        case 'yml':
            return JSON.stringify(yaml.load(value), undefined, '\t')
        case 'json5':
            return JSON.stringify(JSON5.parse(value))
        default:
            return value
    }
}

module.exports = loader
