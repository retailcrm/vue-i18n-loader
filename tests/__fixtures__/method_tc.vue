<template>
    <div>
        <div data-qa-1>{{ $tc('apples', 1) }}</div>
        <div data-qa-2>{{ $tc('apples', 10) }}</div>
    </div>
</template>

<i18n locale="en_GB">
{
    "apples": "{count} apple|{count} apples"
}
</i18n>

<i18n locale="ru_RU">
{
    "apples": "{count} яблоко|{count} яблок"
}
</i18n>
