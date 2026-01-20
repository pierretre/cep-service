package gemoc.mbdo.cep.api.service;

import gemoc.mbdo.cep.api.repository.IncidentRepository;
import gemoc.mbdo.cep.api.repository.RuleRepository;
import gemoc.mbdo.cep.interfaces.RuleService;
import gemoc.mbdo.cep.interfaces.CepEngine;
import gemoc.mbdo.cep.api.model.Rule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RuleServiceImpl implements RuleService {

    @Autowired
    private RuleRepository ruleRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private CepEngine cepEngine;

    @Override
    @Transactional
    public void addRule(Rule rule) {
        if (ruleRepository.existsByName(rule.getName())) {
            throw new IllegalArgumentException("Rule with name '" + rule.getName() + "' already exists");
        }

        // First, validate the rule by checking if it compiles with the CEP engine
        try {
            cepEngine.checkRule(rule);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid EPL query: " + e.getMessage(), e);
        }

        rule.setCreatedAt(LocalDateTime.now());
        rule.setActive(true);
        Rule savedRule = ruleRepository.save(rule);

        // Deploy the rule to the CEP engine if it's active
        if (savedRule.getActive()) {
            try {
                cepEngine.deployRule(savedRule);
                // Update the rule with the deployment ID
                ruleRepository.save(savedRule);
            } catch (Exception e) {
                // If deployment fails, rollback the transaction by throwing a runtime exception
                throw new RuntimeException("Failed to deploy rule to CEP engine: " + e.getMessage(), e);
            }
        }
    }

    @Override
    @Transactional
    public void removeRule(Rule rule) throws Exception {
        Rule existing = ruleRepository.findByName(rule.getName())
                .orElseThrow(() -> new Exception("Rule not found: " + rule.getName()));

        // Undeploy the rule from CEP engine if it's active
        if (existing.getActive()) {
            try {
                cepEngine.undeployRule(existing.getName());
            } catch (Exception e) {
                // Log the error but continue with deletion
                System.err.println("Warning: Failed to undeploy rule from CEP engine: " + e.getMessage());
            }
        }

        ruleRepository.delete(existing);
    }

    @Override
    public List<Rule> getRules() {
        return ruleRepository.findAll();
    }

    public Rule getRuleById(Long id) {
        return ruleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found with id: " + id));
    }

    public Rule getRuleByName(String name) {
        return ruleRepository.findByName(name)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found with name: " + name));
    }

    @Transactional
    public RuleUpdateResult updateRule(Long id, Rule updatedRule) {
        Rule existing = getRuleById(id);

        if (!existing.getName().equals(updatedRule.getName()) &&
                ruleRepository.existsByName(updatedRule.getName())) {
            throw new IllegalArgumentException("Rule with name '" + updatedRule.getName() + "' already exists");
        }

        // Validate the updated EPL query before making changes
        try {
            cepEngine.checkRule(updatedRule);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid EPL query: " + e.getMessage(), e);
        }

        // Check if EPL query has changed
        boolean eplQueryChanged = !existing.getEplQuery().equals(updatedRule.getEplQuery());
        long deletedIncidentsCount = 0;

        // If EPL query changed, delete all incidents related to this rule
        if (eplQueryChanged) {
            deletedIncidentsCount = incidentRepository.countByRule(existing);
            if (deletedIncidentsCount > 0) {
                incidentRepository.deleteByRule(existing);
            }
        }

        // If the rule is active and deployed, undeploy it first
        if (existing.getActive()) {
            try {
                cepEngine.undeployRule(existing.getName());
            } catch (Exception e) {
                throw new RuntimeException("Failed to undeploy existing rule: " + e.getMessage(), e);
            }
        }

        existing.setName(updatedRule.getName());
        existing.setEplQuery(updatedRule.getEplQuery());
        existing.setDescription(updatedRule.getDescription());
        existing.setActive(updatedRule.getActive());
        existing.setUpdatedAt(LocalDateTime.now());

        Rule saved = ruleRepository.save(existing);

        // If the updated rule is active, deploy it
        if (saved.getActive()) {
            try {
                cepEngine.deployRule(saved);
                ruleRepository.save(saved);
            } catch (Exception e) {
                throw new RuntimeException("Failed to deploy updated rule: " + e.getMessage(), e);
            }
        }

        return new RuleUpdateResult(saved, eplQueryChanged, deletedIncidentsCount);
    }

    // Inner class to hold update result information
    public static class RuleUpdateResult {
        private final Rule rule;
        private final boolean eplQueryChanged;
        private final long deletedIncidentsCount;

        public RuleUpdateResult(Rule rule, boolean eplQueryChanged, long deletedIncidentsCount) {
            this.rule = rule;
            this.eplQueryChanged = eplQueryChanged;
            this.deletedIncidentsCount = deletedIncidentsCount;
        }

        public Rule getRule() {
            return rule;
        }

        public boolean isEplQueryChanged() {
            return eplQueryChanged;
        }

        public long getDeletedIncidentsCount() {
            return deletedIncidentsCount;
        }
    }

    @Transactional
    public void activateRule(Long id) {
        Rule rule = getRuleById(id);

        if (!rule.getActive()) {
            rule.setActive(true);
            rule.setUpdatedAt(LocalDateTime.now());
            Rule saved = ruleRepository.save(rule);

            // Deploy the rule to CEP engine
            try {
                cepEngine.deployRule(saved);
                ruleRepository.save(saved);
            } catch (Exception e) {
                throw new RuntimeException("Failed to deploy rule to CEP engine: " + e.getMessage(), e);
            }
        }
    }

    @Transactional
    public void deactivateRule(Long id) {
        Rule rule = getRuleById(id);

        if (rule.getActive()) {
            // Undeploy from CEP engine first
            try {
                cepEngine.undeployRule(rule.getName());
            } catch (Exception e) {
                throw new RuntimeException("Failed to undeploy rule from CEP engine: " + e.getMessage(), e);
            }

            rule.setActive(false);
            rule.setUpdatedAt(LocalDateTime.now());
            ruleRepository.save(rule);
        }
    }

    public List<Rule> getActiveRules() {
        return ruleRepository.findByActive(true);
    }

    public List<Rule> getModifiedRulesSince(LocalDateTime since) {
        return ruleRepository.findModifiedSince(since);
    }
}
