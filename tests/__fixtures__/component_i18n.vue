<template>
    <i18n tag="div" path="hello">
        <b>{{ $t('world') }}</b>
    </i18n>
</template>

<i18n locale="en_GB">
{
    "hello": "Hello, {0}!",
    "world": "world"
}
</i18n>

<i18n locale="ru_RU">
{
    "hello": "Привет, {0}!",
    "world": "мир"
}
</i18n>
