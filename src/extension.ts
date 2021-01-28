import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const hljs = require('highlight.js');
const md = require('markdown-it')({
	html: false,
	xhtmlOut: false,
	breaks: false,
	langPrefix: 'language-',
	linkify: false,
	typographer: false,
	quotes: '“”‘’',
	highlight: (str: string, lang: string) => {
		const langSplit = lang.split(',');
		console.log(langSplit[0]);
		if (lang && hljs.getLanguage(langSplit[0])) {
			try {
				return '<pre class="hljs"><code>' +
						hljs.highlight(langSplit[0], str, true).value +
						'</code></pre>';
			} catch (__) {

			}
		}
	
		return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
	  }
});


function titleCase(str: any): string {
	str = str.toLowerCase().split(' ').map((word: any) => {
		return word.replace(word[0], word[0].toUpperCase());
	});

	return str.join(' ');
}

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

function getFileMap(paths: string[]): Map<string, string> {
	let map: Map<string, string> = new Map<string, string>();
	const reg: RegExp  = /(?<=src\\)(.*)(?=.md)/;

	paths.forEach((v, i) => {
		const result = reg.exec(v);
		const replace = (result !== null) ? result[0].replace(/\\/g, ' \/ ').replace(/_/g, ' ') : '';
		const key: string = titleCase(replace);

		map.set(key, v);
	})

	return map;
}

// Render the markdown to a webview panel
function renderMarkdownWebiew(files: Map<string, string>, selection: string): string {
	let renderedMarkdown: string = '';
	const path = files.get(selection);
	
	if (path) {
		const markdown = fs.readFileSync(path).toString();
		renderedMarkdown = md.render(markdown);
	}

	return `
		<!doctype html>
		<html>
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			</head>
			<body>
				<h1>${selection}</h1>
				${renderedMarkdown}
			</body>
		</html>
	`;
}

export function activate(context: vscode.ExtensionContext) {
	const searchRustByExample = vscode.commands.registerCommand('extension.searchRustByExample', () => {
		const filePath = path.join(context.extensionPath, 'rust-by-example', 'src');
		const paths: string[] = getFilePaths(filePath);
		const map: Map<string, string> = getFileMap(paths);
		const selection: string[] = [];

		for (let k of map.keys()) {
			selection.push(k);
		}

		vscode.window.showQuickPick(selection).then((value: string | undefined) => {
			if (value) {
				const panel = vscode.window.createWebviewPanel('webview', `Rust Example: ${value}`, vscode.ViewColumn.Beside, {
					localResourceRoots: [],
					enableScripts: true,
					retainContextWhenHidden: true
				});

				const html = renderMarkdownWebiew(map, value);
				panel.webview.html = html;
			}
		});
	});


	context.subscriptions.push(searchRustByExample);
}

export function deactivate() {}
