import * as vscode from 'vscode';
import { getMatches } from './logic';

const availableLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type ParsedInput = {
    needle: string,
    selectedLabels: Set<string>,
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
    const actions = [];
    for (; i < input.length; i++) {
        const c = input[i];
        if (availableLabels.includes(c)) {
            actions.push(c);
        }
    }
	const selectedLabels = getSelectedLabels(actions);
    return { needle, selectedLabels };
}

function getSelectedLabels(actions: string[]): Set<string> {
	const selected = new Set<string>();
	for (const action of actions) {
		if (selected.has(action)) {
			selected.delete(action);
		} else {
			selected.add(action);
		}
	}
	return selected;
}

type Mode = "jump" | "multiJump" | "select";

function runCommand(labelDecoration: vscode.TextEditorDecorationType, selectedLabelDecoration: vscode.TextEditorDecorationType, mode: Mode) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const doc = editor.document;
	const inputBox = vscode.window.createInputBox();
	inputBox.title = "Type lowercase letters or symbols";

	inputBox.onDidHide(() => {
		editor.setDecorations(labelDecoration, []);
		editor.setDecorations(selectedLabelDecoration, []);
		inputBox.dispose();
	});

	let curSelectedLabels = new Set<string>();
	let curTargets = new Map<string, vscode.Position>();

	inputBox.onDidAccept(() => {
		switch (mode) {
			case "jump":
				inputBox.title = "Type a label to jump, or press esc to cancel";
				break;
			case "multiJump": {
				if (curSelectedLabels.size === 0) {
					inputBox.title = "Type labels to toggle them and enter to jump to all, or press esc to cancel";
					break;
				}
				const newSelections = [];
				for (const label of curSelectedLabels.values()) {
					const target = curTargets.get(label);
					if (target) {
						newSelections.push(new vscode.Selection(target, target));
					}
				}
				editor.selections = newSelections;
				inputBox.hide();
				break;
			}
			case "select":
				inputBox.title = "Type a label to select, or press esc to cancel";
				break;
			}
	});

	inputBox.onDidChangeValue((input) => {
		const { needle, selectedLabels } = parseInput(input);
		curSelectedLabels = selectedLabels;
		const ranges = editor.visibleRanges;
		const rangeTexts = ranges.map((range) => doc.getText(range).toLowerCase());
		const { labeledMatches, totalMatches } = getMatches(availableLabels, rangeTexts, needle);

		inputBox.title = helpText(totalMatches, labeledMatches.length, needle);

		const decorationOptions = [];
		const selectedDecorationOptions = [];
		const targets = new Map<string, vscode.Position>();
		curTargets = targets;
		for (const match of labeledMatches) {
			const range = ranges[match.rangeIndex];
			const pos = positionPlusOffset(doc, range.start, match.offsetIntoRangeText);
			if (selectedLabels.has(match.label)) {
				selectedDecorationOptions.push(selectedLabelDecorationOptions(pos, match.label));
			} else {
				decorationOptions.push(labelDecorationOptions(pos, match.label));
			}
			targets.set(match.label, pos);
		}
		editor.setDecorations(labelDecoration, decorationOptions);
		editor.setDecorations(selectedLabelDecoration, selectedDecorationOptions);

		switch (mode) {
			case "jump":
				for (const label of selectedLabels.values()) {
					const target = targets.get(label);
					if (target) {
						editor.selection = new vscode.Selection(target, target);
					}
					inputBox.hide();
					break;
				}
				break;
			case "multiJump":
				// multiJump action is handled in onDidAccept
				break;
			case "select":
				for (const label of selectedLabels.values()) {
					const curPos = editor.selection.start;
					const targetPos = targets.get(label);
					if (targetPos) {
						editor.selection = new vscode.Selection(curPos, targetPos);
					}
					inputBox.hide();
					break;
				}
				break;
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

function selectedLabelDecorationOptions(pos: vscode.Position, label: string): vscode.DecorationOptions {
	return {
		range: new vscode.Range(pos, pos.translate(0, 1)),
		renderOptions: {
			before: {
				contentText: label,
				color: "yellow",
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
	const selectedLabelDecoration = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'red',
		opacity: '0',
	});
	
	context.subscriptions.push(vscode.commands.registerCommand('gjump.initJump', () =>
		runCommand(labelDecoration, selectedLabelDecoration, "jump")
	));
	context.subscriptions.push(vscode.commands.registerCommand('gjump.initMultiJump', () =>
		runCommand(labelDecoration, selectedLabelDecoration, "multiJump")
	));
	context.subscriptions.push(vscode.commands.registerCommand('gjump.initSelect', () =>
		runCommand(labelDecoration, selectedLabelDecoration, "select")
	));
}
