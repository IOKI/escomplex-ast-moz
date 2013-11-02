/*globals exports, require */

'use strict';

var check, safeName, syntaxDefinitions;

check = require('check-types');
safeName = require('./safeName');
syntaxDefinitions = require('./syntax');

exports.walk = walk;

function walk (tree, settings, callbacks) {
    var syntaxes;

    check.verify.object(tree, 'Invalid syntax tree');
    check.verify.array(tree.body, 'Invalid syntax tree body');
    check.verify.object(settings, 'Invalid settings');
    check.verify.object(callbacks, 'Invalid callbacks');
    check.verify.fn(callbacks.processNode, 'Invalid processNode callback');
    check.verify.fn(callbacks.createScope, 'Invalid createScope callback');
    check.verify.fn(callbacks.popScope, 'Invalid popScope callback');

    syntaxes = syntaxDefinitions.get(settings);

    visitNodes(tree.body);

    function visitNodes (nodes, assignedName) {
        nodes.forEach(function (node) {
            visitNode(node, assignedName);
        });
    }

    function visitNode (node, assignedName) {
        var syntax;

        if (check.object(node)) {
            syntax = syntaxes[node.type];

            if (check.object(syntax)) {
                callbacks.processNode(node, syntax);

                if (syntax.newScope) {
                    callbacks.createScope(safeName(node.id, assignedName), node.loc, node.params.length);
                }

                visitChildren(node);

                if (syntax.newScope) {
                    callbacks.popScope();
                }
            }
        }
    }

    function visitChildren (node) {
        var syntax = syntaxes[node.type];

        if (check.array(syntax.children)) {
            syntax.children.forEach(function (child) {
                visitChild(
                    node[child],
                    check.fn(syntax.assignableName) ? syntax.assignableName(node) : ''
                );
            });
        }
    }

    function visitChild (child, assignedName) {
        var visitor = check.array(child) ? visitNodes : visitNode;
        visitor(child, assignedName);
    }
}

