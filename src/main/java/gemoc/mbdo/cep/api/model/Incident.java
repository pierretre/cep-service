package gemoc.mbdo.cep.api.model;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false, foreignKey = @ForeignKey(name = "fk_incidents_rule_id"))
    private Rule rule;

    @Column(nullable = false)
    private IncidentSeverity severity;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private LocalDateTime updatedAt;

    public Incident() {
    }

    public Incident(String message, Rule rule, IncidentSeverity severity, LocalDateTime startTime) {
        this.message = message;
        this.rule = rule;
        this.severity = severity;
        this.startTime = startTime;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
