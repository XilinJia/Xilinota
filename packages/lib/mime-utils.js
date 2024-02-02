"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mime_utils_types_1 = __importDefault(require("./mime-utils-types"));
const mimeUtils = {
    fromFileExtension(ext) {
        ext = ext.toLowerCase();
        for (let i = 0; i < mime_utils_types_1.default.length; i++) {
            const t = mime_utils_types_1.default[i];
            if (t.e.indexOf(ext) >= 0) {
                return t.t;
            }
        }
        return null;
    },
    fromFilename(name) {
        if (!name)
            return null;
        const splitted = name.trim().split('.');
        if (splitted.length <= 1)
            return null;
        return mimeUtils.fromFileExtension(splitted[splitted.length - 1]);
    },
    toFileExtension(mimeType) {
        mimeType = mimeType.toLowerCase();
        for (let i = 0; i < mime_utils_types_1.default.length; i++) {
            const t = mime_utils_types_1.default[i];
            if (mimeType === t.t) {
                // Return the first file extension that is 3 characters long
                // If none exist return the first one in the list.
                for (let j = 0; j < t.e.length; j++) {
                    if (t.e[j].length === 3)
                        return t.e[j];
                }
                return t.e[0];
            }
        }
        return null;
    },
    fromDataUrl(dataUrl) {
        // Example: data:image/jpeg;base64,/9j/4AAQSkZJR.....
        const defaultMime = 'text/plain';
        const p = dataUrl.substring(0, dataUrl.indexOf(',')).split(';');
        let s = p[0];
        const ss = s.split(':');
        if (ss.length <= 1)
            return defaultMime;
        s = ss[1];
        return s.indexOf('/') >= 0 ? s : defaultMime; // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
    },
};
exports.default = mimeUtils;
// module.exports = { mime };
//# sourceMappingURL=mime-utils.js.map