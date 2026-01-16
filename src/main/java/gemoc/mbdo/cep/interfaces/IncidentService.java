package gemoc.mbdo.cep.interfaces;

import gemoc.mbdo.cep.shared.model.Incident;

import java.util.List;

public interface IncidentService
{
    List<Incident> getIncidents();

    Incident getIncidentById(long id);
}
