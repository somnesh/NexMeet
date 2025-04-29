// src/services/WebRTCService.js
import * as mediasoupClient from 'mediasoup-client';
import { io } from 'socket.io-client';

class WebRTCService {
    constructor() {
        this.device = null;
        this.socket = null;
        this.producerTransport = null;
        this.consumerTransport = null;
        this.producers = new Map();
        this.consumers = new Map();
        this.roomId = null;
        this.userId = null;
        this.userName = null;
        this.peers = new Map();
        this.mediaStreams = {
            localVideo: null,
            localAudio: null,
            localScreen: null
        };
        this.onNewConsumer = null;
        this.onPeerJoined = null;
        this.onPeerLeft = null;
    }

    /**
     * Initialize WebRTC service and connect to signaling server
     * @param {string} serverUrl - The WebSocket server URL
     */
    init(serverUrl) {
        this.socket = io(serverUrl, {
            withCredentials: true
        });

        this.socket.on('connect', () => {
            console.log('Connected to signaling server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from signaling server');
        });

        // Handle various socket events
        this.socket.on('peerJoined', this.handlePeerJoined.bind(this));
        this.socket.on('peerLeft', this.handlePeerLeft.bind(this));
        this.socket.on('newProducer', this.handleNewProducer.bind(this));
        this.socket.on('producerClosed', this.handleProducerClosed.bind(this));
    }

    /**
     * Join a meeting room
     * @param {string} roomId - The room ID to join
     * @param {string} userId - The user's ID
     * @param {string} userName - The user's display name
     */
    async joinRoom(roomId, userId, userName) {
        this.roomId = roomId;
        this.userId = userId;
        this.userName = userName;

        try {
            // Join the room and get router RTP capabilities
            const { rtpCapabilities, peerList } = await this.sendRequest('joinRoom', {
                roomId,
                userId,
                name: userName
            });

            // Create mediasoup device
            this.device = new mediasoupClient.Device();

            // Load the device with router RTP capabilities
            await this.device.load({ routerRtpCapabilities: rtpCapabilities });

            // Add existing peers to our peer list
            if (peerList && peerList.length > 0) {
                peerList.forEach(peer => {
                    this.peers.set(peer.id, peer);
                    if (this.onPeerJoined) {
                        this.onPeerJoined(peer);
                    }
                });
            }

            // Create WebRTC transports for sending and receiving media
            await this.createTransports();

            return true;
        } catch (error) {
            console.error('Error joining room:', error);
            return false;
        }
    }

    /**
     * Create WebRTC transports for producing and consuming media
     */
    async createTransports() {
        try {
            // Create producer transport (for sending media)
            const producerTransportInfo = await this.sendRequest('createWebRtcTransport', {
                direction: 'send'
            });

            this.producerTransport = this.device.createSendTransport({
                id: producerTransportInfo.id,
                iceParameters: producerTransportInfo.iceParameters,
                iceCandidates: producerTransportInfo.iceCandidates,
                dtlsParameters: producerTransportInfo.dtlsParameters
            });

            // Handle producer transport events
            this.producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await this.sendRequest('connectTransport', {
                        transportId: this.producerTransport.id,
                        dtlsParameters
                    });
                    callback();
                } catch (error) {
                    errback(error);
                }
            });

            this.producerTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                try {
                    const { id } = await this.sendRequest('produce', {
                        transportId: this.producerTransport.id,
                        kind,
                        rtpParameters,
                        appData
                    });
                    callback({ id });
                } catch (error) {
                    errback(error);
                }
            });

            // Create consumer transport (for receiving media)
            const consumerTransportInfo = await this.sendRequest('createWebRtcTransport', {
                direction: 'recv'
            });

            this.consumerTransport = this.device.createRecvTransport({
                id: consumerTransportInfo.id,
                iceParameters: consumerTransportInfo.iceParameters,
                iceCandidates: consumerTransportInfo.iceCandidates,
                dtlsParameters: consumerTransportInfo.dtlsParameters
            });

            // Handle consumer transport events
            this.consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await this.sendRequest('connectTransport', {
                        transportId: this.consumerTransport.id,
                        dtlsParameters
                    });
                    callback();
                } catch (error) {
                    errback(error);
                }
            });

            return true;
        } catch (error) {
            console.error('Error creating transports:', error);
            return false;
        }
    }

    /**
     * Send a request to the signaling server and wait for response
     * @param {string} type - The request type
     * @param {Object} data - The request data
     * @returns {Promise} - The server response
     */
    sendRequest(type, data) {
        return new Promise((resolve, reject) => {
            this.socket.emit(type, data, response => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Get user media (camera and/or microphone) and create producers
     * @param {boolean} video - Enable video
     * @param {boolean} audio - Enable audio
     */
    async publishMedia(video = true, audio = true) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
            this.mediaStreams.localVideo = video ? stream.getVideoTracks()[0] : null;
            this.mediaStreams.localAudio = audio ? stream.getAudioTracks()[0] : null;

            // Create producers for audio and video
            if (video && this.mediaStreams.localVideo) {
                const videoProducer = await this.producerTransport.produce({
                    track: this.mediaStreams.localVideo,
                    encodings: [
                        { maxBitrate: 100000, scaleResolutionDownBy: 4 },
                        { maxBitrate: 300000, scaleResolutionDownBy: 2 },
                        { maxBitrate: 900000 }
                    ],
                    codecOptions: {
                        videoGoogleStartBitrate: 1000
                    },
                    appData: { source: 'webcam' }
                });

                this.producers.set('video', videoProducer);

                videoProducer.on('trackended', () => {
                    console.log('Video track ended');
                });
            }

            if (audio && this.mediaStreams.localAudio) {
                const audioProducer = await this.producerTransport.produce({
                    track: this.mediaStreams.localAudio,
                    appData: { source: 'mic' }
                });

                this.producers.set('audio', audioProducer);

                audioProducer.on('trackended', () => {
                    console.log('Audio track ended');
                });
            }

            return stream;
        } catch (error) {
            console.error('Error publishing media:', error);
            throw error;
        }
    }

    /**
     * Start screen sharing
     */
    async publishScreen() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'monitor',
                    logicalSurface: true,
                    cursor: true,
                    width: { max: 1920 },
                    height: { max: 1080 },
                    frameRate: { max: 30 }
                }
            });

            this.mediaStreams.localScreen = stream.getVideoTracks()[0];

            // When user stops screen sharing from browser UI
            this.mediaStreams.localScreen.onended = () => {
                this.stopScreenShare();
            };

            const screenProducer = await this.producerTransport.produce({
                track: this.mediaStreams.localScreen,
                encodings: [
                    { maxBitrate: 1500000 }
                ],
                appData: { source: 'screen' }
            });

            this.producers.set('screen', screenProducer);

            return stream;
        } catch (error) {
            console.error('Error publishing screen:', error);
            if (error.name === 'NotAllowedError') {
                // User denied permission
                return null;
            }
            throw error;
        }
    }

    /**
     * Stop screen sharing
     */
    stopScreenShare() {
        const screenProducer = this.producers.get('screen');
        if (screenProducer) {
            screenProducer.close();
            this.producers.delete('screen');
        }

        if (this.mediaStreams.localScreen) {
            this.mediaStreams.localScreen.stop();
            this.mediaStreams.localScreen = null;
        }
    }

    /**
     * Consume media from a remote producer
     * @param {string} producerId - The remote producer ID to consume
     * @param {string} producerPeerId - The peer ID that owns the producer
     */
    async consumeMedia(producerId, producerPeerId) {
        try {
            // Get consumer parameters from server
            const { id, kind, rtpParameters } = await this.sendRequest('consume', {
                transportId: this.consumerTransport.id,
                producerId,
                rtpCapabilities: this.device.rtpCapabilities
            });

            // Create consumer
            const consumer = await this.consumerTransport.consume({
                id,
                producerId,
                kind,
                rtpParameters
            });

            this.consumers.set(consumer.id, consumer);

            // Resume consumer (start receiving media)
            await this.sendRequest('resumeConsumer', { consumerId: consumer.id });

            // Notify application about new consumer
            if (this.onNewConsumer) {
                this.onNewConsumer({
                    consumer,
                    peerId: producerPeerId,
                    kind
                });
            }

            return consumer;
        } catch (error) {
            console.error('Error consuming media:', error);
            return null;
        }
    }

    /**
     * Toggle audio mute state
     * @returns {boolean} - New mute state (true = muted)
     */
    toggleAudio() {
        const audioProducer = this.producers.get('audio');
        if (!audioProducer) return true;

        if (audioProducer.paused) {
            audioProducer.resume();
            return false;
        } else {
            audioProducer.pause();
            return true;
        }
    }

    /**
     * Toggle video mute state
     * @returns {boolean} - New mute state (true = muted)
     */
    toggleVideo() {
        const videoProducer = this.producers.get('video');
        if (!videoProducer) return true;

        if (videoProducer.paused) {
            videoProducer.resume();
            return false;
        } else {
            videoProducer.pause();
            return true;
        }
    }

    /**
     * Handle when a new peer joins the room
     * @param {Object} peer - The new peer data
     */
    handlePeerJoined(peer) {
        console.log('Peer joined:', peer);
        this.peers.set(peer.peerId, {
            id: peer.peerId,
            userId: peer.userId,
            name: peer.name
        });

        if (this.onPeerJoined) {
            this.onPeerJoined(peer);
        }
    }

    /**
     * Handle when a peer leaves the room
     * @param {Object} data - The peer data
     */
    handlePeerLeft(data) {
        console.log('Peer left:', data);
        this.peers.delete(data.peerId);

        if (this.onPeerLeft) {
            this.onPeerLeft(data);
        }
    }

    /**
     * Handle new producer notification
     * @param {Object} data - The producer data
     */
    async handleNewProducer(data) {
        console.log('New producer:', data);

        // Only consume if we're not the publisher
        if (data.peerId !== this.socket.id) {
            await this.consumeMedia(data.producerId, data.peerId);
        }
    }

    /**
     * Handle producer closed notification
     * @param {Object} data - The consumer data
     */
    handleProducerClosed(data) {
        console.log('Producer closed:', data);

        const consumer = this.consumers.get(data.consumerId);
        if (consumer) {
            consumer.close();
            this.consumers.delete(data.consumerId);
        }
    }

    /**
     * Leave the current room
     */
    leaveRoom() {
        // Close all producers
        for (const producer of this.producers.values()) {
            producer.close();
        }
        this.producers.clear();

        // Close all consumers
        for (const consumer of this.consumers.values()) {
            consumer.close();
        }
        this.consumers.clear();

        // Close transports
        if (this.producerTransport) {
            this.producerTransport.close();
            this.producerTransport = null;
        }

        if (this.consumerTransport) {
            this.consumerTransport.close();
            this.consumerTransport = null;
        }

        // Stop all media streams
        if (this.mediaStreams.localVideo) {
            this.mediaStreams.localVideo.stop();
        }

        if (this.mediaStreams.localAudio) {
            this.mediaStreams.localAudio.stop();
        }

        if (this.mediaStreams.localScreen) {
            this.mediaStreams.localScreen.stop();
        }

        this.mediaStreams = {
            localVideo: null,
            localAudio: null,
            localScreen: null
        };

        // Clear room data
        this.roomId = null;
        this.peers.clear();

        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

export default new WebRTCService();