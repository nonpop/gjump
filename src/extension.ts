import * as vscode from 'vscode';
import { getMatches } from './logic';

const availableLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type ParsedInput = {
    needle: string;
    actions: string[];
};

function parseInput(input: string): ParsedInput {
    let i = 0;
    let needle = "";
    for (; i < input.length; i++) {
        const c = input[i];
        if (availableLabels.includes(c)) {
            break;
        }
        needle += c;
    }
    let actions = [];
    for (; i < input.length; i++) {
        const c = input[i];
        if (availableLabels.includes(c)) {
            actions.push(c);
        }
    }
    return { needle, actions };
}

function command(labelDecoration: vscode.TextEditorDecorationType) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const doc = editor.document;
	const inputBox = vscode.window.createInputBox();
	inputBox.title = "Type lowercase letters or symbols";

	inputBox.onDidHide(() => {
		editor.setDecorations(labelDecoration, []);
		inputBox.dispose();
	});

	inputBox.onDidAccept(() => {
		inputBox.hide();
	});

	inputBox.onDidChangeValue((input) => {
		const { needle, actions } = parseInput(input);
		const ranges = editor.visibleRanges;
		const rangeTexts = ranges.map((range) => doc.getText(range).toLowerCase());
		const { labeledMatches, totalMatches } = getMatches(availableLabels, rangeTexts, needle);

		if (totalMatches === 0) {
			if (needle.length > 0) {
				inputBox.title = "No matches";
			} else {
				inputBox.title = "Type lowercase letters or symbols";
			}
		} else if (labeledMatches.length === 0) {
			inputBox.title = `${totalMatches} matches (type more to narrow down)`;
		} else {
			inputBox.title = `${totalMatches} matches. Type label to jump`;
		}

		const decorations: vscode.DecorationOptions[] = [];
		const targets = new Map<string, vscode.Position>();
		for (const match of labeledMatches) {
			const range = ranges[match.rangeIndex];
			const pos = doc.positionAt(doc.offsetAt(range.start) + match.offsetIntoRangeText);
			const decoration: vscode.DecorationOptions = {
				range: new vscode.Range(pos, pos.translate(0, 1)),
				renderOptions: {
					before: {
						contentText: match.label,
						color: "red",
						width: "0",
					},
				},
			};
			decorations.push(decoration);
			targets.set(match.label, pos);
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
}

export function activate(context: vscode.ExtensionContext) {
	const labelDecoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'yellow',
		opacity: '0',
	});
	
	let disposable = vscode.commands.registerCommand('gjump.initJump', () => command(labelDecoration));
	context.subscriptions.push(disposable);
}
