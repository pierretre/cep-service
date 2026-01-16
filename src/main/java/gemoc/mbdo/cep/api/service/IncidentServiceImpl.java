package gemoc.mbdo.cep.api.service;

import gemoc.mbdo.cep.api.repository.IncidentRepository;
import gemoc.mbdo.cep.interfaces.IncidentService;
import gemoc.mbdo.cep.shared.model.Incident;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class IncidentServiceImpl implements IncidentService {

    @Autowired
    private IncidentRepository incidentRepository;

    @Override
    public List<Incident> getIncidents() {
        return incidentRepository.findAll();
    }

    @Override
    public Incident getIncidentById(long id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found with id: " + id));
    }
}
