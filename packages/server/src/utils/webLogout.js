"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookies_1 = require("./cookies");
const requestUtils_1 = require("./requestUtils");
exports.default = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const sessionId = (0, requestUtils_1.contextSessionId)(ctx, false);
    (0, cookies_1.cookieSet)(ctx, 'sessionId', '');
    (0, cookies_1.cookieSet)(ctx, 'adminSessionId', '');
    yield ctx.joplin.models.session().logout(sessionId);
});
//# sourceMappingURL=webLogout.js.map