package gemoc.mbdo.cep.api.controller;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.stats.CacheStats;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/cache")
@Tag(name = "Cache", description = "Cache management and statistics")
public class CacheController {

    @Autowired
    private CacheManager cacheManager;

    @GetMapping("/stats")
    @Operation(summary = "Get cache statistics", description = "Retrieve statistics for all caches including hit rate, miss rate, and eviction count")
    public ResponseEntity<Map<String, Object>> getCacheStats() {
        Map<String, Object> stats = new HashMap<>();

        for (String cacheName : cacheManager.getCacheNames()) {
            org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
            if (cache instanceof CaffeineCache) {
                CaffeineCache caffeineCache = (CaffeineCache) cache;
                Cache<Object, Object> nativeCache = caffeineCache.getNativeCache();
                CacheStats cacheStats = nativeCache.stats();

                Map<String, Object> cacheInfo = new HashMap<>();
                cacheInfo.put("size", nativeCache.estimatedSize());
                cacheInfo.put("hitCount", cacheStats.hitCount());
                cacheInfo.put("missCount", cacheStats.missCount());
                cacheInfo.put("hitRate", String.format("%.2f%%", cacheStats.hitRate() * 100));
                cacheInfo.put("missRate", String.format("%.2f%%", cacheStats.missRate() * 100));
                cacheInfo.put("evictionCount", cacheStats.evictionCount());
                cacheInfo.put("loadSuccessCount", cacheStats.loadSuccessCount());
                cacheInfo.put("loadFailureCount", cacheStats.loadFailureCount());
                cacheInfo.put("totalLoadTime", cacheStats.totalLoadTime());
                cacheInfo.put("averageLoadPenalty", cacheStats.averageLoadPenalty());

                stats.put(cacheName, cacheInfo);
            }
        }

        return ResponseEntity.ok(stats);
    }

    @DeleteMapping("/evict")
    @Operation(summary = "Evict all caches", description = "Clear all cache entries")
    public ResponseEntity<Map<String, String>> evictAllCaches() {
        for (String cacheName : cacheManager.getCacheNames()) {
            org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
            if (cache != null) {
                cache.clear();
            }
        }
        return ResponseEntity.ok(Map.of("message", "All caches evicted successfully"));
    }

    @DeleteMapping("/evict/{cacheName}")
    @Operation(summary = "Evict specific cache", description = "Clear entries from a specific cache")
    public ResponseEntity<Map<String, String>> evictCache(@PathVariable String cacheName) {
        org.springframework.cache.Cache cache = cacheManager.getCache(cacheName);
        if (cache != null) {
            cache.clear();
            return ResponseEntity.ok(Map.of("message", "Cache '" + cacheName + "' evicted successfully"));
        }
        return ResponseEntity.notFound().build();
    }
}
