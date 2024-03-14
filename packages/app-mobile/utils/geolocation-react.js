import Geolocation from '@react-native-community/geolocation';
const Setting = require('@xilinota/lib/models/Setting').default;
export default class GeolocationReact {
    static currentPosition_testResponse() {
        return {
            mocked: false,
            timestamp: new Date().getTime(),
            coords: {
                speed: 0,
                heading: 0,
                accuracy: 20,
                longitude: -3.45966339111328,
                altitude: 0,
                latitude: 48.73219093634444,
            },
        };
    }
    static currentPosition(options = null) {
        if (Setting.value('env') === 'dev')
            return this.currentPosition_testResponse();
        if (!options)
            options = {};
        if (!('enableHighAccuracy' in options))
            options.enableHighAccuracy = true;
        if (!('timeout' in options))
            options.timeout = 10000;
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition((data) => {
                resolve(data);
            }, (error) => {
                reject(error);
            }, options);
        });
    }
}
// module.exports = { GeolocationReact };
//# sourceMappingURL=geolocation-react.js.map