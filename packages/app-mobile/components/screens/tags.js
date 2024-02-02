import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import Tag from '@xilinota/lib/models/Tag';
// const BaseModel = require('@xilinota/lib/BaseModel').default;
import { themeStyle } from '../global-style';
import { ScreenHeader } from '../ScreenHeader';
import { _ } from '@xilinota/lib/locale';
import BaseScreenComponent from '../base-screen';
import SearchEngineUtils from '@xilinota/lib/services/searchengine/SearchEngineUtils';
// import SearchEngine from '@xilinota/lib/services/searchengine/SearchEngine';
import Note from '@xilinota/lib/models/Note';
class TagsScreenComponent extends BaseScreenComponent {
    styles_;
    static navigationOptions() {
        return { header: null };
    }
    constructor(props) {
        super(props);
        this.state = {
            tags: [],
            notes: [],
        };
        this.tagList_renderItem = this.tagList_renderItem.bind(this);
        this.tagList_keyExtractor = this.tagList_keyExtractor.bind(this);
        this.tagItem_press = this.tagItem_press.bind(this);
    }
    styles() {
        if (this.styles_)
            return this.styles_;
        const theme = themeStyle(this.props.themeId.toString());
        this.styles_ = StyleSheet.create({
            listItem: {
                flexDirection: 'row',
                borderBottomWidth: 1,
                borderBottomColor: theme.dividerColor,
                alignItems: 'flex-start',
                paddingLeft: theme.marginLeft,
                paddingRight: theme.marginRight,
                paddingTop: theme.itemMarginTop,
                paddingBottom: theme.itemMarginBottom,
            },
            listItemText: {
                flex: 1,
                color: theme.color,
                fontSize: theme.fontSize,
            },
        });
        return this.styles_;
    }
    tagItem_press(event) {
        this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
        this.props.dispatch({
            type: 'NAV_GO',
            routeName: 'Notes',
            tagId: event.id,
        });
    }
    async refreshSearch(query = '') {
        let notes = [];
        if (query) {
            if (false && this.props.settings['db.ftsEnabled']) {
                // console.log('refreshSearch 1');
                notes = await SearchEngineUtils.notesForQuery(query, true);
            }
            else {
                const p = query.split(' ');
                const temp = [];
                for (let i = 0; i < p.length; i++) {
                    const t = p[i].trim();
                    if (!t)
                        continue;
                    temp.push(t);
                }
                notes = await Note.previews('', {
                    anywherePattern: `*${temp.join('*')}*`,
                });
            }
        }
        this.setState({ notes: notes });
    }
    async tagItem_longPress(event) {
        await this.refreshSearch(event.title);
        this.props.dispatch({
            type: 'NAV_GO',
            routeName: 'Notes',
            Virtual: { parent: event.title, notes: this.state.notes },
        });
    }
    tagList_renderItem(event) {
        const tag = event.item;
        return (<TouchableOpacity onPress={() => {
                this.tagItem_press({ id: tag.id ?? '' });
            }} onLongPress={async () => await this.tagItem_longPress({ title: tag.title ?? '' })}>
				<View style={this.styles().listItem}>
					<Text style={this.styles().listItemText}>{tag.title}</Text>
				</View>
			</TouchableOpacity>);
    }
    tagList_keyExtractor(item) {
        return item.id ?? '';
    }
    async componentDidMount() {
        const tags = await Tag.allWithNotes();
        tags.sort((a, b) => {
            return a.title ?? ''.toLowerCase() < (b.title ?? '').toLowerCase() ? -1 : +1;
        });
        this.setState({ tags: tags });
    }
    render() {
        const theme = themeStyle(this.props.themeId.toString());
        const rootStyle = {
            flex: 1,
            backgroundColor: theme.backgroundColor,
        };
        return (<View style={rootStyle}>
				<ScreenHeader title={_('Tags')} parentComponent={this} showSearchButton={false}/>
				<FlatList style={{ flex: 1 }} data={this.state.tags} renderItem={this.tagList_renderItem} keyExtractor={this.tagList_keyExtractor}/>
			</View>);
    }
}
const TagsScreen = connect((state) => {
    return {
        themeId: state.settings.theme,
    };
})(TagsScreenComponent);
export default TagsScreen;
// module.exports = { TagsScreen };
//# sourceMappingURL=tags.js.map