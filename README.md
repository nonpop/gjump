# gjump

`gjump` is yet another [EasyMotion](https://github.com/easymotion/vim-easymotion) inspired movement plugin. The most similar extension I know of is [Find Then Jump](https://marketplace.visualstudio.com/items?itemName=tranhl.find-then-jump).

## Features

There are three commands:

- `gjump.initJump`: simple jump
- `gjump.initSelect`: simple select
- `gjump.initMultiJump`: jump to multiple locations

There are no default keybindings. I myself have bound them to `alt-/`, `alt-shift-/`, and `alt-ctrl-/`, respectively.

With each command, start by typing some characters from the location(s) you want to target. Do **not** type uppercase letters at this point since those are reserved for labels! When there are few enough matches, labels appear. These labels will remain stable as you type more characters.

Next, type one or more labels. These must be entered in uppercase. What happens now depends on the command:

- simple jump: as soon as you type the first label, the cursor will jump to the corresponding location
- simple select: as soon as you type the first label, the current selection will be extended to the corresponding location
- multi jump: typing a label toggles it. When you're done, press enter to set a cursor to all the selected labels

## Release Notes

### 0.0.4

Initial release
