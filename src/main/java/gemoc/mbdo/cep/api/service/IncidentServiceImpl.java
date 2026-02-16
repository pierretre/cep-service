package gemoc.mbdo.cep.api.service;

import gemoc.mbdo.cep.api.config.CacheConfig;
import gemoc.mbdo.cep.api.repository.IncidentRepository;
import gemoc.mbdo.cep.interfaces.IncidentService;
import gemoc.mbdo.cep.api.model.Incident;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Service
public class IncidentServiceImpl implements IncidentService {

    @Autowired
    private IncidentRepository incidentRepository;

    @Override
    @Cacheable(value = CacheConfig.INCIDENTS_CACHE)
    public List<Incident> getIncidents() {
        log.debug("Fetching all incidents from database (cache miss)");
        return incidentRepository.findAll();
    }

    @Override
    @Cacheable(value = CacheConfig.INCIDENTS_CACHE, key = "#pageable.pageNumber + '-' + #pageable.pageSize")
    public Page<Incident> getIncidentsPaginated(Pageable pageable) {
        log.debug("Fetching incidents page {} with size {} from database (cache miss)",
                pageable.getPageNumber(), pageable.getPageSize());
        return incidentRepository.findAll(pageable);
    }

    @Override
    @Cacheable(value = CacheConfig.INCIDENT_BY_ID_CACHE, key = "#id")
    public Incident getIncidentById(long id) {
        log.debug("Fetching incident {} from database (cache miss)", id);
        return incidentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Incident not found with id: " + id));
    }

    @Override
    @CacheEvict(value = { CacheConfig.INCIDENTS_CACHE, CacheConfig.INCIDENT_BY_ID_CACHE }, allEntries = true)
    public void deleteIncident(long id) {
        log.debug("Deleting incident {} and evicting cache", id);
        if (!incidentRepository.existsById(id)) {
            throw new IllegalArgumentException("Incident not found with id: " + id);
        }
        incidentRepository.deleteById(id);
    }

    @CacheEvict(value = { CacheConfig.INCIDENTS_CACHE, CacheConfig.INCIDENT_BY_ID_CACHE }, allEntries = true)
    public void evictCache() {
        log.debug("Evicting all incident caches");
    }

    @Override
    @Cacheable(value = CacheConfig.INCIDENTS_CACHE, key = "'timerange-' + #startTime + '-' + #endTime + '-' + #pageable.pageNumber + '-' + #pageable.pageSize")
    public Page<Incident> getIncidentsByTimeRange(Long startTime, Long endTime, Pageable pageable) {
        log.debug("Fetching incidents between {} and {} from database (cache miss)", startTime, endTime);
        LocalDateTime start = LocalDateTime.ofInstant(Instant.ofEpochMilli(startTime), ZoneId.systemDefault());
        LocalDateTime end = LocalDateTime.ofInstant(Instant.ofEpochMilli(endTime), ZoneId.systemDefault());
        return incidentRepository.findByStartTimeBetween(start, end, pageable);
    }
}
