package gemoc.mbdo.cep.api.service;

import gemoc.mbdo.cep.api.dto.TimePoint;
import gemoc.mbdo.cep.api.dto.TimeSeriesResponse;
import gemoc.mbdo.cep.api.model.Incident;
import gemoc.mbdo.cep.api.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for generating time-series data with adaptive resolution
 */
@Service
public class TimeSeriesService {

    @Autowired
    private IncidentRepository incidentRepository;

    /**
     * Get time-series data for incidents with specified resolution
     * Results are cached for 5 minutes to improve performance
     */
    @Cacheable(value = "timeSeriesCache", key = "#start + '_' + #end + '_' + #resolution")
    public TimeSeriesResponse getTimeSeriesData(Long start, Long end, String resolution) {
        try {
            // Convert milliseconds to LocalDateTime
            LocalDateTime startTime = LocalDateTime.ofInstant(
                    Instant.ofEpochMilli(start), ZoneId.systemDefault());
            LocalDateTime endTime = LocalDateTime.ofInstant(
                    Instant.ofEpochMilli(end), ZoneId.systemDefault());

            System.out.println("Fetching time-series data from " + startTime + " to " + endTime + " with resolution "
                    + resolution);

            // Fetch all incidents in the time range
            List<Incident> incidents = incidentRepository.findByStartTimeBetween(
                    startTime, endTime, org.springframework.data.domain.Pageable.unpaged())
                    .getContent();

            System.out.println("Found " + incidents.size() + " incidents in time range");

            // Compute bucket size based on resolution
            long bucketMillis = getResolutionInMillis(resolution);

            // Aggregate incidents into time buckets
            List<TimePoint> points = aggregateIncidents(incidents, start, end, bucketMillis);

            System.out.println("Generated " + points.size() + " time points");

            return new TimeSeriesResponse(points, resolution, start, end);
        } catch (Exception e) {
            System.err.println("Error generating time-series data: " + e.getMessage());
            e.printStackTrace();
            // Return empty response on error
            return new TimeSeriesResponse(new ArrayList<>(), resolution, start, end);
        }
    }

    /**
     * Aggregate incidents into time buckets
     */
    private List<TimePoint> aggregateIncidents(List<Incident> incidents, Long start, Long end, long bucketMillis) {
        // Create a map to count incidents per bucket
        Map<Long, Long> bucketCounts = new HashMap<>();

        // Initialize all buckets with 0 (including up to current time)
        long currentTime = System.currentTimeMillis();
        long effectiveEnd = Math.min(end, currentTime);

        for (long timestamp = start; timestamp <= effectiveEnd; timestamp += bucketMillis) {
            bucketCounts.put(timestamp, 0L);
        }

        // Count incidents in each bucket
        for (Incident incident : incidents) {
            long incidentMillis = incident.getStartTime()
                    .atZone(ZoneId.systemDefault())
                    .toInstant()
                    .toEpochMilli();

            // Find the bucket this incident belongs to
            long bucketStart = (incidentMillis / bucketMillis) * bucketMillis;

            // Ensure bucket is within range
            if (bucketStart >= start && bucketStart <= effectiveEnd) {
                bucketCounts.merge(bucketStart, 1L, Long::sum);
            }
        }

        // Convert to TimePoint list and sort by timestamp
        return bucketCounts.entrySet().stream()
                .map(entry -> new TimePoint(entry.getKey(), entry.getValue().doubleValue()))
                .sorted(Comparator.comparing(TimePoint::getTimestamp))
                .collect(Collectors.toList());
    }

    /**
     * Convert resolution string to milliseconds
     */
    private long getResolutionInMillis(String resolution) {
        switch (resolution) {
            case "1m":
                return 60 * 1000L; // 1 minute
            case "5m":
                return 5 * 60 * 1000L; // 5 minutes
            case "15m":
                return 15 * 60 * 1000L; // 15 minutes
            case "1h":
                return 60 * 60 * 1000L; // 1 hour
            case "6h":
                return 6 * 60 * 60 * 1000L; // 6 hours
            case "1d":
                return 24 * 60 * 60 * 1000L; // 1 day
            case "1w":
                return 7 * 24 * 60 * 60 * 1000L; // 1 week
            default:
                return 60 * 60 * 1000L; // Default to 1 hour
        }
    }

    /**
     * Validate resolution string
     */
    public boolean isValidResolution(String resolution) {
        return Set.of("1m", "5m", "15m", "1h", "6h", "1d", "1w").contains(resolution);
    }
}
