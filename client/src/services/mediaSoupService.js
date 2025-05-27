// src/services/mediaSoupService.js (Adapter for mesh WebRTC)
// This file replaces your existing mediaSoupService.js to work with mesh WebRTC

import meshWebRTCService from './meshWebRTCService.js';

// Create an adapter that maintains the same interface as the original mediaSoupService
class MediaSoupAdapter {
  constructor() {
    this.meshService = meshWebRTCService;

    // Forward all events from the mesh service
    this.meshService.on('peerJoined', (...args) => this.emit('peerJoined', ...args));
    this.meshService.on('peerLeft', (...args) => this.emit('peerLeft', ...args));
    this.meshService.on('newConsumer', (...args) => this.emit('newConsumer', ...args));
    this.meshService.on('consumerClosed', (...args) => this.emit('consumerClosed', ...args));
  }

  // Event emitter methods
  on(event, listener) {
    if (!this._events) this._events = {};
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(listener);
  }

  emit(event, ...args) {
    if (!this._events || !this._events[event]) return;
    this._events[event].forEach(listener => listener(...args));
  }

  off(event, listener) {
    if (!this._events || !this._events[event]) return;
    const index = this._events[event].indexOf(listener);
    if (index !== -1) {
      this._events[event].splice(index, 1);
    }
  }

  // Delegate all methods to the mesh service
  async connect(mediaServerUrl) {
    return this.meshService.connect(mediaServerUrl);
  }

  async joinRoom(roomId, userId, userName) {
    return this.meshService.joinRoom(roomId, userId, userName);
  }

  async initializeDevice(rtpCapabilities) {
    return this.meshService.initializeDevice(rtpCapabilities);
  }

  async createSendTransport() {
    return this.meshService.createSendTransport();
  }

  async createReceiveTransport() {
    return this.meshService.createReceiveTransport();
  }

  async produceTrack(track, kind, appData) {
    return this.meshService.produceTrack(track, kind, appData);
  }

  async consumeTrack(producerId, kind, peerId) {
    return this.meshService.consumeTrack(producerId, kind, peerId);
  }

  closeProducer(producerId) {
    return this.meshService.closeProducer(producerId);
  }

  async getIceServers() {
    return this.meshService.getIceServers();
  }

  getTracksForPeer(peerId) {
    return this.meshService.getTracksForPeer(peerId);
  }

  getAllRemoteTracks() {
    return this.meshService.getAllRemoteTracks();
  }

  close() {
    return this.meshService.close();
  }

  // Additional methods that might be useful
  setLocalStream(stream) {
    return this.meshService.setLocalStream(stream);
  }

  // Getters for compatibility
  get socket() {
    return this.meshService.socket;
  }

  get device() {
    return { loaded: true }; // Mock device for compatibility
  }

  get producerTransport() {
    return { id: 'mesh-producer-transport' }; // Mock transport for compatibility
  }

  get consumerTransport() {
    return { id: 'mesh-consumer-transport' }; // Mock transport for compatibility
  }

  get producers() {
    return new Map(); // Mock producers map
  }

  get consumers() {
    return new Map(); // Mock consumers map
  }

  get roomId() {
    return this.meshService.roomId;
  }

  get userId() {
    return this.meshService.userId;
  }

  get remoteTracks() {
    return this.meshService.remoteTracks;
  }
}

// Export singleton instance to maintain compatibility
export default new MediaSoupAdapter();