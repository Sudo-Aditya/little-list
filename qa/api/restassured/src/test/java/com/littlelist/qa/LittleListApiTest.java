package com.littlelist.qa;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Little List API tests (Supabase Auth + PostgREST) — REST Assured.
 *
 * Setup: set env vars LITTLELIST_URL, LITTLELIST_ANON_KEY, QA_EMAIL_A, QA_PASS_A
 * before running. Build with the Maven pom in qa/api/restassured/.
 */
@TestMethodOrder(OrderAnnotation.class)
class LittleListApiTest {

    static String baseUrl = System.getenv().getOrDefault("LITTLELIST_URL", "https://YOUR-PROJECT.supabase.co");
    static String anonKey = System.getenv().getOrDefault("LITTLELIST_ANON_KEY", "YOUR-PUBLISHABLE-KEY");
    static String email = System.getenv().getOrDefault("QA_EMAIL_A", "your-qa-account@example.com");
    static String password = System.getenv().getOrDefault("QA_PASS_A", "your-qa-password");

    static String accessToken;
    static String uid;
    static String createdId;

    @Test
    @Order(1)
    void login_returnsSession() {
        accessToken = given()
            .header("apikey", anonKey).header("Content-Type", "application/json")
            .body("{\"email\": \"" + email + "\", \"password\": \"" + password + "\"}")
        .when()
            .post(baseUrl + "/auth/v1/token?grant_type=password")
        .then()
            .statusCode(200)
            .body("access_token", notNullValue())
            .extract().path("access_token");
        uid = given()
            .header("apikey", anonKey).header("Authorization", "Bearer " + accessToken)
        .when()
            .get(baseUrl + "/auth/v1/user")
        .then()
            .statusCode(200)
            .extract().path("id");
    }

    @Test
    @Order(2)
    void contract_taskShape() {
        given()
            .header("apikey", anonKey).header("Authorization", "Bearer " + accessToken)
        .when()
            .get(baseUrl + "/rest/v1/todos?limit=1")
        .then()
            .statusCode(200)
            .contentType("application/json")
            .body("[0]", anyOf(hasKey("id"), hasKey("title")));
    }

    @Test
    @Order(3)
    void missingApikey_is401() {
        given().when()
            .get(baseUrl + "/rest/v1/todos?limit=1")
        .then().statusCode(401);
    }

    @Test
    @Order(4)
    void patchWithoutFilter_is400() {
        given()
            .header("apikey", anonKey).header("Authorization", "Bearer " + accessToken)
            .header("Content-Type", "application/json")
            .body("{\"title\": \"nope\"}")
        .when()
            .patch(baseUrl + "/rest/v1/todos")
        .then().statusCode(400);
    }

    @Test
    @Order(5)
    void createTask_withBoundaryTitle() {
        String ok = given()
            .header("apikey", anonKey).header("Authorization", "Bearer " + accessToken)
            .header("Content-Type", "application/json")
            .body("{\"title\": \"" + "B".repeat(200) + "\", \"user_id\": \"" + uid + "\"}")
        .when()
            .post(baseUrl + "/rest/v1/todos?select=id")
        .then()
            .statusCode(201)
            .extract().path("id");
        createdId = ok.toString();

        String rejected = given()
            .header("apikey", anonKey).header("Authorization", "Bearer " + accessToken)
            .header("Content-Type", "application/json")
            .body("{\"title\": \"" + "B".repeat(201) + "\", \"user_id\": \"" + uid + "\"}")
        .when()
            .post(baseUrl + "/rest/v1/todos")
        .then()
            .statusCode(400)
            .extract().path("message");
        assertNotNull(rejected);
    }

    @Test
    @Order(6)
    void anonymousAccess_isDenied() {
        given().header("apikey", anonKey).when()
            .get(baseUrl + "/rest/v1/todos?limit=1")
        .then().statusCode(anyOf(equalTo(401), equalTo(403)));
    }

    @Test
    @Order(7)
    void hugePayload_hasNo5xx() {
        given()
            .header("apikey", anonKey).header("Authorization", "Bearer " + accessToken)
            .header("Content-Type", "application/json")
            .body("{\"title\": \"" + "H".repeat(2000000) + "\", \"user_id\": \"" + uid + "\"}")
        .when()
            .post(baseUrl + "/rest/v1/todos")
        .then()
            .statusCode(anyOf(equalTo(400), equalTo(413), equalTo(422)));
    }

    @Test
    @Order(8)
    void malformedJson_is400() {
        given()
            .header("apikey", anonKey).header("Authorization", "Bearer " + accessToken)
            .header("Content-Type", "application/json")
            .body("{not valid json")
        .when()
            .post(baseUrl + "/rest/v1/todos")
        .then().statusCode(400);
    }

    @AfterAll
    static void cleanup() {
        if (createdId != null) {
            given()
                .header("apikey", anonKey).header("Authorization", "Bearer " + accessToken)
            .when()
                .delete(baseUrl + "/rest/v1/todos?id=eq." + createdId)
            .then().statusCode(204);
        }
    }
}
