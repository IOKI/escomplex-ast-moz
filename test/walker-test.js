'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var esprima = require('esprima');
var walker = require('../src');

// List of test cases taken directly from the ESTree
// spec (https://github.com/estree/estree)
suite('AST Walker', function () {

    setup(function () {
        this.callbacks = {
            processNode: sinon.stub(),
            createScope: sinon.stub(),
            popScope: sinon.stub()
        };

        this.walk = function parse (code) {
            var tree = esprima.parse(code);
            walker.walk(tree, {}, this.callbacks);
        };
    });


    suite('Unsupported Syntax', function () {
        test('empty statement', function () {
            this.walk(';');
            assert.strictEqual(this.callbacks.processNode.callCount, 0);
        });

        test('labeled statement', function () {
            this.walk('foo: a;');
            assert.strictEqual(this.callbacks.processNode.callCount, 0);
        });
    });


    suite('Statements', function () {
        test('empty block statement', function () {
            this.walk('{}');

            var blockNode = this.callbacks.processNode.firstCall.args[0];
            assert.strictEqual(blockNode.type, 'BlockStatement');
            assert.strictEqual(blockNode.body.length, 0);

            assert.strictEqual(this.callbacks.createScope.callCount, 0);
            assert.strictEqual(this.callbacks.popScope.callCount, 0);
        });

        test('expression statement', function () {
            this.walk('a');

            var statement = this.callbacks.processNode.firstCall.args[0];
            var expression = this.callbacks.processNode.secondCall.args[0];
            assert.strictEqual(statement.type, 'ExpressionStatement');
            assert.strictEqual(statement.expression, expression);
            assert.strictEqual(this.callbacks.createScope.callCount, 0);
            assert.strictEqual(this.callbacks.popScope.callCount, 0);
        });

        test('if statement', function () {
            this.walk('if (true) { true; } else { false; }');

            var statement = this.callbacks.processNode.firstCall.args[0];
            assert.strictEqual(statement.type, 'IfStatement');
            assert.strictEqual(statement.test.type, 'Literal');
            assert.strictEqual(statement.test.value, true);
            assert.strictEqual(statement.consequent.body[0].expression.value, true);
            assert.strictEqual(statement.alternate.body[0].expression.value, false);
        });


        test('break statement');
        test('continue statement');
        test('with statement');
        test('switch statement');
        test('return statement');
        test('throw statement');
        test('try statement');
        test('while statement');
        test('do-while statement');

        test('for statement', function () {
            var statement;

            this.walk('for (var i = 0;;) true;');
            statement = this.callbacks.processNode.firstCall.args[0];
            assert.strictEqual(statement.type, 'ForStatement');
            assert.strictEqual(statement.init.type, 'VariableDeclaration');
            assert.isNull(statement.test);
            assert.isNull(statement.update);
            assert.strictEqual(statement.body.type, 'ExpressionStatement');
            this.callbacks.processNode.reset();

            this.walk('for (var i = 0; i < 10; i++) true;');
            statement = this.callbacks.processNode.getCall(0).args[0];
            assert.strictEqual(statement.type, 'ForStatement');
            assert.strictEqual(statement.init.type, 'VariableDeclaration');
            assert.strictEqual(statement.test.type, 'BinaryExpression');
            assert.strictEqual(statement.update.type, 'UpdateExpression');
            assert.strictEqual(statement.body.type, 'ExpressionStatement');
            this.callbacks.processNode.reset();

            this.walk('for (var i = 0; i < 10; i++) { true; }');
            statement = this.callbacks.processNode.getCall(0).args[0];
            assert.strictEqual(statement.type, 'ForStatement');
            assert.strictEqual(statement.init.type, 'VariableDeclaration');
            assert.strictEqual(statement.test.type, 'BinaryExpression');
            assert.strictEqual(statement.update.type, 'UpdateExpression');
            assert.strictEqual(statement.body.type, 'BlockStatement');
            this.callbacks.processNode.reset();
        });

        test('for-in statement');

        test('for-of statement', function () {
            this.walk('for (let test of subject) { true; }');

            var statement = this.callbacks.processNode.firstCall.args[0];
            assert.strictEqual(statement.type, 'ForOfStatement');
            assert.strictEqual(statement.left.type, 'VariableDeclaration');
            assert.strictEqual(statement.left.declarations.length, 1);
            assert.strictEqual(statement.left.kind, 'let');
            assert.strictEqual(statement.right.type, 'Identifier');
            assert.strictEqual(statement.right.name, 'subject');
            assert.strictEqual(statement.body.type, 'BlockStatement');
        });

        test('debugger statement', function () {
            this.walk('debugger');

            var statement = this.callbacks.processNode.firstCall.args[0];
            assert.strictEqual(statement.type, 'DebuggerStatement');
        });
    });


    suite('Declarations', function () {
        test('function declaration', function () {
            this.walk('function foo() {}');

            var declaration = this.callbacks.processNode.firstCall.args[0];
            assert.strictEqual(declaration.type, 'FunctionDeclaration');
            assert.strictEqual(declaration.id.name, 'foo');
            assert.strictEqual(declaration.id.type, 'Identifier');
            assert.strictEqual(declaration.params.length, 0);
            assert.strictEqual(declaration.body.type, 'BlockStatement');
            assert.strictEqual(declaration.body.body.length, 0);
        });

        test('generator function declaration', function () {
            this.walk('function* foo() {}');

            var declaration = this.callbacks.processNode.firstCall.args[0];
            assert.strictEqual(declaration.type, 'FunctionDeclaration');
            assert.strictEqual(declaration.id.name, 'foo');
            assert.strictEqual(declaration.id.type, 'Identifier');
            assert.strictEqual(declaration.generator, true);
            assert.strictEqual(declaration.params.length, 0);
            assert.strictEqual(declaration.body.type, 'BlockStatement');
            assert.strictEqual(declaration.body.body.length, 0);
        });

        test('var declaration', function () {
            this.walk('var a = 1');

            var statement = this.callbacks.processNode.firstCall.args[0];
            assert.strictEqual(statement.type, 'VariableDeclaration');
            assert.strictEqual(statement.kind, 'var');
            assert.strictEqual(statement.declarations.length, 1);
        });

        test('let declaration', function () {
            this.walk('let a = 1');
            
            var statement = this.callbacks.processNode.firstCall.args[0];
            assert.strictEqual(statement.type, 'VariableDeclaration');
            assert.strictEqual(statement.kind, 'let');
            assert.strictEqual(statement.declarations.length, 1);
        });

        test('const declaration', function () {
            this.walk('const a = 1');

            var statement = this.callbacks.processNode.firstCall.args[0];
            assert.strictEqual(statement.type, 'VariableDeclaration');
            assert.strictEqual(statement.kind, 'const');
            assert.strictEqual(statement.declarations.length, 1);
        });

        test('var declarator', function () {
            this.walk('var a = 1');

            var statement = this.callbacks.processNode.firstCall.args[0];
            var declarator = this.callbacks.processNode.secondCall.args[0];
            assert.strictEqual(statement.declarations[0], declarator);
            assert.strictEqual(declarator.id.type, 'Identifier');
            assert.strictEqual(declarator.id.name, 'a');
        });

        test('let declarator', function () {
            this.walk('let a = 1');

            var statement = this.callbacks.processNode.firstCall.args[0];
            var declarator = this.callbacks.processNode.secondCall.args[0];
            assert.strictEqual(statement.declarations[0], declarator);
            assert.strictEqual(declarator.id.type, 'Identifier');
            assert.strictEqual(declarator.id.name, 'a');
        });

        test('const declarator', function () {
            this.walk('const a = 1');

            var statement = this.callbacks.processNode.firstCall.args[0];
            var declarator = this.callbacks.processNode.secondCall.args[0];
            assert.strictEqual(statement.declarations[0], declarator);
            assert.strictEqual(declarator.id.type, 'Identifier');
            assert.strictEqual(declarator.id.name, 'a');
        });
    });

    /* Expressions */
    suite('Expressions', function () {
        test('this expression', function () {
            this.walk('this');

            var expression = this.callbacks.processNode.firstCall.args[0].expression;
            assert.strictEqual(expression.type, 'ThisExpression');
        });

        test('empty array expression', function () {
            this.walk('[]');
            var expression = this.callbacks.processNode.firstCall.args[0].expression;
            assert.strictEqual(expression.type, 'ArrayExpression');
            assert.strictEqual(expression.elements.length, 0);
        });

        test('array expression', function () {
            this.walk('[ 1, 2 ]');
            var expression = this.callbacks.processNode.firstCall.args[0].expression;
            assert.strictEqual(expression.type, 'ArrayExpression');
            assert.strictEqual(expression.elements.length, 2);
            assert.strictEqual(expression.elements[0].value, 1);
            assert.strictEqual(expression.elements[1].value, 2);
        });

        test('object expression');
        test('property expression');

        test('function expression', function () {
            this.walk('(function foo() {})');
            var expression = this.callbacks.processNode.firstCall.args[0].expression;
            assert.strictEqual(expression.type, 'FunctionExpression');
            assert.strictEqual(expression.id.name, 'foo');
            assert.strictEqual(expression.generator, false);
        });

        test('generator function expression', function () {
            this.walk('(function* foo() {})');
            var expression = this.callbacks.processNode.firstCall.args[0].expression;
            assert.strictEqual(expression.type, 'FunctionExpression');
            assert.strictEqual(expression.id.name, 'foo');
            assert.strictEqual(expression.generator, true);
        });

        test('sequence expression');
        test('unary expression');
        test('binary expression');

        suite('assignment expression', function () {
            function testAssignmentExpression (expression, operator) {
                assert.strictEqual(expression.type, 'AssignmentExpression');
                assert.strictEqual(expression.operator, operator);
                assert.strictEqual(expression.left.type, 'Identifier');
                assert.strictEqual(expression.left.name, 'foo');
                assert.strictEqual(expression.right.type, 'Literal');
                assert.strictEqual(expression.right.value, 1);
            }

            test('equals assignment operator', function () {
                this.walk('foo = 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '=');
            });

            test('addition assignment operator', function () {
                this.walk('foo += 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '+=');
            });

            test('subtraction assignment operator', function () {
                this.walk('foo -= 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '-=');
            });

            test('multiplication assignment operator', function () {
                this.walk('foo *= 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '*=');
            });

            test('division assignment operator', function () {
                this.walk('foo /= 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '/=');
            });

            test('modulus assignment operator', function () {
                this.walk('foo %= 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '%=');
            });

            test('left shift assignment operator', function () {
                this.walk('foo <<= 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '<<=');
            });

            test('right shift assignment operator', function () {
                this.walk('foo >>= 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '>>=');
            });

            test('unsigned right shift assignment operator', function () {
                this.walk('foo >>>= 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '>>>=');
            });

            test('bitwise or assignment operator', function () {
                this.walk('foo |= 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '|=');
            });

            test('bitwise xor assignment operator', function () {
                this.walk('foo ^=1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '^=');
            });

            test('bitwise and assignment operator', function () {
                this.walk('foo &= 1');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testAssignmentExpression(expression, '&=');
            });
        });

        suite('update expression', function () {
            function testUpdateExpression (expression, operator, prefix) {
                assert.strictEqual(expression.type, 'UpdateExpression');
                assert.strictEqual(expression.argument.name, 'foo');
                assert.strictEqual(expression.operator, operator);
                assert.strictEqual(expression.prefix, prefix);    
            }

            test('increment suffix', function () {
                this.walk('foo++');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testUpdateExpression(expression, '++', false);
            });

            test('increment prefix', function () {
                this.walk('++foo');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testUpdateExpression(expression, '++', true);
            });

            test('decrement suffix', function () {
                this.walk('foo--');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testUpdateExpression(expression, '--', false);
            });

            test('decrement prefix', function () {
                this.walk('--foo');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testUpdateExpression(expression, '--', true);
            });
        });

        suite('logical expression', function () {
            function testLogicalExpression (expression, operator) {
                assert.strictEqual(expression.type, 'LogicalExpression');
                assert.strictEqual(expression.operator, operator);
                assert.strictEqual(expression.left.type, 'Literal');
                assert.strictEqual(expression.left.value, true);
                assert.strictEqual(expression.right.type, 'Literal');
                assert.strictEqual(expression.right.value, false);
            }

            test('and operator', function () {
                this.walk('true && false');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testLogicalExpression(expression, '&&');
            });

            test('or operator', function () {
                this.walk('true || false');
                var expression = this.callbacks.processNode.firstCall.args[0].expression;
                testLogicalExpression(expression, '||');
            });
        });

        test('conditional expression');
        test('call expression');
        test('new expression');
        test('member expression');
        test('super expression');
        test('arrow function expression');
        test('yield expression');
        test('tagged template expression');
    });

    suite('Classes', function () {
        test('class');
        test('class body');
        test('method definition');
        test('class declaration');
        test('meta property');
    });

    suite('Modules', function () {
        test('module declaration');
        test('module specifier');
        test('import declaration');
        test('import specifier');
        test('import default specifier');
        test('import namespace specifier');
        test('export named declaration');
        test('export specifier');
        test('export default declaration');
        test('export all declaration');
    });

    suite('Clauses', function () {
        test('switchcase');
        test('case clause');
    });

    suite('Miscellaneous', function () {
        test('identifier');
        test('literal');
        test('regexp literal');
        test('unary operator');
        test('binary operator');
        test('logical operator');
        test('assignment operator');
        test('update operator');
        test('spread element');
        test('template literal');
        test('template element');
        test('object pattern');
        test('assignment property');
        test('assignment pattern');
        test('array pattern');
        test('rest element');
    });

});
