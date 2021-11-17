<template>
    <div>
        <p v-t="'directive_1'"/>
        <p v-t="{ path: 'directive_2' }"/>
    </div>
</template>

<i18n locale="en_GB">
{
    "directive_1": "Directive 1",
    "directive_2": "Directive 2"
}
</i18n>

<i18n locale="ru_RU">
{
    "directive_1": "Директива 1",
    "directive_2": "Директива 2"
}
</i18n>
