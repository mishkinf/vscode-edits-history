'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// // this method is called when your extension is activated
// // your extension is activated the very first time the command is executed
// export function activate(context: vscode.ExtensionContext) {

//     // Use the console to output diagnostic information (console.log) and errors (console.error)
//     // This line of code will only be executed once when your extension is activated
//     console.log('Congratulations, your extension "vscode-edits-history" is now active!');

//     // The command has been defined in the package.json file
//     // Now provide the implementation of the command with  registerCommand
//     // The commandId parameter must match the command field in package.json
//     let disposable = vscode.commands.registerCommand('extension.sayHello', () => {
//         // The code you place here will be executed every time your command is executed

//         // Display a message box to the user
//         vscode.window.showInformationMessage('Hello World!');
//     });

//     context.subscriptions.push(disposable);
// }

// // this method is called when your extension is deactivated
// export function deactivate() {
// }


import { Uri } from 'vscode';
import DoublyLinkedList from './DoublyLinkedList';

export type EditLocation = {
    file: Uri,
    line: number,
    character: number
};

const editHistory: DoublyLinkedList<EditLocation> = new DoublyLinkedList<EditLocation>();

function moveHistoryDownAfter(file: Uri, line: number, character: number) {
    editHistory.toList().forEach(h => {
        if (h.file.path === file.path && (h.line > line || (h.line === line && h.character > character))) {
            h.line = h.line + 1;
        }
    });
}

function newEdit(file: Uri, line: number, character: number) {
    const edit = editHistory.current;
    const previousEdit = editHistory.toList().find(h => h.line === line);

    if (previousEdit) {
        previousEdit.character = character;
        editHistory.remove(previousEdit);
        editHistory.insertTail(previousEdit); // make this edit the most recent in the history
    } else if (edit && edit.file.path === file.path && edit.line === line) {
        edit.character = character;
    } else {
        editHistory.insert({
            file,
            line,
            character
        });
    }
}

function revealLastEditLocation(editor: vscode.TextEditor): void {
    const edit = editHistory.current;

    if (!edit) {
        return;
    }

    editor.selection = new vscode.Selection(edit.line, edit.character, edit.line, edit.character);
    editor.revealRange(new vscode.Range(edit.line, edit.character, edit.line, edit.character));
}

function renameUriInHistory(oldUri: Uri, newUri: Uri) {
    editHistory.toList().forEach(h => {
        if (h.file.path === oldUri.path) {
            h.file = newUri;
        }
    });
}

function deleteUriInHistory(uri: Uri) {
    editHistory.toList().forEach(h => {
        const fileToKeep = !h.file.path.includes(uri.path);
        if (!fileToKeep) {
            editHistory.remove(h);
        }
    });
}

function deleteEditHistory(change: any, file: Uri) {
    const { start, end } = change.range;
    const startLine = start.line;
    const endLine = end.line;
    const numLines = endLine - startLine;

    if (!editHistory.isEmpty) {
        editHistory.toList().forEach(h => {
            if (
                h.file.path === file.path
                && (h.line > startLine && h.line < endLine)
                || (h.line === startLine && h.character > start.character)
                || (h.line === endLine && h.character < end.character)
            ) {
                // within deleted lines so lets delete the history to that location
                editHistory.remove(h);
            }
        });
        editHistory.toList().forEach(h => {
            if (h.file.path === file.path
                && (h.line > endLine
                    || (h.line === endLine && h.character >= end.character))
            ) {
                // below the fold of where the deletions are occuring so we have to move lines up
                h.line = h.line - numLines;
            }
        });

    }
}

let fileCreated: Uri | null = null;
let fileDeleted: Uri | null = null;
let fileCreatedDate: Date | null = null;
let fileDeletedDate: Date | null = null;

export function activate(context: vscode.ExtensionContext) {
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/*", false, true, false); // too loose
    fileSystemWatcher.onDidCreate(e => {
        fileCreated = e;
        fileCreatedDate = new Date();
    });
    fileSystemWatcher.onDidDelete(e => {
        fileDeleted = e;
        fileDeletedDate = new Date();

        // @ts-ignore: Should never be null
        if (fileDeletedDate - fileCreatedDate < 350) {
            // assume this is a file rename
            // @ts-ignore: Should never be null
            renameUriInHistory(fileDeleted, fileCreated);
        } else {
            // the file was actually deleted
            deleteUriInHistory(fileDeleted);
        }

        fileCreated = null;
        fileDeleted = null;
        fileCreatedDate = null;
        fileDeletedDate = null;
    });

    const documentChangeListener = vscode.workspace.onDidChangeTextDocument(e => {
        const change = e.contentChanges[e.contentChanges.length - 1];
        if (!change) {
            return;
        }

        const start = change.range.start;
        const file = e.document.uri;
        const line = start.line;
        const character = start.character + change.text.length;

        if (change.text === "") { // this is when a delete is occuring
            deleteEditHistory(change, file);
        } else if (change.text === " " || change.text === "\n") { // newline or space is occuring
            if (change.text === "\n") {
                moveHistoryDownAfter(file, line, character);
            }
        } else {
            newEdit(file, line, character);
        }

        editHistory.debugList();
    });

    const previousEditCommand = vscode.commands.registerCommand('extension.moveCursorToPreviousEdit', () => {
        const edit = editHistory.previous();

        if (!edit) {
            return;
        }

        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName === edit.file.path) {
            revealLastEditLocation(activeEditor);
        } else {
            vscode.workspace.openTextDocument(edit.file)
                .then(vscode.window.showTextDocument)
                .then(revealLastEditLocation)
                ;
        }
    });

    const nextEditCommand = vscode.commands.registerCommand('extension.moveCursorToNextEdit', () => {
        const edit = editHistory.next();

        if (!edit) {
            return;
        }

        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.fileName === edit.file.path) {
            revealLastEditLocation(activeEditor);
        } else {
            vscode.workspace.openTextDocument(edit.file)
                .then(vscode.window.showTextDocument)
                .then(revealLastEditLocation)
                ;
        }
    });

    context.subscriptions.push(documentChangeListener, previousEditCommand, nextEditCommand);
}
