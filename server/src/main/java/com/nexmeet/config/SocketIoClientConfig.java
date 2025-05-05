package com.nexmeet.config;

import io.socket.client.IO;
import io.socket.client.Socket;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import java.net.URISyntaxException;

@Configuration
@Component
public class SocketIoClientConfig {

    private static final Logger logger = LoggerFactory.getLogger(SocketIoClientConfig.class);
    private Socket socket;
    private volatile boolean isConnected = false;

    @PostConstruct
    public void start() {
        try {
            initializeSocket();
            
            // Add connection listeners before connecting
            socket.on(Socket.EVENT_CONNECT, args -> {
                isConnected = true;
                logger.info("[Socket.IO] Connected to Mediasoup server");
            });
            
            socket.on(Socket.EVENT_DISCONNECT, args -> {
                isConnected = false;
                logger.info("[Socket.IO] Disconnected from server");
            });
            
            socket.on(Socket.EVENT_CONNECT_ERROR, args -> {
                isConnected = false;
                if (args != null && args.length > 0) {
                    logger.error("[Socket.IO] Connection error: {}", args[0]);
                }
            });

            // Only connect if not already connected
            if (!isConnected) {
                socket.connect();
            }

        } catch (URISyntaxException e) {
            logger.error("Failed to initialize socket", e);
            throw new RuntimeException("Failed to initialize socket", e);
        }
    }

    private synchronized void initializeSocket() throws URISyntaxException {
        if (socket == null) {
            IO.Options options = new IO.Options();
            options.reconnection = true;
            options.reconnectionAttempts = 5;
            options.reconnectionDelay = 1000;
            options.timeout = 5000;
            options.forceNew = false;
            options.secure = false;
            options.transports = new String[]{"websocket"};

            socket = IO.socket("http://localhost:3000", options);
            logger.info("Socket.IO client initialized with options: {}", options);
        }
    }

    @PreDestroy
    public void stop() {
        if (socket != null) {
            logger.info("Disconnecting Socket.IO client...");
            socket.disconnect();
            socket.close();
            isConnected = false;
        }
    }

    // Getter for socket instance
    public Socket getSocket() {
        return socket;
    }

    // Check if socket is connected
    public boolean isConnected() {
        return isConnected;
    }
}