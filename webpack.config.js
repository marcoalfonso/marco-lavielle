const path = require("path");

module.exports = {
  entry: ["./src/index.js"],
  module: {
    rules: [
      {
        // ESM packages (e.g. react-quill-new) import "react/jsx-runtime"
        // without an extension; React 16 has no exports map to resolve it.
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ["babel-loader"],
      },
      {
        test: /\.css$/,
        // The *.module.css files are used as plain global stylesheets
        // (nothing reads their exports), so keep CSS Modules off; css-loader
        // 7 would otherwise hash their class names and break the styles.
        use: ["style-loader", { loader: "css-loader", options: { modules: false } }],
      },
      {
        test: /\.(jpg|png|woff|woff2|eot|ttf|svg)$/,
        type: "asset/resource",
        generator: { filename: "[path][name][ext]?[hash]" },
      },
    ],
  },
  resolve: {
    modules: [path.resolve("./src"), "node_modules"],
    extensions: [".js", ".jsx", ".json"],
  },
  output: {
    path: path.join(__dirname, "public/dist"),
    publicPath: "/",
    filename: "bundle.js",
  },
  devtool: "source-map",
  performance: {
    hints: false,
  },
  devServer: {
    static: "./public/dist",
    historyApiFallback: true,
    hot: true,
  },
};
