# Navigate Edits History - Goto Last Edit

## vscode-edits-history

A Visual Studio Extension that provides the ability to quickly navigate back and forth between recently made edits

## Features

Set whatever key commands you wish to navigate backwards and forwards through your history of edits (any of the recently typed code). Designed after the similar feature provided by IntelliJ based IDEs. This is really useful for quickly moving between multiple files and edit points to code faster without having to use the mouse or arrow keys.

- Quick access back and forth between edits
- Works across multiple files
- Retails edit history after file renaming

![Extension Example](demo.gif)

## Requirements

vscode@1.22.0+

## Extension Settings

This extension contributes the following customizable Keyboard Shortcuts:

| Command                                               | Description                                                            | Mac         | Win          |
| ----------------------------------------------------- |:---------------------------------------------------------------------- | :-----------| :----------- |
| `editsHistory.moveCursorToPreviousEdit`               | Move To Previous Edit                                                  | cmd+j       | ctrl+j       |
| `editsHistory.moveCursorToNextEdit`                   | Move To Next Edit                                                      | cmd+k       | ctrl+k       |
| `editsHistory.moveCursorToPreviouslyEditedFile`       | Move To Previous File Edited                                           | cmd+shift+j | ctrl+shift+j |
| `editsHistory.moveCursorToNextEditedFile`             | Move To Next File Edited                                               | cmd+shift+k | ctrl+shift+k |
| `editsHistory.moveCursorToPreviousEditInSameFile`     | Move To Last Edit In Current File                                      | cmd+shift+u | ctrl+shift+u |
| `editsHistory.moveCursorToNextEditInSameFile`         | Move To Next Edit In Current File                                      | cmd+shift+i | ctrl+shift+i |
| `editsHistory.createEditAtCursor`                     | Create edit on current cursor position (add marker to current line)    | cmd+u       | ctrl+u       |
| `editsHistory.removeEditsFromLine`                    | Remove any edits on the current line (remove marker from current line) | cmd+i       | ctrl+i       |

This extension contributes the following settings:

- `editsHistory.maxHistory`: Moves the cursor forward in the history of edits __(default: 10)__
- `editsHistory.showInformationMessages`: Displays a message when moving through the edit history __(default: false)__
- `editsHistory.loopAround`: Loop back to the start of your history once the end is reached __(default: false)__
- `editsHistory.centerEditInEditor`: Centers the edit in the editor when navigating between edits __(default: true)__

## Known Issues

None currently known of

## Release Notes

See [CHANGELOG.md](CHANGELOG.md)

---------------------------------------------------------------------------------------

### More Visual Studio Code Extensions by `mishkinf`

#### [Visual Studio Code Goto Next/Previous Member](https://github.com/mishkinf/vscode-goto-next-previous-member)

  Visual Studio Code Extenion to navigate through the functions, variables, and classes using quick and easy keycommands similar to functionality provided by IntelliJ IDE's (next/previous function)or Resharper (next/previous member)

**Enjoy!**

## License

MIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
