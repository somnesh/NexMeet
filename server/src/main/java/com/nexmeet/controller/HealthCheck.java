package com.nexmeet.controller;

import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthCheck {

    @Autowired
    private DataSource dataSource;

    @GetMapping("/db")
    public Map<String, Object> dbHealth() {
        HikariDataSource hikariDataSource = (HikariDataSource) dataSource;
        HikariPoolMXBean poolBean = hikariDataSource.getHikariPoolMXBean();

        return Map.of(
                "activeConnections", poolBean.getActiveConnections(),
                "idleConnections", poolBean.getIdleConnections(),
                "totalConnections", poolBean.getTotalConnections(),
                "threadsAwaitingConnection", poolBean.getThreadsAwaitingConnection()
        );
    }

    @GetMapping
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("everything is ok");
    }
}
