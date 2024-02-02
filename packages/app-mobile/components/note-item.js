import React from 'react';
const Component = React.Component;
import { connect } from 'react-redux';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import Checkbox from './checkbox';
import Note from '@xilinota/lib/models/Note';
import time from '@xilinota/lib/time';
import { themeStyle } from './global-style';
import { _ } from '@xilinota/lib/locale';
class NoteItemComponent extends Component {
    styles_;
    constructor(props) {
        super(props);
        this.styles_ = {};
    }
    noteItem_press(noteId) {
        this.props.dispatch({
            type: 'NAV_GO',
            routeName: 'Note',
            noteId: noteId,
        });
    }
    styles() {
        const theme = themeStyle(this.props.themeId.toString());
        if (this.styles_[this.props.themeId])
            return this.styles_[this.props.themeId];
        this.styles_ = {};
        const styles = {
            listItem: {
                flexDirection: 'row',
                // height: 40,
                borderBottomWidth: 1,
                borderBottomColor: theme.dividerColor,
                alignItems: 'flex-start',
                paddingLeft: theme.marginLeft,
                paddingRight: theme.marginRight,
                paddingTop: theme.itemMarginTop,
                paddingBottom: theme.itemMarginBottom,
                // backgroundColor: theme.backgroundColor,
            },
            listItemText: {
                flex: 1,
                color: theme.color,
                fontSize: theme.fontSize,
            },
            selectionWrapper: {
                backgroundColor: theme.backgroundColor,
            },
        };
        styles.listItemWithCheckbox = { ...styles.listItem };
        delete styles.listItemWithCheckbox.paddingTop;
        delete styles.listItemWithCheckbox.paddingBottom;
        delete styles.listItemWithCheckbox.paddingLeft;
        styles.listItemTextWithCheckbox = { ...styles.listItemText };
        styles.listItemTextWithCheckbox.marginTop = styles.listItem.paddingTop - 1;
        styles.listItemTextWithCheckbox.marginBottom = styles.listItem.paddingBottom;
        styles.selectionWrapperSelected = { ...styles.selectionWrapper };
        styles.selectionWrapperSelected.backgroundColor = theme.selectedColor;
        this.styles_[this.props.themeId] = StyleSheet.create(styles);
        return this.styles_[this.props.themeId];
    }
    async todoCheckbox_change(checked) {
        if (!this.props.note)
            return;
        const newNote = {
            id: this.props.note.id,
            todo_completed: checked ? time.unixMs() : 0,
        };
        await Note.save(newNote);
    }
    onPress() {
        if (!this.props.note)
            return;
        if (this.props.note.encryption_applied)
            return;
        if (this.props.noteSelectionEnabled) {
            this.props.dispatch({
                type: 'NOTE_SELECTION_TOGGLE',
                id: this.props.note.id,
            });
        }
        else {
            this.props.dispatch({
                type: 'NAV_GO',
                routeName: 'Note',
                noteId: this.props.note.id,
            });
        }
    }
    onLongPress() {
        if (!this.props.note)
            return;
        this.props.dispatch({
            type: this.props.noteSelectionEnabled ? 'NOTE_SELECTION_TOGGLE' : 'NOTE_SELECTION_START',
            id: this.props.note.id,
        });
    }
    render() {
        const note = this.props.note ? this.props.note : {};
        const isTodo = !!Number(note.is_todo);
        const theme = themeStyle(this.props.themeId.toString());
        // IOS: display: none crashes the app
        const checkboxStyle = !isTodo ? { display: 'none' } : { color: theme.color };
        if (isTodo) {
            checkboxStyle.paddingRight = 10;
            checkboxStyle.paddingTop = theme.itemMarginTop;
            checkboxStyle.paddingBottom = theme.itemMarginBottom;
            checkboxStyle.paddingLeft = theme.marginLeft;
        }
        const checkboxChecked = !!Number(note.todo_completed);
        const listItemStyle = isTodo ? this.styles().listItemWithCheckbox : this.styles().listItem;
        const listItemTextStyle = isTodo ? this.styles().listItemTextWithCheckbox : this.styles().listItemText;
        const opacityStyle = isTodo && checkboxChecked ? { opacity: 0.4 } : {};
        const isSelected = this.props.noteSelectionEnabled && this.props.selectedNoteIds.indexOf(note.id ?? '') >= 0;
        const selectionWrapperStyle = isSelected ? this.styles().selectionWrapperSelected : this.styles().selectionWrapper;
        const noteTitle = Note.displayTitle(note);
        return (<TouchableOpacity onPress={() => this.onPress()} onLongPress={() => this.onLongPress()} activeOpacity={0.5}>
				<View style={selectionWrapperStyle}>
					<View style={opacityStyle}>
						<View style={listItemStyle}>
							<Checkbox style={checkboxStyle} checked={checkboxChecked} onChange={checked => this.todoCheckbox_change(checked)} accessibilityLabel={_('to-do: %s', noteTitle)}/>
							<Text style={listItemTextStyle}>{noteTitle}</Text>
						</View>
					</View>
				</View>
			</TouchableOpacity>);
    }
}
const NoteItem = connect((state) => {
    return {
        themeId: state.settings.theme,
        noteSelectionEnabled: state.noteSelectionEnabled,
        selectedNoteIds: state.selectedNoteIds,
    };
})(NoteItemComponent);
export default NoteItem;
// module.exports = { NoteItem };
//# sourceMappingURL=note-item.js.map