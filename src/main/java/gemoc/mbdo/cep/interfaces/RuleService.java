package gemoc.mbdo.cep.interfaces;

import gemoc.mbdo.cep.api.model.Rule;

import java.util.List;

public interface RuleService {
    void addRule(Rule rule);

    void removeRule(Rule rule) throws Exception;

    List<Rule> getRules();
}
