// src/services/meshWebRTCService.js
import { io } from "socket.io-client";
import axios from "axios";
import EventEmitter from "eventemitter3";

class MeshWebRTCService extends EventEmitter {
    constructor() {
        super();
        this.socket = null;
        this.roomId = null;
        this.userId = null;
        this.localStream = null;
        this.peerConnections = new Map(); // Map of peerId -> RTCPeerConnection
        this.remoteTracks = new Map(); // Map of peerId -> { audio: track, video: track }
        this.iceServers = [];
        this.isInitiator = new Map(); // Track who initiates connections
    }

    // Connect to mesh WebRTC server
    async connect(mediaServerUrl = import.meta.env.VITE_MEDIASOUP_URL) {
        if (this.socket && this.socket.connected) {
            console.log("Already connected to mesh WebRTC server");
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            this.socket = io(mediaServerUrl, {
                transports: ["websocket"],
            });

            this.socket.on("connect", () => {
                console.log("Connected to mesh WebRTC server");
                resolve();
            });

            this.socket.on("connect_error", (error) => {
                console.error("Failed to connect to mesh WebRTC server:", error);
                reject(error);
            });

            // Set up socket event handlers
            this.setupSocketListeners();
        });
    }

    // Setup socket event listeners
    setupSocketListeners() {
        // Handle new peer joining
        this.socket.on("peerJoined", async ({ peerId, userId, name }) => {
            console.log(`Peer joined: ${peerId}, name: ${name}`);
            this.emit("peerJoined", { peerId, userId, name });

            // Create peer connection for new peer
            await this.createPeerConnection(peerId, true); // We are the initiator
        });

        // Handle peer leaving
        this.socket.on("peerLeft", (data) => {
            console.log(`Peer left: ${data.peerId}`);
            this.emit("peerLeft", data);

            // Clean up peer connection
            this.closePeerConnection(data.peerId);
        });


        // Handle WebRTC signaling
        this.socket.on("webrtc-offer", async ({ fromPeerId, offer }) => {
            console.log(`Received offer from ${fromPeerId}`);
            await this.handleOffer(fromPeerId, offer);
        });

        this.socket.on("webrtc-answer", async ({ fromPeerId, answer }) => {
            console.log(`Received answer from ${fromPeerId}`);
            await this.handleAnswer(fromPeerId, answer);
        });

        this.socket.on("webrtc-ice-candidate", async ({ fromPeerId, candidate }) => {
            console.log(`Received ICE candidate from ${fromPeerId}`);
            await this.handleIceCandidate(fromPeerId, candidate);
        });

        // Handle new producer (for compatibility)
        this.socket.on("newProducer", ({ producerId, peerId, kind }) => {
            console.log(`New producer: ${producerId} from peer: ${peerId}, kind: ${kind}`);
            // In mesh, this is handled through WebRTC directly
        });
    }

    // Join a room
    async joinRoom(roomId, userId, userName) {
        this.roomId = roomId;
        this.userId = userId;

        return new Promise((resolve, reject) => {
            this.socket.emit(
                "joinRoom",
                {
                    roomId,
                    userId,
                    name: userName,
                },
                async (response) => {
                    if (response.error) {
                        reject(new Error(response.error));
                        return;
                    }

                    try {
                        // Store ICE servers
                        this.iceServers = response.iceServers || [];

                        // Create peer connections for existing peers
                        if (response.peerList && response.peerList.length > 0) {
                            for (const peer of response.peerList) {
                                await this.createPeerConnection(peer.id, false); // They are already there, so we don't initiate
                            }
                        }

                        resolve(response);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    // Create peer connection
    async createPeerConnection(peerId, isInitiatorFlag = false) {
        if (this.peerConnections.has(peerId)) {
            console.log(`Peer connection already exists for ${peerId}`);
            return this.peerConnections.get(peerId);
        }

        console.log(`Creating peer connection for ${peerId}, initiator: ${isInitiatorFlag}`);

        const pc = new RTCPeerConnection({
            iceServers: this.iceServers,
            iceCandidatePoolSize: 10,
        });

        this.peerConnections.set(peerId, pc);
        this.isInitiator.set(peerId, isInitiatorFlag);

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`Sending ICE candidate to ${peerId}`);
                this.socket.emit("webrtc-ice-candidate", {
                    targetPeerId: peerId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            console.log(`Received track from ${peerId}:`, event.track.kind);

            if (!this.remoteTracks.has(peerId)) {
                this.remoteTracks.set(peerId, {});
            }

            const tracks = this.remoteTracks.get(peerId);
            tracks[event.track.kind] = event.track;

            // Emit new consumer event for compatibility
            this.emit("newConsumer", {
                peerId,
                track: event.track,
                kind: event.track.kind,
            });
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log(`Connection state for ${peerId}: ${pc.connectionState}`);
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                this.closePeerConnection(peerId);
            }
        };

        // Add local tracks if available
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        // If we're the initiator, create and send offer
        if (isInitiatorFlag) {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                console.log(`Sending offer to ${peerId}`);
                this.socket.emit("webrtc-offer", {
                    targetPeerId: peerId,
                    offer: offer,
                });
            } catch (error) {
                console.error(`Error creating offer for ${peerId}:`, error);
            }
        }

        return pc;
    }

    // Handle incoming offer
    async handleOffer(fromPeerId, offer) {
        let pc = this.peerConnections.get(fromPeerId);

        if (!pc) {
            pc = await this.createPeerConnection(fromPeerId, false);
        }

        try {
            await pc.setRemoteDescription(offer);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log(`Sending answer to ${fromPeerId}`);
            this.socket.emit("webrtc-answer", {
                targetPeerId: fromPeerId,
                answer: answer,
            });
        } catch (error) {
            console.error(`Error handling offer from ${fromPeerId}:`, error);
        }
    }

    // Handle incoming answer
    async handleAnswer(fromPeerId, answer) {
        const pc = this.peerConnections.get(fromPeerId);
        if (!pc) {
            console.error(`No peer connection found for ${fromPeerId}`);
            return;
        }

        try {
            await pc.setRemoteDescription(answer);
            console.log(`Set remote description (answer) for ${fromPeerId}`);
        } catch (error) {
            console.error(`Error handling answer from ${fromPeerId}:`, error);
        }
    }

    // Handle incoming ICE candidate
    async handleIceCandidate(fromPeerId, candidate) {
        const pc = this.peerConnections.get(fromPeerId);
        if (!pc) {
            console.error(`No peer connection found for ${fromPeerId}`);
            return;
        }

        try {
            await pc.addIceCandidate(candidate);
            console.log(`Added ICE candidate from ${fromPeerId}`);
        } catch (error) {
            console.error(`Error adding ICE candidate from ${fromPeerId}:`, error);
        }
    }

    // Close peer connection
    closePeerConnection(peerId) {
        const pc = this.peerConnections.get(peerId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(peerId);
            this.isInitiator.delete(peerId);
        }

        // Clean up remote tracks
        if (this.remoteTracks.has(peerId)) {
            this.remoteTracks.delete(peerId);
        }

        console.log(`Closed peer connection for ${peerId}`);
    }

    // Produce a track (add to local stream and all peer connections)
    async produceTrack(track, kind, appData = {}) {
        try {
            // Create local stream if it doesn't exist
            if (!this.localStream) {
                this.localStream = new MediaStream();
            }

            // Add track to local stream
            this.localStream.addTrack(track);

            // Add track to all existing peer connections
            this.peerConnections.forEach((pc, peerId) => {
                console.log(`Adding ${kind} track to peer connection ${peerId}`);
                pc.addTrack(track, this.localStream);
            });

            // Notify server (for compatibility with existing interface)
            return new Promise((resolve) => {
                this.socket.emit(
                    "produce",
                    {
                        transportId: "mesh-transport",
                        kind,
                        rtpParameters: {},
                        appData: { ...appData, kind },
                    },
                    (response) => {
                        resolve({
                            id: response.id,
                            track,
                            kind,
                        });
                    }
                );
            });
        } catch (error) {
            console.error("Failed to produce track:", error);
            throw error;
        }
    }

    // Consume a track (handled automatically through WebRTC)
    async consumeTrack(producerId, kind, peerId) {
        // In mesh architecture, consuming is handled automatically through WebRTC
        // This method exists for compatibility with the existing interface
        console.log(`Consume track request for ${kind} from ${peerId}`);

        return new Promise((resolve) => {
            // Simulate the consume response
            const consumerId = `consumer_${this.socket.id}_${Date.now()}`;

            resolve({
                id: consumerId,
                producerId,
                kind,
                peerId,
            });
        });
    }

    // Close producer (remove track from all peer connections)
    closeProducer(producerId) {
        // In mesh, we need to remove tracks from peer connections
        // This is a simplified implementation
        console.log(`Closing producer: ${producerId}`);
    }

    // Initialize device (compatibility method - not needed for mesh)
    async initializeDevice(rtpCapabilities) {
        console.log("Initialize device - not needed for mesh WebRTC");
        return Promise.resolve();
    }

    // Create transports (compatibility methods - not needed for mesh)
    async createSendTransport() {
        console.log("Create send transport - handled by peer connections in mesh");
        return Promise.resolve();
    }

    async createReceiveTransport() {
        console.log("Create receive transport - handled by peer connections in mesh");
        return Promise.resolve();
    }

    // Get ICE servers from backend
    async getIceServers() {
        try {
            const response = await axios.get("/api/meeting/ice-servers");
            return response.data;
        } catch (error) {
            console.error("Failed to get ICE servers:", error);
            throw error;
        }
    }

    // Helper method to get tracks for a specific peer
    getTracksForPeer(peerId) {
        return this.remoteTracks.get(peerId) || {};
    }

    // Helper to get all remote tracks
    getAllRemoteTracks() {
        return this.remoteTracks;
    }

    // Add local stream to existing peer connections
    setLocalStream(stream) {
        this.localStream = stream;

        // Add tracks to all existing peer connections
        this.peerConnections.forEach((pc, peerId) => {
            // Remove existing tracks first
            const senders = pc.getSenders();
            senders.forEach(sender => {
                if (sender.track) {
                    pc.removeTrack(sender);
                }
            });

            // Add new tracks
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            // If we're the initiator, renegotiate
            if (this.isInitiator.get(peerId)) {
                this.renegotiate(peerId);
            }
        });
    }

    // Renegotiate connection
    async renegotiate(peerId) {
        const pc = this.peerConnections.get(peerId);
        if (!pc) return;

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            this.socket.emit("webrtc-offer", {
                targetPeerId: peerId,
                offer: offer,
            });
        } catch (error) {
            console.error(`Error renegotiating with ${peerId}:`, error);
        }
    }

    // Close all connections
    close() {
        // Close all peer connections
        this.peerConnections.forEach((pc, peerId) => {
            this.closePeerConnection(peerId);
        });
        this.peerConnections.clear();
        this.remoteTracks.clear();
        this.isInitiator.clear();

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Leave room
        if (this.socket && this.roomId) {
            this.socket.emit("leaveRoom", {
                roomId: this.roomId,
                userId: this.userId,
            });
        }

        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

// Export singleton instance
const meshWebRTCService = new MeshWebRTCService();

// Also export the class for direct usage if needed
export { MeshWebRTCService };
export default meshWebRTCService;