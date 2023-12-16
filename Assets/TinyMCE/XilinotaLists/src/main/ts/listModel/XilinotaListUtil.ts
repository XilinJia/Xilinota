export function isCheckboxListItem(element) {
  return element.classList && element.classList.contains('xilinota-checklist');
}

export function findContainerListTypeFromEvent(event) {
  if (isCheckboxListItem(event.element)) return 'xilinotaChecklist';

  for (const parent of event.parents) {
    if (isCheckboxListItem(parent)) return 'xilinotaChecklist';
  }

  return 'regular';
}

export function findContainerListTypeFromElement(element) {
  while (element) {
    if (element.nodeName === 'UL' || element.nodName === 'OL') {
      return isCheckboxListItem(element) ? 'xilinotaChecklist' : 'regular';
    }
    element = element.parentNode;
  }

  return 'regular';
}

export function isXilinotaChecklistItem(element) {
  if (element.nodeName !== 'LI') return false;
  const listType = findContainerListTypeFromElement(element);
  return listType === 'xilinotaChecklist';
}

export function addXilinotaChecklistCommands(editor, ToggleList) {
  editor.addCommand('ToggleXilinotaChecklistItem', function (ui, detail) {
    const element = detail.element;
    if (!isXilinotaChecklistItem(element)) return;

    if (!element.classList || !element.classList.contains('checked')) {
      element.classList.add('checked');
    } else {
      element.classList.remove('checked');
    }
  });

  editor.addCommand('InsertXilinotaChecklist', function (ui, detail) {
    detail = { ...detail,  listType: 'xilinotaChecklist'  };
    ToggleList.toggleList(editor, 'UL', detail);
  });
}