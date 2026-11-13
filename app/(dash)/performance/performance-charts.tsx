"use client";

import { useEffect, useRef, useState } from "react";
import type { ApexOptions } from "apexcharts";

/**
 * Performance charts — ported from the inline <script> in
 * items/performance.blade.php (reference loads ApexCharts 3.35.3 from CDN;
 * here the npm package with verbatim configs).
 *
 * Reference defect repaired (documented): the script also instantiates
 * `#lineChart` and `#areaChart`, which do not exist in the markup —
 * `render()` throws on the null element and aborts the script, so in the
 * reference the subscribers pie, traffic donut and bar chart never appear.
 * Only the six charts with real mount points are created here.
 *
 * Dark mode: light values are reference-verbatim; in dark mode the grid,
 * axis labels, donut center text and radial track/value are retinted for the
 * dark card (charts rebuild when the theme changes).
 */

export type ChartKey =
  | "topLine"
  | "bottomLine"
  | "bar"
  | "subscribers"
  | "traffic"
  | "progressRing";

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sync = () =>
      setTheme(
        (document.documentElement.getAttribute("data-theme") as
          | "light"
          | "dark") ?? "light",
      );
    sync();
    window.addEventListener("bitz-theme-change", sync);
    return () => window.removeEventListener("bitz-theme-change", sync);
  }, []);

  return theme;
}

const categories12 = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function buildOptions(key: ChartKey, dark: boolean): ApexOptions {
  const gridBorder = dark ? "#26304d" : "#f1f1f1";
  const labelColor = dark ? "#9ca3af" : "#666";
  const centerValueColor = dark ? "#f9fafb" : "#333";
  const trackBackground = dark ? "#26304d" : "#f2f2f2";

  switch (key) {
    case "topLine":
      return {
        series: [
          {
            name: "Total revenue",
            data: [200, 250, 200, 300, 250, 400, 300, 250, 300, 350, 200, 800],
          },
          {
            name: "Total users",
            data: [250, 300, 250, 200, 350, 300, 400, 350, 400, 300, 200, 300],
          },
        ],
        chart: {
          height: 200,
          type: "line",
          toolbar: { show: false },
          zoom: { enabled: false },
        },
        colors: ["#FF6B6B", "#4ECDC4"],
        stroke: { width: 2, curve: "smooth" },
        grid: {
          borderColor: gridBorder,
          row: { colors: ["transparent"], opacity: 0.5 },
        },
        xaxis: {
          categories: categories12,
          labels: { style: { colors: labelColor, fontSize: "12px" } },
        },
        yaxis: {
          labels: { style: { colors: labelColor, fontSize: "12px" } },
        },
        legend: { show: false },
      };

    case "bottomLine":
      return {
        series: [
          {
            name: "Total revenue",
            data: [25, 35, 30, 25, 35, 30, 40, 35, 40, 35, 45, 40],
          },
          {
            name: "Sales return",
            data: [20, 25, 20, 30, 25, 35, 30, 25, 30, 25, 35, 20],
          },
        ],
        chart: {
          height: 200,
          type: "line",
          toolbar: { show: false },
          zoom: { enabled: false },
        },
        colors: ["#4ECDC4", "#FF6B6B"],
        stroke: { width: 2, curve: "smooth" },
        grid: {
          borderColor: gridBorder,
          row: { colors: ["transparent"], opacity: 0.5 },
        },
        xaxis: {
          categories: categories12,
          labels: { style: { colors: labelColor, fontSize: "12px" } },
        },
        yaxis: {
          labels: { style: { colors: labelColor, fontSize: "12px" } },
        },
        legend: { show: false },
        annotations: {
          points: [
            {
              x: "Aug",
              y: 35,
              marker: { size: 0 },
              label: {
                borderColor: "#00796b",
                style: {
                  color: "#fff",
                  background: "#00796b",
                },
                text: "$42,500",
              },
            },
          ],
        },
      };

    case "bar":
      return {
        series: [{ name: "Views", data: [44, 55, 57, 56, 61, 58, 63, 60, 66] }],
        chart: {
          type: "bar",
          height: 300,
          toolbar: { show: false },
        },
        colors: ["#FF6B6B"],
        plotOptions: {
          bar: { borderRadius: 4, horizontal: false },
        },
        // Reference leaves grid at library default (light); dark card needs a
        // readable grid line colour.
        ...(dark ? { grid: { borderColor: gridBorder } } : {}),
        xaxis: {
          categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
        },
      };

    case "subscribers":
      return {
        series: [121799, 64754, 21047, 15387, 7806],
        chart: {
          type: "pie",
          height: 200,
          toolbar: { show: false },
        },
        colors: ["#E34F26", "#FF9B26", "#FFB98B", "#FF5733", "#FFC3A6"],
        labels: ["YouTube", "Facebook", "Spotify", "Y", "Instagram"],
        legend: { show: false },
        stroke: { width: 0 },
        dataLabels: { enabled: false },
      };

    case "traffic":
      return {
        series: [42.5, 42.5, 42.5, 42.5, 42.5],
        chart: {
          type: "donut",
          height: 200,
          toolbar: { show: false },
        },
        colors: ["#22C55E", "#EF4444", "#F59E0B", "#FCD34D", "#3B82F6"],
        labels: ["Organic Search", "Direct", "Referral", "Unassigned", "Paid Search"],
        legend: { show: false },
        plotOptions: {
          pie: {
            donut: {
              size: "75%",
              labels: {
                show: true,
                name: { show: false },
                value: {
                  show: true,
                  fontSize: "22px",
                  fontWeight: 600,
                  offsetY: 8,
                  ...(dark ? { color: centerValueColor } : {}),
                },
                total: {
                  show: true,
                  label: "Total",
                  formatter: () => "72",
                  ...(dark ? { color: labelColor } : {}),
                },
              },
            },
          },
        },
        dataLabels: { enabled: false },
      };

    case "progressRing":
      return {
        series: [60],
        chart: {
          height: 100,
          type: "radialBar",
          toolbar: { show: false },
        },
        plotOptions: {
          radialBar: {
            startAngle: -135,
            endAngle: 135,
            hollow: { size: "72%" },
            track: {
              background: trackBackground,
              strokeWidth: "100%",
              margin: 0,
            },
            dataLabels: {
              name: { show: false },
              value: {
                show: true,
                color: centerValueColor,
                fontSize: "16px",
                fontWeight: "500",
                offsetY: 10,
                formatter: () => "3,280",
              },
            },
          },
        },
        stroke: { lineCap: "round" },
        fill: {
          type: "gradient",
          gradient: {
            shade: "dark",
            type: "horizontal",
            shadeIntensity: 0.5,
            gradientToColors: ["#FF6B6B"],
            inverseColors: true,
            opacityFrom: 1,
            opacityTo: 1,
            stops: [0, 100],
          },
        },
        colors: ["#FF6B6B"],
      };
  }
}

export function ApexChart({
  chartKey,
  className,
}: {
  chartKey: ChartKey;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    // apexcharts types use `export =`, so the instance type is kept structural
    // (only `destroy` is needed by cleanup) instead of naming the module type.
    let activeChart: { destroy: () => unknown } | null = null;

    (async () => {
      const { default: ApexCharts } = await import("apexcharts");
      if (disposed || !containerRef.current) return;
      const chart = new ApexCharts(
        containerRef.current,
        buildOptions(chartKey, theme === "dark"),
      );
      activeChart = chart;
      await chart.render();
    })();

    return () => {
      disposed = true;
      if (activeChart) activeChart.destroy();
    };
  }, [chartKey, theme]);

  return <div ref={containerRef} className={className} />;
}
