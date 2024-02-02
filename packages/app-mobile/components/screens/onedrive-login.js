import React from 'react';
import { View, Button } from 'react-native';
import { WebView } from 'react-native-webview';
import { connect } from 'react-redux';
import ScreenHeader from '../ScreenHeader';
import { reg } from '@xilinota/lib/registry';
import { _ } from '@xilinota/lib/locale';
import BaseScreenComponent from '../base-screen';
const parseUri = require('@xilinota/lib/parseUri');
import { themeStyle } from '../global-style';
import shim from '@xilinota/lib/shim';
class OneDriveLoginScreenComponent extends BaseScreenComponent {
    authCode_;
    static navigationOptions() {
        return { header: null };
    }
    constructor(props) {
        super(props);
        this.state = { webviewUrl: '' };
        this.authCode_ = null;
    }
    styles() {
        const theme = themeStyle(this.props.themeId.toString());
        return {
            screen: {
                flex: 1,
                backgroundColor: theme.backgroundColor,
            },
        };
    }
    UNSAFE_componentWillMount() {
        this.setState({
            webviewUrl: this.startUrl(),
        });
    }
    startUrl() {
        return reg
            .syncTarget()
            .api()
            .authCodeUrl(this.redirectUrl());
    }
    redirectUrl() {
        return reg
            .syncTarget()
            .api()
            .nativeClientRedirectUrl();
    }
    async webview_load(noIdeaWhatThisIs) {
        // This is deprecated according to the doc but since the non-deprecated property (source)
        // doesn't exist, use this for now. The whole component is completely undocumented
        // at the moment so it's likely to change.
        const url = noIdeaWhatThisIs.url;
        const parsedUrl = parseUri(url);
        if (!this.authCode_ && parsedUrl && parsedUrl.queryKey && parsedUrl.queryKey.code) {
            this.authCode_ = parsedUrl.queryKey.code;
            try {
                await reg
                    .syncTarget()
                    .api()
                    .execTokenRequest(this.authCode_, this.redirectUrl(), true);
                this.props.dispatch({ type: 'NAV_BACK' });
                reg.scheduleSync(0);
            }
            catch (error) {
                alert(`Could not login to OneDrive. Please try again\n\n${error.message}\n\n${url}`);
            }
            this.authCode_ = null;
        }
    }
    async webview_error() {
        alert('Could not load page. Please check your connection and try again.');
    }
    retryButton_click() {
        // It seems the only way it would reload the page is by loading an unrelated
        // URL, waiting a bit, and then loading the actual URL. There's probably
        // a better way to do this.
        this.setState({
            webviewUrl: 'https://microsoft.com',
        });
        this.forceUpdate();
        shim.setTimeout(() => {
            this.setState({
                webviewUrl: this.startUrl(),
            });
            this.forceUpdate();
        }, 1000);
    }
    render() {
        const source = {
            uri: this.state.webviewUrl,
        };
        return (<View style={this.styles().screen}>
				<ScreenHeader title={_('Login with OneDrive')}/>
				<WebView source={source} onNavigationStateChange={o => {
                this.webview_load(o);
            }} onError={() => {
                this.webview_error();
            }}/>
				<Button title={_('Refresh')} onPress={() => {
                this.retryButton_click();
            }}></Button>
			</View>);
    }
}
const OneDriveLoginScreen = connect((state) => {
    return {
        themeId: state.settings.theme,
    };
})(OneDriveLoginScreenComponent);
export default OneDriveLoginScreen;
// module.exports = { OneDriveLoginScreen };
//# sourceMappingURL=onedrive-login.js.map