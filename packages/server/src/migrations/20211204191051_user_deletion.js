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
    yield db.schema.createTable('user_deletions', (table) => {
        table.increments('id').unique().primary().notNullable();
        table.string('user_id', 32).notNullable();
        table.specificType('process_data', 'smallint').defaultTo(0).notNullable();
        table.specificType('process_account', 'smallint').defaultTo(0).notNullable();
        table.bigInteger('scheduled_time').notNullable();
        table.bigInteger('start_time').defaultTo(0).notNullable();
        table.bigInteger('end_time').defaultTo(0).notNullable();
        table.integer('success').defaultTo(0).notNullable();
        table.text('error', 'mediumtext').defaultTo('').notNullable();
        table.bigInteger('updated_time').notNullable();
        table.bigInteger('created_time').notNullable();
    });
    yield db.schema.alterTable('user_deletions', (table) => {
        table.unique(['user_id']);
    });
});
exports.up = up;
const down = (db) => __awaiter(void 0, void 0, void 0, function* () {
    yield db.schema.dropTable('user_deletions');
});
exports.down = down;
//# sourceMappingURL=20211204191051_user_deletion.js.map