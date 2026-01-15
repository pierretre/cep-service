package gemoc.mbdo.cep.interfaces;

public interface CepEngine {
    public void checkPattern(String pattern) throws Exception;

    public void registerPattern(String pattern, String queryName) throws Exception;
}
