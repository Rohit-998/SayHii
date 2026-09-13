package com.sayhii;

import org.junit.jupiter.api.Test;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupabaseConnectionTest {

    @Test
    void testSupabaseConnection() throws Exception {
        Properties props = new Properties();

        // 1. Read main application.properties from src/main/resources
        java.nio.file.Path mainProps = java.nio.file.Path.of("src/main/resources/application.properties");
        if (java.nio.file.Files.exists(mainProps)) {
            try (InputStream in = java.nio.file.Files.newInputStream(mainProps)) {
                props.load(in);
            }
        }

        // 2. Read application-local.properties if present
        java.nio.file.Path localProps = java.nio.file.Path.of("src/main/resources/application-local.properties");
        if (java.nio.file.Files.exists(localProps)) {
            try (InputStream localIn = java.nio.file.Files.newInputStream(localProps)) {
                props.load(localIn);
            }
        }

        String url = props.getProperty("spring.datasource.url");
        if (url != null && url.startsWith("${DB_URL:")) {
            url = url.substring(9, url.length() - 1);
        }

        String user = props.getProperty("spring.datasource.username");
        if (user != null && user.startsWith("${DB_USERNAME:")) {
            user = user.substring(14, user.length() - 1);
        }

        String password = props.getProperty("spring.datasource.password");
        if (password != null && password.startsWith("${DB_PASSWORD:")) {
            password = password.substring(14, password.length() - 1);
        }

        System.out.println("--> Testing Supabase connection to: " + url);
        System.out.println("--> Using username: " + user);

        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            assertNotNull(conn, "Connection should not be null");
            assertTrue(conn.isValid(10), "Connection should be valid");
            DatabaseMetaData meta = conn.getMetaData();
            System.out.println("--> [SUCCESS] Connected to Supabase PostgreSQL!");
            System.out.println("--> Database Version: " + meta.getDatabaseProductName() + " " + meta.getDatabaseProductVersion());

            // Check existing tables in public schema
            try (ResultSet rs = meta.getTables(null, "public", "%", new String[]{"TABLE"})) {
                System.out.println("--> Tables found in 'public' schema:");
                boolean foundAny = false;
                while (rs.next()) {
                    foundAny = true;
                    System.out.println("     - " + rs.getString("TABLE_NAME"));
                }
                if (!foundAny) {
                    System.out.println("     (No tables created yet)");
                }
            }
        }
    }
}
