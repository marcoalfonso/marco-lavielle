webpackHotUpdate("main",{

/***/ "./src/pages/SoftwarePage.js":
/*!***********************************!*\
  !*** ./src/pages/SoftwarePage.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\n\nvar _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if (\"value\" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();\n\nvar _react = __webpack_require__(/*! react */ \"./node_modules/react/index.js\");\n\nvar _react2 = _interopRequireDefault(_react);\n\nvar _propTypes = __webpack_require__(/*! prop-types */ \"./node_modules/prop-types/index.js\");\n\nvar _propTypes2 = _interopRequireDefault(_propTypes);\n\nvar _reactRedux = __webpack_require__(/*! react-redux */ \"./node_modules/react-redux/es/index.js\");\n\nvar _reactRouterDom = __webpack_require__(/*! react-router-dom */ \"./node_modules/react-router-dom/es/index.js\");\n\nvar _Software = __webpack_require__(/*! ../components/Software/Software */ \"./src/components/Software/Software.js\");\n\nvar _Software2 = _interopRequireDefault(_Software);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nfunction _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError(\"Cannot call a class as a function\"); } }\n\nfunction _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError(\"this hasn't been initialised - super() hasn't been called\"); } return call && (typeof call === \"object\" || typeof call === \"function\") ? call : self; }\n\nfunction _inherits(subClass, superClass) { if (typeof superClass !== \"function\" && superClass !== null) { throw new TypeError(\"Super expression must either be null or a function, not \" + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }\n\nvar SoftwarePage = function (_Component) {\n  _inherits(SoftwarePage, _Component);\n\n  function SoftwarePage() {\n    _classCallCheck(this, SoftwarePage);\n\n    return _possibleConstructorReturn(this, (SoftwarePage.__proto__ || Object.getPrototypeOf(SoftwarePage)).apply(this, arguments));\n  }\n\n  _createClass(SoftwarePage, [{\n    key: 'render',\n    value: function render() {\n      var _this2 = this;\n\n      var match = this.props.match;\n\n\n      return _react2.default.createElement(\n        _reactRouterDom.Switch,\n        null,\n        _react2.default.createElement(_reactRouterDom.Route, { exact: true, path: match.url, render: function render() {\n            return _react2.default.createElement(_Software2.default, _this2.props);\n          } })\n      );\n    }\n  }]);\n\n  return SoftwarePage;\n}(_react.Component);\n\nSoftwarePage.propTypes = {\n  match: _propTypes2.default.object.isRequired\n};\n\nvar mapStateToProps = function mapStateToProps(state) {\n  return {};\n};\n\nvar mapDispatchToProps = function mapDispatchToProps(dispatch) {\n  return {};\n};\n\nexports.default = (0, _reactRouterDom.withRouter)((0, _reactRedux.connect)(mapStateToProps, mapDispatchToProps)(SoftwarePage));\n\n//# sourceURL=webpack:///./src/pages/SoftwarePage.js?");

/***/ })

})