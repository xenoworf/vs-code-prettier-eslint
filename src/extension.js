// eslint-disable-next-line import/no-unresolved
import * as vscode from 'vscode';
import format from './formatter';

// store registrations for disposal when `vscode-prettier-eslint.disabled` becomes true
let registration;

let outputChannel;

function formatter(document, range) {
  try {
    if (!range) {
      const firstLine = document.lineAt(0);
      const lastLine = document.lineAt(document.lineCount - 1);
      // eslint-disable-next-line no-param-reassign
      range = new vscode.Range(firstLine.range.start, lastLine.range.end);
    }

    const text = document.getText(range);
    const extensionConfig = vscode.workspace.getConfiguration('vs-code-prettier-eslint');
    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;

    const formatted = format({
      text,
      filePath: document.fileName,
      workspaceFolder,
      ...extensionConfig,
    });
    return [vscode.TextEdit.replace(range, formatted)];
  } catch (err) {
    outputChannel.appendLine(`Error: ${err.message}`);
  }
}

function registerFormatterIfEnabled() {
  const isEnabled = vscode.workspace.getConfiguration().get('vs-code-prettier-eslint.enabled');
  if (isEnabled && !registration) {
    registration = {};
    registration.documentFormatting = vscode.languages.registerDocumentFormattingEditProvider(
      'javascript',
      {
        provideDocumentFormattingEdits(document) {
          return formatter(document);
        },
      },
    );
    registration.documentRangeFormatting = vscode.languages.registerDocumentRangeFormattingEditProvider(
      'javascript',
      {
        provideDocumentRangeFormattingEdits(document, range) {
          return formatter(document, range);
        },
      },
    );

    // Create output channel for error logging
    outputChannel = vscode.window.createOutputChannel('Prettier Eslint');
  } else if (!isEnabled && registration) {
    registration.documentFormatting.dispose();
    registration.documentRangeFormatting.dispose();
    registration = undefined;

    outputChannel.dispose();
    outputChannel = undefined;
  }
}

// register at activate-time
registerFormatterIfEnabled();

// add/remove formatter when config changes
vscode.workspace.onDidChangeConfiguration((event) => {
  if (event.affectsConfiguration('vs-code-prettier-eslint.enabled')) {
    registerFormatterIfEnabled();
  }
});
