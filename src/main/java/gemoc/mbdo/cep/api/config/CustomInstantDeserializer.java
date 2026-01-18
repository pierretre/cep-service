package gemoc.mbdo.cep.api.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.Instant;

public class CustomInstantDeserializer extends JsonDeserializer<Instant> {

    @Override
    public Instant deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String timestamp = p.getText();

        // Handle malformed timestamps with both timezone offset and Z
        // e.g., "2026-01-18T14:30:04.532251+00:00Z"
        if (timestamp.endsWith("Z") && timestamp.contains("+")) {
            // Remove the trailing Z
            timestamp = timestamp.substring(0, timestamp.length() - 1);
        }

        return Instant.parse(timestamp);
    }
}
