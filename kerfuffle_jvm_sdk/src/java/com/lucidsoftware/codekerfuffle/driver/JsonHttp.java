package com.lucidsoftware.codekerfuffle.driver;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import org.apache.commons.io.IOUtils;
import org.apache.http.Header;
import org.apache.http.HttpHeaders;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

public class JsonHttp {
    private static Boolean DEBUG = false;
    private final CloseableHttpClient client;
    private final ObjectMapper mapper;

    public JsonHttp() {
        client = HttpClientBuilder.create().setDefaultRequestConfig(
            RequestConfig.custom()
                .setConnectTimeout(200)
                .setSocketTimeout(10000)
                .setConnectionRequestTimeout(100)
                .build()
        ).build();
        mapper = new ObjectMapper();
        mapper.registerModule(new Jdk8Module());
    }


    private <T> T runRequest(HttpUriRequest request, Optional<String> token, Class<T> classToParse) {
        int maxAttempts = 3;
        int attempts = 1;
        while (attempts <= maxAttempts) {
            attempts += 1;
            if (DEBUG) System.out.println("Running Request " + request);
            token.ifPresent((String t) -> request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + t));
            request.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");
            request.setHeader(HttpHeaders.ACCEPT, "application/json");
            request.setHeader(HttpHeaders.ACCEPT_ENCODING, "gzip");
            try {
                if (DEBUG) {
                    for (Header h : request.getAllHeaders()) {
                        System.out.println("Header: " + h.getName() + ": " + h.getValue());
                    }
                }
                CloseableHttpResponse response = client.execute(request);
                byte[] responseBody = IOUtils.toByteArray(response.getEntity().getContent());
                response.close();
                if (DEBUG) System.out.println("RESPONSE: " + new String(responseBody));
                if (response.getStatusLine().getStatusCode() >= 200 && response.getStatusLine().getStatusCode() < 300) {
                    return mapper.readValue(responseBody, classToParse);
                } else {
                    String message = "Unsuccessful HTTP request. " + response.getStatusLine().getStatusCode() + " body: " + new String(responseBody);
                    System.err.println(message);
                    throw new RuntimeException(message);
                }
            } catch (Exception e) {
                if (attempts < maxAttempts) {
                    System.out.println("Failed request " + request + ". Retrying");
                    try { Thread.sleep(100); } catch (InterruptedException e1) {}
                } else {
                    e.printStackTrace();
                    System.err.println("Unable to perform " + request);
                    throw new RuntimeException(e);
                }
            }
        }
        return null;
    }

    public <T> T get(String url, Optional<String> token, Class<T> classToParse) {
        return runRequest(new HttpGet(url), token, classToParse);
    }

    public <T> T post(String url, Optional<String> token, Object body, Class<T> classToParse) {
        HttpPost request = new HttpPost(url);
        try {
            String json = mapper.writeValueAsString(body);
            if (DEBUG) System.out.println("POST Data: " + json);
            request.setEntity(new StringEntity(json, ContentType.APPLICATION_JSON.withCharset(StandardCharsets.UTF_8)));
            return runRequest(request, token, classToParse);
        } catch (JsonProcessingException e) {
            if (DEBUG) {
                System.err.println("Unable to serialize JSON for object: " + body);
            }
            throw new RuntimeException(e);
        }
    }
}
