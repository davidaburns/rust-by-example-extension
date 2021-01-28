import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Obtain a list of all paths to the book markdown files including sub paths
function getFilePaths(root: string, paths: string[] = []): string[] {
	fs.readdirSync(root).forEach(file => {
		const dirPath = root + '/' + file;
		if (fs.statSync(dirPath).isDirectory()) {
			paths = getFilePaths(dirPath, paths);
		} else {
			paths.push(path.join(root, '/', file));
		}
	});

	return paths;
}

// Render the markdown to a webview panel
function renderMarkdownWebiew(panel: vscode.Webview): void {

}

export function activate(context: vscode.ExtensionContext) {
	const searchRustByExample = vscode.commands.registerCommand('extension.searchRustByExample', () => {
		const filePath = path.join(context.extensionPath, 'rust-by-example', 'src');
		let paths: string[] = getFilePaths(filePath);

		console.log(paths);
	});


	context.subscriptions.push(searchRustByExample);
}

export function deactivate() {}
