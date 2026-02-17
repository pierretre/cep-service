# Adaptive Time-Series Chart Component

A high-performance Angular component for displaying large temporal datasets using ECharts with automatic resolution adaptation based on zoom level.

## Features

- **Adaptive Resolution**: Automatically adjusts data granularity based on visible time range
- **Zoom-Driven Loading**: Fetches appropriate data resolution when user zooms/pans
- **Performance Optimized**:
  - LTTB (Largest-Triangle-Three-Buckets) sampling
  - Progressive rendering for large datasets
  - Debounced zoom events (200ms)
  - Smart caching with automatic expiration
- **Request Management**:
  - Cancels in-flight requests when new zoom occurs
  - Prevents duplicate requests for same range + resolution
- **Loading States**: Visual feedback during data fetching

## Resolution Ladder

| Time Range | Resolution | Description |
|------------|-----------|-------------|
| ≤ 24 hours | 1 minute | High detail for recent data |
| ≤ 7 days | 5 minutes | Balanced detail for week view |
| ≤ 30 days | 15 minutes | Month overview |
| ≤ 90 days | 1 hour | Quarter view |
| ≤ 1 year | 6 hours | Yearly trends |
| ≤ 2 years | 1 day | Multi-year daily |
| > 2 years | 1 week | Long-term weekly trends |

## Usage

### Basic Usage

```typescript
import { AdaptiveTimeseriesChartComponent } from './components/adaptive-timeseries-chart/adaptive-timeseries-chart.component';

@Component({
  selector: 'app-my-page',
  standalone: true,
  imports: [AdaptiveTimeseriesChartComponent],
  template: `
    <app-adaptive-timeseries-chart
      [title]="'My Time Series'"
      [initialRange]="timeRange">
    </app-adaptive-timeseries-chart>
  `
})
export class MyPageComponent {
  timeRange = {
    start: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    end: Date.now()
  };
}
```

### With Custom Controls

```typescript
@Component({
  template: `
    <div>
      <button (click)="setLast24Hours()">Last 24 Hours</button>
      <button (click)="setLastWeek()">Last Week</button>
      <button (click)="setLastMonth()">Last Month</button>
      <button (click)="chart.refresh()">Refresh</button>
    </div>
    
    <app-adaptive-timeseries-chart
      #chart
      [title]="'Metrics Over Time'"
      [initialRange]="currentRange">
    </app-adaptive-timeseries-chart>
  `
})
export class MyPageComponent {
  @ViewChild('chart') chart!: AdaptiveTimeseriesChartComponent;
  
  currentRange = { start: Date.now() - 86400000, end: Date.now() };
  
  setLast24Hours() {
    const end = Date.now();
    this.chart.setTimeRange({ start: end - 86400000, end });
  }
  
  setLastWeek() {
    const end = Date.now();
    this.chart.setTimeRange({ start: end - 7 * 86400000, end });
  }
  
  setLastMonth() {
    const end = Date.now();
    this.chart.setTimeRange({ start: end - 30 * 86400000, end });
  }
}
```

## API Configuration

### Backend API Endpoint

The component expects a backend API endpoint that accepts:

**GET** `/api/timeseries`

**Query Parameters:**
- `start` (number): Start timestamp in milliseconds
- `end` (number): End timestamp in milliseconds  
- `resolution` (string): One of: `1m`, `5m`, `15m`, `1h`, `6h`, `1d`, `1w`

**Response:**
```typescript
{
  points: Array<{ timestamp: number; value: number }>;
  resolution: string;
  startTime: number;
  endTime: number;
}
```

### Example Backend Implementation (Node.js/Express)

```javascript
app.get('/api/timeseries', async (req, res) => {
  const { start, end, resolution } = req.query;
  
  // Query your database with aggregation
  const points = await db.query(`
    SELECT 
      time_bucket($1, timestamp) as timestamp,
      AVG(value) as value
    FROM metrics
    WHERE timestamp >= $2 AND timestamp <= $3
    GROUP BY time_bucket($1, timestamp)
    ORDER BY timestamp
  `, [resolution, start, end]);
  
  res.json({
    points,
    resolution,
    startTime: parseInt(start),
    endTime: parseInt(end)
  });
});
```

### Customizing API Endpoint

Edit `time-series-data.service.ts`:

```typescript
export class TimeSeriesDataService {
  private readonly apiBaseUrl = '/api/your-custom-endpoint';
  // ... rest of the service
}
```

## Component Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `'Time Series Data'` | Chart title |
| `initialRange` | TimeRange | Last 24 hours | Initial time range to display |

## Component Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `refresh()` | none | Manually refresh current data |
| `setTimeRange(range)` | `TimeRange` | Set new time range and fetch data |

## Data Service

### TimeSeriesDataService

**Methods:**

- `computeResolution(rangeMs: number): ResolutionLevel`
  - Computes appropriate resolution for given time range
  
- `fetchData(request: DataRequest): Observable<TimeSeriesData>`
  - Fetches data with caching
  
- `fetchDataForRange(range: TimeRange): Observable<TimeSeriesData>`
  - Fetches data with automatic resolution computation
  
- `clearCache(): void`
  - Clears all cached data
  
- `pruneCache(): void`
  - Removes expired cache entries

**Observables:**

- `loading$: Observable<boolean>`
  - Emits loading state changes

## Performance Characteristics

- **Memory**: Only keeps data for visible range (typically 1000-5000 points)
- **Network**: Debounced requests, cached responses
- **Rendering**: Progressive rendering for datasets > 3000 points
- **Sampling**: LTTB algorithm reduces visual data without losing shape
- **Cache**: 5-minute TTL, automatic pruning

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (14+)
- Requires ES2015+ support

## Dependencies

- `@angular/core`: ^19.0.0
- `@angular/common`: ^19.0.0
- `echarts`: ^5.4.0
- `rxjs`: ^7.8.0

## License

MIT
