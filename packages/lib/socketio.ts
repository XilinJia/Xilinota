
import express = require('express');
import { Application as ExpApp } from 'express';
import * as http from 'http';
const os = require('os');

import { Server, Socket as SocketServer } from 'socket.io';

const dgram = require('dgram');

import { reg } from './registry';
import Setting from './models/Setting';
import { PeerSocket, PeersFolder, PeersNote } from './models/Peers';
import Note from './models/Note';
import Folder from './models/Folder';

const deviceName = os.hostname();

interface RemoteInfo {
	address: string;
	family: 'IPv4' | 'IPv6';
	port: number;
	size: number;
}

const socketPort = 51876;
let httpServer: http.Server = null;

export let socketIOServer: Server = null;
export let socketIOWorker: Server = null;
export const clientsNameIDMap = new Map<string, string>();
export let clientCount = 0;

export function initSocketIOServer() {
	const app: ExpApp = express();
	httpServer = http.createServer(app);
	socketIOServer = new Server(httpServer);
	socketIOWorker = socketIOServer;

	// Serve static files from a directory
	app.use(express.static(__dirname));

	// Express server routes and middleware can be defined here
	socketIOServer.on('connection', (socket: SocketServer) => {
		const token = socket.handshake.query.token;
		if (token !== udpCodeEven) {
			reg.logger().info('Server: A client unauthorized rejected.');
			socket.disconnect(true);
			return;
		}

		reg.logger().info('Server: A client connected.');
		PeerSocket.broadcaster = workerEmit;
		PeerSocket.sender = workerEmitToClient;

		let clientName: string;
		const onlineTime = new Date().getTime();
		Setting.setValue('onlineTime', onlineTime);
		Setting.setValue('offlineTime', onlineTime);

		// Receive client name from the client
		socket.on('registerName', (name) => {
			// Store the client name and its socket ID
			clientsNameIDMap.set(name, socket.id);
			clientName = name;
			clientCount = clientsNameIDMap.size;

			reg.logger().info(`Server: Client connected: ${name} (${socket.id}) ${clientCount}`);
			socket.emit('serverName', deviceName);

			socketIOServer.emit('clientList', Object.keys(clientsNameIDMap));
		});

		// Receive a private message from the client
		socket.on('privateMessage', ({ tag, recipient, data }) => {
			const recipientId = clientsNameIDMap.get(recipient);

			if (recipientId) {
				reg.logger().info(`Server: forwarding message from (${socket.id}) to ${recipient}`);
				socketIOServer.to(recipientId).emit(tag, data);
			} else {
				reg.logger().info(`Recipient '${recipient}' not found.`);
			}
		});

		// Receive a private message from the client
		socket.on('semiPrivateMessage', ({ recipients, message }: { recipients: string[]; message: string }) => {
			// eslint-disable-next-line github/array-foreach
			recipients.forEach((recipient: string) => {
				if (clientsNameIDMap.has(recipient)) {
					socketIOServer.to(recipient).emit('message', `Private message from ${clientName}: ${message}`);
				} else {
					reg.logger().info(`Recipient '${recipient}' not found.`);
				}
			});
		});

		// Handle incoming messages from the client
		socket.on('message', (data) => {
			reg.logger().info('Server: Received message:', data);

			// Broadcast the message to all connected clients (including sender)
			socketIOServer.emit('message', data);
		});

		socket.on('updateRequest', async (data) => {
			reg.logger().info('Server: Received updateRequest:', data);
			const offTime = data['offTime'];

			reg.logger().info('Server: received updateRequest from ', socket.id, new Date(offTime));

			// first syncing deleted folders
			// const folderids = await Folder.foldersDeletedAfter(offTime);
			// for (const id of folderids) {
			// 	await Folder.deleteOnPeer(id, socket.id, workerEmitToClient);
			// }
			socketIOServer.to(socket.id).emit('folderDeleteSent', 'Done');

			socket.on('folderDeleteSent', async (_data) => {
				reg.logger().info('Server: received folderDeleteSent from ', socket.id, new Date(offTime));

				// sync moved folders
				const [folderids] = await Folder.foldersUpdatedAfter(offTime);
				for (const id of folderids) {
					reg.logger().info('Server: late move folder', id);
					await PeersFolder.moveOnPeer(id, socket.id);
				}
				socketIOServer.to(socket.id).emit('folderMoveSent', 'Done');

				socket.on('folderMoveSent', async (data) => {
					reg.logger().info('Server: received folderMoveSent from ', socket.id, new Date(offTime));

					// handle notes updates
					const noteidsClient: string[] = data['noteids'];
					reg.logger().info(`Server: received ${noteidsClient.length} node ids from client ${socket.id} for sync`);

					const [noteids, notes] = await Note.notesUpdatedAfter(offTime);
					let conflistids: string[] = [];
					if (noteids.length > 0 && noteidsClient.length > 0) {
						conflistids = noteids.filter((id) => noteidsClient.includes(id));
						for (const noteId of conflistids) {
							const note = notes.find((n => n.id === noteId));
							await Note.createConflictNote(note, 111);
						}
					}
					reg.logger().info(`Server: among the note ids from client, ${conflistids.length} are in conflict`);

					socketIOServer.to(socket.id).emit('conflictNotes', { noteids: conflistids });
					socket.on('conflictReceived', async (_data) => {
						reg.logger().info('Server: received conflictReceived from ', socket.id, new Date(offTime));
						if (noteids.length > 0) {
							for (const note of notes) {
								if (conflistids.includes(note.id)) continue;
								reg.logger().info('Server: late sync note', note.title);
								await PeersNote.syncToPeer(note, socket.id);
							}
						}
						socketIOServer.to(socket.id).emit('updateSent', 'Done');

						socket.on('updateSent', async (_data) => {
							reg.logger().info('Server: received updateSent from ', socket.id, new Date(offTime));

							// sync deleted notes
							const noteids = await Note.notesDeletedAfter(offTime);
							reg.logger().info('Server: late batch delete notes', noteids);
							await PeersNote.batchDeleteOnPeer(noteids, socket.id);
							socketIOServer.to(socket.id).emit('deleteSent', 'Done');
						});
					});
				});
			});
		});

		socket.on('note', async (msg: Record<string, string>) => {
			// const Note = BaseItem.getClass('Note');
			await PeersNote.parsePeerMessage(msg);
			socket.broadcast.emit('note', msg);
		});

		socket.on('folder', async (msg: Record<string, string>) => {
			// const Folder = BaseItem.getClass('Folder');
			await PeersFolder.parsePeerMessage(msg);
			socket.broadcast.emit('folder', msg);
		});

		// Handle client disconnection
		socket.on('disconnect', () => {
			reg.logger().info('Server: A client disconnected.', socket.id);
			// eslint-disable-next-line github/array-foreach
			clientsNameIDMap.forEach((value, key) => {
				if (value === socket.id) {
					clientsNameIDMap.delete(key);
				}
			});
			clientCount = clientsNameIDMap.size;
			if (clientCount === 0) {
				Setting.setValue('offlineTime', new Date().getTime());
				PeerSocket.broadcaster = null;
				PeerSocket.sender = null;
			}
		});
	});

	httpServer.listen(socketPort, () => {
		reg.logger().info(`httpServer listening on port ${socketPort}.`);
	});

	socketIOServer.on('close', () => {
		// Server shutdown event handling
		reg.logger().info('Server is shutting down or restarting');
	});
}

const closeServer = () => {
	httpServer.close(() => {
		reg.logger().info('Server closed');
		process.exit(0);
	});
};

process.on('SIGINT', closeServer);

export function workerEmit(tag: string, data: Record<string, string>) {
	if (socketIOServer && socketIOServer.engine.clientsCount > 0) socketIOWorker.emit(tag, data);
}

export function workerEmitToClient(tag: string, data: Record<string, string>, clientId: string = null) {
	if (clientId) {
		socketIOWorker.to(clientId).emit(tag, data);
	} else {
		if (socketIOServer && socketIOServer.engine.clientsCount > 0) socketIOWorker.emit(tag, data);
	}
}

// Check if any client is connected
export function isAnyClientConnected() {
	const connectedClients = Object.keys(socketIOServer.sockets.sockets);
	reg.logger().info('Server: connected client', connectedClients.length);
	return connectedClients.length > 0;
}

export const udpServer = dgram.createSocket('udp4');

const broadcastPort = 32345;
const serverResponsePort = 54321;
let privateUDPHeaderCode: string;
let udpCodeOdd: string;
let udpCodeEven: string;

export function initUDPServer() {

	privateUDPHeaderCode = Setting.value('privateCode');
	udpCodeOdd = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 !== 0).join('');
	udpCodeEven = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 === 0).join('');

	// Get the server's IP address
	const interfaces = os.networkInterfaces();
	let serverAddress: string | undefined;

	// eslint-disable-next-line github/array-foreach
	Object.keys(interfaces).forEach((interfaceName) => {
		const addresses = interfaces[interfaceName];
		// eslint-disable-next-line github/array-foreach
		addresses.forEach((address: { family: string; internal: any; address: string }) => {
			if (address.family === 'IPv4' && !address.internal) {
				serverAddress = address.address;
			}
		});
	});

	if (!serverAddress) {
		console.error('UDPServer: Unable to determine server IP address');
		process.exit(1);
	}

	// Get the subnet-directed broadcast address
	const broadcastAddress: string = serverAddress.replace(/\.\d+$/, '.255');

	privateUDPHeaderCode = Setting.value('privateCode');

	// Enable SO_BROADCAST option
	udpServer.on('listening', () => {
		udpServer.setBroadcast(true);
	});

	// Listen for the client's response
	// eslint-disable-next-line no-unused-vars
	udpServer.on('message', (message: Buffer, _rinfo: RemoteInfo) => {
		reg.logger().info('UDPServer: Received message from client:', message.toString());
	});

	// Broadcast the server presence
	udpServer.bind(serverResponsePort, () => {
		setInterval(() => {
			const udpHeaderCode = Setting.value('privateCode');
			if (privateUDPHeaderCode !== udpHeaderCode) {
				privateUDPHeaderCode = udpHeaderCode;
				udpCodeOdd = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 !== 0).join('');
				udpCodeEven = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 === 0).join('');
				if (socketIOServer) {
					// eslint-disable-next-line github/array-foreach
					socketIOServer.sockets.sockets.forEach((socket) => {
						socket.disconnect();
					});
				}
			}

			if (privateUDPHeaderCode) {
				const broadcastData = `${udpCodeOdd}.D ${deviceName}`;
				udpServer.send(broadcastData, broadcastPort, broadcastAddress, (error: Error | null) => {
					if (error) {
						reg.logger().error('UDPServer: Error broadcasting server presence:', error);
					}
				});
			}
		}, 10000);
		reg.logger().info('UDPServer:  is running.');
	});
}

const udpClient = dgram.createSocket('udp4');

export function initUDPClient() {
	privateUDPHeaderCode = Setting.value('privateCode');
	udpCodeOdd = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 !== 0).join('');
	udpCodeEven = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 === 0).join('');

	// Listen for the server's broadcast
	udpClient.on('message', (message: Buffer, _remote: RemoteInfo) => {
		const broadcastMsg = message.toString();
		if (broadcastMsg.startsWith(privateUDPHeaderCode)) {
			reg.logger().info('Received server broadcast');
			// Decide to act as the client
			// Connect to the server using the extracted serverAddress
			udpClient.send('Hello Server', serverResponsePort, _remote.address);
		}
	});

	// Bind to a port to receive server broadcast
	udpClient.bind(broadcastPort, () => {
		udpClient.setBroadcast(true);
	});

	reg.logger().info('Client is running.');
}
