package gemoc.mbdo.cep.api.repository;

import gemoc.mbdo.cep.api.model.Incident;
import gemoc.mbdo.cep.api.model.Rule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {

    Optional<Incident> findById(long id);

    void deleteByRule(Rule rule);

    long countByRule(Rule rule);

    @Query("SELECT i FROM Incident i WHERE i.startTime >= :startTime AND i.startTime <= :endTime")
    Page<Incident> findByStartTimeBetween(@Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            Pageable pageable);

}
