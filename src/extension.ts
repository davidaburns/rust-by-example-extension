import * as vscode from 'vscode';
import * as path from 'path';
import { AxiosResponse } from 'axios';
const axios = require('axios').default;

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function titleCase(str: any): string {
	str = str.toLowerCase().split(' ').map((word: any) => {
		return word.replace(word[0], word[0].toUpperCase());
	});

	return str.join(' ');
}

function filterUrls(urls: string[]): string[] {
    let filtered  = urls.map((value: string) => {
        const index = value.indexOf('.');
        return value.slice(0, index);
    });

    filtered = filtered.filter((value, index, self) => {
        return self.indexOf(value) === index && value !== 'index';
	});
	
	return filtered;
}

function filterAnchorTags(html: string): string {
	let index: number = 0;
	while (true) {
		index = html.indexOf('<a', 0);
		if (index !== -1) {
			let close = html.indexOf('>', index);
			if (close !== -1) {
				html = html.replace(html.substring(index, close + 1), '');
			} else {
				break;
			}
		} else {
			break;
		}
	}

	html = html.replace('</a>', '');
	return html;
}

function setHeader(html: string): string {
	html = html.replace('<h1>', '<h2>');
	html = html.replace('</h1>', '</h2>');

	return html;
}

function extractContent(html: string): string {
	const start = html.indexOf('<main>');
	const end = html.indexOf('</main>');

	return html.slice(start, end);
}

function getWebviewHtml(context: vscode.ExtensionContext, webview: vscode.Webview, value: any, content: string): string {
	let header: string = value.replace(/_/g, ' ');
	header = header.replace(/\//g, ' / ');
	header = titleCase(header);

	let nonce = getNonce();

	let highlightScriptPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'media', 'highlight.min.js');
	let highlightScriptUri = webview.asWebviewUri(highlightScriptPath);

	let rustScriptPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'media', 'highlight.min.js');
	let rustScriptUri = webview.asWebviewUri(rustScriptPath);

	let cssPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'media', 'highlight.min.css');
	let cssUri = webview.asWebviewUri(cssPath);

	return `
		<!doctype html>
		<html>
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link rel="stylesheet" href="${cssUri}>

				<script nonce=${nonce} src="${highlightScriptUri}"></script>
				<script nonce=${nonce} src="${rustScriptUri}"></script>
				<script>
					hljs.initHighlightingOnLoad();
					document.addEventListener('DOMContentLoaded', (event) => {
						document.querySelectorAll('pre code').forEach((block) => {
							hljs.highlightBlock(block);
						});
					});
				</script>
			</head>
			<body>
				<h1>${header}</h1>
				${content}
			</body>
		</html>
	`;
}

export function activate(context: vscode.ExtensionContext) {
	const searchRustByExample = vscode.commands.registerCommand('extension.searchRustByExample', () => {
		const baseUrl = 'https://doc.rust-lang.org/stable/rust-by-example';
		axios.get(`${baseUrl}/searchindex.json`).then((response: AxiosResponse) => {
			const urls = filterUrls(response.data['doc_urls']);

			vscode.window.showQuickPick(urls).then((value: string | undefined) => {
				axios.get(`${baseUrl}/${value}.html`).then((response: AxiosResponse) => {
					const panel = vscode.window.createWebviewPanel('webview', `Rust Example: ${value}`, vscode.ViewColumn.Beside, {
						localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src', 'media'))],
						enableScripts: true,
						retainContextWhenHidden: true
					});

					let html = extractContent(response.data);
					html = filterAnchorTags(html);
					html = setHeader(html);
					html = getWebviewHtml(context, panel.webview, value, html);

					console.log(html);
					panel.webview.html = html;
					
				}).catch((error: AxiosResponse) => {
					console.log(error);
					vscode.window.showErrorMessage(`Failed to obtain Rust example: ${value}`);
				});
			});
		}).catch((error: AxiosResponse) => {
			vscode.window.showErrorMessage('Failed to obtain Rust By Example topics');
		});
	});


	context.subscriptions.push(searchRustByExample);
}

export function deactivate() {}
