'use strict';
import * as vscode from 'vscode';
import { Uri } from 'vscode';
import DoublyLinkedList from './DoublyLinkedList';

export type AppConfiguration = {
    showMessages: boolean;
    loopAround: boolean;
    maxSize: number;
};

type EditLocation = {
    file: Uri,
    line: number,
    character: number
};

const ignoreFilesRegex = /^(.*settings.json|.*keybindings.json|.*.git)$/;
let configuration: AppConfiguration;


function setConfiguration() {
    configuration = {
        showMessages: vscode.workspace.getConfiguration('editsHistory').get('showInformationMessages') === true,
        loopAround: vscode.workspace.getConfiguration('editsHistory').get('loopAround') === true,
        maxSize: vscode.workspace.getConfiguration('editsHistory').get('maxHistory') || 5
    };
}

setConfiguration();

const onConfigChange = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('editsHistory')) {
        setConfiguration();
        editHistory.configuration = configuration;
    }
});



 // @ts-ignore: Configuration is already set
const editHistory: DoublyLinkedList<EditLocation> = new DoublyLinkedList<EditLocation>(configuration);

function moveHistoryDownAfter(file: Uri, line: number, character: number, numberOfLines: number) {
    editHistory.toList().forEach(h => {
        if (h.file.path === file.path && (h.line > line || (h.line === line && h.character > character))) {
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
        editHistory.insert(previousEdit);
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
        if (h.file.path === newUri.path) {
            editHistory.remove(h);
        }
    });
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
            if (h.file.path === file.path) {
                if (
                    (h.line > startLine && h.line < endLine)
                    || (h.line === startLine && h.character > start.character && startLine !== endLine)
                    || (h.line === endLine && h.character < end.character && startLine !== endLine)
                ) {
                    // within deleted lines so lets delete the history to that location
                    editHistory.remove(h);
                } else if (h.line === endLine && h.character > end.character) {
                    h.character -= change.rangeLength;
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
            }
        });

    }
}

let fileCreated: Uri | null = null;
let fileDeleted: Uri | null = null;
let fileCreatedDate: Date | null = null;
let fileDeletedDate: Date | null = null;

export function activate(context: vscode.ExtensionContext) {
    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/*", false, true, false);
    const onCreate = fileSystemWatcher.onDidCreate(e => {
        fileCreated = e;
        fileCreatedDate = new Date();
    });
    const onDelete = fileSystemWatcher.onDidDelete(e => {
        fileDeleted = e;
        fileDeletedDate = new Date();

        // @ts-ignore: Should never be null
        if (fileDeletedDate - fileCreatedDate < 350) {
            // @ts-ignore: Should never be null
            renameUriInHistory(fileDeleted, fileCreated);
        } else {
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

    const onDidSave = vscode.workspace.onDidSaveTextDocument(e => {
        fileSaved = e.uri;
        fileSavedTime = new Date();
    });

    const onDidClose = vscode.workspace.onDidCloseTextDocument(e => {
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
        fileSavedTime = null;
        fileClosedTime = null;
        fileClosed = null;
    });

    const documentChangeListener = vscode.workspace.onDidChangeTextDocument(e => {
        const change = e.contentChanges[e.contentChanges.length - 1];
        if (!change || e.document.uri.path.match(ignoreFilesRegex)) { return; }

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
                    }
                });
            }
        } else {
            newEdit(file, line, character);
        }
    });

    const msg = {
        previousEdit: {
            success: "Previous Edit",
            failure: "No More Previous Edits"
        },
        nextEdit: {
            success: "Next Edit",
            failure: "No More Next Edits"
        },
        previousFileEdit: {
            success: "Previously Edited File",
            failure: "No More Previously Edited Files"
        },
        nextFileEdit: {
            success: "Next Edited File",
            failure: "No More Next Edited Files"
        },
        sameFilePreviousEdit: {
            success: "Previous Edit in this file",
            failure: "No More Edits in this File"
        },
        sameFileNextEdit: {
            success: "Next Edit in this file",
            failure: "No More Edits in this File"
        }
    };

    type Command = "previousEdit" | "nextEdit" | "previousFileEdit" | "nextFileEdit" | "sameFilePreviousEdit" | "sameFileNextEdit";

    const runKeyCommand = (command: Command) => {
        const activeEditor = vscode.window.activeTextEditor;
        let edit = null;

        switch (command) {
            case "previousEdit":
                edit = editHistory.previous();
                break;
            case "nextEdit":
                edit = editHistory.next();
                break;
            case "previousFileEdit":
                edit = editHistory.previousMatch((edit) => activeEditor !== undefined && edit.file.path !== activeEditor.document.uri.path);
                break;
            case "nextFileEdit":
                edit = editHistory.nextMatch((edit) => activeEditor !== undefined && edit.file.path !== activeEditor.document.uri.path);
                break;
            case "sameFilePreviousEdit":
                edit = editHistory.previousMatch((edit) => activeEditor !== undefined && edit.file.path === activeEditor.document.uri.path);
                break;
            case "sameFileNextEdit":
                edit = editHistory.nextMatch((edit) => activeEditor !== undefined && edit.file.path === activeEditor.document.uri.path);
                break;
        }

        const message = editHistory.isEmpty ? "No Edits!" : edit ? msg[command].success : msg[command].failure;
        if (configuration.showMessages) {
            vscode.window.showInformationMessage(message);
        }
        vscode.window.setStatusBarMessage(message, 1500);

        if (!edit) {
            return;
        }

        if (activeEditor && activeEditor.document.fileName === edit.file.path) {
            revealLastEditLocation(activeEditor);
        } else {
            vscode.workspace.openTextDocument(edit.file)
                .then(vscode.window.showTextDocument)
                .then(revealLastEditLocation)
                ;
        }
    };

    const previousEditCommand   = vscode.commands.registerCommand('editsHistory.moveCursorToPreviousEdit',           () => runKeyCommand("previousEdit"));
    const nextEditCommand       = vscode.commands.registerCommand('editsHistory.moveCursorToNextEdit',               () => runKeyCommand("nextEdit"));
    const previousFileCommand   = vscode.commands.registerCommand('editsHistory.moveCursorToPreviouslyEditedFile',   () => runKeyCommand("previousFileEdit"));
    const nextFileCommand       = vscode.commands.registerCommand('editsHistory.moveCursorToNextEditedFile',         () => runKeyCommand("nextFileEdit"));
    const previousEditSameFile  = vscode.commands.registerCommand('editsHistory.moveCursorToPreviousEditInSameFile', () => runKeyCommand("sameFilePreviousEdit"));
    const nextEditSameFile      = vscode.commands.registerCommand('editsHistory.moveCursorToNextEditInSameFile',     () => runKeyCommand("sameFileNextEdit"));

    context.subscriptions.push(
        documentChangeListener,
        previousEditCommand,
        nextEditCommand,
        previousFileCommand,
        nextFileCommand,
        previousEditSameFile,
        nextEditSameFile,
        onDidSave,
        onDidClose,
        fileSystemWatcher,
        onCreate,
        onDelete,
        onConfigChange
    );
}
