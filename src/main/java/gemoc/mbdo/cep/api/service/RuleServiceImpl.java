package gemoc.mbdo.cep.api.service;

import gemoc.mbdo.cep.api.repository.RuleRepository;
import gemoc.mbdo.cep.interfaces.RuleService;
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

    @Override
    @Transactional
    public void addRule(Rule rule) {
        if (ruleRepository.existsByName(rule.getName())) {
            throw new IllegalArgumentException("Rule with name '" + rule.getName() + "' already exists");
        }
        rule.setCreatedAt(LocalDateTime.now());
        rule.setActive(true);
        ruleRepository.save(rule);
    }

    @Override
    @Transactional
    public void removeRule(Rule rule) throws Exception {
        Rule existing = ruleRepository.findByName(rule.getName())
                .orElseThrow(() -> new Exception("Rule not found: " + rule.getName()));
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
    public Rule updateRule(Long id, Rule updatedRule) {
        Rule existing = getRuleById(id);

        if (!existing.getName().equals(updatedRule.getName()) &&
                ruleRepository.existsByName(updatedRule.getName())) {
            throw new IllegalArgumentException("Rule with name '" + updatedRule.getName() + "' already exists");
        }

        existing.setName(updatedRule.getName());
        existing.setEplQuery(updatedRule.getEplQuery());
        existing.setDescription(updatedRule.getDescription());
        existing.setActive(updatedRule.getActive());
        existing.setUpdatedAt(LocalDateTime.now());

        return ruleRepository.save(existing);
    }

    @Transactional
    public void activateRule(Long id) {
        Rule rule = getRuleById(id);
        rule.setActive(true);
        rule.setUpdatedAt(LocalDateTime.now());
        ruleRepository.save(rule);
    }

    @Transactional
    public void deactivateRule(Long id) {
        Rule rule = getRuleById(id);
        rule.setActive(false);
        rule.setUpdatedAt(LocalDateTime.now());
        ruleRepository.save(rule);
    }

    public List<Rule> getActiveRules() {
        return ruleRepository.findByActive(true);
    }

    public List<Rule> getModifiedRulesSince(LocalDateTime since) {
        return ruleRepository.findModifiedSince(since);
    }
}
