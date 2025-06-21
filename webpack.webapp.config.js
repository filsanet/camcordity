var webpack = require("webpack"),
  path = require("path"),
  fileSystem = require("fs-extra"),
  env = require("./utils/env"),
  CopyWebpackPlugin = require("copy-webpack-plugin"),
  HtmlWebpackPlugin = require("html-webpack-plugin"),
  TerserPlugin = require("terser-webpack-plugin");
var { CleanWebpackPlugin } = require("clean-webpack-plugin");

const ASSET_PATH = process.env.ASSET_PATH || "/";

var fileExtensions = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "eot",
  "otf",
  "svg",
  "ttf",
  "woff",
  "woff2",
];

var options = {
  mode: process.env.NODE_ENV || "production",
  performance: {
    hints: false,
  },
  entry: {
    // Single entry point for web app
    webapp: path.join(__dirname, "src", "index.jsx"),
  },

  output: {
    filename: "[name].[contenthash].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
    publicPath: ASSET_PATH,
  },

  module: {
    rules: [
      {
        // look for .css or .scss files
        test: /\.(css|scss)$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: new RegExp(".(" + fileExtensions.join("|") + ")$"),
        type: "asset/resource",
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        loader: "html-loader",
        exclude: /node_modules/,
      },
      { test: /\.(ts|tsx)$/, loader: "ts-loader", exclude: /node_modules/ },
      {
        test: /\.(js|jsx)$/,
        use: [
          {
            loader: "source-map-loader",
          },
          {
            loader: "babel-loader",
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    extensions: fileExtensions
      .map((extension) => "." + extension)
      .concat([".js", ".jsx", ".ts", ".tsx", ".css"]),
  },

  plugins: [
    new CleanWebpackPlugin({ verbose: false }),
    new webpack.ProgressPlugin(),
    
    // Expose environment variables with defaults
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development'
    }),
    
    // Copy static assets
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "src/assets/",
          to: path.join(__dirname, "dist/assets"),
          force: true,
        },
      ],
    }),
    
    // Copy localization files
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "src/_locales/",
          to: path.join(__dirname, "dist/_locales"),
          force: true,
        },
      ],
    }),
    
    // Generate main HTML file
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "public", "index.html"),
      filename: "index.html",
      chunks: ["webapp"],
      cache: false,
    }),

    // Service worker for offline functionality
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "src/sw.js",
          to: "sw.js",
          force: true,
        },
      ],
    }),
  ],

  // Development server configuration
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    compress: true,
    port: 3000,
    hot: true,
    historyApiFallback: true, // Enable client-side routing
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    server: "https", // Required for getDisplayMedia API
  },

  // Optimization for production
  optimization: {
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          priority: 10,
          chunks: "all",
        },
        common: {
          name: "common",
          minChunks: 2,
          priority: 5,
          chunks: "all",
          enforce: true,
        },
      },
    },
  },
};

if (env.NODE_ENV === "development") {
  options.devtool = "cheap-module-source-map";
} else {
  options.optimization.minimize = true;
  options.optimization.minimizer = [
    new TerserPlugin({
      extractComments: false,
    }),
  ];
}

module.exports = options;