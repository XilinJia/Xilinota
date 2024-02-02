
import { reg } from '@xilinota/lib/registry';
import { io, Socket as SocketClient } from 'socket.io-client';

const dgram = require('react-native-udp');
import DeviceInfo from 'react-native-device-info';
import { NetworkInfo } from 'react-native-network-info';
import { PeersFolder, PeersNote, PeerSocket } from '@xilinota/lib/models/Peers';
import Setting from '@xilinota/lib/models/Setting';
import Note from '@xilinota/lib/models/Note';
import Folder from '@xilinota/lib/models/Folder';

const deviceName = DeviceInfo.getDeviceNameSync();
let ipAddress = '';
let serverAddress = '';

const socketPort = 51876;
export let socketIOClient: SocketClient | null = null;
export let socketIOWorker: SocketClient | null = null;
const clientnames = new Set<string>();
let serverName: string;

function initSocketIOClient() {
	const serverUrl = `http://${serverAddress}:${socketPort}`; // Replace with your Socket.IO server URL

	reg.logger().info('Client: getting socket');
	socketIOClient = io(serverUrl, {
		reconnection: false, // Disable automatic reconnection
		query: {
			token: udpCodeEven,
		},
	});
	// reg.logger().info('Client: socket=', this.socket);

	socketIOClient.on('connect', async () => {
		// clientId = socketIOClient.id;
		socketIOClient!.emit('registerName', deviceName);

		socketIOWorker = socketIOClient;
		PeerSocket.broadcaster = workerEmit;
		PeerSocket.sender = workerEmitToPeer;

		reg.logger().info('Client: Socket.IO connection established.');

		const offlineTime = Setting.value('offlineTime');
		let onlineTime = Setting.value('onlineTime');
		const quitTime = Setting.value('shutdownTime');
		const lastSyncTime = Setting.value('peerSyncTime');
		// offlineTime === onlineTime means the app was thrown out while online without having time to record offlineTime
		// const offTime = offlineTime === onlineTime ? quitTime : offlineTime > quitTime ? offlineTime : quitTime;	// TODO: needs review
		const offTime = lastSyncTime === 0 ? quitTime : lastSyncTime;
		reg.logger().info('Client: device offline and shutdown times', new Date(offlineTime), new Date(quitTime), new Date(offTime));

		socketIOWorker?.emit('updateRequest', { offTime: offTime });

		socketIOClient?.on('folderDeleteSent', async (_msg) => {
			// after syncing server folder delete, sync back the same
			// const folderids = await Folder.foldersDeletedAfter(offTime);
			// for (const id of folderids) {
			// 	await Folder.deleteOnPeers(id, workerEmit);
			// }
			socketIOWorker?.emit('folderDeleteSent', 'Done');

			socketIOClient?.on('folderMoveSent', async (_msg) => {
				// after syncing server moved folders, sync back the same
				const [folderids] = await Folder.foldersUpdatedAfter(offTime);
				for (const id of folderids) {
					await PeersFolder.moveOnPeers(id);
				}
				// while notify server having moved folders, notify about updated notes
				const [noteids, notes] = await Note.notesUpdatedAfter(offTime);
				socketIOWorker?.emit('folderMoveSent', { noteids: noteids });

				socketIOClient?.on('conflictNotes', async (msg) => {
					reg.logger().info('Client: Received conflictNotes:', msg);
					const conflistids: string[] = msg['noteids'];
					if (conflistids.length > 0) {
						for (const noteId of conflistids) {
							const note = notes.find((n => n.id === noteId));
							if (note) {
								reg.logger().info('Client: Mark note as conflict:', note.title);
								await Note.createConflictNote(note, 111);
							}
						}
					}
					socketIOWorker?.emit('conflictReceived', 'Done');

					socketIOClient?.on('updateSent', async (msg: string) => {
						// after syncing updated notes from server, sync back the same
						reg.logger().info('Client: Received updatesent:', msg);
						for (const note of notes) {
							if (!note.id || conflistids.includes(note.id)) continue;
							reg.logger().info('Client: late sync note', note.title);
							await PeersNote.syncToPeers(note);
						}
						socketIOWorker?.emit('updateSent', 'Done');

						socketIOClient?.on('deleteSent', async (_msg) => {
							// after syncing deleted notes from server, sync back the same
							const noteids = await Note.notesDeletedAfter(offTime);
							await PeersNote.batchDeleteOnPeers(noteids);
						});
					});
				});
			});
		});

		onlineTime = new Date().getTime();
		Setting.setValue('onlineTime', onlineTime);
		Setting.setValue('offlineTime', onlineTime);
		Setting.setValue('peerSyncTime', onlineTime);
	});

	// socketIOClient.on('message', (message: string) => {
	// 	reg.logger().info('Client: Received message:', message);
	// });

	// Send a private message to another client
	// socketIOClient.emit('privateMessage', { recipient: 'client2', message: 'Hello there!' });

	socketIOClient.on('serverName', (name: string) => {
		serverName = name;
		reg.logger().info('Client: socket server name:', serverName);
	});

	// Receive the list of connected clients from the server
	socketIOClient.on('clientList', (clients: string[]) => {
		reg.logger().info('Client: Connected clients:', clients);

		clients.forEach((client: string) => {
			if (client !== deviceName) clientnames.add(client);
		});
	});
	// Event handler to receive file data from the server
	socketIOClient.on('note', async (msg: Record<string, string>) => {
		// const Note = BaseItem.getClass('Note');
		await PeersNote.parsePeerMessage(msg);
	});

	socketIOClient.on('folder', async (msg: Record<string, string>) => {
		// const Folder = BaseItem.getClass('Folder');
		await PeersFolder.parsePeerMessage(msg);
	});

	socketIOClient.on('disconnect', () => {
		// Handle the disconnect event
		reg.logger().info('Client: Disconnected from the server');
		socketIOClient = null;
		socketIOWorker = null;
		Setting.setValue('offlineTime', new Date().getTime());
		PeerSocket.broadcaster = null;
		PeerSocket.sender = null;
	});
}

export function workerEmit(tag: string, data: Record<string, string>) {
	if (socketIOWorker && socketIOWorker.connected) {
		socketIOWorker.emit(tag, data);
		Setting.setValue('peerSyncTime', new Date().getTime());
	}
}

export function workerEmitToPeer(tag: string, data: Record<string, string>, clientName: string = '') {
	if (!clientName) {
		reg.logger().error('workerEmitToPeer: clientName empty');
		return;
	}
	data = { clientName: clientName, ...data };
	if (socketIOWorker && socketIOWorker.connected) {
		socketIOClient?.emit('privateMessage', { tag: tag, recipient: clientName, data: data });
		Setting.setValue('peerSyncTime', new Date().getTime());
	}
}

// Stop the socket connection
// function stopSocketIOClient() {
// 	if (socketIOClient) {
// 		socketIOClient.close();
// 		socketIOClient = null;
// 		reg.logger().info('Socket connection stopped');
// 	} else {
// 		reg.logger().info('No active socket connection');
// 	}
// }


const broadcastPort = 32345;
const serverResponsePort = 54321;
let privateUDPHeaderCode: string;
let udpCodeOdd: string;
let udpCodeEven: string;
let broadcastAddress = '';

export const udpServer = dgram.createSocket({
	type: 'udp4',
	reusePort: true, // optional, enables multiple sockets to bind to the same port
	debug: true, // optional, enables debug logs
});

export async function initUDPServer() {
	privateUDPHeaderCode = Setting.value('privateCode');
	udpCodeOdd = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 !== 0).join('');
	udpCodeEven = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 === 0).join('');

	ipAddress = await NetworkInfo.getIPAddress() ?? '';
	reg.logger().info('Network IP Address:', ipAddress);

	// NetworkInfo.getIPAddress().then((ipAddress: string) => {
	// 	reg.logger().info('Network IP Address:', ipAddress);
	// });

	// Listen for messages from clients
	udpServer.on('message', (message: Buffer, rinfo: { address: string; port: number }) => {
		reg.logger().info('Received message from client:', message.toString());
		reg.logger().info('Client address:', rinfo.address);
		reg.logger().info('Client port:', rinfo.port);

		// Respond to the client
		const responseMessage = 'Hello from server!';
		udpServer.send(responseMessage, 0, responseMessage.length, rinfo.port, rinfo.address, (error: Error | null) => {
			if (error) {
				console.error('Error sending response to client:', error);
			} else {
				reg.logger().info('Response sent to client.');
			}
		});
	});

	// Broadcast the server presence
	udpServer.bind(() => {
		udpServer.setBroadcast(true);
		setInterval(() => {
			const broadcastData = privateUDPHeaderCode;
			broadcastAddress = ipAddress.replace(/\.\d+$/, '.255');
			udpServer.send(broadcastData, 0, broadcastData.length, broadcastPort, broadcastAddress, (error: Error | null) => {
				if (error) {
					reg.logger().error('Error broadcasting server presence:', error);
				} else {
					reg.logger().info('Server broadcast sent.');
				}
			});
		}, 5000);
		reg.logger().info('Server is running.');
	});
}

export function queryForServer() {
	const timeoutDuration = 2000;
	// Broadcast the message
	const message = 'Hello, recipients!';
	udpServer.send(message, serverResponsePort, broadcastAddress, (error: any) => {
		if (error) {
			console.error('Error sending UDP broadcast:', error);
			return;
		}
		reg.logger().info('Broadcast sent successfully.');
	});

	// Start the timeout
	const timeout = setTimeout(() => {
		reg.logger().info('No responses received within the specified duration.');
		// socket.close();
	}, timeoutDuration);

	// Close the socket and clear the timeout on exit
	process.on('exit', () => {
		udpServer.close();
		clearTimeout(timeout);
	});
}

export const udpClient = dgram.createSocket({
	type: 'udp4',
	reusePort: true, // optional, enables multiple sockets to bind to the same port
	debug: true, // optional, enables debug logs
});

export function initUDPClient() {
	privateUDPHeaderCode = Setting.value('privateCode');
	udpCodeOdd = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 !== 0).join('');
	udpCodeEven = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 === 0).join('');

	const respondToServer = (_message: Buffer, rinfo: { address: any; port?: number }) => {
		const messageString: string = _message.toString();
		if (privateUDPHeaderCode && messageString.startsWith(udpCodeOdd)) {
			serverAddress = rinfo.address;
			reg.logger().info('UDPClient: Received server broadcast from:', serverAddress, 'Connecting...');
			// const message = deviceName;
			// udpClient.send(message, 0, message.length, serverResponsePort, serverAddress, (error: Error | null) => {
			// 	if (error) {
			// 		console.error('UDPClient: Error sending message to server:', error);
			// 	} else {
			// 		reg.logger().info('UDPClient: Message sent to server.');
			// 	}
			// });
			initSocketIOClient();
		}
	};
	// Listen for server broadcasts
	udpClient.on('message', (message: Buffer, rinfo: { address: string; port: number }) => {
		const udpHeaderCode = Setting.value('privateCode');
		if (udpHeaderCode !== privateUDPHeaderCode) {
			privateUDPHeaderCode = udpHeaderCode;
			udpCodeOdd = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 !== 0).join('');
			udpCodeEven = privateUDPHeaderCode.split('').filter((_: any, index: number) => index % 2 === 0).join('');
			if (socketIOClient) socketIOClient.disconnect();
		}

		if (!socketIOClient || !socketIOClient.connected) {
			// reg.logger().info('UDPClient: Received server broadcast:', message.toString(), 'connecting...');
			respondToServer(message, rinfo);
		}
	});

	// Bind the client socket
	udpClient.bind(broadcastPort, () => {
		udpClient.setBroadcast(true);
		reg.logger().info('UDPClient is running.');

		// Send a broadcast to discover the server
		const broadcastData = 'ClientBroadcast';
		udpClient.send(broadcastData, 0, broadcastData.length, broadcastPort, '255.255.255.255', (error: Error | null) => {
			if (error) {
				reg.logger().error('UDPClient: Error sending client broadcast:', error);
			} else {
				reg.logger().info('UDPClient: Client broadcast sent.');
			}
		});
	});
}
