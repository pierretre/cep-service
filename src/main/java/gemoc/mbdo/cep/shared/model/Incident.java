package gemoc.mbdo.cep.shared.model;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import javax.print.attribute.standard.Severity;
import java.time.LocalDateTime;

@Setter
@Getter
@Entity
@Table(name = "incidents")
public class Incident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String message;

    @ManyToOne
    @JoinColumn(name = "rule_id", nullable = false)
    private Rule rule;

    @Column(nullable = false)
    private IncidentSeverity severity;

    private boolean ended;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private LocalDateTime updatedAt;

    public Incident() {}

    public Incident(String message, Rule rule, IncidentSeverity severity) {
        this.message = message;
        this.rule = rule;
        this.severity = severity;
        this.ended = false;
        this.createdAt = LocalDateTime.now();
    }
}
