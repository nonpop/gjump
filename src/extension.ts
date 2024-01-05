import * as vscode from 'vscode';

const jumpers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function activate(context: vscode.ExtensionContext) {
	const labelDecoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'yellow',
		opacity: '0',
	});
	
	let disposable = vscode.commands.registerCommand('gjump.jump', () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const doc = editor.document;
		const inputBox = vscode.window.createInputBox();

		inputBox.onDidHide(() => {
			editor.setDecorations(labelDecoration, []);
			inputBox.dispose();
		});

		inputBox.onDidAccept(() => {
			inputBox.hide();
		});

		inputBox.onDidChangeValue((input) => {
			let i = 0;
			let needle = "";
			for (; i < input.length; i++) {
				const c = input[i];
				if (jumpers.includes(c)) {
					break;
				}
				needle += c;
			}
			let actions = "";
			for (; i < input.length; i++) {
				const c = input[i];
				if (jumpers.includes(c)) {
					actions += c;
				}
			}

			const matches = new Map<string, vscode.Position[]>();
			editor.visibleRanges.forEach((range) => {
				const text = doc.getText(range).toLowerCase();
				const rangeStartOffset = doc.offsetAt(range.start);
				for (let i = 0; i < text.length; i++) {
					for (let j = 1; j <= needle.length; j++) {
						if (i+j > text.length) {
							break;
						}
						const prefix = needle.slice(0, j);
						if (text.slice(i, i+j) === prefix) {
							if (!matches.has(prefix)){
								matches.set(prefix, []);
							}
							matches.get(prefix)!.push(doc.positionAt(rangeStartOffset+i));
						}
					}
				}
			});

			let matchForLabels: vscode.Position[] = [];
			for (let j = 1; j <= needle.length; j++) {
				const prefix = needle.slice(0, j);
				const match = matches.get(prefix);
				if (!match || match.length > jumpers.length) {
					continue;
				}
				matchForLabels = match;
				break;
			}

			let fullMatches = matches.get(needle) ?? [];
			const decorations: vscode.DecorationOptions[] = [];
			const targets = new Map<string, vscode.Position>();
			for (let i = 0; i < matchForLabels.length; i++) {
				const match = matchForLabels[i];
				if (fullMatches.some((fullMatch) => fullMatch.isEqual(match))) {
					const label = jumpers[i];
					const range = new vscode.Range(match, match.translate(0, 1));
					const decoration: vscode.DecorationOptions = {
						range,
						renderOptions: {
							before: {
								contentText: label,
								color: "red",
								width: "0",
							},
						},
					};
					decorations.push(decoration);
					targets.set(label, match);
				}
			}
			editor.setDecorations(labelDecoration, decorations);

			for (let i = 0; i < actions.length; i++) {
				const action = actions[i];
				const target = targets.get(action);
				if (target) {
					editor.selection = new vscode.Selection(target, target);
				}
				inputBox.hide();
			}
		});
		inputBox.show();
	});
	context.subscriptions.push(disposable);
}
