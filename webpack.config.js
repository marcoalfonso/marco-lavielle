const webpack = require("webpack");
const path = require("path");

module.exports = {
  entry: ["react-hot-loader/patch", "./src/index.js"],
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ["babel-loader"],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(jpg|png|woff|woff2|eot|ttf|svg)$/,
        loader: "file-loader?name=[path][name].[ext]?[hash]",
      },
    ],
  },
  resolve: {
    modules: [path.resolve("./src"), "node_modules"],
    extensions: [".js", ".jsx", ".json"],
  },
  output: {
    path: __dirname + "/public/dist",
    publicPath: "/",
    filename: "bundle.js",
    hotUpdateChunkFilename: "hot/hot-update.js",
    hotUpdateMainFilename: "hot/hot-update.json",
  },
  devtool: "source-map",
  optimization: {
    minimize: false,
  },
  plugins: [new webpack.HotModuleReplacementPlugin()],
  devServer: {
    contentBase: "./public/dist",
    hot: true,
  },
};
