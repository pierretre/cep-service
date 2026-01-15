package gemoc.mbdo.cep.interfaces;

public interface CepEngine {
    void checkPattern(String pattern) throws Exception;

    void registerPattern(String pattern, String queryName) throws Exception;
}
