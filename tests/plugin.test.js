import 'core-js'

import path from 'path'
import webpack from 'webpack'

import FsInMemory from 'memory-fs'

import { JSDOM, VirtualConsole } from 'jsdom'

import VueLoaderPlugin from 'vue-loader/lib/plugin'
import VueI18NLoaderPlugin from '../lib/plugin'

import { createLocalVue, mount } from '@vue/test-utils'
import VueI18N from 'vue-i18n'

import { createId } from '../lib/utils'

/**
 * @typedef {Object} BundleResolve
 * @property {string} code
 * @property {webpack.Stats} stats
 */

/**
 * @typedef {Object} RunResolve
 * @property {any} instance
 * @property {Window} window
 * @property {any} module
 * @property {any} exports
 * @property {any} error
 */

/**
 * @param {string} fixture
 * @return {Promise<BundleResolve>}
 */
function compile (fixture) {
    const compiler = webpack({
        mode: 'development',

        devtool: 'source-map',

        context: __dirname,

        entry: './__fixtures__/entry.js',

        resolve: {
            alias: {
                '~target': path.resolve(__dirname, fixture),
            },
        },

        output: {
            path: '/',
            filename: 'bundle.js'
        },

        module: {
            rules: [{
                test: /\.vue$/,
                loader: 'vue-loader',
            }, {
                resourceQuery: /blockType=i18n/,
                type: 'javascript/auto',
                use: [path.resolve(__dirname, '../lib/loader.js')],
            }],
        },

        plugins: [
            new VueLoaderPlugin(),
            new VueI18NLoaderPlugin(),
        ],
    })

    const mfs = new FsInMemory()
    compiler.outputFileSystem = mfs

    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            if (err) {
                return reject(err)
            }
            if (stats.hasErrors()) {
                return reject(new Error(stats.toJson().errors.join(' | ')))
            }
            resolve({ code: mfs.readFileSync('/bundle.js').toString(), stats })
        })
    })
}

/**
 * @param {string} code
 * @param config
 * @return {Promise<RunResolve>}
 */
async function run (code, config = {}) {
    let dom = null
    let error

    try {
        // noinspection HtmlRequiredLangAttribute, HtmlRequiredTitleElement
        dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
            runScripts: 'outside-only',
            virtualConsole: new VirtualConsole(),
        })
        dom.window.eval(code)
    } catch (e) {
        console.error(`JSDOM error:\n${e.stack}`)
        error = e
    }

    if (!dom) {
        return Promise.reject(new Error('Cannot assigned JSDOM instance'))
    }

    const { window } = dom
    const { module, exports } = window

    const instance = {}

    if (module && module.beforeCreate) {
        module.beforeCreate.forEach(hook => hook.call(instance))
    }

    return Promise.resolve({
        window,
        module,
        exports,
        instance,
        error,
    })
}

describe('VueI18NLoaderPlugin', () => {
    const localVue = createLocalVue()

    localVue.use(VueI18N)

    test('Method $t', async () => {
        const id = createId('/', '/__fixtures__/method_t.vue')

        const { code } = await compile('./__fixtures__/method_t.vue')
        const { module } = await run(code)

        const i18n = new VueI18N({ locale: 'en_GB' })

        const wrapper = mount({ render: h => h({ ...module, i18n }) }, { localVue })
        const component = wrapper.vm.$children[0]

        expect(component).toBeTruthy()
        expect(component.$i18n.messages).toEqual({
            'en_GB': { [id]: {'test':'Test'} },
            'ru_RU': { [id]: {'test':'Тест'} },
        })

        expect(wrapper.text()).toEqual('Test')

        component.$i18n.locale = 'ru_RU'

        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toEqual('Тест')
    })

    test('Method $tc', async () => {
        const id = createId('/', '/__fixtures__/method_tc.vue')

        const { code } = await compile('./__fixtures__/method_tc.vue')
        const { module } = await run(code)

        const i18n = new VueI18N({ locale: 'en_GB' })

        const wrapper = mount({ render: h => h({ ...module, i18n }) }, { localVue })
        const component = wrapper.vm.$children[0]

        expect(component).toBeTruthy()
        expect(component.$i18n.messages).toEqual({
            'en_GB': { [id]: { 'apples': '{count} apple|{count} apples' } },
            'ru_RU': { [id]: { 'apples': '{count} яблоко|{count} яблок' } },
        })

        expect(wrapper.find('[data-qa-1]').text()).toEqual('1 apple')
        expect(wrapper.find('[data-qa-2]').text()).toEqual('10 apples')

        component.$i18n.locale = 'ru_RU'

        await wrapper.vm.$nextTick()

        expect(wrapper.find('[data-qa-1]').text()).toEqual('1 яблоко')
        expect(wrapper.find('[data-qa-2]').text()).toEqual('10 яблок')
    })

    test('Interpolation component i18n', async () => {
        const id = createId('/', '/__fixtures__/component_i18n.vue')

        const { code } = await compile('./__fixtures__/component_i18n.vue')
        const { module } = await run(code)

        const i18n = new VueI18N({ locale: 'en_GB' })

        const wrapper = mount({ render: h => h({ ...module, i18n }) }, { localVue })
        const component = wrapper.vm.$children[0]

        expect(component).toBeTruthy()
        expect(component.$i18n.messages).toEqual({
            'en_GB': { [id]: { 'hello': 'Hello, {0}!', 'world': 'world' } },
            'ru_RU': { [id]: { 'hello': 'Привет, {0}!', 'world': 'мир' } },
        })

        expect(wrapper.text()).toEqual('Hello, world!')

        component.$i18n.locale = 'ru_RU'

        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toEqual('Привет, мир!')
    })

    test('Directive v-t', async () => {
        const id = createId('/', '/__fixtures__/directive_v_t.vue')

        const { code } = await compile('./__fixtures__/directive_v_t.vue')
        const { module } = await run(code)

        const i18n = new VueI18N({ locale: 'en_GB' })

        const wrapper = mount({ render: h => h({ ...module, i18n }) }, { localVue })
        const component = wrapper.vm.$children[0]

        expect(component).toBeTruthy()
        expect(component.$i18n.messages).toEqual({
            'en_GB': { [id]: { 'directive_1': 'Directive 1', 'directive_2': 'Directive 2' } },
            'ru_RU': { [id]: { 'directive_1': 'Директива 1', 'directive_2': 'Директива 2' } },
        })

        expect(wrapper.text()).toContain('Directive 1')
        expect(wrapper.text()).toContain('Directive 2')

        component.$i18n.locale = 'ru_RU'

        await wrapper.vm.$nextTick()

        expect(wrapper.text()).toContain('Директива 1')
        expect(wrapper.text()).toContain('Директива 2')
    })
})
