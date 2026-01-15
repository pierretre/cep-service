package gemoc.mbdo.cep.api.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/incidents")
@CrossOrigin(origins = "*")
@Tag(name = "Incidents", description = "APIs for retrieving rule violations/incidents")
public class IncidentController {

    @Autowired
    private
}
