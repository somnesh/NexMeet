// src/services/stompService.js
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class StompService {
    constructor() {
        this.client = null;
        this.subscriptions = new Map();
        this.connected = false;
        this.connectionPromise = null;
    }

    connect(serverUrl = `${import.meta.env.VITE_SERVER_URL}/ws`) {
        if (this.connected) {
            return Promise.resolve();
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            const socket = new SockJS(serverUrl);

            this.client = new Client({
                webSocketFactory: () => socket,
                debug: function(str) {
                    console.log('STOMP: ' + str);
                },
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000
            });

            this.client.onConnect = () => {
                console.log('STOMP connection established');
                this.connected = true;
                resolve();
            };

            this.client.onStompError = (frame) => {
                console.error('STOMP error:', frame);
                reject(new Error('STOMP connection error'));
            };

            this.client.activate();
        });

        return this.connectionPromise;
    }

    // Subscribe to a topic
    subscribe(destination, callback) {
        if (!this.connected) {
            console.warn('STOMP not connected, attempting to connect...');
            return this.connect().then(() => this.subscribe(destination, callback));
        }

        if (this.subscriptions.has(destination)) {
            return this.subscriptions.get(destination);
        }

        const subscription = this.client.subscribe(destination, (message) => {
            try {
                const data = JSON.parse(message.body);
                callback(data);
            } catch (error) {
                console.error('Error parsing message:', error);
                callback(message.body);
            }
        });

        this.subscriptions.set(destination, subscription);
        return subscription;
    }

    // Unsubscribe from a topic
    unsubscribe(destination) {
        if (this.subscriptions.has(destination)) {
            const subscription = this.subscriptions.get(destination);
            subscription.unsubscribe();
            this.subscriptions.delete(destination);
        }
    }

    // Send a message to the server
    send(destination, body) {
        if (!this.connected) {
            console.warn('STOMP not connected, attempting to connect...');
            return this.connect().then(() => this.send(destination, body));
        }

        this.client.publish({
            destination,
            body: JSON.stringify(body)
        });
    }

    // Close the connection
    disconnect() {
        if (this.client && this.connected) {
            this.client.deactivate();
            this.connected = false;
            this.connectionPromise = null;
            this.subscriptions.clear();
        }
    }
}

export default new StompService();