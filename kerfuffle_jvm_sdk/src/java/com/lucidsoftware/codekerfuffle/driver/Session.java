package com.lucidsoftware.codekerfuffle.driver;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.lucidsoftware.codekerfuffle.bot.Direction;
import org.apache.http.client.utils.URIBuilder;

import java.net.URISyntaxException;
import java.util.Optional;

public class Session {
    public static class SessionInitData {
        public final Session session;
        public final String playerName;

        public SessionInitData(Session session, String playerName) {
            this.session = session;
            this.playerName = playerName;
        }
    }

    private static class NewPlayerPost {
        public final String name;
        public final boolean persistent;
        public NewPlayerPost(String name, boolean persistent) {
            this.name = name;
            this.persistent = persistent;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown=true)
    private static class GameName {
        public final String name;
        public final boolean persistent;
        @JsonCreator
        public GameName(@JsonProperty("name") String name, @JsonProperty("persistent") boolean persistent) {
            this.name = name;
            this.persistent = persistent;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown=true)
    private static class NewPlayerResponse {
        public final String name;
        public final String token;
        public final boolean persistent;
        @JsonCreator
        public NewPlayerResponse(@JsonProperty("name") String name, @JsonProperty("token") String token, @JsonProperty("persistent") boolean persistent) {
            this.name = name;
            this.token = token;
            this.persistent = persistent;
        }
    }

    public static SessionInitData startSession(String host, String port, String playerName, boolean persistent) {
        String baseUrl = "http://" + host + ":" + port;
        JsonHttp http = new JsonHttp();
        NewPlayerResponse player =  http.post(baseUrl + "/players", Optional.empty(), new NewPlayerPost(playerName, persistent), NewPlayerResponse.class);
        return new SessionInitData(new Session(http, baseUrl, player.token), player.name);
    }

    private final JsonHttp http;
    private final String baseUrl;
    private final String token;

    Session(JsonHttp http, String baseUrl, String token) {
        this.http = http;
        this.baseUrl = baseUrl;
        this.token = token;
    }

    public String findFirstAvailableGame() {
        while (true) {
            GameName[] availableGames = http.get(baseUrl + "/games", Optional.of(token), GameName[].class);
            if (availableGames.length > 0) {
                return availableGames[0].name;
            } else {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {}
            }
        }
    }

    public GameState sendMoves(String gameName, Direction[] moves) {
        String url = "";
        try {
            url = new URIBuilder(baseUrl).setPath("/games/" + gameName).toString();
        } catch (URISyntaxException e) {}
        return http.post(url, Optional.of(token), moves, GameState.class);
    }

    public GameState joinGame(String gameName) {
        return sendMoves(gameName, new Direction[0]);
    }
}