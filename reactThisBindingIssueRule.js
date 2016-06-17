"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ts = require('typescript');
var Lint = require('tslint/lib/lint');
var ErrorTolerantWalker_1 = require('./utils/ErrorTolerantWalker');
var SyntaxKind_1 = require('./utils/SyntaxKind');
var AstUtils_1 = require('./utils/AstUtils');
var FAILURE_DOUBLE_BIND = 'A function is having its \'this\' reference bound twice in the constructor: ';
var FAILURE_UNBOUND_LISTENER = 'A class method is passed as a JSX attribute without having the \'this\' ' +
    'reference bound in the constructor: ';
var Rule = (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        _super.apply(this, arguments);
    }
    Rule.prototype.apply = function (sourceFile) {
        if (sourceFile.languageVariant === ts.LanguageVariant.JSX) {
            return this.applyWithWalker(new ReactThisBindingIssueRuleWalker(sourceFile, this.getOptions()));
        }
        else {
            return [];
        }
    };
    return Rule;
}(Lint.Rules.AbstractRule));
exports.Rule = Rule;
var ReactThisBindingIssueRuleWalker = (function (_super) {
    __extends(ReactThisBindingIssueRuleWalker, _super);
    function ReactThisBindingIssueRuleWalker() {
        _super.apply(this, arguments);
        this.boundListeners = [];
        this.declaredMethods = [];
    }
    ReactThisBindingIssueRuleWalker.prototype.visitClassDeclaration = function (node) {
        var _this = this;
        this.boundListeners = [];
        this.declaredMethods = [];
        AstUtils_1.AstUtils.getDeclaredMethodNames(node).forEach(function (methodName) {
            _this.declaredMethods.push('this.' + methodName);
        });
        _super.prototype.visitClassDeclaration.call(this, node);
    };
    ReactThisBindingIssueRuleWalker.prototype.visitConstructorDeclaration = function (node) {
        this.boundListeners = this.getSelfBoundListeners(node);
        _super.prototype.visitConstructorDeclaration.call(this, node);
    };
    ReactThisBindingIssueRuleWalker.prototype.visitJsxElement = function (node) {
        this.visitJsxOpeningElement(node.openingElement);
        _super.prototype.visitJsxElement.call(this, node);
    };
    ReactThisBindingIssueRuleWalker.prototype.visitJsxSelfClosingElement = function (node) {
        this.visitJsxOpeningElement(node);
        _super.prototype.visitJsxSelfClosingElement.call(this, node);
    };
    ReactThisBindingIssueRuleWalker.prototype.visitJsxOpeningElement = function (node) {
        var _this = this;
        node.attributes.forEach(function (attributeLikeElement) {
            if (_this.isUnboundListener(attributeLikeElement)) {
                var attribute = attributeLikeElement;
                var jsxExpression = attribute.initializer;
                var propAccess = jsxExpression.expression;
                var listenerText = propAccess.getText();
                if (_this.declaredMethods.indexOf(listenerText) > -1 && _this.boundListeners.indexOf(listenerText) === -1) {
                    var start = propAccess.getStart();
                    var widget = propAccess.getWidth();
                    var message = FAILURE_UNBOUND_LISTENER + listenerText;
                    _this.addFailure(_this.createFailure(start, widget, message));
                }
            }
        });
    };
    ReactThisBindingIssueRuleWalker.prototype.isUnboundListener = function (attributeLikeElement) {
        if (attributeLikeElement.kind === SyntaxKind_1.SyntaxKind.current().JsxAttribute) {
            var attribute = attributeLikeElement;
            if (attribute.initializer != null && attribute.initializer.kind === SyntaxKind_1.SyntaxKind.current().JsxExpression) {
                var jsxExpression = attribute.initializer;
                if (jsxExpression.expression != null && jsxExpression.expression.kind === SyntaxKind_1.SyntaxKind.current().PropertyAccessExpression) {
                    var propAccess = jsxExpression.expression;
                    if (propAccess.expression.getText() === 'this') {
                        var listenerText = propAccess.getText();
                        if (this.declaredMethods.indexOf(listenerText) > -1 && this.boundListeners.indexOf(listenerText) === -1) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };
    ReactThisBindingIssueRuleWalker.prototype.getSelfBoundListeners = function (node) {
        var _this = this;
        var result = [];
        if (node.body != null && node.body.statements != null) {
            node.body.statements.forEach(function (statement) {
                if (statement.kind === SyntaxKind_1.SyntaxKind.current().ExpressionStatement) {
                    var expressionStatement = statement;
                    var expression = expressionStatement.expression;
                    if (expression.kind === SyntaxKind_1.SyntaxKind.current().BinaryExpression) {
                        var binaryExpression = expression;
                        var operator = binaryExpression.operatorToken;
                        if (operator.kind === SyntaxKind_1.SyntaxKind.current().EqualsToken) {
                            if (binaryExpression.left.kind === SyntaxKind_1.SyntaxKind.current().PropertyAccessExpression) {
                                var leftPropText = binaryExpression.left.getText();
                                if (binaryExpression.right.kind === SyntaxKind_1.SyntaxKind.current().CallExpression) {
                                    var callExpression = binaryExpression.right;
                                    if (AstUtils_1.AstUtils.getFunctionName(callExpression) === 'bind'
                                        && callExpression.arguments != null
                                        && callExpression.arguments.length === 1
                                        && callExpression.arguments[0].getText() === 'this') {
                                        var rightPropText = AstUtils_1.AstUtils.getFunctionTarget(callExpression);
                                        if (leftPropText === rightPropText) {
                                            if (result.indexOf(rightPropText) === -1) {
                                                result.push(rightPropText);
                                            }
                                            else {
                                                var start = binaryExpression.getStart();
                                                var width = binaryExpression.getWidth();
                                                var msg = FAILURE_DOUBLE_BIND + binaryExpression.getText();
                                                _this.addFailure(_this.createFailure(start, width, msg));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }
        return result;
    };
    return ReactThisBindingIssueRuleWalker;
}(ErrorTolerantWalker_1.ErrorTolerantWalker));
//# sourceMappingURL=reactThisBindingIssueRule.js.map