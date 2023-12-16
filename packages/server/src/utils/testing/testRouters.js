"use strict";
/* eslint-disable no-console */
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
const fs = require("fs-extra");
require('source-map-support').install();
const { stringify } = require('query-string');
const execCommand = function (command, returnStdErr = false) {
    const exec = require('child_process').exec;
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                if (error.signal === 'SIGTERM') {
                    resolve('Process was killed');
                }
                else {
                    reject(error);
                }
            }
            else {
                const output = [];
                if (stdout.trim())
                    output.push(stdout.trim());
                if (returnStdErr && stderr.trim())
                    output.push(stderr.trim());
                resolve(output.join('\n\n'));
            }
        });
    });
};
function sleep(seconds) {
    return __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, seconds * 1000);
        });
    });
}
function curl(method, path, query = null, body = null, headers = null, formFields = null, options = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const curlCmd = ['curl'];
        if (options.verbose)
            curlCmd.push('-v');
        if (options.output)
            curlCmd.push(`--output "${options.output}"`);
        if ((['PUT', 'DELETE', 'PATCH'].indexOf(method) >= 0) || (method === 'POST' && !formFields && !body)) {
            curlCmd.push('-X');
            curlCmd.push(method);
        }
        if (typeof body === 'object' && body) {
            curlCmd.push('--data');
            curlCmd.push(`'${JSON.stringify(body)}'`);
        }
        if (formFields) {
            for (const f of formFields) {
                curlCmd.push('-F');
                curlCmd.push(`'${f}'`);
            }
        }
        if (options.uploadFile) {
            curlCmd.push('--data-binary');
            curlCmd.push(`@${options.uploadFile}`);
            headers['Content-Type'] = 'application/octet-stream';
        }
        if (!headers && body)
            headers = {};
        if (body && !headers['Content-Type'])
            headers['Content-Type'] = 'application/json';
        if (headers) {
            for (const k in headers) {
                curlCmd.push('--header');
                curlCmd.push(`"${k}: ${headers[k]}"`);
            }
        }
        curlCmd.push(`http://localhost:22300/${path}${query ? `?${stringify(query)}` : ''}`);
        console.info(`Running: ${curlCmd.join(' ')}`);
        const result = yield execCommand(curlCmd.join(' '), !!options.verbose);
        if (options.verbose)
            return result;
        return result ? JSON.parse(result) : null;
    });
}
function extractCurlResponse(rawResult) {
    const splitted = rawResult.split('\n');
    return splitted.filter((line) => line.indexOf('<') === 0).join('\n');
}
const spawn = require('child_process').spawn;
let serverProcess = null;
function checkAndPrintResult(prefix, result) {
    if (typeof result === 'object' && result && result.error)
        throw new Error(`${prefix}: ${JSON.stringify(result)}`);
    console.info(prefix, result);
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const serverRoot = `${__dirname}/../../..`;
        const tempDir = `${serverRoot}/temp`;
        process.chdir(serverRoot);
        yield fs.remove(tempDir);
        yield fs.mkdirp(tempDir);
        const pidFilePath = `${serverRoot}/test.pid`;
        fs.removeSync(`${serverRoot}/db-testing.sqlite`);
        // const migrateCommand = 'NODE_ENV=testing node dist/app.js --migrate-latest --env dev';
        const clearCommand = 'node dist/app.js --env dev --drop-tables';
        const migrateCommand = 'node dist/app.js --env dev --migrate-latest';
        yield execCommand(clearCommand);
        yield execCommand(migrateCommand);
        const serverCommandParams = [
            'dist/app.js',
            '--pidfile', pidFilePath,
            '--env', 'dev',
        ];
        serverProcess = spawn('node', serverCommandParams, {
            detached: true,
            stdio: 'inherit',
        });
        const cleanUp = () => {
            console.info(`To run this server again: ${clearCommand} ${migrateCommand} && node ${serverCommandParams.join(' ')}`);
            serverProcess.kill();
        };
        process.on('SIGINT', () => {
            console.info('Received SIGINT signal - killing server');
            cleanUp();
            process.exit();
        });
        try {
            let response = null;
            console.info('Waiting for server to be ready...');
            while (true) {
                try {
                    response = yield curl('GET', 'api/ping');
                    console.info(`Got ping response: ${JSON.stringify(response)}`);
                    break;
                }
                catch (error) {
                    // console.error('error', error);
                    yield sleep(0.5);
                }
            }
            console.info('Server is ready');
            // POST api/sessions
            const session = yield curl('POST', 'api/sessions', null, { email: 'admin@localhost', password: 'admin' });
            checkAndPrintResult('Session: ', session);
            // PUT api/files/:fileId/content
            response = yield curl('PUT', 'api/files/root:/photo.jpg:/content', null, null, { 'X-API-AUTH': session.id }, null, {
                uploadFile: `${serverRoot}/assets/tests/photo.jpg`,
            });
            checkAndPrintResult('Response:', response);
            // GET api/files/:fileId
            const file = yield curl('GET', `api/files/${response.id}`, null, null, { 'X-API-AUTH': session.id });
            checkAndPrintResult('Response:', file);
            // GET api/files/:fileId/content
            response = yield curl('GET', `api/files/${response.id}/content`, null, null, { 'X-API-AUTH': session.id }, null, {
                verbose: true,
                output: `${tempDir}/photo-downloaded.jpg`,
            });
            console.info(extractCurlResponse(response));
            // GET api/files/root/children
            const files = yield curl('GET', 'api/files/root/children', null, null, { 'X-API-AUTH': session.id });
            checkAndPrintResult('Response:', files);
            // PATCH api/files/:fileId - change name
            response = yield curl('PATCH', 'api/files/root:/photo.jpg:', null, { name: 'newname.jpg' }, { 'X-API-AUTH': session.id });
            checkAndPrintResult('Response:', response);
        }
        finally {
            cleanUp();
        }
    });
}
main().catch(error => {
    console.error('FATAL ERROR', error);
    if (serverProcess)
        serverProcess.kill();
});
//# sourceMappingURL=testRouters.js.map