package gemoc.mbdo.cep.interfaces;

import gemoc.mbdo.cep.api.model.Event;
import gemoc.mbdo.cep.api.model.Rule;

public interface CepEngine {
    void checkRule(Rule rule) throws Exception;

    void deployRule(Rule rule) throws Exception;

    void sendEvent(Event event);
}
