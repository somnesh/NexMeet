// src/services/mediasoupService.js
import * as mediasoupClient from "mediasoup-client";
import { io } from "socket.io-client";
import axios from "axios";
import EventEmitter from "eventemitter3";

class MediasoupService extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.device = null;
    this.producerTransport = null;
    this.consumerTransport = null;
    this.producers = new Map();
    this.consumers = new Map();
    this.roomId = null;
    this.userId = null;
    this.remoteTracks = new Map();
  }

  // Connect to mediasoup server
  async connect(mediaServerUrl = import.meta.env.VITE_MEDIASOUP_URL) {
    if (this.socket && this.socket.connected) {
      console.log("Already connected to mediasoup server");
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.socket = io(mediaServerUrl, {
        transports: ["websocket"],
      });

      this.socket.on("connect", () => {
        console.log("Connected to mediasoup server");
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error("Failed to connect to mediasoup server:", error);
        reject(error);
      });

      // Set up other socket event handlers
      this.setupSocketListeners();
    });
  }

  // Setup socket event listeners
  setupSocketListeners() {
    this.socket.on("newProducer", async ({ producerId, peerId, kind }) => {
      console.log(`New producer: ${producerId} from peer: ${peerId}`);
      await this.consumeTrack(producerId, kind, peerId);
    });

    this.socket.on("producerClosed", ({ consumerId, peerId, kind }) => {
      const consumer = this.consumers.get(consumerId);
      if (consumer) {
        // Emit event before closing
        this.emit("consumerClosed", {
          consumer,
          peerId,
          kind,
        });

        consumer.close();
        this.consumers.delete(consumerId);

        // Update remoteTracks
        if (this.remoteTracks.has(peerId)) {
          const tracks = this.remoteTracks.get(peerId);
          delete tracks[kind];

          // Remove peerId entry if no tracks left
          if (Object.keys(tracks).length === 0) {
            this.remoteTracks.delete(peerId);
          }
        }
      }
    });

    this.socket.on("peerJoined", ({ peerId, userId, name }) => {
      console.log(`Peer joined: ${peerId}, name: ${name}`);
      this.emit("peerJoined", { peerId, userId, name });
    });

    this.socket.on("peerLeft", ({ peerId }) => {
      console.log(`Peer left: ${peerId}`);
      this.emit("peerLeft", { peerId });

      // Clean up any remaining tracks
      if (this.remoteTracks.has(peerId)) {
        this.remoteTracks.delete(peerId);
      }
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
            // Initialize mediasoup device
            await this.initializeDevice(response.rtpCapabilities);

            // Create sending and receiving transports
            await this.createSendTransport();
            await this.createReceiveTransport();

            resolve(response);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  // Initialize mediasoup device
  async initializeDevice(routerRtpCapabilities) {
    try {
      this.device = new mediasoupClient.Device();
      await this.device.load({ routerRtpCapabilities });
      console.log("Mediasoup device initialized");
    } catch (error) {
      console.error("Failed to initialize mediasoup device:", error);
      throw error;
    }
  }

  // Create transport for sending media
  async createSendTransport() {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "createWebRtcTransport",
        { direction: "send" },
        async (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          try {
            this.producerTransport = this.device.createSendTransport({
              id: response.id,
              iceParameters: response.iceParameters,
              iceCandidates: response.iceCandidates,
              dtlsParameters: response.dtlsParameters,
            });
            console.log("Send transport created:", this.producerTransport);

            // Set up producer transport event handlers
            this.producerTransport.on(
              "connect",
              ({ dtlsParameters }, callback, errback) => {
                this.socket.emit(
                  "connectTransport",
                  {
                    transportId: this.producerTransport.id,
                    dtlsParameters,
                  },
                  (response) => {
                    if (response.error) {
                      errback(new Error(response.error));
                      return;
                    }
                    callback();
                  }
                );
              }
            );

            this.producerTransport.on(
              "produce",
              ({ kind, rtpParameters, appData }, callback, errback) => {
                this.socket.emit(
                  "produce",
                  {
                    transportId: this.producerTransport.id,
                    kind,
                    rtpParameters,
                    appData,
                  },
                  (response) => {
                    if (response.error) {
                      errback(new Error(response.error));
                      return;
                    }
                    callback({ id: response.id });
                  }
                );
              }
            );

            resolve();
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  // Create transport for receiving media
  async createReceiveTransport() {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "createWebRtcTransport",
        { direction: "receive" },
        async (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          try {
            this.consumerTransport = this.device.createRecvTransport({
              id: response.id,
              iceParameters: response.iceParameters,
              iceCandidates: response.iceCandidates,
              dtlsParameters: response.dtlsParameters,
            });

            // Set up consumer transport event handlers
            this.consumerTransport.on(
              "connect",
              ({ dtlsParameters }, callback, errback) => {
                this.socket.emit(
                  "connectTransport",
                  {
                    transportId: this.consumerTransport.id,
                    dtlsParameters,
                  },
                  (response) => {
                    if (response.error) {
                      errback(new Error(response.error));
                      return;
                    }
                    callback();
                  }
                );
              }
            );

            resolve();
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  // Produce a track (send audio/video)
  async produceTrack(track, kind, appData = {}) {
    if (!this.producerTransport) {
      throw new Error("Send transport not created");
    }

    try {
      const producer = await this.producerTransport.produce({
        track,
        encodings: this.getEncodings(kind),
        codecOptions: this.getCodecOptions(kind),
        appData: { ...appData, kind },
      });

      this.producers.set(producer.id, producer);

      producer.on("trackended", () => {
        console.log("Track ended");
        this.closeProducer(producer.id);
      });

      return producer;
    } catch (error) {
      console.error("Failed to produce track:", error);
      throw error;
    }
  }

  // Consume a track (receive audio/video)
  async consumeTrack(producerId, kind, peerId) {
    if (!this.consumerTransport) {
      throw new Error("Receive transport not created");
    }

    return new Promise((resolve, reject) => {
      this.socket.emit(
        "consume",
        {
          transportId: this.consumerTransport.id,
          producerId,
          rtpCapabilities: this.device.rtpCapabilities,
        },
        async (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          try {
            const consumer = await this.consumerTransport.consume({
              id: response.id,
              producerId: response.producerId,
              kind: response.kind,
              rtpParameters: response.rtpParameters,
              appData: { peerId, kind },
            });

            this.consumers.set(consumer.id, consumer);

            // Store track by peerId for easy access
            if (!this.remoteTracks.has(peerId)) {
              this.remoteTracks.set(peerId, {});
            }

            this.remoteTracks.get(peerId)[kind] = consumer.track;

            // Emit event with consumer and track information
            this.emit("newConsumer", {
              consumer,
              peerId,
              track: consumer.track,
              kind,
            });

            // Tell the server we're ready to consume
            this.socket.emit(
              "resumeConsumer",
              { consumerId: consumer.id },
              (response) => {
                if (response.error) {
                  console.error(response.error);
                } else {
                  console.log("Consumer resumed successfully");
                }
              }
            );

            resolve(consumer);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  // Close producer
  closeProducer(producerId) {
    const producer = this.producers.get(producerId);
    if (!producer) return;

    producer.close();
    this.producers.delete(producerId);

    this.socket.emit("closeProducer", { producerId });
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

  // Helper methods for encoding settings
  getEncodings(kind, source) {
    if (kind === "video") {
      if (source === "screen") {
        // Higher quality for screen sharing
        return [{ maxBitrate: 5000000, scaleResolutionDownBy: 1 }];
      } else {
        return [
          { maxBitrate: 500000, scaleResolutionDownBy: 4 },
          { maxBitrate: 1000000, scaleResolutionDownBy: 2 },
          { maxBitrate: 5000000 },
        ];
      }
    }
    return [{}];
  }

  getCodecOptions(kind) {
    return kind === "video" ? { videoGoogleStartBitrate: 1000 } : {};
  }

  // Close all connections
  close() {
    // Close all producers
    this.producers.forEach((producer) => producer.close());
    this.producers.clear();

    // Close all consumers
    this.consumers.forEach((consumer) => consumer.close());
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

export default new MediasoupService();
