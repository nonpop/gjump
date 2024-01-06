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

type Mode = "jump" | "select";

function runCommand(labelDecoration: vscode.TextEditorDecorationType, mode: Mode) {
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

		inputBox.title = helpText(totalMatches, labeledMatches.length, needle);

		const decorationOptions = [];
		const targets = new Map<string, vscode.Position>();
		for (const match of labeledMatches) {
			const range = ranges[match.rangeIndex];
			const pos = positionPlusOffset(doc, range.start, match.offsetIntoRangeText);
			decorationOptions.push(labelDecorationOptions(pos, match.label));
			targets.set(match.label, pos);
		}
		editor.setDecorations(labelDecoration, decorationOptions);

		if (actions.length > 0) {
			switch (mode) {
				case "jump": {
					const target = targets.get(actions[0]);
					if (target) {
						editor.selection = new vscode.Selection(target, target);
					}
					inputBox.hide();
					break;
				}
				case "select": {
					const curPos = editor.selection.start;
					const targetPos = targets.get(actions[0]);
					if (targetPos) {
						editor.selection = new vscode.Selection(curPos, targetPos);
					}
					inputBox.hide();
					break;
				}
			}
		}
	});
	inputBox.show();
}

function positionPlusOffset(doc: vscode.TextDocument, pos: vscode.Position, offset: number): vscode.Position {
	return doc.positionAt(doc.offsetAt(pos) + offset);
}

function labelDecorationOptions(pos: vscode.Position, label: string): vscode.DecorationOptions {
	return {
		range: new vscode.Range(pos, pos.translate(0, 1)),
		renderOptions: {
			before: {
				contentText: label,
				color: "red",
				width: "0",
			},
		},
	};
}

function helpText(totalMatches: number, totalTargets: number, needle: string) {
	if (totalMatches === 0) {
		if (needle.length > 0) {
			return "No matches";
		} else {
			return "Type lowercase letters or symbols";
		}
	} else if (totalTargets === 0) {
		return `${totalMatches} matches (type more to narrow down)`;
	} else {
		return `${totalMatches} matches. Type label to jump`;
	}
}

export function activate(context: vscode.ExtensionContext) {
	const labelDecoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'yellow',
		opacity: '0',
	});
	
	context.subscriptions.push(vscode.commands.registerCommand('gjump.initJump', () => runCommand(labelDecoration, "jump")));
	context.subscriptions.push(vscode.commands.registerCommand('gjump.initSelect', () => runCommand(labelDecoration, "select")));
}
