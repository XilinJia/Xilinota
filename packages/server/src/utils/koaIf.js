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
// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
function koaIf(middleware, condition = null) {
    // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
    return (ctx, next) => __awaiter(this, void 0, void 0, function* () {
        if (typeof condition === 'function' && condition(ctx)) {
            yield middleware(ctx, next);
        }
        else if (typeof condition === 'boolean' && condition) {
            yield middleware(ctx, next);
        }
        else {
            yield next();
        }
    });
}
exports.default = koaIf;
//# sourceMappingURL=koaIf.js.map