import math
import duckdb
from typing import List, Dict, Any, Optional

class AnomalyService:
    @staticmethod
    def detect_metric_anomalies(
        file_path: str,
        metric_col: str,
        dim_col: str,
        z_threshold: float = 2.0,
    ) -> List[Dict[str, Any]]:
        """
        Calculates group-level aggregates across dimension slices,
        computes z-scores and percentage deviations from the group mean,
        and identifies real statistical anomalies.
        """
        normalized_path = file_path.replace("\\", "/")
        con = duckdb.connect(":memory:")
        try:
            sql = f"""
                SELECT 
                    "{dim_col}" AS dimension_value,
                    SUM("{metric_col}") AS total_val,
                    COUNT(*) AS count_val,
                    AVG("{metric_col}") AS avg_val
                FROM read_csv_auto('{normalized_path}')
                WHERE "{dim_col}" IS NOT NULL AND "{metric_col}" IS NOT NULL
                GROUP BY "{dim_col}"
                HAVING COUNT(*) > 0
                ORDER BY total_val DESC
            """
            rows = con.execute(sql).fetchall()
            if not rows or len(rows) < 2:
                return []

            values = [float(r[1]) for r in rows if r[1] is not None]
            if not values:
                return []

            n = len(values)
            mean_val = sum(values) / n
            variance = sum((x - mean_val) ** 2 for x in values) / (n - 1) if n > 1 else 0.0
            std_dev = math.sqrt(variance)

            anomalies = []
            for r in rows:
                dim_val = str(r[0])
                val = float(r[1]) if r[1] is not None else 0.0
                z_score = (val - mean_val) / std_dev if std_dev > 0 else 0.0
                pct_diff = ((val - mean_val) / mean_val * 100.0) if mean_val != 0 else 0.0

                if abs(z_score) >= z_threshold or abs(pct_diff) >= 40.0:
                    severity = "critical" if (z_score < -2.0 or pct_diff <= -35.0) else (
                        "warning" if abs(z_score) >= 2.0 else "info"
                    )
                    anomalies.append({
                        "dimension_value": dim_val,
                        "value": val,
                        "mean": mean_val,
                        "std_dev": std_dev,
                        "z_score": round(z_score, 2),
                        "percentage_diff": round(pct_diff, 2),
                        "severity": severity,
                        "row_count": r[2],
                    })

            return anomalies
        except Exception as e:
            print(f"[AnomalyService] Error analyzing anomalies: {e}")
            return []
        finally:
            con.close()
