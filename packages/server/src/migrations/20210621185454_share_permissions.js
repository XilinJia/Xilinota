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
exports.down = exports.up = void 0;
const up = (db) => __awaiter(void 0, void 0, void 0, function* () {
    yield db.schema.alterTable('users', (table) => {
        table.renameColumn('can_share', 'can_share_folder');
        table.integer('can_share_note').defaultTo(1).notNullable();
    });
});
exports.up = up;
const down = (_db) => __awaiter(void 0, void 0, void 0, function* () {
});
exports.down = down;
//# sourceMappingURL=20210621185454_share_permissions.js.map