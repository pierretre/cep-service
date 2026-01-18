package gemoc.mbdo.cep.api.repository;

import gemoc.mbdo.cep.api.model.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RuleRepository extends JpaRepository<Rule, Long> {

    Optional<Rule> findByName(String name);

    List<Rule> findByActive(Boolean active);

    @Query("SELECT r FROM Rule r WHERE r.updatedAt > :since OR (r.updatedAt IS NULL AND r.createdAt > :since)")
    List<Rule> findModifiedSince(LocalDateTime since);

    boolean existsByName(String name);
}
