'use strict';
import * as vscode from 'vscode';
import { Uri } from 'vscode';
import DoublyLinkedList from './DoublyLinkedList';

export type EditLocation = {
    file: Uri,
    line: number,
    character: number
};

const editHistory: DoublyLinkedList<EditLocation> = new DoublyLinkedList<EditLocation>();

function moveHistoryDownAfter(file: Uri, line: number, character: number, numberOfLines: number) {
    editHistory.toList().forEach(h => {
        if (h.file.path === file.path && (h.line > line || (h.line === line && h.character > character))) {
            console.log("moving history down by a line", h);
            h.line = h.line + numberOfLines;
        }
    });
}

function newEdit(file: Uri, line: number, character: number) {
    const edit = editHistory.current;
    const previousEdit = editHistory.toList().find(h => h.line === line && h.file.path === file.path);

    if (previousEdit) {
        previousEdit.character = character;
        editHistory.remove(previousEdit);
        editHistory.insertTail(previousEdit); // make this edit the most recent in the history
        console.log("Adding new edit to the tail", previousEdit);
    } else if (edit && edit.file.path === file.path && edit.line === line) {
        edit.character = character;
        console.log("Moving edit character to", character);;
    } else {
        editHistory.insert({
            file,
            line,
            character
        });
        console.log("Inserting new edit history");
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
            console.log("removing from edit history", h);
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
            if (h.file.path === file.path) {
                if (
                    (h.line > startLine && h.line < endLine)
                    || (h.line === startLine && h.character > start.character && startLine !== endLine)
                    || (h.line === endLine && h.character < end.character && startLine !== endLine)
                ) {
                    // within deleted lines so lets delete the history to that location
                    editHistory.remove(h);
                    console.log("Removing history", h);
                } else if (h.line === endLine && h.character > end.character) {
                    h.character -= change.rangeLength;
                    console.log("Shifting edit to the left by", change.rangeLength, "spaces");
                }
            }
        });
        editHistory.toList().forEach(h => {
            if (h.file.path === file.path
                && (h.line > endLine
                    || (h.line === endLine && h.character >= end.character))
            ) {
                // below the fold of where the deletions are occuring so we have to move lines up
                h.line = h.line - numLines;
                console.log("shifting edit lines ", numLines);
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

        setTimeout(() => {
            if(!fileDeleted) {

            }
        }, 350);
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

    let fileSaved: Uri | null = null;
    let fileSavedTime: Date | null = null;
    let fileClosedTime: Date | null = null;
    let fileClosed: Uri | null = null;
    vscode.workspace.onDidSaveTextDocument(e => {
        fileSaved = e.uri;
        fileSavedTime = new Date();
    });

    vscode.workspace.onDidCloseTextDocument(e => {
        fileClosed = e.uri;
        fileClosedTime = new Date();

        if (!fileSaved) {
            return;
        }
        // @ts-ignore: Should never be null
        if(fileClosedTime - fileSavedTime < 350) {
            // @ts-ignore: Should never be null
            renameUriInHistory(fileClosed, fileSaved);
        }

        fileSaved = null;
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
        } else if (change.text.match(/^\s+$/) || change.text.match(/^\n\s*$/)) { // newline or space is occuring
            if (change.text.match(/^\n\s*$/)) {
                const numberOfLines = (change.text.match(/\n/g) || []).length;
                moveHistoryDownAfter(file, line, character, numberOfLines);
            } else {
                // check if added whitespace comes before an edit. If so, shift edit by that amount of spaces

                editHistory.toList().forEach(h => {
                    if(h.file === file
                    && h.line === line
                    && h.character > start.character) {
                        h.character += (change.text.length - change.rangeLength);
                        console.log("Shifting edit history to the right", (change.text.length - change.rangeLength));
                    }
                });
            }
        } else {
            newEdit(file, line, character);
        }

        // editHistory.debugList();
    });

    const previousEditCommand = vscode.commands.registerCommand('editsHistory.moveCursorToPreviousEdit', () => {
        const edit = editHistory.previous();
        editHistory.debugList();

        vscode.window.showInformationMessage('Previous Edit');

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

    const nextEditCommand = vscode.commands.registerCommand('editsHistory.moveCursorToNextEdit', () => {
        const edit = editHistory.next();
        editHistory.debugList();

        vscode.window.showInformationMessage('Next Edit');

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

