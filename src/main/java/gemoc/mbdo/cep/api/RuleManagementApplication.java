package gemoc.mbdo.cep.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Spring Boot Application for Rule Management API
 * <p>
 * This application provides REST endpoints to manage CEP rules.
 * It stores rules in a database that the CEP engine polls for updates.
 */
@SpringBootApplication
@EnableJpaRepositories(basePackages = "gemoc.mbdo.cep.api.repository")
public class RuleManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(RuleManagementApplication.class, args);
        System.out.println("\n=== Rule Management API Started ===");
        System.out.println("API available at: http://localhost:8081");
        System.out.println("Swagger UI: http://localhost:8081/swagger-ui.html");
        System.out.println("OpenAPI Docs: http://localhost:8081/api-docs");
        System.out.println("H2 Console: http://localhost:8081/h2-console");
        System.out.println("=====================================\n");
    }
}
