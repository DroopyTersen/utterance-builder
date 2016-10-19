module.exports = {
    entry: { "site": "./site.js" },
    output: {
        path: __dirname + "/dist",
        filename: "bundle.js",
    },
    module: {
        loaders: [
            addBabelLoader() //Enable writing ES6 javascript
        ]
    },
    devtool: "source-map"
};

// Transpile all js files to ES5
function addBabelLoader() {
    return {
        test: /\.js?$/,
        exclude: /(node_modules)/,
        loader: 'babel',
        query: {
            presets: ['es2015'],
        }
    };
}
