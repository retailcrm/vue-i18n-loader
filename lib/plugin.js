const qs = require('querystring')
const walk = require('acorn-walk')

const NullFactory = require('webpack/lib/NullFactory')

const VueI18NDependency = require('./dependencies/VueI18NDependency')
const VueI18NMetadata = require('./metadata/VueI18NMetadata')

const utils = require('./utils')

/**
 * @typedef {webpack.Compiler} Compiler
 */

/**
 * @typedef {webpack.compilation.normalModuleFactory.Parser} Parser
 */

/**
 * @typedef {webpack.compilation.Module} Module
 */

/**
 * @typedef {Object} Loader
 * @property {string} loader
 * @property {*} options
 * @property {string|undefined} indent
 * @property {string|undefined} type
 */

/**
 *
 * @typedef {Object} NormalModuleExtend
 * @property {string|undefined} resource
 * @property {string|undefined} request
 * @property {string|undefined} userRequest
 * @property {Parser} parser
 * @property {Array<Loader>} loaders
 * @method addDependency(dep): void
 */

/**
 * @typedef {Module & NormalModuleExtend} NormalModule
 */

/**
 * @param {CallExpression} e
 * @param objName
 * @param propName
 * @return {boolean}
 */
const matchesVarCall = (e, [objName, propName]) => e.callee.type === 'MemberExpression'
    && e.callee.object.type === 'Identifier'
    && e.callee.object.name === objName
    && e.callee.property.name === propName

/**
 * @param {CallExpression} e
 * @param objName
 * @param propName
 * @return {boolean}
 */
const matchesThisCall = (e, [objName, propName]) => e.callee.type === 'MemberExpression'
    && e.callee.object.type === 'MemberExpression'
    && e.callee.object.object.type === 'ThisExpression'
    && e.callee.object.property.name === objName
    && e.callee.property.name === propName

/**
 * @param {CallExpression} e
 * @param componentName
 * @return {boolean}
 */
const matchesComponentCall = (e, componentName) => {
    const { callee, arguments: [calledComponentName] } = e

    return callee.type === 'Identifier'
        && callee.name === '_c'
        && calledComponentName
        && calledComponentName.type === 'Literal'
        && calledComponentName.value === componentName
}

/**
 * @param {CallExpression} e
 * @returns {null|ObjectExpression}
 */
const getDirectiveObject = (e) => {
    /** @type {ObjectExpression} */
    const objectExpression = e.arguments[1]

    if (e.callee.type === 'Identifier'
      && e.callee.name === '_c'
      && isObjectExpression(objectExpression)
    ) {
        /** @type {Property} */
        const directives = objectExpression.properties.find(prop => hasPropertyWithDirectives(prop))

        if (isArrayProp(directives)) {
            /** @type {ObjectExpression} */
            const object = directives.value.elements.find(elem => isObjectExpression(elem))
            /** @type {Property} */
            const prop = object.properties.find(prop => prop.value.value === 'v-t')

            return prop ? object : null
        }

        return null
    }
}

/**
 * @param {ObjectExpression} directiveObject
 * @return {Property}
 */
const getPathToDirectiveValue = (directiveObject) => {
    /** @type {Property} */
    let property = directiveObject.properties.find(prop => prop.key.name === 'value')

    // если директива используется как: <p v-t="{ path: 'directive_detected' }"/>
    if (property.value.type === 'ObjectExpression') {
        property = property.value.properties.find(prop => prop.key.name === 'path')
    }

    return property
}

const isLiteral = node => node && node.type === 'Literal'

const isObjectExpression = node => node && node.type === 'ObjectExpression'

const hasPropertyWithDirectives = property => property && property.key.name === 'directives'

const isArrayProp = property => property && property.value.type === 'ArrayExpression'

module.exports = class VueI18NLoaderPlugin {
    constructor () {
        this.name = 'VueI18NLoaderPlugin'
    }

    /**
     * @param {Compiler} compiler
     */
    apply (compiler) {
        const metadata = new VueI18NMetadata()

        const rootPath = compiler.options.context || process.cwd()

        const createId = resourcePath => utils.createId(rootPath, resourcePath)

        compiler.hooks.compilation.tap(this.name, (compilation, { normalModuleFactory }) => {
            compilation.hooks.normalModuleLoader.tap(this.name, loaderCtx => {
                loaderCtx.__vueI18NMetadata = metadata
            })

            compilation.dependencyFactories.set(VueI18NDependency, new NullFactory())
            compilation.dependencyTemplates.set(VueI18NDependency, new VueI18NDependency.Template())

            /**
             * @param {Parser} parser
             */
            const handler = (parser) => {
                parser.hooks.program.tap(this.name, ast => {
                    const [resourcePath, resourceQuery] = parser.state.module.resource.split('?')

                    const id = createId(resourcePath)
                    const query = qs.parse(resourceQuery)

                    if (resourcePath.endsWith('.vue') && ['template', 'script'].includes(query.type)) {
                        const addDependency = path => {
                            const dep = new VueI18NDependency(id, path.value, path.range, metadata)
                            dep.loc = path.loc

                            parser.state.current.addDependency(dep)
                        }

                        walk.simple(ast, {
                            /**
                             * @param {CallExpression} expression
                             */
                            CallExpression (expression) {
                                // @TODO:
                                // Calculate object name _vm - seek `var _vm = this` in ast
                                // Maybe another visitor method could help, it will be called earlier,
                                // cause of AST structure
                                // Suggestion: seek `$createElement` renaming & extract identifier from it
                                // (to be sure it is done correctly)
                                // VariableDeclarator, id / init, init.type = ThisExpression
                                if ((
                                    matchesVarCall(expression, ['_vm', '$t']) // _vm.$t
                                    || matchesVarCall(expression, ['_vm', '$tc']) // _vm.$tc
                                    || matchesThisCall(expression, ['$i18n', 't']) // this.$i18n.t
                                    || matchesThisCall(expression, ['$i18n', 'tc']) // this.$i18n.tc
                                )) {
                                    const [path] = expression.arguments

                                    if (isLiteral(path)) {
                                        addDependency(path)
                                    }

                                    return
                                }

                                if (matchesComponentCall(expression, 'i18n')) { // _c('i18n', ...)
                                    /** @type {ObjectExpression} */
                                    const vNodeData = expression.arguments[1]

                                    /** @type {Property} */
                                    const attrs = vNodeData.properties.find(prop => prop.key.name === 'attrs')

                                    if (!attrs) {
                                        return
                                    }

                                    /** @type {Property} */
                                    const path = attrs.value.properties.find(prop => prop.key.name === 'path')

                                    if (path && isLiteral(path.value)) {
                                        addDependency(path.value)
                                    }
                                }

                                /** @type {ObjectExpression} */
                                const directives = getDirectiveObject(expression)

                                if (directives) {
                                    /** @type {Property} */
                                    const path = getPathToDirectiveValue(directives)

                                    if (isLiteral(path.value)) {
                                        addDependency(path.value)
                                    }
                                }
                            },
                        })
                    }
                })
            }

            const parser = normalModuleFactory.hooks.parser

            parser.for('javascript/auto').tap(this.name, handler)
            parser.for('javascript/dynamic').tap(this.name, handler)
            parser.for('javascript/esm').tap(this.name, handler)
        })
    }
}
