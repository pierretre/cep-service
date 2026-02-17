package gemoc.mbdo.cep.api.config;

import gemoc.mbdo.cep.api.model.Rule;
import gemoc.mbdo.cep.api.repository.RuleRepository;
import gemoc.mbdo.cep.interfaces.CepEngine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Initializes the CEP engine by deploying all active rules from the database on
 * application startup.
 */
@Slf4j
@Component
public class RuleInitializer implements ApplicationRunner {

    private final RuleRepository ruleRepository;
    private final CepEngine cepEngine;

    public RuleInitializer(RuleRepository ruleRepository, CepEngine cepEngine) {
        this.ruleRepository = ruleRepository;
        this.cepEngine = cepEngine;
    }

    @Override
    public void run(ApplicationArguments args) {
        log.info("=== Starting Rule Initialization ===");

        List<Rule> activeRules = ruleRepository.findByActive(true);

        if (activeRules.isEmpty()) {
            log.info("No active rules found in database");
            return;
        }

        log.info("Found {} active rule(s) to deploy", activeRules.size());

        int successCount = 0;
        int failureCount = 0;

        for (Rule rule : activeRules) {
            try {
                log.info("Deploying rule: {} (ID: {})", rule.getName(), rule.getId());
                cepEngine.deployRule(rule);
                successCount++;
                log.info("Successfully deployed rule: {}", rule.getName());
            } catch (Exception e) {
                failureCount++;
                log.error("Failed to deploy rule: {} - Error: {}", rule.getName(), e.getMessage(), e);
            }
        }

        log.info("=== Rule Initialization Complete ===");
        log.info("Successfully deployed: {} rule(s)", successCount);

        if (failureCount > 0) {
            log.warn("Failed to deploy: {} rule(s)", failureCount);
        }
    }
}
