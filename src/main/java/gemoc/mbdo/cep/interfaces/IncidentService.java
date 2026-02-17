package gemoc.mbdo.cep.interfaces;

import gemoc.mbdo.cep.api.model.Incident;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface IncidentService {
    List<Incident> getIncidents();

    Page<Incident> getIncidentsPaginated(Pageable pageable);

    Incident getIncidentById(long id);

    void deleteIncident(long id);

    Page<Incident> getIncidentsByTimeRange(Long startTime, Long endTime, Pageable pageable);

    List<Incident> getIncidentsInTimeRange(LocalDateTime startTime, LocalDateTime endTime);

}
