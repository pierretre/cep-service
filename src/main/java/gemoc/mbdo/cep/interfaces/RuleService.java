package gemoc.mbdo.cep.interfaces;

import gemoc.mbdo.cep.model.Rule;

import java.util.List;

public interface RuleService {
    public void addRule(Rule rule);

    public void removeRule(Rule rule) throws Exception;

    public List<Rule> getRules();
}
