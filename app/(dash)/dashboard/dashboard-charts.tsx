"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

/**
 * Dashboard charts — ported from the inline <script> in items/dashboard.blade.php
 * (reference loads Chart.js from CDN; here the npm package with an identical
 * config: line chart with the reference's two datasets, doughnut with the
 * reference's five slices and 75% cutout). Charts re-render on mount and are
 * destroyed on unmount.
 */

export function ReportLineChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: [
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
        ],
        datasets: [
          {
            label: "Operational",
            data: [65, 59, 80, 81, 56, 55, 40, 60, 55, 30, 78, 95],
            borderColor: "rgb(59, 130, 246)",
            tension: 0.4,
          },
          {
            label: "Recent",
            data: [28, 48, 40, 19, 86, 27, 90, 82, 75, 85, 73, 62],
            borderColor: "rgb(147, 197, 253)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    return () => chart.destroy();
  }, []);

  return <canvas ref={canvasRef} height={200} />;
}

export function TrafficDonutChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const chart = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: [
          "Social Media",
          "Movie Streaming",
          "Music Streaming",
          "Wallets",
          "Reserved",
        ],
        datasets: [
          {
            data: [42.9, 42.9, 42.9, 42.9, 42.9],
            backgroundColor: [
              "rgb(59, 130, 246)", // blue-500
              "rgb(168, 85, 247)", // purple-500
              "rgb(239, 68, 68)", // red-500
              "rgb(234, 179, 8)", // yellow-500
              "rgb(96, 165, 250)", // blue-400
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        cutout: "75%",
      },
    });

    return () => chart.destroy();
  }, []);

  return <canvas ref={canvasRef} height={200} />;
}
