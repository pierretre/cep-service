package gemoc.mbdo.cep.api.repository;

import gemoc.mbdo.cep.api.model.Incident;
import gemoc.mbdo.cep.api.model.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {

    Optional<Incident> findById(long id);

    void deleteByRule(Rule rule);

    long countByRule(Rule rule);

}
