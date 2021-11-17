module.exports = {
    rootDir: __dirname,
    moduleFileExtensions: [
        'js',
    ],
    modulePaths: [
        '<rootDir>',
    ],
    transform: {
        '.*\\.js$': 'babel-jest',
    },
    testEnvironment: 'jsdom',
    testPathIgnorePatterns : ['/__fixtures__/'],
    testRunner: 'jest-jasmine2',
}
