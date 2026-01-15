package gemoc.mbdo.cep.shared.model;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDateTime;

@Setter
@Getter
@Entity
@Table(name = "rules")
public class Rule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String eplQuery;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private LocalDateTime updatedAt;

    @Column
    private String deploymentId;

    public Rule() {
    }

    public Rule(String name, String eplQuery, String description) {
        this.name = name;
        this.eplQuery = eplQuery;
        this.description = description;
        this.active = true;
        this.createdAt = LocalDateTime.now();
    }

}
