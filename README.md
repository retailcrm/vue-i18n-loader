# vue-i18n-loader

This is an experimental webpack tool for `vue-i18n`. The package provides webpack loader and plugin to load translations from
`<i18n>` custom blocks.

If the plugin added to a `webpack.config.js`, it will add
prefix to translation messages paths & their usages in `<template>`/`script` blocks.
Currently, not all variants of `vue-i18n` syntax are covered with prefix, in particular,
renamings are not supported:
```javascript
const t = this.$i18n.t

t('some.translation.path') // will not be prefixed
```

Supported syntax:
* methods `$t`, `$tc` in templates;
* methods `t`, `tc` in `this.$i18n.%methodName%` calls;
* directive `v-t`;
* interpolation component `<i18n>`.

Restrictions:
* renamings;
* usage as map method like `paths.map(this.$i18n.t)` or similar;
* computed dynamic paths.

Webpack config example:

```javascript
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const VueI18NLoaderPlugin = require('@retailcrm/vue-i18n-loader/lib/plugin')

module.exports = {
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
      loader: '@retailcrm/vue-i18n-loader',
    }],
  },

  plugins: [
    new VueLoaderPlugin(),
    new VueI18NLoaderPlugin(),
  ],
}
```

